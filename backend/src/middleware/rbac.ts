import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from '../errors/AppError';
import { UserRole } from '../models/User';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('User authentication missing.', 401, 'AUTH_INVALID'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden. Role '${req.user.role}' is not authorized for this resource. Required: [${allowedRoles.join(
            ', '
          )}]`,
          403,
          'AUTH_FORBIDDEN'
        )
      );
    }

    next();
  };
};
