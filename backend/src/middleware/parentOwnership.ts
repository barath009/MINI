import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from '../errors/AppError';
import { ParentWard } from '../models/ParentWard';
import { Student } from '../models/Student';
import mongoose from 'mongoose';

export interface ParentRequest extends AuthRequest {
  parentWard?: any;
  authorizedStudent?: any;
}

export const verifyParentWardAccess = async (req: ParentRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'AUTH_REQUIRED');
    }

    // Admins have overarching oversight access
    if (req.user.role === 'ADMIN') {
      const studentId = req.params.studentId || req.query.studentId;
      if (studentId && mongoose.Types.ObjectId.isValid(studentId as string)) {
        const student = await Student.findById(studentId);
        if (student) {
          req.authorizedStudent = student;
          return next();
        }
      }
      return next();
    }

    if (req.user.role !== 'PARENT') {
      throw new AppError('Access forbidden. Parent role required.', 403, 'AUTH_FORBIDDEN');
    }

    const rawStudentId = req.params.studentId || req.query.studentId;
    if (!rawStudentId) {
      throw new AppError('Student identifier is required.', 400, 'STUDENT_ID_REQUIRED');
    }

    if (!mongoose.Types.ObjectId.isValid(rawStudentId as string)) {
      throw new AppError('Invalid Student ID format.', 400, 'INVALID_ID');
    }

    const association = await ParentWard.findOne({
      parent: req.user._id,
      student: rawStudentId,
      isActive: true,
    }).populate({
      path: 'student',
      populate: ['departmentId', 'sectionId', 'userId'],
    });

    if (!association || !association.student) {
      throw new AppError(
        'Access denied. You are not authorized to monitor this student, or the relationship is inactive.',
        403,
        'WARD_ACCESS_DENIED'
      );
    }

    req.parentWard = association;
    req.authorizedStudent = association.student;
    next();
  } catch (error) {
    next(error);
  }
};
