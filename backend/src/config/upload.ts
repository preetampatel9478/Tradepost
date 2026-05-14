import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadsRoot = path.join(process.cwd(), 'uploads');
const avatarsDir = path.join(uploadsRoot, 'avatars');
const postsDir = path.join(uploadsRoot, 'posts');

fs.mkdirSync(avatarsDir, { recursive: true });
fs.mkdirSync(postsDir, { recursive: true });

function safeFileBaseName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const userId = safeFileBaseName(String((req.body?.userId ?? req.body?.mobileNumber ?? 'user') as string));
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const fileName = `${userId}_${Date.now()}${ext}`;
    cb(null, fileName);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    const err = new Error('Only image uploads are allowed') as any;
    err.statusCode = 400;
    cb(err);
    return;
  }
  cb(null, true);
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const postMediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, postsDir),
  filename: (req, file, cb) => {
    const userId = safeFileBaseName(String((req as any)?.userId ?? 'user'));
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const fileName = `${userId}_${Date.now()}${ext}`;
    cb(null, fileName);
  },
});

const postMediaFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
  if (!ok) {
    const err = new Error('Only image/video uploads are allowed') as any;
    err.statusCode = 400;
    cb(err);
    return;
  }
  cb(null, true);
};

export const uploadPostMedia = multer({
  storage: postMediaStorage,
  fileFilter: postMediaFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 5,
  },
});

export function buildPublicFileUrl(req: any, relativePath: string) {
  const explicitBaseUrl = process.env.PUBLIC_BASE_URL;
  const baseUrl = explicitBaseUrl || `${req.protocol}://${req.get('host')}`;
  const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${baseUrl}${normalized}`;
}
