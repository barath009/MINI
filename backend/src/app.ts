import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import facultyRoutes from './routes/facultyRoutes';
import studentRoutes from './routes/studentRoutes';
import deviceRoutes from './routes/deviceRoutes';
import reportRoutes from './routes/reportRoutes';
import importRoutes from './routes/importRoutes';
import parentRoutes from './routes/parentRoutes';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'BIT Smart Attendance Backend API',
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/faculty', facultyRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/attendance', deviceRoutes); // Support POST /api/v1/attendance/recognize
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/import', importRoutes);
app.use('/api/v1/admin/import', importRoutes); // Alias for full spec compatibility
app.use('/api/v1/parent', parentRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
