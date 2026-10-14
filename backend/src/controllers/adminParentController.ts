import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { ParentWard } from '../models/ParentWard';
import { createParentSchema, updateParentSchema, assignWardSchema } from '../validators';
import { createAuditLog } from '../services/auditService';

export const createParent = async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = createParentSchema.parse(req.body);
    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError('An account with this email address already exists in the system.', 409, 'DUPLICATE_EMAIL');
    }

    // Generate secure setup password if none provided
    const tempPassword = data.password || `Parent@${crypto.randomBytes(3).toString('hex')}26`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const parentUser = await User.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'PARENT',
      phone: data.phone.trim(),
      status: 'ACTIVE',
    });

    const assignedWards = [];
    if (data.studentIds && Array.isArray(data.studentIds) && data.studentIds.length > 0) {
      for (const sId of data.studentIds) {
        if (mongoose.Types.ObjectId.isValid(sId)) {
          const studentDoc = await Student.findById(sId);
          if (studentDoc) {
            const wardLink = await ParentWard.create({
              parent: parentUser._id,
              student: studentDoc._id,
              relationship: data.relationship || 'Guardian',
              isActive: true,
              assignedBy: req.user._id,
            });
            assignedWards.push(wardLink);
          }
        }
      }
    }

    await createAuditLog(
      req.user._id,
      'CREATE_PARENT',
      'User',
      parentUser._id.toString(),
      {
        parentName: parentUser.name,
        email: parentUser.email,
        assignedWardsCount: assignedWards.length,
      },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Parent account successfully provisioned.',
      data: {
        parent: {
          id: parentUser._id,
          name: parentUser.name,
          email: parentUser.email,
          phone: parentUser.phone,
          role: parentUser.role,
          status: parentUser.status,
          createdAt: parentUser.createdAt,
        },
        initialPassword: tempPassword,
        assignedWardsCount: assignedWards.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getParents = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const query: any = { role: 'PARENT' };
    if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status as string)) {
      query.status = status;
    }

    if (search) {
      const re = new RegExp(search as string, 'i');
      query.$or = [{ name: re }, { email: re }, { phone: re }];
    }

    const [parents, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(query),
    ]);

    // Attach active ward count and basic preview for each parent
    const parentsWithWards = await Promise.all(
      parents.map(async (p: any) => {
        const wardCount = await ParentWard.countDocuments({ parent: p._id, isActive: true });
        return {
          id: p._id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          status: p.status,
          wardCount,
          lastLoginAt: p.lastLoginAt,
          createdAt: p.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: parentsWithWards,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getParentById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Parent ID format.', 400);
    }

    const parent = await User.findOne({ _id: id, role: 'PARENT' }).lean();
    if (!parent) {
      throw new AppError('Parent record not found.', 404);
    }

    const wardLinks = await ParentWard.find({ parent: id, isActive: true })
      .populate({
        path: 'student',
        populate: [
          { path: 'userId', select: 'name email phone' },
          { path: 'departmentId', select: 'name code' },
          { path: 'sectionId', select: 'name' },
        ],
      })
      .lean();

    const formattedWards = wardLinks.map((wl: any) => ({
      wardLinkId: wl._id,
      relationship: wl.relationship,
      assignedAt: wl.createdAt,
      studentId: wl.student?._id,
      name: wl.student?.userId?.name || 'Unknown Student',
      email: wl.student?.userId?.email,
      registerNumber: wl.student?.registerNumber,
      rollNumber: wl.student?.rollNumber,
      department: wl.student?.departmentId?.name,
      section: wl.student?.sectionId?.name,
      year: wl.student?.year,
      semester: wl.student?.semester,
      biometricStatus: wl.student?.biometricStatus,
    }));

    res.status(200).json({
      success: true,
      data: {
        id: parent._id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        status: parent.status,
        createdAt: parent.createdAt,
        lastLoginAt: parent.lastLoginAt,
        wards: formattedWards,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateParent = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateParentSchema.parse(req.body);

    const parent = await User.findOne({ _id: id, role: 'PARENT' });
    if (!parent) throw new AppError('Parent record not found.', 404);

    if (data.name) parent.name = data.name.trim();
    if (data.phone) parent.phone = data.phone.trim();
    if (data.status) parent.status = data.status;

    await parent.save();

    await createAuditLog(
      req.user._id,
      'UPDATE_PARENT',
      'User',
      parent._id.toString(),
      { updatedFields: Object.keys(data) },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Parent information successfully updated.',
      data: {
        id: parent._id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        status: parent.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateParentStatus = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      throw new AppError('Invalid status value. Must be ACTIVE, INACTIVE, or SUSPENDED.', 400);
    }

    const parent = await User.findOne({ _id: id, role: 'PARENT' });
    if (!parent) throw new AppError('Parent record not found.', 404);

    parent.status = status;
    await parent.save();

    await createAuditLog(
      req.user._id,
      'TOGGLE_PARENT_STATUS',
      'User',
      parent._id.toString(),
      { newStatus: status },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: `Parent account status updated to ${status}.`,
      data: { id: parent._id, status: parent.status },
    });
  } catch (error) {
    next(error);
  }
};

export const assignWard = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { studentId, relationship } = assignWardSchema.parse(req.body);

    const parent = await User.findOne({ _id: id, role: 'PARENT' });
    if (!parent) throw new AppError('Parent record not found.', 404);

    const student = await Student.findById(studentId);
    if (!student) throw new AppError('Student record not found.', 404);

    const existingLink = await ParentWard.findOne({ parent: id, student: studentId });
    if (existingLink) {
      if (existingLink.isActive) {
        throw new AppError('Student is already actively associated with this parent account.', 409);
      }
      existingLink.isActive = true;
      existingLink.relationship = relationship || existingLink.relationship;
      existingLink.assignedBy = req.user._id;
      await existingLink.save();

      await createAuditLog(
        req.user._id,
        'REACTIVATE_PARENT_WARD',
        'ParentWard',
        existingLink._id.toString(),
        { parentId: id, studentId },
        req.ip
      );

      return res.status(200).json({
        success: true,
        message: 'Ward association successfully re-activated.',
        data: existingLink,
      });
    }

    const newLink = await ParentWard.create({
      parent: id,
      student: studentId,
      relationship: relationship || 'Guardian',
      isActive: true,
      assignedBy: req.user._id,
    });

    await createAuditLog(
      req.user._id,
      'ASSIGN_WARD',
      'ParentWard',
      newLink._id.toString(),
      { parentId: id, studentId, relationship },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Ward successfully assigned to parent account.',
      data: newLink,
    });
  } catch (error) {
    next(error);
  }
};

export const removeWard = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id, studentId } = req.params;

    const link = await ParentWard.findOne({ parent: id, student: studentId, isActive: true });
    if (!link) {
      throw new AppError('Active ward association not found.', 404);
    }

    link.isActive = false;
    await link.save();

    await createAuditLog(
      req.user._id,
      'REMOVE_WARD',
      'ParentWard',
      link._id.toString(),
      { parentId: id, studentId },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Ward association successfully deactivated. Parent access revoked.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetParentPassword = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parent = await User.findOne({ _id: id, role: 'PARENT' });
    if (!parent) throw new AppError('Parent record not found.', 404);

    const tempPassword = `Parent#${crypto.randomInt(100000, 999999)}`;
    parent.passwordHash = await bcrypt.hash(tempPassword, 10);
    await parent.save();

    await createAuditLog(
      req.user._id,
      'RESET_PARENT_PASSWORD',
      'User',
      parent._id.toString(),
      { action: 'Admin initiated password reset' },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Temporary password generated successfully.',
      data: {
        temporaryPassword: tempPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};
