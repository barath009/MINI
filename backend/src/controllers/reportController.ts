import { Request, Response, NextFunction } from 'express';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { Student } from '../models/Student';
import { Department } from '../models/Department';

export const exportAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { format, reportType, startDate, endDate, date, departmentId, sectionId, status, subjectId } = req.query;

    const query: any = {};
    if (date) {
      const d = new Date(date as string);
      const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (subjectId && subjectId !== 'ALL') {
      query.subjectId = subjectId;
    }
    if (sectionId && sectionId !== 'ALL') {
      query.sectionId = sectionId;
    }
    if (departmentId && departmentId !== 'ALL') {
      const studentsInDept = await Student.find({ departmentId }).select('_id');
      query.studentId = { $in: studentsInDept.map((s) => s._id) };
    }

    const records = await AttendanceRecord.find(query)
      .populate({ path: 'studentId', populate: [{ path: 'userId' }, { path: 'departmentId' }, { path: 'sectionId' }] })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId' } })
      .populate('classroomId')
      .populate('deviceId')
      .populate('timetableId')
      .sort({ timestamp: -1 });

    if (format === 'csv') {
      let csv = 'Register Number,Student Name,Department,Subject,Faculty,Classroom,Date,Time,Status,Recognition Method\n';
      records.forEach((r: any) => {
        const sName = r.studentId?.userId?.name || 'N/A';
        const regNo = r.studentId?.registerNumber || 'N/A';
        const dept = r.studentId?.departmentId?.code || 'CSE';
        const sub = r.subjectId?.name || 'Subject';
        const fac = r.facultyId?.userId?.name || 'Faculty';
        const room = r.classroomId?.roomNumber || 'A204';
        const date = new Date(r.date).toISOString().split('T')[0];
        const time = new Date(r.timestamp).toLocaleTimeString();
        csv += `"${regNo}","${sName}","${dept}","${sub}","${fac}","${room}","${date}","${time}","${r.status}","${r.recognitionMethod}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=BIT_Attendance_Report_${Date.now()}.csv`);
      return res.status(200).send(csv);
    }

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};
