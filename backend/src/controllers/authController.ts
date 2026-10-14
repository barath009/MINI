import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../errors/AppError';
import { User, IUser } from '../models/User';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { loginSchema } from '../validators';
import { createAuditLog } from '../services/auditService';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password credentials.', 401, 'AUTH_INVALID');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is inactive or suspended. Please contact administrator.', 403, 'USER_INACTIVE');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password credentials.', 401, 'AUTH_INVALID');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    const refreshToken = jwt.sign({ userId: user._id, role: user.role }, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn as any,
    });

    // Populate role-specific profile details
    let profileDetails: any = {};
    if (user.role === 'STUDENT') {
      profileDetails = await Student.findOne({ userId: user._id })
        .populate('departmentId')
        .populate('sectionId');
    } else if (user.role === 'FACULTY') {
      profileDetails = await Faculty.findOne({ userId: user._id }).populate('departmentId');
    }

    await createAuditLog(user._id, 'USER_LOGIN', 'User', user._id.toString(), { role: user.role }, req.ip);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          status: user.status,
          profile: profileDetails,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user as IUser;

    let profileDetails: any = {};
    if (user.role === 'STUDENT') {
      profileDetails = await Student.findOne({ userId: user._id })
        .populate('departmentId')
        .populate('sectionId');
    } else if (user.role === 'FACULTY') {
      profileDetails = await Faculty.findOne({ userId: user._id }).populate('departmentId');
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        profile: profileDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user as IUser;

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400, 'AUTH_INVALID');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await createAuditLog(user._id, 'PASSWORD_CHANGED', 'User', user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
