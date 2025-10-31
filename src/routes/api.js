const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require('path');
const { DATA_DIR, NOTICE_FILE_PATH } = require('../config/constants');
const { validateUserId } = require('../middleware/auth');

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

        const userInfo = userInfoMap.get(req.user.userId);
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

// 清理不活跃用户API
router.post("/api/cleanup-inactive-users", validateUserId, (req, res) => {
  try {
    // 这里可以添加管理员权限检查，目前简化为所有用户都可以触发
    console.log(`用户 ${req.user.userId} 请求清理不活跃用户`);
    
    // 执行清理操作
    const cleanedCount = cleanupInactiveUsers();
    
    // 允许 API 访问 io 实例来广播事件
    const io = req.app.get('io');
    
    // 如果有用户被清理，则广播通知
    if (cleanedCount > 0) {
      io.emit("system_notification", {
        type: "info",
        message: `系统已清理 ${cleanedCount} 个超过50天未活跃的用户账户`
      });
    }
    
    res.json({
      success: true,
      message: cleanedCount > 0 
        ? `成功清理了 ${cleanedCount} 个不活跃用户` 
        : "没有需要清理的不活跃用户",
      cleanedCount
    });
  } catch (error) {
    console.error("清理不活跃用户失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器错误"
    });
  }
});
// 添加AI配置读取API
router.get('/api/ai-config', validateUserId, (req, res) => {
  try {
    const aiConfigPath = path.join(__dirname, '..', 'config', 'aiConfig.json');
    if (fs.existsSync(aiConfigPath)) {
      const rawConfig = fs.readFileSync(aiConfigPath, 'utf-8');
      const config = JSON.parse(rawConfig);
      // 只返回需要暴露的三个字段
      res.json({
        success: true,
        data: {
          enable_enhancement: config.enable_enhancement || false,
          systemPrompt: config.systemPrompt || '',
          temperature: config.customParams?.temperature || 0.8,
          model: config.model || 'hunyuan-turbos-latest',
        }
      });
    } else {
      // 如果配置文件不存在，返回默认值
      res.json({
        success: true,
        data: {
          enable_enhancement: false,
          systemPrompt: '',
          temperature: 0.8
        }
      });
    }
  } catch (error) {
    console.error('读取AI配置失败:', error);
    res.status(500).json({
      success: false,
      message: '读取配置失败'
    });
  }
});

// 添加AI配置更新API
router.post('/api/ai-config', validateUserId, (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: '请求数据格式错误' });
    }
    
    const aiConfigPath = path.join(__dirname, '..', 'config', 'aiConfig.json');
    
    // 读取现有配置
    let existingConfig = {};
    if (fs.existsSync(aiConfigPath)) {
      const rawConfig = fs.readFileSync(aiConfigPath, 'utf-8');
      existingConfig = JSON.parse(rawConfig);
    }

    // 更新指定的三个字段
    existingConfig.enable_enhancement = data.enable_enhancement || false;
    existingConfig.systemPrompt = data.systemPrompt || '';
    existingConfig.customParams = existingConfig.customParams || {};
    // 更新模型
    existingConfig.model = data.model || 'hunyuan-turbos-latest';
    const temperature = parseFloat(data.temperature);
    existingConfig.customParams.temperature = isNaN(temperature) ? 0.8 : Math.max(0, Math.min(2, temperature));

    // 写回配置文件
    fs.writeFileSync(aiConfigPath, JSON.stringify(existingConfig, null, 2), 'utf-8');

    // 通知所有客户端配置已更新
    const io = req.app.get('io');
    console.log(existingConfig)
    io.emit('ai-config-updated', {
      enable_enhancement: existingConfig.enable_enhancement,
      systemPrompt: existingConfig.systemPrompt,
      temperature: existingConfig.customParams.temperature,
      model: existingConfig.model || 'hunyuan-turbos-latest'
    });

    res.json({ success: true, message: '配置更新成功' });
  } catch (error) {
    console.error('更新AI配置失败:', error);
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
});

module.exports = router;