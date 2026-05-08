import multer from 'multer'
import { Request, Response, NextFunction } from 'express'
import { isSupportedMimeType } from '../services/rag/extractor'
import { err } from '../lib/response'

// §7 Admin Dashboard — "Supported formats: PDF, DOCX, TXT"
// Memory storage: file buffer passed directly to S3 upload without touching disk

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.odt', '.txt'])
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  // 50 MB

const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase()

    // Validate both MIME type and extension — MIME can be spoofed
    if (!isSupportedMimeType(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error('INVALID_FILE_TYPE'))
      return
    }
    cb(null, true)
  },
})

function handleMulterError(multerErr: any, res: Response, next: NextFunction): void {
  if (!multerErr) { next(); return }

  if (multerErr.message === 'INVALID_FILE_TYPE') {
    err(res, 'INVALID_FILE_TYPE', 'Only PDF, DOCX, ODT, and TXT files are accepted.')
    return
  }
  if (multerErr.code === 'LIMIT_FILE_SIZE') {
    err(res, 'FILE_TOO_LARGE', `File must be under ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`, 413)
    return
  }
  if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
    err(res, 'TOO_MANY_FILES', 'Maximum 50 files per bulk upload.', 400)
    return
  }
  err(res, 'UPLOAD_ERROR', 'File upload failed. Please try again.', 500)
}

export function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  multerInstance.single('file')(req, res, (multerErr) => handleMulterError(multerErr, res, next))
}

export function bulkUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  multerInstance.array('files', 50)(req, res, (multerErr) => handleMulterError(multerErr, res, next))
}
