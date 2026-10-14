import { Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { ImportJob, IImportPreviewRow, IImportError } from '../models/ImportJob';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { Department } from '../models/Department';
import { Section } from '../models/Section';
import { Subject } from '../models/Subject';
import { ClassAllocation } from '../models/ClassAllocation';
import { AppError } from '../errors/AppError';
import { createAuditLog } from '../services/auditService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ROWS = 500;

function sanitizeCell(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  // Prevent formula injection
  if (['=', '+', '-', '@'].includes(s[0])) return "'" + s;
  return s;
}

function cellStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function generateBitsathyEmail(name: string, deptCode: string): string {
  // Format: name.dept@bitsathy.ac.in (all lowercase, dot separated, no spaces or special symbols)
  const cleanName = (name || 'student').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanDept = (deptCode || 'dept').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}.${cleanDept}@bitsathy.ac.in`;
}

function parseWorkbook(buffer: Buffer): XLSX.WorkBook {
  try {
    return XLSX.read(buffer, { type: 'buffer', cellText: true, cellDates: false });
  } catch {
    throw new AppError('Invalid or corrupted Excel/CSV file.', 400, 'INVALID_FILE');
  }
}

function sheetToRows(wb: XLSX.WorkBook, sheetName?: string): Record<string, any>[] {
  const name = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) throw new AppError(`Sheet "${name}" not found in uploaded file.`, 400, 'SHEET_NOT_FOUND');
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
}

function checkRequiredColumns(row: Record<string, any>, required: string[]): string[] {
  return required.filter(col => !(col in row));
}

// ─── Template Generation ───────────────────────────────────────────────────────

export const getStudentTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wb = XLSX.utils.book_new();

    const headers = ['student_id', 'register_number', 'student_name', 'email', 'phone', 'department_code', 'year', 'section_name', 'semester', 'academic_year'];
    const samples = [
      ['STU001', '7376241AD001', 'Arun Kumar', '', '9876543210', 'AIDS', '3', 'MZ-A', '5', '2026-2027'],
      ['STU002', '7376241AD002', 'Priya S', '', '9876543211', 'CSE', '2', 'CS-B', '3', '2026-2027'],
    ];
    const wsData = [headers, ...samples];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Force text format on ID/phone columns
    ['A', 'B', 'E'].forEach(col => {
      for (let r = 2; r <= 10; r++) {
        const cell = ws[`${col}${r}`];
        if (cell) cell.t = 's';
      }
    });
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    // Instructions sheet
    const instructions = [
      ['FIELD', 'REQUIRED', 'DESCRIPTION', 'EXAMPLE'],
      ['student_id', 'YES', 'Unique Primary Key (must not be empty, must be unique across system)', 'STU001'],
      ['register_number', 'YES', 'Institution Register Number starting with 7376 (e.g. 7376241AD001)', '7376241AD001'],
      ['student_name', 'YES', 'Full name of the student', 'Arun Kumar'],
      ['email', 'NO', 'Institutional Email. If empty, auto-generated as name.dept@bitsathy.ac.in', 'arunkumar.aids@bitsathy.ac.in'],
      ['phone', 'NO', 'Mobile number (kept as text)', '9876543210'],
      ['department_code', 'YES', 'Department code (e.g. AIDS, CSE, ECE, MECH)', 'AIDS'],
      ['year', 'YES', 'Year of study (1-4)', '3'],
      ['section_name', 'YES', 'Section name (e.g. MZ-A, CS-B)', 'MZ-A'],
      ['semester', 'YES', 'Current semester (1-8)', '5'],
      ['academic_year', 'YES', 'Academic year (e.g. 2026-2027)', '2026-2027'],
      ['', '', '', ''],
      ['NOTES', '', '', ''],
      ['- student_id is the primary unique identifier', '', '', ''],
      ['- register_number must start with 7376', '', '', ''],
      ['- If email is left empty, system auto-generates <name>.<dept>@bitsathy.ac.in', '', '', ''],
      ['- If a new Department or Section is specified, admin can review, rename, or confirm creation in preview', '', '', ''],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 55 }, { wch: 25 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="students_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
};

export const getFacultyTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wb = XLSX.utils.book_new();

    const headers = ['faculty_id', 'faculty_name', 'email', 'phone', 'department_code', 'designation'];
    const samples = [
      ['FAC001', 'Dr. Anand Kumar', '', '9876543212', 'AIDS', 'Assistant Professor'],
      ['FAC002', 'Dr. Priya M', '', '9876543213', 'CSE', 'Associate Professor'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...samples]);
    ['A', 'D'].forEach(col => {
      for (let r = 2; r <= 10; r++) {
        const cell = ws[`${col}${r}`];
        if (cell) cell.t = 's';
      }
    });
    ws['!cols'] = headers.map(() => ({ wch: 24 }));

    const instructions = [
      ['FIELD', 'REQUIRED', 'DESCRIPTION', 'EXAMPLE'],
      ['faculty_id', 'YES', 'Unique Primary Key (must not be empty, must be unique across system)', 'FAC001'],
      ['faculty_name', 'YES', 'Full name of the faculty member', 'Dr. Anand Kumar'],
      ['email', 'NO', 'Institutional Email. If empty, auto-generated as name.dept@bitsathy.ac.in', 'anandkumar.aids@bitsathy.ac.in'],
      ['phone', 'NO', 'Mobile number (kept as text)', '9876543212'],
      ['department_code', 'YES', 'Department code as in system', 'AIDS'],
      ['designation', 'NO', 'Academic designation', 'Assistant Professor'],
      ['', '', '', ''],
      ['- If a new Department is encountered, admin can review or rename before confirmation', '', '', ''],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 55 }, { wch: 25 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Faculty');
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="faculty_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
};

export const getAllocationTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wb = XLSX.utils.book_new();

    const headers = ['student_id', 'faculty_id', 'subject_code', 'section_name'];
    const samples = [
      ['STU001', 'FAC001', 'MA301', 'MZ-A'],
      ['STU002', 'FAC001', 'MA301', 'MZ-A'],
      ['STU001', 'FAC002', 'EC302', 'MZ-A'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...samples]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));

    const instructions = [
      ['FIELD', 'REQUIRED', 'DESCRIPTION'],
      ['student_id', 'YES', 'Must match an existing student_id in the system'],
      ['faculty_id', 'YES', 'Must match an existing faculty employee ID'],
      ['subject_code', 'YES', 'Must match an existing subject code'],
      ['section_name', 'YES', 'Section name in system'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 50 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Allocations');
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="allocation_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
};

export const getSubjectTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wb = XLSX.utils.book_new();

    const headers = ['subject_code', 'subject_name', 'department_code', 'year', 'semester', 'credits'];
    const samples = [
      ['MZ3501', 'Sensors and Signal Conditioning', 'MZ', '3', '5', '4'],
      ['MZ3502', 'Microcontrollers and Embedded Systems', 'MZ', '3', '5', '4'],
      ['CS501', 'Database Management Systems', 'CSE', '3', '5', '4'],
      ['IT302', 'Web Technologies', 'IT', '2', '3', '3'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...samples]);
    ws['!cols'] = headers.map(() => ({ wch: 26 }));

    const instructions = [
      ['FIELD', 'REQUIRED', 'DESCRIPTION', 'EXAMPLE'],
      ['subject_code', 'YES', 'Unique curriculum course code', 'MZ3501'],
      ['subject_name', 'YES', 'Full descriptive name of the subject', 'Sensors and Signal Conditioning'],
      ['department_code', 'YES', 'Engineering Department code (e.g. MZ, CSE, IT, ECE)', 'MZ'],
      ['year', 'NO', 'Year of study (1 to 4). Defaults based on semester if omitted', '3'],
      ['semester', 'YES', 'Curriculum semester number (1 to 8)', '5'],
      ['credits', 'NO', 'Course credit weight (defaults to 3 if omitted)', '4'],
      ['', '', '', ''],
      ['NOTES', '', '', ''],
      ['- subject_code must be unique across the institution curriculum', '', '', ''],
      ['- department_code must correspond to an active engineering department or alias', '', '', ''],
      ['- year corresponds to Year of Study (1 to 4)', '', '', ''],
      ['- If importing for a single department, you can select the target department in the upload screen', '', '', ''],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
    wsInstr['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 55 }, { wch: 30 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Subjects');
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="subjects_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
};

// ─── Student Import ────────────────────────────────────────────────────────────

export const previewStudentImport = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400, 'NO_FILE');

    const wb = parseWorkbook(req.file.buffer);
    const rawRows = sheetToRows(wb);

    if (rawRows.length === 0) throw new AppError('Uploaded file is empty.', 400, 'EMPTY_FILE');
    if (rawRows.length > MAX_ROWS) throw new AppError(`File exceeds maximum of ${MAX_ROWS} rows.`, 400, 'TOO_MANY_ROWS');

    const REQUIRED = ['student_id', 'register_number', 'student_name', 'department_code', 'year', 'section_name', 'semester', 'academic_year'];
    const missingCols = checkRequiredColumns(rawRows[0], REQUIRED);
    if (missingCols.length > 0) {
      throw new AppError(`Missing required columns: ${missingCols.join(', ')}`, 400, 'MISSING_COLUMNS');
    }

    // Pre-load DB lookup sets for validation
    const [departments, sections, existingUsers, existingStudents] = await Promise.all([
      Department.find({ status: 'ACTIVE' }),
      Section.find({ status: 'ACTIVE' }),
      User.find({ role: 'STUDENT' }, { email: 1 }),
      Student.find({}, { rollNumber: 1, registerNumber: 1 }),
    ]);

    // Build lookup maps supporting both code and name
    const deptMap = new Map<string, any>();
    departments.forEach(d => {
      deptMap.set(d.code.toUpperCase(), d._id);
      deptMap.set(d.name.toUpperCase(), d._id);
    });
    // Standard BIT engineering department aliases
    const deptAliases: Record<string, string> = {
      'MZ': 'MECH',
      'ME': 'MECH',
      'MECHANICAL': 'MECH',
      'CS': 'CSE',
      'COMPUTER SCIENCE': 'CSE',
      'EC': 'ECE',
      'ELECTRONICS': 'ECE',
      'EE': 'EEE',
      'ELECTRICAL': 'EEE',
      'AI': 'AIDS',
      'AI&DS': 'AIDS',
      'AI & DS': 'AIDS',
      'AI-DS': 'AIDS',
    };
    Object.entries(deptAliases).forEach(([alias, targetCode]) => {
      if (deptMap.has(targetCode)) {
        deptMap.set(alias, deptMap.get(targetCode));
      }
    });

    const sectionMap = new Map<string, any>();
    sections.forEach(s => {
      sectionMap.set(s.name.toUpperCase(), s);
      sectionMap.set(`${s.departmentId}_${s.name.toUpperCase()}`, s);
    });

    const dbEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const dbRegNums = new Set(existingStudents.map(s => s.registerNumber));
    const dbRollNums = new Set(existingStudents.map(s => s.rollNumber));

    // Within-file duplicate detection sets
    const fileEmails = new Set<string>();
    const fileRegNums = new Set<string>();
    const fileStudentIds = new Set<string>();

    const missingDepts = new Set<string>();
    const missingSecs = new Map<string, { name: string; deptCode: string }>();

    const previewRows: IImportPreviewRow[] = [];
    let validRows = 0, invalidRows = 0, duplicateRows = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2; // Excel row (1-indexed + header)
      const errors: string[] = [];

      const studentId   = cellStr(raw['student_id']);
      const regNum      = cellStr(raw['register_number']);
      const name        = cellStr(raw['student_name']);
      let email         = cellStr(raw['email']).toLowerCase();
      const phone       = cellStr(raw['phone']);
      const deptCode    = cellStr(raw['department_code']).toUpperCase();
      const year        = cellStr(raw['year']);
      const sectionName = cellStr(raw['section_name']).toUpperCase();
      const semester    = cellStr(raw['semester']);
      const acadYear    = cellStr(raw['academic_year']);

      // CONSTRAINT 1: Primary Key / No Null for Student ID
      if (!studentId) {
        errors.push('student_id is Primary Key and cannot be empty/null');
      }

      // CONSTRAINT 2: Register Number starting with 7376
      if (!regNum) {
        errors.push('register_number is required');
      } else if (!regNum.startsWith('7376')) {
        errors.push(`register_number "${regNum}" must start with 7376`);
      }

      // CONSTRAINT 3: Student Name
      if (!name) {
        errors.push('student_name is required');
      }

      // CONSTRAINT 4: Default Institutional Email (name+dept@bitsathy.ac.in)
      if (!email) {
        email = generateBitsathyEmail(name, deptCode);
      } else if (!EMAIL_RE.test(email)) {
        errors.push('email format is invalid');
      }

      // Other required fields
      if (!deptCode)    errors.push('department_code is required');
      if (!year)        errors.push('year is required');
      if (!sectionName) errors.push('section_name is required');
      if (!semester)    errors.push('semester is required');
      if (!acadYear)    errors.push('academic_year is required');

      if (year && (isNaN(+year) || +year < 1 || +year > 4)) errors.push('year must be 1–4');
      if (semester && (isNaN(+semester) || +semester < 1 || +semester > 8)) errors.push('semester must be 1–8');

      // CONSTRAINT 5: Department check & Section check
      const deptId = deptMap.get(deptCode);
      if (deptCode && !deptId) {
        missingDepts.add(deptCode);
      }

      if (sectionName) {
        const secKey = deptId ? `${deptId}_${sectionName}` : sectionName;
        if (!sectionMap.has(sectionName) && !sectionMap.has(secKey)) {
          const mapKey = `${deptCode}_${sectionName}`;
          if (!missingSecs.has(mapKey)) {
            missingSecs.set(mapKey, { name: sectionName, deptCode });
          }
        }
      }

      // CONSTRAINT 6: Uniqueness & Duplicates (Primary Key + DB integrity)
      let isDuplicate = false;
      if (studentId && fileStudentIds.has(studentId)) {
        errors.push(`Duplicate student_id "${studentId}" within uploaded file (Violates Primary Key)`);
        isDuplicate = true;
      }
      if (regNum && fileRegNums.has(regNum)) {
        errors.push(`Duplicate register_number "${regNum}" within uploaded file`);
        isDuplicate = true;
      }
      if (email && fileEmails.has(email)) {
        errors.push(`Duplicate email "${email}" within uploaded file`);
        isDuplicate = true;
      }
      if (studentId && dbRollNums.has(studentId)) {
        errors.push(`student_id "${studentId}" already exists in database (Primary Key collision)`);
        isDuplicate = true;
      }
      if (regNum && dbRegNums.has(regNum)) {
        errors.push(`register_number "${regNum}" already exists in database`);
        isDuplicate = true;
      }
      if (email && dbEmails.has(email)) {
        errors.push(`email "${email}" already exists in database`);
        isDuplicate = true;
      }

      if (studentId) fileStudentIds.add(studentId);
      if (regNum) fileRegNums.add(regNum);
      if (email) fileEmails.add(email);

      const status = isDuplicate ? 'DUPLICATE' : errors.length > 0 ? 'INVALID' : 'VALID';
      if (status === 'VALID') validRows++;
      else if (status === 'DUPLICATE') duplicateRows++;
      else invalidRows++;

      previewRows.push({
        rowNumber: rowNum,
        data: { studentId, regNum, name, email, phone, deptCode, year, sectionName, semester, acadYear },
        status,
        errors,
      });
    }

    const job = await ImportJob.create({
      importType: 'STUDENTS',
      uploadedFilename: req.file.originalname,
      uploadedBy: req.user._id,
      totalRows: rawRows.length,
      validRows,
      invalidRows,
      duplicateRows,
      importedRows: 0,
      skippedRows: 0,
      status: 'PREVIEW',
      previewData: previewRows,
      missingEntities: {
        departments: Array.from(missingDepts),
        sections: Array.from(missingSecs.values()),
      },
      rowErrors: previewRows
        .filter(r => r.status !== 'VALID')
        .flatMap(r => r.errors.map(msg => ({
          rowNumber: r.rowNumber,
          fieldName: 'row',
          errorCode: r.status,
          errorMessage: msg,
        }))),
    });

    res.status(200).json({
      success: true,
      data: {
        jobId: job._id,
        totalRows: rawRows.length,
        validRows,
        invalidRows,
        duplicateRows,
        previewRows,
        missingEntities: job.missingEntities,
      },
    });
  } catch (err) { next(err); }
};

export const confirmStudentImport = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { skipDuplicates = true, entityDecisions = {} } = req.body;
    // entityDecisions: {
    //   departments: { [rawDeptCode: string]: { action: 'CREATE' | 'MAP', targetCode?: string, name?: string } },
    //   sections: { [secName: string]: { action: 'CREATE' | 'MAP', targetName?: string } }
    // }

    const job = await ImportJob.findById(jobId);
    if (!job) throw new AppError('Import job not found.', 404, 'JOB_NOT_FOUND');
    if (job.status !== 'PREVIEW') throw new AppError('This import job has already been processed.', 400, 'JOB_ALREADY_PROCESSED');
    if (job.uploadedBy.toString() !== req.user._id.toString()) throw new AppError('You are not authorized to confirm this import job.', 403, 'FORBIDDEN');
    if (job.importType !== 'STUDENTS') throw new AppError('Job type mismatch.', 400, 'TYPE_MISMATCH');

    let departments = await Department.find({ status: 'ACTIVE' });
    let sections = await Section.find({ status: 'ACTIVE' });

    const deptMap = new Map<string, any>();
    departments.forEach(d => {
      deptMap.set(d.code.toUpperCase(), d._id);
      deptMap.set(d.name.toUpperCase(), d._id);
    });
    const deptAliases: Record<string, string> = {
      'MZ': 'MECH',
      'ME': 'MECH',
      'MECHANICAL': 'MECH',
      'CS': 'CSE',
      'COMPUTER SCIENCE': 'CSE',
      'EC': 'ECE',
      'ELECTRONICS': 'ECE',
      'EE': 'EEE',
      'ELECTRICAL': 'EEE',
      'AI': 'AIDS',
      'AI&DS': 'AIDS',
      'AI & DS': 'AIDS',
      'AI-DS': 'AIDS',
    };
    Object.entries(deptAliases).forEach(([alias, targetCode]) => {
      if (deptMap.has(targetCode)) {
        deptMap.set(alias, deptMap.get(targetCode));
      }
    });

    // 1. Process Department Decisions (Create new or map to renamed)
    if (entityDecisions?.departments) {
      for (const [rawCode, dec] of Object.entries<any>(entityDecisions.departments)) {
        if (dec.action === 'CREATE') {
          const newCode = (dec.targetCode || rawCode).trim().toUpperCase();
          const newName = (dec.name || newCode).trim();
          let dept = await Department.findOne({ code: newCode });
          if (!dept) {
            dept = await Department.create({ code: newCode, name: newName, status: 'ACTIVE' });
          }
          deptMap.set(rawCode.toUpperCase(), dept._id);
          deptMap.set(newCode, dept._id);
        } else if (dec.action === 'MAP' && dec.targetCode) {
          const existingTargetId = deptMap.get(dec.targetCode.toUpperCase());
          if (existingTargetId) {
            deptMap.set(rawCode.toUpperCase(), existingTargetId);
          }
        }
      }
    }

    const sectionMap = new Map<string, any>();
    sections.forEach(s => {
      sectionMap.set(s.name.toUpperCase(), s._id);
      sectionMap.set(`${s.departmentId}_${s.name.toUpperCase()}`, s._id);
    });

    const rowsToImport = job.previewData.filter(r =>
      r.status === 'VALID' || (skipDuplicates && r.status !== 'INVALID')
    ).filter(r => r.status === 'VALID');

    let importedRows = 0;
    const failedRows: number[] = [];

    for (const row of rowsToImport) {
      try {
        const { studentId, regNum, name, email, phone, deptCode, year, sectionName, semester, acadYear } = row.data;
        const deptId = deptMap.get(deptCode.toUpperCase());
        if (!deptId) { failedRows.push(row.rowNumber); continue; }

        // Find or create section with respect to sectionDecisions
        let actualSectionName = sectionName.toUpperCase();
        if (entityDecisions?.sections?.[actualSectionName]?.targetName) {
          actualSectionName = entityDecisions.sections[actualSectionName].targetName.trim().toUpperCase();
        }

        let sectionId = sectionMap.get(`${deptId}_${actualSectionName}`) || sectionMap.get(actualSectionName);
        if (!sectionId) {
          // If admin approved creation or section is scheduled
          const newSection = await Section.create({
            name: actualSectionName,
            departmentId: deptId,
            year: +year || 1,
            semester: +semester || 1,
            academicYear: acadYear || '2026-2027',
            status: 'ACTIVE',
          });
          sectionId = newSection._id;
          sectionMap.set(`${deptId}_${actualSectionName}`, sectionId);
          sectionMap.set(actualSectionName, sectionId);
        }

        const finalEmail = (email && EMAIL_RE.test(email))
          ? email.toLowerCase()
          : generateBitsathyEmail(name, deptCode);

        const defaultPassword = `${name.split(' ')[0]}@BIT2025`;
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        const user = await User.create({
          name,
          email: finalEmail,
          passwordHash,
          role: 'STUDENT',
          phone: phone || undefined,
          status: 'ACTIVE',
        });

        await Student.create({
          userId: user._id,
          rollNumber: studentId,
          registerNumber: regNum,
          departmentId: deptId,
          sectionId,
          year: +year,
          semester: +semester,
          academicYear: acadYear,
          biometricStatus: 'PENDING',
          status: 'ACTIVE',
        });

        importedRows++;
      } catch (e: any) {
        if (e.code !== 11000) failedRows.push(row.rowNumber);
      }
    }

    job.importedRows = importedRows;
    job.skippedRows = job.duplicateRows;
    job.status = 'COMPLETED';
    job.completedAt = new Date();
    await job.save();

    await createAuditLog(req.user._id, 'BULK_IMPORT_STUDENTS', 'ImportJob', job._id.toString(), {
      importedRows, totalRows: job.totalRows, skippedRows: job.skippedRows,
    }, req.ip);

    res.status(200).json({
      success: true,
      message: `Import completed. ${importedRows} students imported successfully.`,
      data: {
        totalRows: job.totalRows,
        importedRows,
        skippedRows: job.skippedRows,
        invalidRows: job.invalidRows,
        duplicateRows: job.duplicateRows,
        failedRows,
        biometricPending: importedRows,
      },
    });
  } catch (err) { next(err); }
};

// ─── Faculty Import ────────────────────────────────────────────────────────────

export const previewFacultyImport = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400, 'NO_FILE');

    const wb = parseWorkbook(req.file.buffer);
    const rawRows = sheetToRows(wb);

    if (rawRows.length === 0) throw new AppError('Uploaded file is empty.', 400, 'EMPTY_FILE');
    if (rawRows.length > MAX_ROWS) throw new AppError(`File exceeds maximum of ${MAX_ROWS} rows.`, 400, 'TOO_MANY_ROWS');

    const REQUIRED = ['faculty_id', 'faculty_name', 'email', 'department_code'];
    const missingCols = checkRequiredColumns(rawRows[0], REQUIRED);
    if (missingCols.length > 0) throw new AppError(`Missing required columns: ${missingCols.join(', ')}`, 400, 'MISSING_COLUMNS');

    const [departments, existingUsers, existingFaculty] = await Promise.all([
      Department.find({ status: 'ACTIVE' }),
      User.find({ role: 'FACULTY' }, { email: 1 }),
      Faculty.find({}, { employeeId: 1 }),
    ]);

    // Build lookup maps supporting both code and name
    const deptMap = new Map<string, any>();
    departments.forEach(d => {
      deptMap.set(d.code.toUpperCase(), d._id);
      deptMap.set(d.name.toUpperCase(), d._id);
    });
    const deptAliases: Record<string, string> = {
      'MZ': 'MECH',
      'ME': 'MECH',
      'MECHANICAL': 'MECH',
      'CS': 'CSE',
      'COMPUTER SCIENCE': 'CSE',
      'EC': 'ECE',
      'ELECTRONICS': 'ECE',
      'EE': 'EEE',
      'ELECTRICAL': 'EEE',
      'AI': 'AIDS',
      'AI&DS': 'AIDS',
      'AI & DS': 'AIDS',
      'AI-DS': 'AIDS',
    };
    Object.entries(deptAliases).forEach(([alias, targetCode]) => {
      if (deptMap.has(targetCode)) {
        deptMap.set(alias, deptMap.get(targetCode));
      }
    });

    const dbEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const dbEmpIds = new Set(existingFaculty.map(f => f.employeeId));

    const fileEmails = new Set<string>();
    const fileFacIds = new Set<string>();

    const missingDepts = new Set<string>();
    const previewRows: IImportPreviewRow[] = [];
    let validRows = 0, invalidRows = 0, duplicateRows = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2;
      const errors: string[] = [];

      const facultyId   = cellStr(raw['faculty_id']);
      const name        = cellStr(raw['faculty_name']);
      let email         = cellStr(raw['email']).toLowerCase();
      const phone       = cellStr(raw['phone']);
      const deptCode    = cellStr(raw['department_code']).toUpperCase();
      const designation = cellStr(raw['designation']);

      // CONSTRAINT 1: Primary key / No null on faculty_id
      if (!facultyId)  errors.push('faculty_id is Primary Key and cannot be empty/null');
      if (!name)       errors.push('faculty_name is required');

      // CONSTRAINT 2: Default institutional email
      if (!email) {
        email = generateBitsathyEmail(name, deptCode);
      } else if (!EMAIL_RE.test(email)) {
        errors.push('email format is invalid');
      }

      if (!deptCode)   errors.push('department_code is required');
      
      const deptId = deptMap.get(deptCode);
      if (deptCode && !deptId) {
        missingDepts.add(deptCode);
      }

      let isDuplicate = false;
      if (facultyId && fileFacIds.has(facultyId)) {
        errors.push(`Duplicate faculty_id "${facultyId}" within uploaded file (Violates Primary Key)`);
        isDuplicate = true;
      }
      if (email && fileEmails.has(email)) {
        errors.push(`Duplicate email "${email}" within uploaded file`);
        isDuplicate = true;
      }
      if (facultyId && dbEmpIds.has(facultyId)) {
        errors.push(`faculty_id "${facultyId}" already exists in database (Primary Key collision)`);
        isDuplicate = true;
      }
      if (email && dbEmails.has(email)) {
        errors.push(`email "${email}" already exists in database`);
        isDuplicate = true;
      }

      if (facultyId) fileFacIds.add(facultyId);
      if (email) fileEmails.add(email);

      const status = isDuplicate ? 'DUPLICATE' : errors.length > 0 ? 'INVALID' : 'VALID';
      if (status === 'VALID') validRows++;
      else if (status === 'DUPLICATE') duplicateRows++;
      else invalidRows++;

      previewRows.push({
        rowNumber: rowNum,
        data: { facultyId, name, email, phone, deptCode, designation },
        status,
        errors,
      });
    }

    const job = await ImportJob.create({
      importType: 'FACULTY',
      uploadedFilename: req.file.originalname,
      uploadedBy: req.user._id,
      totalRows: rawRows.length,
      validRows, invalidRows, duplicateRows,
      importedRows: 0, skippedRows: 0,
      status: 'PREVIEW',
      previewData: previewRows,
      missingEntities: {
        departments: Array.from(missingDepts),
        sections: [],
      },
      rowErrors: previewRows.filter(r => r.status !== 'VALID').flatMap(r =>
        r.errors.map(msg => ({ rowNumber: r.rowNumber, fieldName: 'row', errorCode: r.status, errorMessage: msg }))
      ),
    });

    res.status(200).json({
      success: true,
      data: {
        jobId: job._id,
        totalRows: rawRows.length,
        validRows,
        invalidRows,
        duplicateRows,
        previewRows,
        missingEntities: job.missingEntities,
      },
    });
  } catch (err) { next(err); }
};

export const confirmFacultyImport = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { entityDecisions = {} } = req.body;

    const job = await ImportJob.findById(jobId);
    if (!job) throw new AppError('Import job not found.', 404, 'JOB_NOT_FOUND');
    if (job.status !== 'PREVIEW') throw new AppError('This import job has already been processed.', 400, 'JOB_ALREADY_PROCESSED');
    if (job.uploadedBy.toString() !== req.user._id.toString()) throw new AppError('Unauthorized to confirm this job.', 403, 'FORBIDDEN');
    if (job.importType !== 'FACULTY') throw new AppError('Job type mismatch.', 400, 'TYPE_MISMATCH');

    let departments = await Department.find({ status: 'ACTIVE' });
    const deptMap = new Map<string, any>();
    departments.forEach(d => {
      deptMap.set(d.code.toUpperCase(), d._id);
      deptMap.set(d.name.toUpperCase(), d._id);
    });
    const deptAliases: Record<string, string> = {
      'MZ': 'MECH',
      'ME': 'MECH',
      'MECHANICAL': 'MECH',
      'CS': 'CSE',
      'COMPUTER SCIENCE': 'CSE',
      'EC': 'ECE',
      'ELECTRONICS': 'ECE',
      'EE': 'EEE',
      'ELECTRICAL': 'EEE',
      'AI': 'AIDS',
      'AI&DS': 'AIDS',
      'AI & DS': 'AIDS',
      'AI-DS': 'AIDS',
    };
    Object.entries(deptAliases).forEach(([alias, targetCode]) => {
      if (deptMap.has(targetCode)) {
        deptMap.set(alias, deptMap.get(targetCode));
      }
    });

    // Handle department decisions
    if (entityDecisions?.departments) {
      for (const [rawCode, dec] of Object.entries<any>(entityDecisions.departments)) {
        if (dec.action === 'CREATE') {
          const newCode = (dec.targetCode || rawCode).trim().toUpperCase();
          const newName = (dec.name || newCode).trim();
          let dept = await Department.findOne({ code: newCode });
          if (!dept) {
            dept = await Department.create({ code: newCode, name: newName, status: 'ACTIVE' });
          }
          deptMap.set(rawCode.toUpperCase(), dept._id);
          deptMap.set(newCode, dept._id);
        } else if (dec.action === 'MAP' && dec.targetCode) {
          const existingTargetId = deptMap.get(dec.targetCode.toUpperCase());
          if (existingTargetId) {
            deptMap.set(rawCode.toUpperCase(), existingTargetId);
          }
        }
      }
    }

    const rowsToImport = job.previewData.filter(r => r.status === 'VALID');
    let importedRows = 0;
    const failedRows: number[] = [];

    for (const row of rowsToImport) {
      try {
        const { facultyId, name, email, phone, deptCode, designation } = row.data;
        const deptId = deptMap.get(deptCode.toUpperCase());
        if (!deptId) { failedRows.push(row.rowNumber); continue; }

        const finalEmail = (email && EMAIL_RE.test(email))
          ? email.toLowerCase()
          : generateBitsathyEmail(name, deptCode);

        const defaultPassword = `${name.split(' ').pop()}@BIT2025`;
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        const user = await User.create({
          name,
          email: finalEmail,
          passwordHash,
          role: 'FACULTY',
          phone: phone || undefined,
          status: 'ACTIVE',
        });

        await Faculty.create({
          userId: user._id,
          employeeId: facultyId,
          departmentId: deptId,
          designation: designation || 'Assistant Professor',
          status: 'ACTIVE',
        });

        importedRows++;
      } catch (e: any) {
        if (e.code !== 11000) failedRows.push(row.rowNumber);
      }
    }

    job.importedRows = importedRows;
    job.skippedRows = job.duplicateRows;
    job.status = 'COMPLETED';
    job.completedAt = new Date();
    await job.save();

    await createAuditLog(req.user._id, 'BULK_IMPORT_FACULTY', 'ImportJob', job._id.toString(), {
      importedRows, totalRows: job.totalRows,
    }, req.ip);

    res.status(200).json({
      success: true,
      message: `Import completed. ${importedRows} faculty members imported.`,
      data: { totalRows: job.totalRows, importedRows, skippedRows: job.skippedRows, invalidRows: job.invalidRows, duplicateRows: job.duplicateRows, failedRows },
    });
  } catch (err) { next(err); }
};

// ─── Allocation Import ─────────────────────────────────────────────────────────

export const previewAllocationImport = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400, 'NO_FILE');

    const wb = parseWorkbook(req.file.buffer);
    const rawRows = sheetToRows(wb);
    if (rawRows.length === 0) throw new AppError('Uploaded file is empty.', 400, 'EMPTY_FILE');
    if (rawRows.length > MAX_ROWS) throw new AppError(`File exceeds maximum of ${MAX_ROWS} rows.`, 400, 'TOO_MANY_ROWS');

    const REQUIRED = ['student_id', 'faculty_id', 'subject_code', 'section_name'];
    const missingCols = checkRequiredColumns(rawRows[0], REQUIRED);
    if (missingCols.length > 0) throw new AppError(`Missing required columns: ${missingCols.join(', ')}`, 400, 'MISSING_COLUMNS');

    const [students, faculty, subjects, sections, existingAllocations] = await Promise.all([
      Student.find({}, { rollNumber: 1 }),
      Faculty.find({}, { employeeId: 1 }),
      Subject.find({}, { code: 1 }),
      Section.find({ status: 'ACTIVE' }, { name: 1 }),
      ClassAllocation.find({}, { studentId: 1, facultyId: 1, sectionId: 1 }),
    ]);

    const studentMap = new Map(students.map(s => [s.rollNumber, s._id]));
    const facultyMap = new Map(faculty.map(f => [f.employeeId, f._id]));
    const subjectMap = new Map(subjects.map(s => [(s as any).code?.toUpperCase(), s._id]));
    const sectionMap = new Map(sections.map(s => [s.name.toUpperCase(), s._id]));
    const existingAllocSet = new Set(existingAllocations.map(a => `${a.studentId}_${a.facultyId}_${a.sectionId}`));

    const fileAllocSet = new Set<string>();
    const previewRows: IImportPreviewRow[] = [];
    let validRows = 0, invalidRows = 0, duplicateRows = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2;
      const errors: string[] = [];

      const studentId   = cellStr(raw['student_id']);
      const facultyId   = cellStr(raw['faculty_id']);
      const subjectCode = cellStr(raw['subject_code']).toUpperCase();
      const sectionName = cellStr(raw['section_name']).toUpperCase();

      if (!studentId)   errors.push('student_id is required');
      if (!facultyId)   errors.push('faculty_id is required');
      if (!subjectCode) errors.push('subject_code is required');
      if (!sectionName) errors.push('section_name is required');

      const stId   = studentId ? studentMap.get(studentId) : undefined;
      const facId  = facultyId ? facultyMap.get(facultyId) : undefined;
      const secId  = sectionName ? sectionMap.get(sectionName) : undefined;
      const subId  = subjectCode ? subjectMap.get(subjectCode) : undefined;

      if (studentId && !stId)   errors.push(`student_id "${studentId}" not found in system`);
      if (facultyId && !facId)  errors.push(`faculty_id "${facultyId}" not found in system`);
      if (subjectCode && !subId) errors.push(`subject_code "${subjectCode}" not found in system`);
      if (sectionName && !secId) errors.push(`section_name "${sectionName}" not found in system`);

      let isDuplicate = false;
      if (stId && facId && secId) {
        const key = `${stId}_${facId}_${secId}`;
        if (fileAllocSet.has(key)) { errors.push('Duplicate allocation within file'); isDuplicate = true; }
        else if (existingAllocSet.has(key)) { errors.push('Allocation already exists in database'); isDuplicate = true; }
        else fileAllocSet.add(key);
      }

      const status = isDuplicate ? 'DUPLICATE' : errors.length > 0 ? 'INVALID' : 'VALID';
      if (status === 'VALID') validRows++;
      else if (status === 'DUPLICATE') duplicateRows++;
      else invalidRows++;

      previewRows.push({
        rowNumber: rowNum,
        data: { studentId, facultyId, subjectCode, sectionName },
        status,
        errors,
      });
    }

    const job = await ImportJob.create({
      importType: 'ALLOCATIONS',
      uploadedFilename: req.file.originalname,
      uploadedBy: req.user._id,
      totalRows: rawRows.length,
      validRows, invalidRows, duplicateRows,
      importedRows: 0, skippedRows: 0,
      status: 'PREVIEW',
      previewData: previewRows,
      rowErrors: previewRows.filter(r => r.status !== 'VALID').flatMap(r =>
        r.errors.map(msg => ({ rowNumber: r.rowNumber, fieldName: 'row', errorCode: r.status, errorMessage: msg }))
      ),
    });

    res.status(200).json({
      success: true,
      data: { jobId: job._id, totalRows: rawRows.length, validRows, invalidRows, duplicateRows, previewRows },
    });
  } catch (err) { next(err); }
};

export const confirmAllocationImport = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    const job = await ImportJob.findById(jobId);
    if (!job) throw new AppError('Import job not found.', 404, 'JOB_NOT_FOUND');
    if (job.status !== 'PREVIEW') throw new AppError('Already processed.', 400, 'JOB_ALREADY_PROCESSED');
    if (job.uploadedBy.toString() !== req.user._id.toString()) throw new AppError('Unauthorized.', 403, 'FORBIDDEN');
    if (job.importType !== 'ALLOCATIONS') throw new AppError('Job type mismatch.', 400, 'TYPE_MISMATCH');

    const [students, faculty, subjects, sections] = await Promise.all([
      Student.find({}, { rollNumber: 1 }),
      Faculty.find({}, { employeeId: 1 }),
      Subject.find({}, { code: 1 }),
      Section.find({ status: 'ACTIVE' }, { name: 1 }),
    ]);

    const studentMap = new Map(students.map(s => [s.rollNumber, s._id]));
    const facultyMap = new Map(faculty.map(f => [f.employeeId, f._id]));
    const subjectMap = new Map(subjects.map(s => [(s as any).code?.toUpperCase(), s._id]));
    const sectionMap = new Map(sections.map(s => [s.name.toUpperCase(), s._id]));

    const validRows = job.previewData.filter(r => r.status === 'VALID');
    let importedRows = 0;

    for (const row of validRows) {
      try {
        const stId  = studentMap.get(row.data.studentId);
        const facId = facultyMap.get(row.data.facultyId);
        const secId = sectionMap.get(row.data.sectionName?.toUpperCase());
        const subId = subjectMap.get(row.data.subjectCode?.toUpperCase());

        if (!stId || !facId || !secId) continue;

        await ClassAllocation.create({
          studentId: stId,
          facultyId: facId,
          sectionId: secId,
          subjectId: subId,
          status: 'ACTIVE',
        });
        importedRows++;
      } catch (e: any) {
        if (e.code !== 11000) console.error('Allocation insert error:', e.message);
      }
    }

    job.importedRows = importedRows;
    job.skippedRows = job.duplicateRows;
    job.status = 'COMPLETED';
    job.completedAt = new Date();
    await job.save();

    await createAuditLog(req.user._id, 'BULK_IMPORT_ALLOCATIONS', 'ImportJob', job._id.toString(), { importedRows }, req.ip);

    res.status(200).json({
      success: true,
      message: `${importedRows} allocations imported successfully.`,
      data: { totalRows: job.totalRows, importedRows, skippedRows: job.skippedRows, invalidRows: job.invalidRows },
    });
  } catch (err) { next(err); }
};

// ─── Subject Import ────────────────────────────────────────────────────────────

export const previewSubjectImport = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400, 'NO_FILE');

    const wb = parseWorkbook(req.file.buffer);
    const rawRows = sheetToRows(wb);

    if (rawRows.length === 0) throw new AppError('Uploaded file is empty.', 400, 'EMPTY_FILE');
    if (rawRows.length > MAX_ROWS) throw new AppError(`File exceeds maximum of ${MAX_ROWS} rows.`, 400, 'TOO_MANY_ROWS');

    const defaultDeptId = req.body.defaultDepartmentId;
    const REQUIRED = ['subject_code', 'subject_name'];
    const missingCols = checkRequiredColumns(rawRows[0], REQUIRED);
    if (missingCols.length > 0) {
      throw new AppError(`Missing required columns: ${missingCols.join(', ')}`, 400, 'MISSING_COLUMNS');
    }

    const [departments, existingSubjects] = await Promise.all([
      Department.find({ status: 'ACTIVE' }),
      Subject.find({}, { code: 1, name: 1, departmentId: 1 }),
    ]);

    const deptMap = new Map<string, any>();
    departments.forEach(d => {
      deptMap.set(d.code.toUpperCase(), d._id);
      deptMap.set(d.name.toUpperCase(), d._id);
    });
    const deptAliases: Record<string, string> = {
      'MZ': 'MECH',
      'ME': 'MECH',
      'CS': 'CSE',
      'EC': 'ECE',
      'EE': 'EEE',
      'AI': 'AIDS',
      'AI&DS': 'AIDS',
    };
    Object.entries(deptAliases).forEach(([alias, targetCode]) => {
      if (deptMap.has(targetCode)) {
        deptMap.set(alias, deptMap.get(targetCode));
      }
    });

    const defaultDept = defaultDeptId ? departments.find(d => d._id.toString() === defaultDeptId.toString()) : null;

    const existingCodeMap = new Map<string, any>();
    existingSubjects.forEach(s => {
      existingCodeMap.set(s.code.toUpperCase(), s);
    });

    const fileCodes = new Set<string>();
    const previewRows: IImportPreviewRow[] = [];
    const rowErrors: IImportError[] = [];
    const missingDepts = new Set<string>();

    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2;
      const errors: string[] = [];

      const code = cellStr(row.subject_code || row.code || row.Course_Code || row['Course Code']).toUpperCase();
      const name = cellStr(row.subject_name || row.name || row.Course_Name || row['Course Name']);
      let deptCode = cellStr(row.department_code || row.department || row.dept || row.Department).toUpperCase();
      const semesterStr = cellStr(row.semester || row.sem || row.Semester);
      const creditsStr = cellStr(row.credits || row.Credits);

      if (!code) {
        errors.push('subject_code is required');
        rowErrors.push({ rowNumber: rowNum, fieldName: 'subject_code', errorCode: 'REQUIRED_FIELD', errorMessage: 'Subject code is required.' });
      }

      if (!name) {
        errors.push('subject_name is required');
        rowErrors.push({ rowNumber: rowNum, fieldName: 'subject_name', errorCode: 'REQUIRED_FIELD', errorMessage: 'Subject name is required.' });
      }

      let resolvedDeptId: any = null;
      if (deptCode) {
        resolvedDeptId = deptMap.get(deptCode);
        if (!resolvedDeptId) {
          missingDepts.add(deptCode);
          errors.push(`department_code "${deptCode}" not recognized in system`);
          rowErrors.push({ rowNumber: rowNum, fieldName: 'department_code', errorCode: 'INVALID_DEPARTMENT', errorMessage: `Department "${deptCode}" not recognized.`, rawValue: deptCode });
        }
      } else if (defaultDept) {
        resolvedDeptId = defaultDept._id;
        deptCode = defaultDept.code;
      } else {
        errors.push('department_code is required');
        rowErrors.push({ rowNumber: rowNum, fieldName: 'department_code', errorCode: 'REQUIRED_FIELD', errorMessage: 'Department code is required.' });
      }

      let semester = 1;
      if (semesterStr) {
        semester = parseInt(semesterStr, 10);
        if (isNaN(semester) || semester < 1 || semester > 8) {
          errors.push('semester must be between 1 and 8');
          rowErrors.push({ rowNumber: rowNum, fieldName: 'semester', errorCode: 'INVALID_SEMESTER', errorMessage: 'Semester must be between 1 and 8.', rawValue: semesterStr });
        }
      }

      const yearStr = cellStr(row.year || row.Year || row.year_of_study || row['Year of Study']);
      let year = Math.ceil(semester / 2) || 1;
      if (yearStr) {
        const parsedYear = parseInt(yearStr, 10);
        if (!isNaN(parsedYear) && parsedYear >= 1 && parsedYear <= 4) {
          year = parsedYear;
        }
      }

      let credits = 3;
      if (creditsStr) {
        credits = parseInt(creditsStr, 10);
        if (isNaN(credits) || credits < 1 || credits > 10) {
          credits = 3;
        }
      }

      let isDuplicate = false;
      if (code) {
        if (fileCodes.has(code)) {
          isDuplicate = true;
          errors.push(`Duplicate subject_code "${code}" within uploaded file.`);
          rowErrors.push({ rowNumber: rowNum, fieldName: 'subject_code', errorCode: 'FILE_DUPLICATE', errorMessage: `Duplicate subject code "${code}" in file.`, rawValue: code });
        } else if (existingCodeMap.has(code)) {
          isDuplicate = true;
          errors.push(`Subject code "${code}" already exists in system (will update on confirm).`);
        }
        fileCodes.add(code);
      }

      let status: 'VALID' | 'INVALID' | 'DUPLICATE' | 'WARNING' = 'VALID';
      if (errors.some(e => !e.includes('already exists in system'))) {
        status = 'INVALID';
        invalidCount++;
      } else if (isDuplicate) {
        status = 'DUPLICATE';
        duplicateCount++;
      } else {
        validCount++;
      }

      previewRows.push({
        rowNumber: rowNum,
        data: {
          subject_code: code,
          subject_name: name,
          department_code: deptCode,
          departmentId: resolvedDeptId,
          year,
          semester,
          credits,
        },
        status,
        errors,
      });
    }

    const job = await ImportJob.create({
      importType: 'SUBJECTS',
      uploadedFilename: req.file.originalname,
      uploadedBy: req.user._id,
      totalRows: rawRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      duplicateRows: duplicateCount,
      importedRows: 0,
      skippedRows: 0,
      status: 'PREVIEW',
      rowErrors,
      previewData: previewRows,
      missingEntities: {
        departments: Array.from(missingDepts),
        sections: [],
      },
    });

    res.status(200).json({
      success: true,
      data: {
        jobId: job._id,
        summary: {
          totalRows: rawRows.length,
          validRows: validCount,
          invalidRows: invalidCount,
          duplicateRows: duplicateCount,
        },
        previewRows,
        missingEntities: {
          departments: Array.from(missingDepts),
          sections: [],
        },
      },
    });
  } catch (err) { next(err); }
};

export const confirmSubjectImport = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { deptDecisions = {}, skipDuplicates = false } = req.body;

    const job = await ImportJob.findById(jobId);
    if (!job) throw new AppError('Import job not found.', 404, 'JOB_NOT_FOUND');
    if (job.status !== 'PREVIEW') throw new AppError('Import job is not in preview state.', 400, 'INVALID_STATE');

    const deptMap = new Map<string, any>();
    const departments = await Department.find({ status: 'ACTIVE' });
    departments.forEach(d => deptMap.set(d.code.toUpperCase(), d._id));

    for (const [deptCode, dec] of Object.entries<any>(deptDecisions)) {
      if (dec.action === 'CREATE') {
        const newDept = await Department.create({
          code: deptCode.toUpperCase(),
          name: dec.name || deptCode,
        });
        deptMap.set(deptCode.toUpperCase(), newDept._id);
      } else if (dec.action === 'MAP' && dec.targetCode) {
        const targetId = deptMap.get(dec.targetCode.toUpperCase());
        if (targetId) deptMap.set(deptCode.toUpperCase(), targetId);
      }
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of job.previewData) {
      if (row.status === 'INVALID') {
        skippedCount++;
        continue;
      }

      if (row.status === 'DUPLICATE' && skipDuplicates) {
        skippedCount++;
        continue;
      }

      const d = row.data;
      let targetDeptId = d.departmentId;
      if (!targetDeptId && d.department_code) {
        targetDeptId = deptMap.get(d.department_code.toUpperCase());
      }

      if (!targetDeptId) {
        skippedCount++;
        continue;
      }

      await Subject.findOneAndUpdate(
        { code: d.subject_code.toUpperCase() },
        {
          code: d.subject_code.toUpperCase(),
          name: d.subject_name,
          departmentId: targetDeptId,
          year: d.year || Math.ceil((d.semester || 1) / 2),
          semester: d.semester || 1,
          credits: d.credits || 3,
          status: 'ACTIVE',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      importedCount++;
    }

    job.status = 'COMPLETED';
    job.importedRows = importedCount;
    job.skippedRows = skippedCount;
    job.completedAt = new Date();
    await job.save();

    await createAuditLog(
      req.user._id,
      'IMPORT_SUBJECTS',
      'Subject',
      job._id.toString(),
      { total: job.totalRows, imported: importedCount, skipped: skippedCount },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: `${importedCount} curriculum subjects imported successfully.`,
      data: {
        totalRows: job.totalRows,
        importedRows: importedCount,
        skippedRows: skippedCount,
      },
    });
  } catch (err) { next(err); }
};

// ─── Export ────────────────────────────────────────────────────────────────────

export const exportStudents = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { department, year, section, status = 'ACTIVE', format = 'xlsx' } = req.query;

    const query: any = {};
    if (status) query['status'] = status;
    if (year) query['year'] = +year;

    const students = await Student.find(query)
      .populate('userId', 'name email phone status')
      .populate('departmentId', 'name code')
      .populate('sectionId', 'name');

    const rows = students.map(s => {
      const u = s.userId as any;
      const d = s.departmentId as any;
      const sec = s.sectionId as any;
      return {
        'Roll Number':      sanitizeCell(s.rollNumber),
        'Register Number':  sanitizeCell(s.registerNumber),
        'Student Name':     sanitizeCell(u?.name),
        'Email':            sanitizeCell(u?.email),
        'Phone':            sanitizeCell(u?.phone),
        'Department':       sanitizeCell(d?.name),
        'Department Code':  sanitizeCell(d?.code),
        'Year':             sanitizeCell(s.year),
        'Semester':         sanitizeCell(s.semester),
        'Section':          sanitizeCell(sec?.name),
        'Academic Year':    sanitizeCell(s.academicYear),
        'Biometric Status': sanitizeCell(s.biometricStatus),
        'Account Status':   sanitizeCell(u?.status),
        'Enrolled On':      s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString() : '',
      };
    });

    await createAuditLog(req.user._id, 'EXPORT_STUDENTS', 'Student', 'bulk', { count: rows.length }, req.ip);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="students_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
};

export const exportFaculty = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { format = 'xlsx' } = req.query;

    const faculty = await Faculty.find()
      .populate('userId', 'name email phone status')
      .populate('departmentId', 'name code');

    const rows = faculty.map(f => {
      const u = f.userId as any;
      const d = f.departmentId as any;
      return {
        'Employee ID':    sanitizeCell(f.employeeId),
        'Faculty Name':   sanitizeCell(u?.name),
        'Email':          sanitizeCell(u?.email),
        'Phone':          sanitizeCell(u?.phone),
        'Department':     sanitizeCell(d?.name),
        'Department Code':sanitizeCell(d?.code),
        'Designation':    sanitizeCell(f.designation),
        'Status':         sanitizeCell(f.status),
      };
    });

    await createAuditLog(req.user._id, 'EXPORT_FACULTY', 'Faculty', 'bulk', { count: rows.length }, req.ip);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Disposition', 'attachment; filename="faculty_export.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="faculty_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
};

export const exportSubjects = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { department, format = 'xlsx' } = req.query;
    const query: any = {};
    if (department && department !== 'ALL') {
      const deptDoc = await Department.findOne({
        $or: [{ code: department.toUpperCase() }, { _id: department }],
      });
      if (deptDoc) query.departmentId = deptDoc._id;
    }

    const subjects = await Subject.find(query).populate('departmentId', 'name code').sort({ code: 1 });
    const rows = subjects.map(s => {
      const d = s.departmentId as any;
      return {
        'Subject Code': sanitizeCell(s.code),
        'Subject Name': sanitizeCell(s.name),
        'Department': sanitizeCell(d?.name),
        'Department Code': sanitizeCell(d?.code),
        'Semester': s.semester,
        'Credits': s.credits,
        'Status': s.status,
      };
    });

    await createAuditLog(req.user._id, 'EXPORT_SUBJECTS', 'Subject', 'bulk', { count: rows.length }, req.ip);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 25 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Subjects');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Disposition', 'attachment; filename="subjects_export.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="subjects_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
};

// ─── History & Error Report ────────────────────────────────────────────────────

export const getImportHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const jobs = await ImportJob.find()
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-previewData -rowErrors');

    res.status(200).json({ success: true, data: jobs });
  } catch (err) { next(err); }
};

export const getImportJobDetail = async (req: any, res: Response, next: NextFunction) => {
  try {
    const job = await ImportJob.findById(req.params.jobId)
      .populate('uploadedBy', 'name email');
    if (!job) throw new AppError('Import job not found.', 404, 'JOB_NOT_FOUND');
    res.status(200).json({ success: true, data: job });
  } catch (err) { next(err); }
};

export const downloadErrorReport = async (req: any, res: Response, next: NextFunction) => {
  try {
    const job = await ImportJob.findById(req.params.jobId);
    if (!job) throw new AppError('Import job not found.', 404, 'JOB_NOT_FOUND');

    const errorRows = job.previewData.filter(r => r.status !== 'VALID').map(r => ({
      'Row #':   r.rowNumber,
      'Status':  r.status,
      'Errors':  r.errors.join('; '),
      ...Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, sanitizeCell(v)])),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(errorRows.length > 0 ? errorRows : [{ Message: 'No errors found.' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="import_errors_${job._id}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
};

export const cancelImportJob = async (req: any, res: Response, next: NextFunction) => {
  try {
    const job = await ImportJob.findById(req.params.jobId);
    if (!job) throw new AppError('Import job not found.', 404, 'JOB_NOT_FOUND');
    if (job.uploadedBy.toString() !== req.user._id.toString()) throw new AppError('Unauthorized.', 403, 'FORBIDDEN');
    if (job.status !== 'PREVIEW') throw new AppError('Only PREVIEW jobs can be cancelled.', 400, 'INVALID_STATUS');

    job.status = 'CANCELLED';
    await job.save();

    res.status(200).json({ success: true, message: 'Import job cancelled.' });
  } catch (err) { next(err); }
};

// ─── Inline Row Editing & Live Re-validation ─────────────────────────────────

export const updatePreviewRow = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { rowNumber, updatedData } = req.body;

    const job = await ImportJob.findById(jobId);
    if (!job) throw new AppError('Import job not found.', 404, 'JOB_NOT_FOUND');
    if (job.status !== 'PREVIEW') throw new AppError('Only PREVIEW jobs can have rows updated.', 400, 'INVALID_STATUS');
    if (job.uploadedBy.toString() !== req.user._id.toString()) throw new AppError('Unauthorized.', 403, 'FORBIDDEN');

    const rowIndex = job.previewData.findIndex(r => r.rowNumber === Number(rowNumber));
    if (rowIndex === -1) throw new AppError(`Row #${rowNumber} not found in this preview.`, 404, 'ROW_NOT_FOUND');

    // Merge updatedData into existing row data
    const currentRow = job.previewData[rowIndex];
    const mergedData = { ...currentRow.data, ...updatedData };

    // Perform re-validation across all rows for integrity
    if (job.importType === 'STUDENTS') {
      const [departments, sections, existingUsers, existingStudents] = await Promise.all([
        Department.find({ status: 'ACTIVE' }),
        Section.find({ status: 'ACTIVE' }),
        User.find({ role: 'STUDENT' }, { email: 1 }),
        Student.find({}, { rollNumber: 1, registerNumber: 1 }),
      ]);

      const deptMap = new Map<string, any>();
      departments.forEach(d => {
        deptMap.set(d.code.toUpperCase(), d._id);
        deptMap.set(d.name.toUpperCase(), d._id);
      });
      const deptAliases: Record<string, string> = {
        'MZ': 'MECH', 'ME': 'MECH', 'MECHANICAL': 'MECH',
        'CS': 'CSE', 'COMPUTER SCIENCE': 'CSE',
        'EC': 'ECE', 'ELECTRONICS': 'ECE',
        'EE': 'EEE', 'ELECTRICAL': 'EEE',
        'AI': 'AIDS', 'AI&DS': 'AIDS', 'AI & DS': 'AIDS', 'AI-DS': 'AIDS',
      };
      Object.entries(deptAliases).forEach(([alias, targetCode]) => {
        if (deptMap.has(targetCode)) deptMap.set(alias, deptMap.get(targetCode));
      });

      const sectionMap = new Map<string, any>();
      sections.forEach(s => {
        sectionMap.set(s.name.toUpperCase(), s);
        sectionMap.set(`${s.departmentId}_${s.name.toUpperCase()}`, s);
      });

      const dbEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
      const dbRegNums = new Set(existingStudents.map(s => s.registerNumber));
      const dbRollNums = new Set(existingStudents.map(s => s.rollNumber));

      // Update current row data in memory
      job.previewData[rowIndex].data = mergedData;

      // Re-run validation on ALL rows to update file uniqueness & valid/invalid counts
      const fileEmails = new Set<string>();
      const fileRegNums = new Set<string>();
      const fileStudentIds = new Set<string>();
      const missingDepts = new Set<string>();
      const missingSecs = new Map<string, { name: string; deptCode: string }>();

      let validCount = 0;
      let invalidCount = 0;
      let duplicateCount = 0;

      for (let i = 0; i < job.previewData.length; i++) {
        const r = job.previewData[i];
        const errors: string[] = [];
        const studentId   = cellStr(r.data.studentId);
        const regNum      = cellStr(r.data.regNum);
        const name        = cellStr(r.data.name);
        let email         = cellStr(r.data.email).toLowerCase();
        const deptCode    = cellStr(r.data.deptCode).toUpperCase();
        const year        = cellStr(r.data.year);
        const sectionName = cellStr(r.data.sectionName).toUpperCase();
        const semester    = cellStr(r.data.semester);
        const acadYear    = cellStr(r.data.acadYear);

        if (!studentId) {
          errors.push('student_id is Primary Key and cannot be empty/null');
        }
        if (!regNum) {
          errors.push('register_number is required');
        } else if (!regNum.startsWith('7376')) {
          errors.push(`register_number "${regNum}" must start with 7376`);
        }
        if (!name) errors.push('student_name is required');

        if (!email) {
          email = generateBitsathyEmail(name, deptCode);
          r.data.email = email;
        } else if (!EMAIL_RE.test(email)) {
          errors.push('email format is invalid');
        }

        if (!deptCode)    errors.push('department_code is required');
        if (!year)        errors.push('year is required');
        if (!sectionName) errors.push('section_name is required');
        if (!semester)    errors.push('semester is required');
        if (!acadYear)    errors.push('academic_year is required');

        if (year && (isNaN(+year) || +year < 1 || +year > 4)) errors.push('year must be 1–4');
        if (semester && (isNaN(+semester) || +semester < 1 || +semester > 8)) errors.push('semester must be 1–8');

        const deptId = deptMap.get(deptCode);
        if (deptCode && !deptId) missingDepts.add(deptCode);

        if (sectionName) {
          const secKey = deptId ? `${deptId}_${sectionName}` : sectionName;
          if (!sectionMap.has(sectionName) && !sectionMap.has(secKey)) {
            const mapKey = `${deptCode}_${sectionName}`;
            if (!missingSecs.has(mapKey)) missingSecs.set(mapKey, { name: sectionName, deptCode });
          }
        }

        let isDuplicate = false;
        if (studentId && fileStudentIds.has(studentId)) {
          errors.push(`Duplicate student_id "${studentId}" within uploaded file (Violates Primary Key)`);
          isDuplicate = true;
        }
        if (regNum && fileRegNums.has(regNum)) {
          errors.push(`Duplicate register_number "${regNum}" within uploaded file`);
          isDuplicate = true;
        }
        if (email && fileEmails.has(email)) {
          errors.push(`Duplicate email "${email}" within uploaded file`);
          isDuplicate = true;
        }
        if (studentId && dbRollNums.has(studentId)) {
          errors.push(`student_id "${studentId}" already exists in database (Primary Key collision)`);
          isDuplicate = true;
        }
        if (regNum && dbRegNums.has(regNum)) {
          errors.push(`register_number "${regNum}" already exists in database`);
          isDuplicate = true;
        }
        if (email && dbEmails.has(email)) {
          errors.push(`email "${email}" already exists in database`);
          isDuplicate = true;
        }

        if (studentId) fileStudentIds.add(studentId);
        if (regNum) fileRegNums.add(regNum);
        if (email) fileEmails.add(email);

        const status = isDuplicate ? 'DUPLICATE' : errors.length > 0 ? 'INVALID' : 'VALID';
        r.errors = errors;
        r.status = status;

        if (status === 'VALID') validCount++;
        else if (status === 'DUPLICATE') duplicateCount++;
        else invalidCount++;
      }

      job.validRows = validCount;
      job.invalidRows = invalidCount;
      job.duplicateRows = duplicateCount;
      job.missingEntities = {
        departments: Array.from(missingDepts),
        sections: Array.from(missingSecs.values()),
      };
    } else if (job.importType === 'FACULTY') {
      const [departments, existingUsers, existingFaculty] = await Promise.all([
        Department.find({ status: 'ACTIVE' }),
        User.find({ role: 'FACULTY' }, { email: 1 }),
        Faculty.find({}, { employeeId: 1 }),
      ]);

      const deptMap = new Map<string, any>();
      departments.forEach(d => {
        deptMap.set(d.code.toUpperCase(), d._id);
        deptMap.set(d.name.toUpperCase(), d._id);
      });
      const dbEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
      const dbEmpIds = new Set(existingFaculty.map(f => f.employeeId));

      job.previewData[rowIndex].data = mergedData;

      const fileEmails = new Set<string>();
      const fileFacIds = new Set<string>();
      const missingDepts = new Set<string>();

      let validCount = 0, invalidCount = 0, duplicateCount = 0;

      for (let i = 0; i < job.previewData.length; i++) {
        const r = job.previewData[i];
        const errors: string[] = [];
        const facultyId   = cellStr(r.data.facultyId);
        const name        = cellStr(r.data.name);
        let email         = cellStr(r.data.email).toLowerCase();
        const deptCode    = cellStr(r.data.deptCode).toUpperCase();

        if (!facultyId) errors.push('faculty_id is Primary Key and cannot be empty/null');
        if (!name) errors.push('faculty_name is required');

        if (!email) {
          email = generateBitsathyEmail(name, deptCode);
          r.data.email = email;
        } else if (!EMAIL_RE.test(email)) {
          errors.push('email format is invalid');
        }

        if (!deptCode) errors.push('department_code is required');
        const deptId = deptMap.get(deptCode);
        if (deptCode && !deptId) missingDepts.add(deptCode);

        let isDuplicate = false;
        if (facultyId && fileFacIds.has(facultyId)) {
          errors.push(`Duplicate faculty_id "${facultyId}" within uploaded file (Violates Primary Key)`);
          isDuplicate = true;
        }
        if (email && fileEmails.has(email)) {
          errors.push(`Duplicate email "${email}" within uploaded file`);
          isDuplicate = true;
        }
        if (facultyId && dbEmpIds.has(facultyId)) {
          errors.push(`faculty_id "${facultyId}" already exists in database (Primary Key collision)`);
          isDuplicate = true;
        }
        if (email && dbEmails.has(email)) {
          errors.push(`email "${email}" already exists in database`);
          isDuplicate = true;
        }

        if (facultyId) fileFacIds.add(facultyId);
        if (email) fileEmails.add(email);

        const status = isDuplicate ? 'DUPLICATE' : errors.length > 0 ? 'INVALID' : 'VALID';
        r.errors = errors;
        r.status = status;

        if (status === 'VALID') validCount++;
        else if (status === 'DUPLICATE') duplicateCount++;
        else invalidCount++;
      }

      job.validRows = validCount;
      job.invalidRows = invalidCount;
      job.duplicateRows = duplicateCount;
      job.missingEntities = {
        departments: Array.from(missingDepts),
        sections: [],
      };
    } else if (job.importType === 'ALLOCATIONS') {
      const [students, faculty, subjects, sections] = await Promise.all([
        Student.find({}, { rollNumber: 1, registerNumber: 1 }),
        Faculty.find({}, { employeeId: 1 }),
        Subject.find({ status: 'ACTIVE' }, { code: 1 }),
        Section.find({ status: 'ACTIVE' }, { name: 1 }),
      ]);

      const stuSet = new Set(students.map(s => s.rollNumber).concat(students.map(s => s.registerNumber)));
      const facSet = new Set(faculty.map(f => f.employeeId));
      const subSet = new Set(subjects.map(s => s.code.toUpperCase()));
      const secSet = new Set(sections.map(s => s.name.toUpperCase()));

      job.previewData[rowIndex].data = mergedData;
      let validCount = 0, invalidCount = 0, duplicateCount = 0;

      for (let i = 0; i < job.previewData.length; i++) {
        const r = job.previewData[i];
        const errors: string[] = [];
        const studentId   = cellStr(r.data.studentId);
        const facultyId   = cellStr(r.data.facultyId);
        const subjectCode = cellStr(r.data.subjectCode).toUpperCase();
        const sectionName = cellStr(r.data.sectionName).toUpperCase();

        if (!studentId) errors.push('student_id is required');
        else if (!stuSet.has(studentId)) errors.push(`student_id "${studentId}" not found in system`);

        if (!facultyId) errors.push('faculty_id is required');
        else if (!facSet.has(facultyId)) errors.push(`faculty_id "${facultyId}" not found in system`);

        if (!subjectCode) errors.push('subject_code is required');
        else if (!subSet.has(subjectCode)) errors.push(`subject_code "${subjectCode}" not found in system`);

        if (!sectionName) errors.push('section_name is required');
        else if (!secSet.has(sectionName)) errors.push(`section_name "${sectionName}" not found in system`);

        const status = errors.length > 0 ? 'INVALID' : 'VALID';
        r.errors = errors;
        r.status = status;

        if (status === 'VALID') validCount++;
        else invalidCount++;
      }

      job.validRows = validCount;
      job.invalidRows = invalidCount;
    }

    job.markModified('previewData');
    job.markModified('missingEntities');
    await job.save();

    res.status(200).json({
      success: true,
      message: `Row #${rowNumber} updated and re-validated.`,
      data: {
        totalRows: job.totalRows,
        validRows: job.validRows,
        invalidRows: job.invalidRows,
        duplicateRows: job.duplicateRows,
        previewRows: job.previewData,
        missingEntities: job.missingEntities,
        updatedRow: job.previewData[rowIndex],
      },
    });
  } catch (err) { next(err); }
};
