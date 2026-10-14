import { SystemSetting } from '../models/SystemSetting';
import { createAuditLog } from './auditService';
import { emitSystemTimeUpdate } from './socketService';

export type TimeMode = 'REAL_TIME' | 'TEST_MODE';

export interface SystemTimeConfig {
  mode: TimeMode;
  simulatedBaseTime: string; // ISO string
  simulatedAtRealTime: string; // Real timestamp when base was set
  isPaused: boolean;
  speedMultiplier: number;
  enabledBy?: string;
  enabledAt?: string;
}

const SETTING_KEY = 'SYSTEM_TIME_CONFIG';

class CentralizedClockService {
  private config: SystemTimeConfig = {
    mode: 'REAL_TIME',
    simulatedBaseTime: new Date().toISOString(),
    simulatedAtRealTime: new Date().toISOString(),
    isPaused: false,
    speedMultiplier: 1,
  };
  private isInitialized = false;

  public async init(): Promise<void> {
    try {
      const setting = await SystemSetting.findOne({ key: SETTING_KEY });
      if (setting && setting.value) {
        this.config = {
          mode: setting.value.mode || 'REAL_TIME',
          simulatedBaseTime: setting.value.simulatedBaseTime || new Date().toISOString(),
          simulatedAtRealTime: setting.value.simulatedAtRealTime || new Date().toISOString(),
          isPaused: Boolean(setting.value.isPaused),
          speedMultiplier: Number(setting.value.speedMultiplier) || 1,
          enabledBy: setting.value.enabledBy,
          enabledAt: setting.value.enabledAt,
        };
      }
      this.isInitialized = true;
      console.log(`[ClockService] Initialized in mode: ${this.config.mode}`);
    } catch (err) {
      console.error('[ClockService] Failed to load config from database, using REAL_TIME fallback:', err);
      this.isInitialized = true;
    }
  }

  /**
   * Obtains the actual real physical server time.
   */
  public getRealNow(): Date {
    return new Date();
  }

  /**
   * Centralized application clock.
   * Returns simulated time in TEST_MODE or real server time in REAL_TIME.
   */
  public getEffectiveNow(): Date {
    if (this.config.mode === 'REAL_TIME') {
      return new Date();
    }

    const baseMs = new Date(this.config.simulatedBaseTime).getTime();
    if (this.config.isPaused) {
      return new Date(baseMs);
    }

    const setAtRealMs = new Date(this.config.simulatedAtRealTime).getTime();
    const elapsedRealMs = Date.now() - setAtRealMs;
    const effectiveMs = baseMs + elapsedRealMs * this.config.speedMultiplier;
    return new Date(effectiveMs);
  }

  /**
   * Formatted status for APIs, dashboards, and header clock.
   */
  public getStatus() {
    const realNow = this.getRealNow();
    const effectiveNow = this.getEffectiveNow();
    return {
      mode: this.config.mode,
      effectiveTime: effectiveNow.toISOString(),
      realTime: realNow.toISOString(),
      isPaused: this.config.isPaused,
      speedMultiplier: this.config.speedMultiplier,
      timezone: 'Asia/Kolkata',
      enabledBy: this.config.enabledBy,
      enabledAt: this.config.enabledAt,
    };
  }

  /**
   * Enable Test Mode with specified datetime.
   */
  public async enableTestMode(targetDatetime?: Date | string, adminId?: string): Promise<any> {
    const realNow = this.getRealNow();
    const baseDate = targetDatetime ? new Date(targetDatetime) : this.getEffectiveNow();

    if (isNaN(baseDate.getTime())) {
      throw new Error('Invalid target datetime provided for test mode.');
    }

    this.config = {
      mode: 'TEST_MODE',
      simulatedBaseTime: baseDate.toISOString(),
      simulatedAtRealTime: realNow.toISOString(),
      isPaused: false,
      speedMultiplier: 1,
      enabledBy: adminId,
      enabledAt: realNow.toISOString(),
    };

    await this.persistConfig();

    if (adminId) {
      await createAuditLog(adminId, 'ENABLE_TEST_TIME_MODE', 'SystemSetting', SETTING_KEY, {
        simulatedBaseTime: this.config.simulatedBaseTime,
        realTimestamp: realNow.toISOString(),
      });
    }

    const status = this.getStatus();
    emitSystemTimeUpdate(status);
    return status;
  }

