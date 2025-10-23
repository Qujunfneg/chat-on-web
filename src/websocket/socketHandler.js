const { 
  onlineUsers, 
  userInfoMap, 
  chatHistory // 暴露 chatHistory 以便写入
} = require('../services/userService');
const { MAX_HISTORY } = require('../config/constants');

module.exports = (io) => {
  // WebSocket连接处理
  io.on("connection", (socket) => {
    console.log("新用户连接:", socket.id);

    // 用户加入聊天室，需要提供userId和username
    socket.on("join", ({ userId, username }) => {
      if (!userId || !username) {
        console.log(`用户验证失败：缺少必要信息`);
        socket.emit("user_id_failed", { message: "缺少用户ID或用户名" });
        return;
      }

      // 检查 userId 是否已存在于其他 socket
      if (userInfoMap.has(userId)) {
        const existingSocketId = Array.from(onlineUsers.entries()).find(([_, uid]) => uid === userId)?.[0];
        if (existingSocketId && existingSocketId !== socket.id) {
          console.log(`检测到重复 userId ${userId}，断开旧连接 ${existingSocketId}`);
          io.sockets.sockets.get(existingSocketId)?.disconnect(true);
          onlineUsers.delete(existingSocketId);
        }
      }

      // 记录在线用户 (socket.id -> userId)
      onlineUsers.set(socket.id, userId);

      // 初始化或更新用户信息
      if (!userInfoMap.has(userId)) {
        userInfoMap.set(userId, { userId, username, nickname: username });
      } else {
        // 更新最新的用户名（允许重名）
        const info = userInfoMap.get(userId);
        info.username = username;
        userInfoMap.set(userId, info);
      }

      console.log(`${username} 加入聊天室，用户ID: ${userId}`);

      socket.emit("chat_history", chatHistory);

      const usersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
        return userInfoMap.get(uid) || { userId: uid, username: null };
      });

      io.emit("user_join", {
        username,
        userId,
        nickname: userInfoMap.get(userId)?.nickname || username,
        users: usersList,
      });
    });

    // 接收消息并广播
    socket.on("chat_message", (data) => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || userId !== data.userId) {
        console.log(`消息发送验证失败：用户ID不匹配或用户不存在`);
        socket.emit("user_id_failed", { message: "用户验证失败，请重新输入用户名" });
        return;
      }

      console.log(
        socket.request.connection.remoteAddress,
        userInfo.nickname,
        "说:",
        data.content
      );

      let processedMessage = { ...data };

      if (processedMessage.userName && !processedMessage.username) {
        processedMessage.username = processedMessage.userName;
        delete processedMessage.userName;
      }
      // 使用最新的昵称（如果已更新）
      processedMessage.username = userInfo.nickname; 
      
      processedMessage.id = Date.now().toString();
      processedMessage.timestamp = Date.now(); // 使用时间戳而不是格式化后的字符串
      processedMessage.userId = data.userId;
      processedMessage.localId = data.localId;

      if (processedMessage.quote) {
        const quotedInfo = Array.from(userInfoMap.values()).find(info => info.username === processedMessage.quote.username);
        processedMessage.quote.userId = quotedInfo?.userId || "";
      }

      if (data.mentionedUserIds && Array.isArray(data.mentionedUserIds)) {
        processedMessage.mentionedUserIds = data.mentionedUserIds;
        
        if (!processedMessage.mentions) {
          processedMessage.mentions = [];
          data.mentionedUserIds.forEach(uid => {
            const info = userInfoMap.get(uid);
            const name = info?.username;
            if (name && !processedMessage.mentions.includes(name)) {
              processedMessage.mentions.push(name);
            }
          });
        }
      }

      chatHistory.push(processedMessage);
      if (chatHistory.length > MAX_HISTORY) {
        chatHistory.shift();
      }

      io.emit("chat_message", processedMessage);
    });

    // 处理弹幕消息
    socket.on('danmu_message', (data) => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      if (!userInfo || userId !== data.userId) {
        console.log(`弹幕发送验证失败：用户ID不匹配或用户不存在`);
        return;
      }

      console.log(`${userInfo.nickname} 发送了弹幕: ${data.content}`);

      const danmuData = {
        content: data.content,
        color: data.color,
        username: userInfo.nickname,
        userId: userId,
        timestamp: data.timestamp
      };
      io.emit('danmu_message', danmuData);
    });

    // 用户断开连接
    socket.on("disconnect", () => {
      const userId = onlineUsers.get(socket.id);
      if (userId) {
        onlineUsers.delete(socket.id);
        console.log(`用户 ${userId} 离开聊天室`);

        const hasOtherConnections = Array.from(onlineUsers.values()).includes(userId);
        if (!hasOtherConnections) {
          userInfoMap.delete(userId);
        }

        const usersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
          return userInfoMap.get(uid) || { userId: uid, username: null };
        });

        io.emit("user_leave", {
          userId,
          users: usersList,
        });
      }
    });
  });
};