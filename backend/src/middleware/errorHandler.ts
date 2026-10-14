import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Handle Zod Validation Errors
  if (err.name === 'ZodError' || Array.isArray(err.issues)) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    if (Array.isArray(err.issues) && err.issues.length > 0) {
      const messages = err.issues.map((issue: any) => {
        const fieldName = issue.path && issue.path.length > 0 ? issue.path.join('.') : '';
        if (issue.message && !issue.message.startsWith('Invalid') && !issue.message.startsWith('String')) {
          return issue.message;
        }
        return fieldName ? `${fieldName}: ${issue.message}` : issue.message;
      });
      message = messages.join(' | ');
    } else {
      message = 'Validation failed. Please check your inputs.';
    }
  } else if (err.name === 'ValidationError') {
    statusCode = 422;
    message = err.message;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate entry error: ${field} already exists in database.`;
    errorCode = 'DUPLICATE_KEY_ERROR';
  } else if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoNetworkError' || err.message?.includes('buffering timed out')) {
    statusCode = 503;
    message = 'Database service is currently initializing or unreachable. Please start MongoDB or wait a few seconds for automatic setup.';
    errorCode = 'DATABASE_UNAVAILABLE';
  }

  // Fallback: If message is a JSON array string (e.g. stringified Zod issues array)
  if (typeof message === 'string' && message.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(message);
      if (Array.isArray(parsed) && parsed.length > 0) {
        message = parsed.map((item: any) => item.message || `${item.path?.join('.') || 'Field'} is invalid`).join(' | ');
      }
    } catch (e) {
      // Keep original message if JSON parse fails
    }
  }

  if (statusCode >= 500) {
    console.error('[Unhandled Exception Error]:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
