const path = require("path");

const MAX_HISTORY = 100;

// 文件存储配置
const CDN_SIZE_LIMIT_MB = process.env.CDN_SIZE_LIMIT_MB ? parseInt(process.env.CDN_SIZE_LIMIT_MB) : 500;
const CDN_SIZE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const CDN_CLEAN_PERCENTAGE = 0.2;

// 目录路径
// 注意：使用 path.join(__dirname, '..', '..') 来定位项目根目录
const ROOT_DIR = path.join(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const TEMP_UPLOAD_DIR = path.join(PUBLIC_DIR, "temp-uploads");
const CDN_IMAGES_DIR = path.join(PUBLIC_DIR, "cdn-images");
const NOTICE_FILE_PATH = path.join(DATA_DIR, 'notice.md'); // 注意: 原始代码中 notice.md 在根目录

// 动态表情映射表
const dynamicEmojis = {
  微笑: "/images/smile.gif",
  哭泣: "/images/cry.gif",
  生气: "/images/angry.gif",
  开心: "/images/happy.gif",
  惊讶: "/images/surprised.gif",
  爱心: "/images/love.gif",
};

module.exports = {
  MAX_HISTORY,
  CDN_SIZE_LIMIT_MB,
  CDN_SIZE_CHECK_INTERVAL_MS,
  CDN_CLEAN_PERCENTAGE,
  TEMP_UPLOAD_DIR,
  CDN_IMAGES_DIR,
  NOTICE_FILE_PATH,
  dynamicEmojis,
  ROOT_DIR,
  PUBLIC_DIR,
  DATA_DIR
};