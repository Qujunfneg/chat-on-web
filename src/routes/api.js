const express = require("express");
const router = express.Router();
const fs = require("fs");

const { validateUserId } = require('../middleware/auth');
const { 
  mockObjectStorage, 
  TEMP_UPLOAD_DIR, 
  CDN_IMAGES_DIR,
  path // 导入 path 供 mock-upload 使用
} = require('../services/storageService'); 
const { 
  tempUploads, 
  userInfoMap, 
  chatHistory 
} = require('../services/userService');
const { 
  NOTICE_FILE_PATH, 
  DATA_DIR 
} = require('../config/constants');


// 获取临时签名URL接口
router.post(
  "/api/get-presigned-url",
  validateUserId,
  (req, res) => {
    // 原始逻辑完全不变
    try {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          const { filename, fileType } = data;

          if (!filename || !fileType) {
            return res.status(400).json({
              success: false,
              message: "缺少文件名或文件类型"
            });
          }

          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
          if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({
              success: false,
              message: "只支持JPG、PNG、GIF和WebP格式的图片"
            });
          }

          const presignedInfo = mockObjectStorage.generatePresignedUrl(
            req.user.userId,
            filename,
            fileType
          );

          tempUploads.set(presignedInfo.uploadUrl.split('/').pop(), {
            filename: presignedInfo.filename,
            userId: req.user.userId,
            expireAt: presignedInfo.expireAt
          });

          res.json({
            success: true,
            uploadUrl: presignedInfo.uploadUrl,
            filename: presignedInfo.filename,
            expireAt: presignedInfo.expireAt
          });
        } catch (error) {
          res.status(400).json({
            success: false,
            message: "请求数据格式错误"
          });
        }
      });
    } catch (error) {
      console.error("生成签名URL失败:", error);
      res.status(500).json({
        success: false,
        message: "服务器错误"
      });
    }
  }
);

// 模拟对象存储上传接口
router.put("/api/mock-upload/:signature", (req, res) => {
  // 原始逻辑完全不变
  const signature = req.params.signature;
  const uploadInfo = tempUploads.get(signature);

  if (!uploadInfo || uploadInfo.expireAt < Date.now()) {
    return res.status(403).json({
      success: false,
      message: "上传链接已过期或无效"
    });
  }

  try {
    const tempFilePath = path.join(TEMP_UPLOAD_DIR, `${signature}_temp`);
    const writeStream = fs.createWriteStream(tempFilePath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const cdnFilePath = path.join(CDN_IMAGES_DIR, uploadInfo.filename);
      fs.rename(tempFilePath, cdnFilePath, (err) => {
        if (err) {
          console.error("文件移动失败:", err);
          return res.status(500).json({
            success: false,
            message: "文件上传失败"
          });
        }

        const cdnUrl = mockObjectStorage.getCdnUrl(uploadInfo.filename);
        tempUploads.delete(signature);

        res.json({
          success: true,
          cdnUrl: cdnUrl
        });
      });
    });

    writeStream.on('error', (err) => {
      console.error("文件写入失败:", err);
      res.status(500).json({
        success: false,
        message: "文件上传失败"
      });
    });
  } catch (error) {
    console.error("上传处理失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器错误"
    });
  }
});

// 获取在线用户列表API
router.get("/api/users", validateUserId, (req, res) => {
  // 原始逻辑完全不变
  res.json({ users: Array.from(require('../services/userService').onlineUsers.values()) });
});

// 获取公告API
router.get('/api/notices', (req, res) => {
  // 原始逻辑完全不变
  if (fs.existsSync(NOTICE_FILE_PATH)) {
    const content = fs.readFileSync(NOTICE_FILE_PATH, 'utf-8');
    res.send({ content: content });
  } else {
    res.send({ content: '' });
  }
});

// 更新用户昵称API
router.post("/api/update-nickname", validateUserId, (req, res) => {
  // 原始逻辑完全不变
  try {
    // 允许 API 访问 io 实例来广播事件
    const io = req.app.get('io');
    
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const { nickname } = data;

        if (nickname.length > 20) {
          return res
            .status(400)
            .json({ success: false, message: "昵称不能超过20个字符" });
        }

        const userInfo = userInfoMap.get(req.user.username);
        if (userInfo) {
          const userId = userInfo.userId;
          
          userInfo.nickname = nickname;
          userInfoMap.set(req.user.username, userInfo);

          chatHistory.forEach(message => {
            if (message.userId === userId) {
              message.username = nickname;
              if (message.userName) {
                message.userName = nickname;
              }
            }
            if (message.quote && message.quote.userId === userId) {
              message.quote.username = nickname;
              if (message.quote.userName) {
                message.quote.userName = nickname;
              }
            }
          });

          io.emit("user_nickname_updated", {
            username: req.user.username,
            newNickname: nickname,
            userId: userId
          });

          res.json({ success: true, message: "昵称更新成功", nickname });
        } else {
          res.status(404).json({ success: false, message: "用户不存在" });
        }
      } catch (error) {
        res.status(400).json({ success: false, message: "请求数据格式错误" });
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 获取表情包文件列表API
router.get("/api/emojis/:category", (req, res) => {
  // 原始逻辑完全不变
  try {
    const { category } = req.params;
    const targetDir = path.join(DATA_DIR, "emojis", category);
    
    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({
        success: false,
        message: "表情包目录不存在"
      });
    }
    
    const files = fs.readdirSync(targetDir);
    
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.gif', '.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });
    
    const emojis = imageFiles.map(file => ({
      name: path.basename(file, path.extname(file)),
      url: `/emojis/${category}/${file}`,
      ext: path.extname(file).toLowerCase()
    }));
    
    res.json({
      success: true,
      data: emojis,
      total: emojis.length
    });
  } catch (error) {
    console.error("获取表情包文件列表失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器错误"
    });
  }
});

module.exports = router;