  /**
   * Set custom simulated time while in Test Mode.
   */
  public async setTestTime(targetDatetime: Date | string, adminId?: string): Promise<any> {
    const realNow = this.getRealNow();
    const baseDate = new Date(targetDatetime);

    if (isNaN(baseDate.getTime())) {
      throw new Error('Invalid target datetime provided for setTestTime.');
    }

    this.config.mode = 'TEST_MODE';
    this.config.simulatedBaseTime = baseDate.toISOString();
    this.config.simulatedAtRealTime = realNow.toISOString();

    await this.persistConfig();

    if (adminId) {
      await createAuditLog(adminId, 'SET_TEST_TIME', 'SystemSetting', SETTING_KEY, {
        newSimulatedTime: this.config.simulatedBaseTime,
        realTimestamp: realNow.toISOString(),
      });
    }

    const status = this.getStatus();
    emitSystemTimeUpdate(status);
    return status;
  }

  /**
   * Advance simulated time by milliseconds.
   */
  public async advanceTestTime(durationMs: number, adminId?: string): Promise<any> {
    const currentEffective = this.getEffectiveNow();
    const newEffectiveMs = currentEffective.getTime() + durationMs;
    const newBaseDate = new Date(newEffectiveMs);

    return this.setTestTime(newBaseDate, adminId);
  }

  /**
   * Play/pause simulated clock and set speed multiplier.
   */
  public async setPlayback(isPaused: boolean, speedMultiplier = 1, adminId?: string): Promise<any> {
    const currentEffective = this.getEffectiveNow();
    const realNow = this.getRealNow();

    this.config.simulatedBaseTime = currentEffective.toISOString();
    this.config.simulatedAtRealTime = realNow.toISOString();
    this.config.isPaused = Boolean(isPaused);
    this.config.speedMultiplier = Math.max(0.1, Math.min(120, Number(speedMultiplier) || 1));

    await this.persistConfig();

    if (adminId) {
      await createAuditLog(adminId, 'CHANGE_TEST_TIME_PLAYBACK', 'SystemSetting', SETTING_KEY, {
        isPaused: this.config.isPaused,
        speedMultiplier: this.config.speedMultiplier,
        currentEffective: currentEffective.toISOString(),
      });
    }

    const status = this.getStatus();
    emitSystemTimeUpdate(status);
    return status;
  }

  /**
   * Disable Test Mode and restore actual physical server time.
   */
  public async disableTestMode(adminId?: string): Promise<any> {
    const realNow = this.getRealNow();

    this.config = {
      mode: 'REAL_TIME',
      simulatedBaseTime: realNow.toISOString(),
      simulatedAtRealTime: realNow.toISOString(),
      isPaused: false,
      speedMultiplier: 1,
    };

    await this.persistConfig();

    if (adminId) {
      await createAuditLog(adminId, 'DISABLE_TEST_TIME_MODE', 'SystemSetting', SETTING_KEY, {
        realTimestamp: realNow.toISOString(),
      });
    }

    const status = this.getStatus();
    emitSystemTimeUpdate(status);
    return status;
  }

  private async persistConfig(): Promise<void> {
    try {
      await SystemSetting.findOneAndUpdate(
        { key: SETTING_KEY },
        {
          key: SETTING_KEY,
          value: this.config,
          description: 'Admin System Time Control simulation configuration',
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('[ClockService] Error persisting config to database:', err);
    }
  }
}

export const clockService = new CentralizedClockService();
