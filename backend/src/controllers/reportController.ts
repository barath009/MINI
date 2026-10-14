import { Request, Response, NextFunction } from 'express';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { Student } from '../models/Student';
import { Department } from '../models/Department';

export const exportAttendanceReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { format, reportType, startDate, endDate, departmentId } = req.query;

    const query: any = {};
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const records = await AttendanceRecord.find(query)
      .populate({ path: 'studentId', populate: [{ path: 'userId' }, { path: 'departmentId' }] })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId' } })
      .populate('classroomId')
      .sort({ date: -1 });

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
