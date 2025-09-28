// 导入所需模块
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

// 创建Express应用和HTTP服务器
const app = express();
const server = http.createServer(app);

// 设置静态目录，用于存放Vue打包后的文件
app.use(express.static(path.join(__dirname, "public")));
// 设置emojis目录为静态文件目录
app.use('/emojis', express.static(path.join(__dirname, "data", "emojis")));

// 使用基于签名URL的对象存储方案，不再需要multer

// 创建WebSocket服务器
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 存储在线用户信息 - 使用后台缓存维护
const onlineUsers = new Map(); // socket.id => username
// 存储用户信息映射 - 后台缓存维护userList
const userInfoMap = new Map(); // username => {userId, username, nickname}
// 存储用户ID和用户名的映射关系
const userIdMap = new Map(); // userId => username
// 存储聊天历史
const chatHistory = [];
const MAX_HISTORY = 100;

// 模拟对象存储服务
const mockObjectStorage = {
  // 生成临时签名URL
  generatePresignedUrl: (userId, filename, fileType) => {
    // 实际项目中应该使用真实的对象存储SDK生成签名URL
    // 这里为了演示，我们生成一个临时的上传URL
    const timestamp = Date.now();
    const signature = `${userId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      uploadUrl: `/api/mock-upload/${signature}`,
      filename: `${userId}_${filename}`,
      expireAt: timestamp + 5 * 60 * 1000, // 5分钟有效期
    };
  },
  
  // 获取永久可访问的CDN URL
  getCdnUrl: (filename) => {
    // 实际项目中应该返回对象存储的CDN URL
    // 这里我们使用本地的静态文件URL作为模拟
    return `/cdn-images/${filename}`;
  }
};

// 创建临时上传目录和CDN目录
const tempUploadDir = path.join(__dirname, "public", "temp-uploads");
const cdnImagesDir = path.join(__dirname, "public", "cdn-images");
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}
if (!fs.existsSync(cdnImagesDir)) {
  fs.mkdirSync(cdnImagesDir, { recursive: true });
}

// 服务重启时清理CDN目录所有文件
function cleanCdnDirectoryOnRestart() {
  try {
    console.log('服务重启，开始清理CDN目录...');
    
    // 检查目录是否存在
    if (!fs.existsSync(cdnImagesDir)) {
      console.log('CDN目录不存在，无需清理');
      return;
    }
    
    // 读取目录内容
    const files = fs.readdirSync(cdnImagesDir);
    
    // 记录清理前的文件数量
    const filesToDelete = files.length;
    
    // 删除所有文件
    files.forEach(file => {
      const filePath = path.join(cdnImagesDir, file);
      
      try {
        // 检查是否为文件
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

// 服务启动时执行CDN目录清理
cleanCdnDirectoryOnRestart();

// 监控CDN图片目录大小的配置
const CDN_SIZE_LIMIT_MB = process.env.CDN_SIZE_LIMIT_MB ? parseInt(process.env.CDN_SIZE_LIMIT_MB) : 500; // 默认500MB
const CDN_SIZE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 每30分钟检查一次
const CDN_CLEAN_PERCENTAGE = 0.2; // 超过限制时清理20%的空间

// 计算目录大小的函数
function getDirectorySize(dirPath) {
  let totalSize = 0;
  try {
    // 读取目录内容
    const files = fs.readdirSync(dirPath);
    
    // 遍历所有文件
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      // 如果是文件，累加大小
      if (stat.isFile()) {
        totalSize += stat.size;
      }
    });
  } catch (error) {
    console.error('计算目录大小失败:', error);
  }
  
  return totalSize; // 字节
}

// 清理目录的函数
function cleanDirectory(dirPath, targetSizeBytes) {
  try {
    // 读取目录内容并获取文件信息
    const files = fs.readdirSync(dirPath)
      .map(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        return {
          path: filePath,
          name: file,
          size: stat.size,
          mtime: stat.mtime.getTime() // 修改时间戳
        };
      })
      .filter(fileInfo => fileInfo.size > 0) // 只处理有效文件
      .sort((a, b) => a.mtime - b.mtime); // 按修改时间排序，最旧的在前
    
    let currentSize = files.reduce((sum, file) => sum + file.size, 0);
    const targetSize = currentSize * (1 - CDN_CLEAN_PERCENTAGE); // 目标大小
    
    console.log(`开始清理CDN目录，当前大小: ${(currentSize / (1024 * 1024)).toFixed(2)}MB, 目标大小: ${(targetSize / (1024 * 1024)).toFixed(2)}MB`);
    
    // 删除文件直到达到目标大小
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
  const sizeBytes = getDirectorySize(cdnImagesDir);
  const sizeMB = sizeBytes / (1024 * 1024);
  const limitBytes = CDN_SIZE_LIMIT_MB * 1024 * 1024;
  
  console.log(`CDN目录当前大小: ${sizeMB.toFixed(2)}MB, 限制: ${CDN_SIZE_LIMIT_MB}MB`);
  
  // 如果超过限制，进行清理
  if (sizeBytes > limitBytes) {
    console.log(`CDN目录大小超过限制，开始清理...`);
    cleanDirectory(cdnImagesDir, limitBytes * (1 - CDN_CLEAN_PERCENTAGE));
  }
}

// 启动定期检查
setInterval(checkDirectorySize, CDN_SIZE_CHECK_INTERVAL_MS);

// 初始检查
setTimeout(checkDirectorySize, 10000); // 服务器启动10秒后进行首次检查

// 动态表情映射表
const dynamicEmojis = {
  微笑: "/images/smile.gif",
  哭泣: "/images/cry.gif",
  生气: "/images/angry.gif",
  开心: "/images/happy.gif",
  惊讶: "/images/surprised.gif",
  爱心: "/images/love.gif",
};

// WebSocket连接处理
io.on("connection", (socket) => {
  console.log("新用户连接:", socket.id);

  // 用户加入聊天室，需要提供userId和username
  socket.on("join", ({ userId, username }) => {
    // 验证userId和username是否存在
    if (!userId || !username) {
      console.log(`用户验证失败：缺少必要信息`);
      socket.emit("user_id_failed", { message: "缺少用户ID或用户名" });
      return;
    }

    // 检查用户ID是否已被使用（避免重复连接）
    if (userIdMap.has(userId)) {
      const existingUsername = userIdMap.get(userId);
      const existingSocketId = Array.from(onlineUsers.entries()).find(([_, name]) => name === existingUsername)?.[0];
      
      // 如果发现相同用户ID但不同用户名的连接，拒绝新连接
      if (existingSocketId && existingSocketId !== socket.id && onlineUsers.get(existingSocketId) !== username) {
        console.log(`检测到用户ID ${userId} 已被其他用户名使用，拒绝新连接`);
        socket.emit("user_id_failed", { message: "用户ID已被使用，请重新输入用户名" });
        return;
      }
      
      // 如果是相同用户ID和用户名的新连接，断开旧连接
      if (existingSocketId && existingSocketId !== socket.id) {
        console.log(`检测到重复用户ID ${userId}，断开旧连接 ${existingSocketId}`);
        io.sockets.sockets.get(existingSocketId)?.disconnect(true);
        onlineUsers.delete(existingSocketId);
      }
    }

    // 更新后台缓存的用户列表
    onlineUsers.set(socket.id, username);
    userIdMap.set(userId, username);
    userInfoMap.set(username, { userId, username, nickname: username });
    
    console.log(`${username} 加入聊天室，用户ID: ${userId}`);

    // 发送历史消息给新用户
    socket.emit("chat_history", chatHistory);

    // 广播用户加入信息
    io.emit("user_join", {
      username,
      userId,
      nickname: username,
      // 发送包含userId的完整用户列表，而仅仅是用户名
      users: Array.from(onlineUsers.entries()).map(([socketId, user]) => {
        const userInfo = userInfoMap.get(user);
        return userInfo || { username: user, userId: null };
      }),
    });
  });

  // 接收消息并广播
  socket.on("chat_message", (data) => {
    // 验证用户ID是否存在于后台缓存中
    const username = onlineUsers.get(socket.id);
    const userInfo = userInfoMap.get(username);
    
    if (!userInfo || userInfo.userId !== data.userId) {
      console.log(`消息发送验证失败：用户ID不匹配或用户不存在`);
      socket.emit("user_id_failed", { message: "用户验证失败，请重新输入用户名" });
      return;
    }

    console.log(
      socket.request.connection.remoteAddress,
      username,
      "说:",
      data.content
    );

    // 处理消息类型和内容
  let processedMessage = { ...data };

  // 修复字段名不一致问题：将userName转换为username
  if (processedMessage.userName && !processedMessage.username) {
    processedMessage.username = processedMessage.userName;
    delete processedMessage.userName;
  }

  // 为消息添加时间戳和ID
  processedMessage.id = Date.now().toString();
  processedMessage.timestamp = new Date().toLocaleTimeString();
  processedMessage.userId = data.userId; // 使用客户端提供的用户ID
  processedMessage.localId = data.localId; // 保留客户端发送的localId

    // 处理引用消息，确保引用消息也包含用户ID
    if (processedMessage.quote) {
      // 查找引用消息用户的ID
      const quotedUserInfo = userInfoMap.get(processedMessage.quote.username);
      const quoteUserId = quotedUserInfo?.userId || "";
      processedMessage.quote.userId = quoteUserId;
    }

    // 处理被@用户的ID列表
    if (data.mentionedUserIds && Array.isArray(data.mentionedUserIds)) {
      // 保留客户端发送的被@用户ID列表
      processedMessage.mentionedUserIds = data.mentionedUserIds;
      
      // 确保mentionedUsers数组也存在，保持向后兼容性
      if (!processedMessage.mentions) {
        processedMessage.mentions = [];
        // 尝试从mentionedUserIds映射回用户名
        data.mentionedUserIds.forEach(userId => {
          const username = Array.from(userInfoMap.entries()).find(([_, userInfo]) => 
            userInfo.userId === userId
          )?.[0];
          if (username && !processedMessage.mentions.includes(username)) {
            processedMessage.mentions.push(username);
          }
        });
      }
    }

    // 保存历史消息
    chatHistory.push(processedMessage);
    if (chatHistory.length > MAX_HISTORY) {
      chatHistory.shift();
    }

    // 广播消息
    io.emit("chat_message", processedMessage);
  });

  // 处理弹幕消息
  socket.on('danmu_message', (data) => {
    // 验证用户是否在线
    const username = onlineUsers.get(socket.id);
    const userInfo = userInfoMap.get(username);
    
    if (!userInfo || userInfo.userId !== data.userId) {
      console.log(`弹幕发送验证失败：用户ID不匹配或用户不存在`);
      return;
    }

    console.log(`${username} 发送了弹幕: ${data.content}`);

    // 构建弹幕数据
    const danmuData = {
      content: data.content,
      color: data.color,
      username: username,
      userId: data.userId,
      timestamp: data.timestamp
    };

    // 广播弹幕消息给所有用户
    io.emit('danmu_message', danmuData);
  });

  // 用户断开连接
  socket.on("disconnect", () => {
    const username = onlineUsers.get(socket.id);
    if (username) {
      onlineUsers.delete(socket.id);
      console.log(`${username} 离开聊天室`);

      // 检查该用户是否还有其他连接
      const hasOtherConnections = Array.from(onlineUsers.values()).includes(username);
      
      if (!hasOtherConnections) {
        // 如果用户没有其他连接，从映射中移除
        const userInfo = userInfoMap.get(username);
        if (userInfo) {
          userIdMap.delete(userInfo.userId);
          userInfoMap.delete(username);
        }
      }

      // 广播用户离开信息
      io.emit("user_leave", {
        username,
        // 发送包含userId的完整用户列表，而仅仅是用户名
        users: Array.from(onlineUsers.entries()).map(([socketId, user]) => {
          const userInfo = userInfoMap.get(user);
          return userInfo || { username: user, userId: null };
        }),
      });
    }
  });
});

// 验证用户ID的中间件 - 使用X-User-Id头部
function validateUserId(req, res, next) {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ success: false, message: "未提供用户ID" });
  }

  // 检查用户ID是否存在于后台缓存中
  const username = userIdMap.get(userId);
  if (!username) {
    return res.status(401).json({ success: false, message: "用户ID无效" });
  }

  // 将用户信息添加到请求对象中
  req.user = {
    userId,
    username
  };
  next();
}

// 存储临时上传签名信息
const tempUploads = new Map();

// 获取临时签名URL接口
app.post(
  "/api/get-presigned-url",
  validateUserId,
  (req, res) => {
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

          // 验证文件类型（只允许图片）
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
          if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({
              success: false,
              message: "只支持JPG、PNG、GIF和WebP格式的图片"
            });
          }

          // 生成临时签名URL
          const presignedInfo = mockObjectStorage.generatePresignedUrl(
            req.user.userId,
            filename,
            fileType
          );

          // 存储临时上传信息
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
app.put("/api/mock-upload/:signature", (req, res) => {
  const signature = req.params.signature;
  const uploadInfo = tempUploads.get(signature);

  // 检查签名是否有效
  if (!uploadInfo || uploadInfo.expireAt < Date.now()) {
    return res.status(403).json({
      success: false,
      message: "上传链接已过期或无效"
    });
  }

  try {
    // 创建临时文件路径
    const tempFilePath = path.join(tempUploadDir, `${signature}_temp`);
    const writeStream = fs.createWriteStream(tempFilePath);

    // 写入文件数据
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      // 移动文件到CDN目录
      const cdnFilePath = path.join(cdnImagesDir, uploadInfo.filename);
      fs.rename(tempFilePath, cdnFilePath, (err) => {
        if (err) {
          console.error("文件移动失败:", err);
          return res.status(500).json({
            success: false,
            message: "文件上传失败"
          });
        }

        // 获取CDN URL
        const cdnUrl = mockObjectStorage.getCdnUrl(uploadInfo.filename);

        // 移除临时上传信息
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
app.get("/api/users", validateUserId, (req, res) => {
  res.json({ users: Array.from(onlineUsers.values()) });
});

// 获取公告API
app.get('/api/notices', (req, res) => {
  const filePath = path.join(__dirname, 'notice.md');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.send({ content: content });
  } else {
    res.send({ content: '' }); // 不存在返回空
  }
});

// 更新用户昵称API
app.post("/api/update-nickname", validateUserId, (req, res) => {
  try {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const { nickname } = data;

        // 验证昵称不超过20个字符
        if (nickname.length > 20) {
          return res
            .status(400)
            .json({ success: false, message: "昵称不能超过20个字符" });
        }

        // 更新后台缓存中的用户昵称
        const userInfo = userInfoMap.get(req.user.username);
        if (userInfo) {
          // 获取用户ID
          const userId = userInfo.userId;
          
          // 更新用户信息
          userInfo.nickname = nickname;
          userInfoMap.set(req.user.username, userInfo);

          // 更新聊天历史记录中所有该用户ID对应的消息用户名
          chatHistory.forEach(message => {
            // 检查消息的用户ID是否匹配当前用户ID
            if (message.userId === userId) {
              message.username = nickname;
              // 保持兼容性，同时更新userName字段
              if (message.userName) {
                message.userName = nickname;
              }
            }
            
            // 检查引用消息中的用户ID是否匹配当前用户ID
            if (message.quote && message.quote.userId === userId) {
              message.quote.username = nickname;
              if (message.quote.userName) {
                message.quote.userName = nickname;
              }
            }
          });

          // 广播用户昵称更新事件，通知所有客户端
          io.emit("user_nickname_updated", {
            username: req.user.username,
            newNickname: nickname,
            userId: userId // 添加用户ID信息
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
app.get("/api/emojis/:category", (req, res) => {
  try {
    const { category } = req.params;
    // 构建表情包目录的绝对路径
    const targetDir = path.join(__dirname, "data", "emojis", category);
    
    // 检查目录是否存在
    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({
        success: false,
        message: "表情包目录不存在"
      });
    }
    
    // 读取目录中的所有文件
    const files = fs.readdirSync(targetDir);
    
    // 过滤出gif、jpg、png等图片文件
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.gif', '.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });
    
    // 构建文件信息列表
    const emojis = imageFiles.map(file => ({
      name: path.basename(file, path.extname(file)), // 不带扩展名的文件名
      url: `/emojis/${category}/${file}`,           // 文件URL路径
      ext: path.extname(file).toLowerCase()          // 文件扩展名
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

// 所有其他路由都指向index.html（用于SPA路由）
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 启动服务器
const PORT = process.env.PORT || 3000; // 改为3001端口，避免与已占用的3000端口冲突
const BIND_ADDRESS = process.env.BIND_ADDRESS || "0.0.0.0";
server.listen(PORT, BIND_ADDRESS, () => {
  console.log(`服务器运行在 http://localhost:${PORT} 或 http://本机IP:${PORT}`);
  console.log(`同一局域网内的用户可以通过您的IP地址访问聊天室`);
});
