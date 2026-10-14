import mongoose, { Schema, Document } from 'mongoose';

export type ImportType = 'STUDENTS' | 'FACULTY' | 'ALLOCATIONS' | 'SUBJECTS' | 'SECTIONS';
export type ImportStatus = 'PREVIEW' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface IImportError {
  rowNumber: number;
  fieldName: string;
  errorCode: string;
  errorMessage: string;
  rawValue?: string;
}

export interface IImportPreviewRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'VALID' | 'INVALID' | 'DUPLICATE' | 'WARNING';
  errors: string[];
}

export interface IImportJob extends Document {
  importType: ImportType;
  uploadedFilename: string;
  uploadedBy: mongoose.Types.ObjectId;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  skippedRows: number;
  status: ImportStatus;
  rowErrors: IImportError[];
  previewData: IImportPreviewRow[];
  missingEntities?: {
    departments: string[];
    sections: { name: string; deptCode: string }[];
  };
  createdAt: Date;
  completedAt?: Date;
}

const ImportErrorSchema = new Schema({
  rowNumber: { type: Number, required: true },
  fieldName: { type: String, required: true },
  errorCode: { type: String, required: true },
  errorMessage: { type: String, required: true },
  rawValue: { type: String },
}, { _id: false });

const ImportPreviewRowSchema = new Schema({
  rowNumber: { type: Number, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['VALID', 'INVALID', 'DUPLICATE', 'WARNING'], required: true },
  errors: [{ type: String }],
}, { _id: false });

const ImportJobSchema: Schema = new Schema(
  {
    importType: { type: String, enum: ['STUDENTS', 'FACULTY', 'ALLOCATIONS', 'SUBJECTS', 'SECTIONS'], required: true },
    uploadedFilename: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    duplicateRows: { type: Number, default: 0 },
    importedRows: { type: Number, default: 0 },
    skippedRows: { type: Number, default: 0 },
    status: { type: String, enum: ['PREVIEW', 'COMPLETED', 'FAILED', 'CANCELLED'], default: 'PREVIEW' },
    rowErrors: [ImportErrorSchema],
    previewData: [ImportPreviewRowSchema],
    missingEntities: {
      departments: [{ type: String }],
      sections: [{ name: String, deptCode: String }],
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ImportJobSchema.index({ uploadedBy: 1, createdAt: -1 });
ImportJobSchema.index({ status: 1 });

export const ImportJob = mongoose.model<IImportJob>('ImportJob', ImportJobSchema);
