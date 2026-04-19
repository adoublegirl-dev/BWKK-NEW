const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const { ApiError, success } = require('../utils/response');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 使用 用户ID + 时间戳 + 扩展名 命名
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!safeExts.includes(ext)) {
      return cb(new Error('不支持的图片格式'));
    }
    const filename = `${req.user.id}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

/**
 * 上传头像
 * POST /api/upload/image
 * multipart/form-data, field: image
 */
router.post('/image', authMiddleware, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, '图片大小不能超过10MB'));
      }
      return next(new ApiError(400, err.message || '图片上传失败'));
    }

    if (!req.file) {
      return next(new ApiError(400, '请选择图片'));
    }

    // 返回可访问的URL路径
    const imageUrl = `/uploads/avatars/${req.file.filename}`;
    success(res, { url: imageUrl }, '上传成功');
  });
});

module.exports = router;
