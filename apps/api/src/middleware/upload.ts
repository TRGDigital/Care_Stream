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

// ─── Image upload (blog feature images) ──────────────────────────────────────

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_IMAGE_EXT  = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
const MAX_IMAGE_SIZE      = 10 * 1024 * 1024  // 10 MB

const imageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = '.' + (file.originalname.split('.').pop()?.toLowerCase() ?? '')
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype) || !ALLOWED_IMAGE_EXT.has(ext)) {
      cb(new Error('INVALID_IMAGE_TYPE'))
      return
    }
    cb(null, true)
  },
})

export function imageUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  imageMulter.single('image')(req, res, (multerErr) => {
    if (!multerErr) { next(); return }
    if (multerErr.message === 'INVALID_IMAGE_TYPE') {
      err(res, 'INVALID_IMAGE_TYPE', 'Only JPG, PNG, WebP, and GIF images are accepted.')
      return
    }
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      err(res, 'FILE_TOO_LARGE', 'Image must be under 10 MB.', 413)
      return
    }
    err(res, 'UPLOAD_ERROR', 'Image upload failed. Please try again.', 500)
  })
}

// busboy (under multer) decodes multipart filenames as latin1, which corrupts
// non-ASCII characters (em-dash, en-dash, curly quotes, accents). Re-decode the
// latin1 bytes as UTF-8 to restore the original filename. No-op for pure ASCII.
function fixUtf8Filename(name: string): string {
  try {
    const fixed = Buffer.from(name, 'latin1').toString('utf8')
    // Only adopt the re-decode if it round-trips cleanly (guards against rare
    // already-UTF-8 inputs); for ASCII both sides are identical anyway.
    return Buffer.from(fixed, 'utf8').toString('latin1') === name ? fixed : name
  } catch {
    return name
  }
}

function fixUploadedFilenames(req: Request): void {
  if (req.file) req.file.originalname = fixUtf8Filename(req.file.originalname)
  if (Array.isArray(req.files)) {
    for (const f of req.files as Express.Multer.File[]) f.originalname = fixUtf8Filename(f.originalname)
  }
}

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
  multerInstance.single('file')(req, res, (multerErr) => {
    if (!multerErr) fixUploadedFilenames(req)
    handleMulterError(multerErr, res, next)
  })
}

export function bulkUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  multerInstance.array('files', 50)(req, res, (multerErr) => {
    if (!multerErr) fixUploadedFilenames(req)
    handleMulterError(multerErr, res, next)
  })
}
