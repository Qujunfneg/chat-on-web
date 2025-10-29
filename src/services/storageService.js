const fs = require("fs");
const path = require("path");
const { 
  CDN_IMAGES_DIR, 
  TEMP_UPLOAD_DIR, 
  CDN_SIZE_LIMIT_MB, 
  CDN_CLEAN_PERCENTAGE,
  ROOT_DIR
} = require('../config/constants');
const { tempUploads } = require('./userService');

// 定义数据文件路径
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data');
const POINTS_FILE = path.join(DATA_DIR, 'points.json');
const REDPACKETS_FILE = path.join(DATA_DIR, 'redPackets.json');

// --- 目录初始化和清理（原全局逻辑） ---

// 初始化数据文件
function initializeDataFiles() {
  try {
    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log('已创建数据目录:', DATA_DIR);
    }
    
    // 初始化points.json
    if (!fs.existsSync(POINTS_FILE)) {
      fs.writeFileSync(POINTS_FILE, JSON.stringify({}), 'utf8');
      console.log('已创建points.json文件');
    }
    
    // 初始化redPackets.json
    if (!fs.existsSync(REDPACKETS_FILE)) {
      fs.writeFileSync(REDPACKETS_FILE, JSON.stringify({}), 'utf8');
      console.log('已创建redPackets.json文件');
    }
  } catch (error) {
    console.error('初始化数据文件失败:', error);
  }
}

// 创建临时上传目录和CDN目录
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(CDN_IMAGES_DIR)) {
  fs.mkdirSync(CDN_IMAGES_DIR, { recursive: true });
}

// 服务重启时清理CDN目录所有文件
function cleanCdnDirectoryOnRestart() {
  // 原始逻辑完全不变
  try {
    console.log('服务重启，开始清理CDN目录...');
    
    if (!fs.existsSync(CDN_IMAGES_DIR)) {
      console.log('CDN目录不存在，无需清理');
      return;
    }
    
    const files = fs.readdirSync(CDN_IMAGES_DIR);
    const filesToDelete = files.length;
    
    files.forEach(file => {
      const filePath = path.join(CDN_IMAGES_DIR, file);
      try {
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`删除文件失败 ${file}:`, error);
      }
    });
    
    console.log(`CDN目录清理完成，共删除 ${filesToDelete} 个文件`);
  } catch (error) {
    console.error('清理CDN目录失败:', error);
  }
}

// --- 对象存储模拟（原全局逻辑） ---

const mockObjectStorage = {
  // 生成临时签名URL (逻辑不变)
  generatePresignedUrl: (userId, filename, fileType) => {
    const timestamp = Date.now();
    const signature = `${userId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      uploadUrl: `/api/mock-upload/${signature}`,
      filename: `${userId}_${filename}`,
      expireAt: timestamp + 5 * 60 * 1000, // 5分钟有效期
    };
  },
  
  // 获取永久可访问的CDN URL (逻辑不变)
  getCdnUrl: (filename) => {
    return `/cdn-images/${filename}`;
  }
};

// --- 定期清理逻辑（原全局函数） ---

// 计算目录大小的函数
function getDirectorySize(dirPath) {
  // 原始逻辑完全不变
  let totalSize = 0;
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        totalSize += stat.size;
      }
    });
  } catch (error) {
    console.error('计算目录大小失败:', error);
  }
  return totalSize;
}

// 清理目录的函数
function cleanDirectory(dirPath, targetSizeBytes) {
  // 原始逻辑完全不变
  try {
    const files = fs.readdirSync(dirPath)
      .map(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        return {
          path: filePath,
          name: file,
          size: stat.size,
          mtime: stat.mtime.getTime() 
        };
      })
      .filter(fileInfo => fileInfo.size > 0) 
      .sort((a, b) => a.mtime - b.mtime);
    
    let currentSize = files.reduce((sum, file) => sum + file.size, 0);
    const targetSize = currentSize * (1 - CDN_CLEAN_PERCENTAGE);
    
    console.log(`开始清理CDN目录，当前大小: ${(currentSize / (1024 * 1024)).toFixed(2)}MB, 目标大小: ${(targetSize / (1024 * 1024)).toFixed(2)}MB`);
    
    for (const file of files) {
      if (currentSize <= targetSizeBytes) {
        break;
      }
      
      try {
        fs.unlinkSync(file.path);
        currentSize -= file.size;
        console.log(`已删除文件: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)}KB`);
      } catch (error) {
        console.error(`删除文件失败 ${file.name}:`, error);
      }
    }
    
    console.log(`CDN目录清理完成，剩余大小: ${(currentSize / (1024 * 1024)).toFixed(2)}MB`);
  } catch (error) {
    console.error('清理目录失败:', error);
  }
}

// 定期检查目录大小的函数
function checkDirectorySize() {
  // 原始逻辑完全不变
  const sizeBytes = getDirectorySize(CDN_IMAGES_DIR);
  const sizeMB = sizeBytes / (1024 * 1024);
  const limitBytes = CDN_SIZE_LIMIT_MB * 1024 * 1024;
  
  console.log(`CDN目录当前大小: ${sizeMB.toFixed(2)}MB, 限制: ${CDN_SIZE_LIMIT_MB}MB`);
  
  if (sizeBytes > limitBytes) {
    console.log(`CDN目录大小超过限制，开始清理...`);
    // 注意：原始代码这里使用了 limitBytes * (1 - CDN_CLEAN_PERCENTAGE) 作为目标大小，
    // 但 cleanDirectory 内部又会重新计算目标大小，此处保持原始调用的参数。
    cleanDirectory(CDN_IMAGES_DIR, limitBytes * (1 - CDN_CLEAN_PERCENTAGE));
  }
}

// 导出所有功能
module.exports = {
  initializeDataFiles,
  cleanCdnDirectoryOnRestart,
  checkDirectorySize,
  mockObjectStorage,
  TEMP_UPLOAD_DIR,
  CDN_IMAGES_DIR,
  // 暴露 fs 和 path 供 mock-upload 接口使用
  fs,
  path
};