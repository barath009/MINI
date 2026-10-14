import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from '../errors/AppError';
import { Faculty } from '../models/Faculty';
import { Student } from '../models/Student';
import { ClassAllocation } from '../models/ClassAllocation';
import mongoose from 'mongoose';

export interface FacultyStudentRequest extends AuthRequest {
  facultyProfile?: any;
  targetStudent?: any;
}

/**
 * Middleware to verify that the logged-in Faculty member has an active allocation
 * for the requested student (or is an Admin with overarching oversight).
 * Prevents IDOR (Insecure Direct Object Reference) access.
 */
export const verifyFacultyStudentAccess = async (
  req: FacultyStudentRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'AUTH_REQUIRED');
    }

    const rawStudentId = req.params.studentId || req.query.studentId;
    if (!rawStudentId) {
      throw new AppError('Student identifier is required.', 400, 'STUDENT_ID_REQUIRED');
    }

    if (!mongoose.Types.ObjectId.isValid(rawStudentId as string)) {
      throw new AppError('Invalid Student ID format.', 400, 'INVALID_STUDENT_ID');
    }

    const student = await Student.findById(rawStudentId)
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name code')
      .populate('sectionId', 'name');

    if (!student) {
      throw new AppError('Student profile not found.', 404, 'STUDENT_NOT_FOUND');
    }
    req.targetStudent = student;

    // Administrators have full oversight access across all students
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (req.user.role !== 'FACULTY') {
      throw new AppError('Access forbidden. Faculty role required.', 403, 'FACULTY_ROLE_REQUIRED');
    }

    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) {
      throw new AppError('Faculty profile not found for authenticated user.', 404, 'FACULTY_NOT_FOUND');
    }
    req.facultyProfile = faculty;

    // Check direct active ClassAllocation for this faculty and student
    const directAllocation = await ClassAllocation.findOne({
      facultyId: faculty._id,
      studentId: student._id,
      status: 'ACTIVE',
    });

    if (directAllocation) {
      return next();
    }

    // Check if the student belongs to a section allocated to this faculty
    if (student.sectionId) {
      const sectionAllocation = await ClassAllocation.findOne({
        facultyId: faculty._id,
        sectionId: (student.sectionId as any)?._id || student.sectionId,
        status: 'ACTIVE',
      });

      if (sectionAllocation) {
        return next();
      }
    }

    // Unauthorized access attempt to unallocated student
    throw new AppError(
      'Access denied. You are only authorized to view attendance for students allocated to your classes.',
      403,
      'FACULTY_STUDENT_ACCESS_DENIED'
    );
  } catch (err) {
    next(err);
  }
};
