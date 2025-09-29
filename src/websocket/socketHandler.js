const { 
  onlineUsers, 
  userInfoMap, 
  userIdMap, 
  chatHistory // 暴露 chatHistory 以便写入
} = require('../services/userService');
const { MAX_HISTORY } = require('../config/constants');

module.exports = (io) => {
  // WebSocket连接处理
  io.on("connection", (socket) => {
    console.log("新用户连接:", socket.id);

    // 用户加入聊天室，需要提供userId和username
    socket.on("join", ({ userId, username }) => {
      // 原始逻辑完全不变
      if (!userId || !username) {
        console.log(`用户验证失败：缺少必要信息`);
        socket.emit("user_id_failed", { message: "缺少用户ID或用户名" });
        return;
      }

      if (userIdMap.has(userId)) {
        const existingUsername = userIdMap.get(userId);
        const existingSocketId = Array.from(onlineUsers.entries()).find(([_, name]) => name === existingUsername)?.[0];
        
        if (existingSocketId && existingSocketId !== socket.id && onlineUsers.get(existingSocketId) !== username) {
          console.log(`检测到用户ID ${userId} 已被其他用户名使用，拒绝新连接`);
          socket.emit("user_id_failed", { message: "用户ID已被使用，请重新输入用户名" });
          return;
        }
        
        if (existingSocketId && existingSocketId !== socket.id) {
          console.log(`检测到重复用户ID ${userId}，断开旧连接 ${existingSocketId}`);
          io.sockets.sockets.get(existingSocketId)?.disconnect(true);
          onlineUsers.delete(existingSocketId);
        }
      }

      onlineUsers.set(socket.id, username);
      userIdMap.set(userId, username);
      if (!userInfoMap.has(username)) { // 确保只初始化一次
         userInfoMap.set(username, { userId, username, nickname: username });
      } else {
         // 如果用户已存在，更新其 socket.id 对应的 username
         userInfoMap.get(username).userId = userId;
      }
      
      console.log(`${username} 加入聊天室，用户ID: ${userId}`);

      socket.emit("chat_history", chatHistory);

      const usersList = Array.from(onlineUsers.entries()).map(([socketId, user]) => {
        const userInfo = userInfoMap.get(user);
        return userInfo || { username: user, userId: null };
      });

      io.emit("user_join", {
        username,
        userId,
        nickname: userInfoMap.get(username)?.nickname || username,
        users: usersList,
      });
    });

    // 接收消息并广播
    socket.on("chat_message", (data) => {
      // 原始逻辑完全不变
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

      let processedMessage = { ...data };

      if (processedMessage.userName && !processedMessage.username) {
        processedMessage.username = processedMessage.userName;
        delete processedMessage.userName;
      }
      // 使用最新的昵称（如果已更新）
      processedMessage.username = userInfo.nickname; 
      
      processedMessage.id = Date.now().toString();
      processedMessage.timestamp = new Date().toLocaleTimeString();
      processedMessage.userId = data.userId;
      processedMessage.localId = data.localId;

      if (processedMessage.quote) {
        const quotedUserInfo = userInfoMap.get(processedMessage.quote.username);
        const quoteUserId = quotedUserInfo?.userId || "";
        processedMessage.quote.userId = quoteUserId;
      }

      if (data.mentionedUserIds && Array.isArray(data.mentionedUserIds)) {
        processedMessage.mentionedUserIds = data.mentionedUserIds;
        
        if (!processedMessage.mentions) {
          processedMessage.mentions = [];
          data.mentionedUserIds.forEach(userId => {
            const username = Array.from(userInfoMap.entries()).find(([_, info]) => info.userId === userId)?.[0];
            if (username && !processedMessage.mentions.includes(username)) {
              processedMessage.mentions.push(username);
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
      // 原始逻辑完全不变
      const username = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(username);
      
      if (!userInfo || userInfo.userId !== data.userId) {
        console.log(`弹幕发送验证失败：用户ID不匹配或用户不存在`);
        return;
      }

      console.log(`${username} 发送了弹幕: ${data.content}`);

      const danmuData = {
        content: data.content,
        color: data.color,
        username: userInfo.nickname, // 使用昵称
        userId: data.userId,
        timestamp: data.timestamp
      };

      io.emit('danmu_message', danmuData);
    });

    // 用户断开连接
    socket.on("disconnect", () => {
      // 原始逻辑完全不变
      const username = onlineUsers.get(socket.id);
      if (username) {
        onlineUsers.delete(socket.id);
        console.log(`${username} 离开聊天室`);

        const hasOtherConnections = Array.from(onlineUsers.values()).includes(username);
        
        if (!hasOtherConnections) {
          const userInfo = userInfoMap.get(username);
          if (userInfo) {
            userIdMap.delete(userInfo.userId);
            userInfoMap.delete(username);
          }
        }

        const usersList = Array.from(onlineUsers.entries()).map(([socketId, user]) => {
          const userInfo = userInfoMap.get(user);
          return userInfo || { username: user, userId: null };
        });
        
        io.emit("user_leave", {
          username,
          users: usersList,
        });
      }
    });
  });
};