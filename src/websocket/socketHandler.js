const { 
  onlineUsers, 
  userInfoMap, 
  chatHistory // 暴露 chatHistory 以便写入
} = require('../services/userService');
const { MAX_HISTORY } = require('../config/constants');
const { 
  getUserPoints, 
  addUserPoints, 
  canClaimDailyPoints, 
  claimDailyPoints,
  addUserOnlineMinutes,
  resetUserOnlineMinutes,
  getUserInfo,
  cleanupInactiveUsers
} = require('../services/pointsService');

module.exports = (io) => {
  // 确保只有一个定时器在运行 - 使用全局变量
  if (global.pointsInterval) {
    clearInterval(global.pointsInterval);
    console.log("清理旧的积分定时器");
  }
  
  // 每10分钟为在线用户增加10积分
  global.pointsInterval = setInterval(() => {
    const now = new Date();
    console.log(`[${now.toLocaleTimeString()}] 开始为在线用户增加积分...`);
    
    // 遍历所有在线用户
    onlineUsers.forEach((userId, socketId) => {
      const userInfo = userInfoMap.get(userId);
      if (userInfo && userInfo.coreId) {
        // 为在线用户增加10积分
        const success = addUserPoints(userInfo.coreId, 10);
        if (success) {
          // 增加在线时长（10分钟）
          addUserOnlineMinutes(userInfo.coreId, 10);
          
          // 获取更新后的积分和用户信息
          const updatedPoints = getUserPoints(userInfo.coreId);
          const userData = getUserInfo(userInfo.coreId);
          
          // 向用户发送积分更新通知
          io.to(socketId).emit("points_updated", {
            coreId: userInfo.coreId,
            points: updatedPoints,
            addedPoints: 10,
            canClaimDaily: canClaimDailyPoints(userInfo.coreId), // 添加canClaimDaily状态
            lastClaimDate: userData?.lastDailyClaim || null // 添加最后领取日期
          });
          
          // 广播更新后的用户列表给所有用户，确保积分显示正确
          const updatedUsersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
            const userInfo = userInfoMap.get(uid) || { userId: uid, username: null };
            // 获取每个用户的最新积分信息
            const userPoints = userInfo.coreId ? getUserPoints(userInfo.coreId) : 0;
            return {
              ...userInfo,
              points: userPoints
            };
          });
          
          // 广播更新后的用户列表
          io.emit("users_updated", updatedUsersList);
          
          console.log(`[${now.toLocaleTimeString()}] 用户 ${userInfo.username} 积分增加10，当前积分: ${updatedPoints}`);
        }
      }
    });
  }, 600000); // 每10分钟执行一次（600000毫秒）
  
  console.log("积分定时器已设置，每10分钟执行一次");
  
  // 设置清理不活跃用户的定时器 - 每天执行一次
  if (global.cleanupInterval) {
    clearInterval(global.cleanupInterval);
    console.log("清理旧的清理定时器");
  }
  
  // 每天凌晨2点执行清理不活跃用户
  const scheduleCleanup = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 设置为明天凌晨2点
    
    const timeUntilTomorrow = tomorrow.getTime() - now.getTime();
    
    console.log(`将在 ${tomorrow.toLocaleString()} 执行下一次不活跃用户清理`);
    
    global.cleanupTimeout = setTimeout(() => {
      console.log("开始执行不活跃用户清理...");
      const cleanedCount = cleanupInactiveUsers();
      if (cleanedCount > 0) {
        io.emit("system_notification", {
          type: "info",
          message: `系统已清理 ${cleanedCount} 个超过50天未活跃的用户账户`
        });
      }
      // 递归调用，安排下一次清理
      scheduleCleanup();
    }, timeUntilTomorrow);
  };
  
  // 立即安排第一次清理
  scheduleCleanup();

  // WebSocket连接处理
  io.on("connection", (socket) => {
    console.log("新用户连接:", socket.id);

    // 用户加入聊天室，需要提供userId、username和coreId
    socket.on("join", ({ userId, username, coreId }) => {
      if (!userId || !username || !coreId) {
        console.log(`用户验证失败：缺少必要信息`);
        socket.emit("user_id_failed", { message: "缺少用户ID、用户名或coreId" });
        return;
      }

      // 检查用户是否被踢出且仍在禁期内
      if (global.kickedUsers && global.kickedUsers.has(userId)) {
        const kickInfo = global.kickedUsers.get(userId);
        const now = Date.now();
        
        // 检查是否仍在禁期内
        if (kickInfo.unbanTimestamp === 0 || now < kickInfo.unbanTimestamp) {
          const remainingTime = kickInfo.unbanTimestamp === 0 ? 
            '永久' : 
            Math.ceil((kickInfo.unbanTimestamp - now) / (60 * 1000)) + '分钟';
          
          console.log(`用户 ${username} 尝试重新连接，但仍在禁期内，剩余时间: ${remainingTime}`);
          socket.emit("user_banned", {
            message: `您已被管理员 ${kickInfo.kickedByUsername} 踢出聊天室`,
            reason: kickInfo.reason,
            duration: kickInfo.duration,
            remainingTime: remainingTime,
            timestamp: kickInfo.timestamp
          });
          
          // 断开连接
          socket.disconnect(true);
          return;
        } else {
          // 禁期已过，移除踢人记录
          global.kickedUsers.delete(userId);
          console.log(`用户 ${username} 禁期已过，允许重新连接`);
        }
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
        userInfoMap.set(userId, { userId, username, nickname: username, coreId });
      } else {
        // 更新最新的用户名和coreId（允许重名）
        const info = userInfoMap.get(userId);
        info.username = username;
        info.coreId = coreId;
        userInfoMap.set(userId, info);
      }

      // 获取用户积分信息
      const userPoints = getUserPoints(coreId);
      const canClaim = canClaimDailyPoints(coreId);
      const userInfo = getUserInfo(coreId);

      console.log(`${username} 加入聊天室，用户ID: ${userId}, coreId: ${coreId}, 积分: ${userPoints}`);

      socket.emit("chat_history", chatHistory);
      
      // 发送用户积分信息
      socket.emit("points_info", {
        coreId,
        points: userPoints,
        canClaimDaily: canClaim,
        onlineMinutes: userInfo?.onlineMinutes || 0
      });

      const usersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
        const userInfo = userInfoMap.get(uid) || { userId: uid, username: null };
        // 获取每个用户的积分信息
        const userPoints = userInfo.coreId ? getUserPoints(userInfo.coreId) : 0;
        return {
          ...userInfo,
          points: userPoints
        };
      });

      io.emit("user_join", {
        username,
        userId,
        coreId,
        nickname: userInfoMap.get(userId)?.nickname || username,
        points: userPoints,
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

    // 处理消息撤回
    socket.on('recall_message', (data) => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || userId !== data.userId) {
        console.log(`消息撤回失败：用户ID不匹配或用户不存在`);
        socket.emit("recall_failed", { message: "用户验证失败" });
        return;
      }

      // 查找要撤回的消息
      const messageIndex = chatHistory.findIndex(msg => msg.id === data.messageId);
      
      if (messageIndex === -1) {
        console.log(`消息撤回失败：消息不存在，消息ID: ${data.messageId}`);
        socket.emit("recall_failed", { message: "消息不存在或无权限撤回" });
        return;
      }

      const message = chatHistory[messageIndex];
      
      // 检查消息是否属于当前用户
      if (message.userId !== userId) {
        console.log(`消息撤回失败：无权限撤回此消息`);
        socket.emit("recall_failed", { message: "无权限撤回此消息" });
        return;
      }
      
      // 检查消息发送时间，只允许撤回2分钟内的消息
      const now = Date.now();
      const messageTime = message.timestamp || Date.parse(message.timestamp);
      const timeDiff = now - messageTime;
      const twoMinutes = 2 * 60 * 1000; // 2分钟的毫秒数
      
      if (timeDiff > twoMinutes) {
        console.log(`消息撤回失败：超过撤回时间限制`);
        socket.emit("recall_failed", { message: "消息发送超过2分钟，无法撤回" });
        return;
      }

      // 标记消息为已撤回
      chatHistory[messageIndex] = {
        ...message,
        recalled: true,
        content: "此消息已被撤回",
        type: "recalled"
      };

      // 广播消息撤回事件
      io.emit("message_recalled", {
        messageId: data.messageId,
        userId: userId
      });
    });

    // 处理获取积分请求
    socket.on("get_points", () => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("points_error", { message: "用户信息不完整" });
        return;
      }
      
      const userPoints = getUserPoints(userInfo.coreId);
      const canClaim = canClaimDailyPoints(userInfo.coreId);
      const userData = getUserInfo(userInfo.coreId);
      
      socket.emit("points_info", {
        coreId: userInfo.coreId,
        points: userPoints,
        canClaimDaily: canClaim,
        onlineMinutes: userData?.onlineMinutes || 0,
        lastClaimDate: userData?.lastDailyClaim || null
      });
    });

    // 处理每日积分领取
    socket.on("claim_daily_points", () => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("claim_points_failed", { message: "用户信息不完整" });
        return;
      }
      
      // 检查是否可以领取每日积分
      if (!canClaimDailyPoints(userInfo.coreId)) {
        socket.emit("claim_points_failed", { message: "今日已领取过积分" });
        return;
      }
      
      // 领取每日积分
      const success = claimDailyPoints(userInfo.coreId);
      if (success) {
        const updatedPoints = getUserPoints(userInfo.coreId);
        const canClaim = canClaimDailyPoints(userInfo.coreId);
        
        socket.emit("claim_points_success", {
          coreId: userInfo.coreId,
          points: updatedPoints,
          claimedPoints: 100,
          canClaimDaily: canClaim
        });
        
        console.log(`用户 ${userInfo.username} 领取了每日100积分，当前积分: ${updatedPoints}`);
      } else {
        socket.emit("claim_points_failed", { message: "领取积分失败" });
      }
    });

    // 处理踢人请求
    socket.on('kick_user', (data) => {
      const adminId = onlineUsers.get(socket.id);
      const adminInfo = userInfoMap.get(adminId);
      
      // 验证管理员身份（暂时简化为检查用户是否在线）
      if (!adminInfo) {
        console.log(`踢人失败：用户 ${adminId} 不存在或未登录`);
        socket.emit("kick_failed", { message: "用户未登录" });
        return;
      }
      
      const { userId, username, duration } = data;
      
      // 如果提供了userId，直接使用；否则通过username查找
      let targetUserId = userId;
      let targetUserInfo = userInfoMap.get(userId);
      
      if (!targetUserId && username) {
        // 通过username查找userId
        for (const [uid, info] of userInfoMap.entries()) {
          if (info.username === username || info.nickname === username) {
            targetUserId = uid;
            targetUserInfo = info;
            break;
          }
        }
      }
      
      if (!targetUserInfo) {
        console.log(`踢人失败：目标用户 ${userId || username} 不存在`);
        socket.emit("kick_failed", { message: "目标用户不存在" });
        return;
      }
      
      // 不能踢自己
      if (targetUserId === adminId) {
        console.log(`踢人失败：管理员尝试踢自己`);
        socket.emit("kick_failed", { message: "不能踢出自己" });
        return;
      }
      
      // 查找目标用户的socket
      let targetSocketId = null;
      for (const [sid, uid] of onlineUsers.entries()) {
        if (uid === targetUserId) {
          targetSocketId = sid;
          break;
        }
      }
      
      if (!targetSocketId) {
        console.log(`踢人失败：目标用户 ${targetUserId} 不在线`);
        socket.emit("kick_failed", { message: "目标用户不在线" });
        return;
      }
      
      // 记录踢人信息
      const kickInfo = {
        kickedUserId: targetUserId,
        kickedByUsername: adminInfo.nickname,
        kickedByUserId: adminId,
        duration: duration, // 分钟数，0表示永久
        timestamp: Date.now(),
        reason: data.reason || "违反聊天室规定"
      };
      
      // 存储踢人信息
      if (!global.kickedUsers) {
        global.kickedUsers = new Map();
      }
      
      // 计算解禁时间戳
      let unbanTimestamp = 0;
      if (duration > 0) {
        unbanTimestamp = Date.now() + (duration * 60 * 1000);
      }
      
      global.kickedUsers.set(targetUserId, {
        ...kickInfo,
        unbanTimestamp
      });
      
      // 通知被踢用户
      io.to(targetSocketId).emit("user_kicked", {
        message: `您已被管理员 ${adminInfo.nickname} 踢出聊天室`,
        duration: duration,
        reason: kickInfo.reason,
        timestamp: kickInfo.timestamp
      });
      
      // 断开目标用户连接
      io.sockets.sockets.get(targetSocketId)?.disconnect(true);
      
      // 从在线用户列表中移除
      onlineUsers.delete(targetSocketId);
      
      // 向管理员发送踢人成功通知
      socket.emit("kick_success", {
        message: `已成功踢出用户 ${targetUserInfo.nickname}`,
        kickedUserId: targetUserId,
        kickedUsername: targetUserInfo.nickname,
        duration: duration
      });
      
      // 广播踢人事件给其他用户
      socket.broadcast.emit("user_kicked_notification", {
        kickedUserId: targetUserId,
        kickedUsername: targetUserInfo.nickname,
        kickedByUsername: adminInfo.nickname,
        duration: duration,
        timestamp: kickInfo.timestamp
      });
      
      // 更新用户列表
      const usersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
        return userInfoMap.get(uid) || { userId: uid, username: null };
      });
      
      io.emit("user_list_updated", usersList);
      
      console.log(`管理员 ${adminInfo.nickname} 踢出了用户 ${targetUserInfo.nickname}，时长: ${duration === 0 ? '永久' : duration + '分钟'}`);
    });

    // 用户断开连接
    socket.on("disconnect", () => {
      const userId = onlineUsers.get(socket.id);
      if (userId) {
        onlineUsers.delete(socket.id);
        console.log(`用户 ${userId} 离开聊天室`);

        // 获取用户信息
        const userInfo = userInfoMap.get(userId);
        
        // 重置用户在线时长，防止断开连接后继续累积
        if (userInfo && userInfo.coreId) {
          resetUserOnlineMinutes(userInfo.coreId);
          console.log(`已重置用户 ${userInfo.username} 的在线时长`);
        }

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