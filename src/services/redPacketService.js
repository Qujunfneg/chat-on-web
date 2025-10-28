const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// 红包数据存储文件路径
const REDPACKET_DATA_FILE = path.join(__dirname, "..", "data", "redPackets.json");

// 红包状态枚举
const RED_PACKET_STATUS = {
  ACTIVE: 'active',       // 活跃状态(可领取)
  EXPIRED: 'expired',     // 已过期
  COMPLETED: 'completed'  // 已领完
};

// 确保数据目录存在
function ensureDataDirectory() {
  const dataDir = path.dirname(REDPACKET_DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 初始化红包数据文件
function initializeRedPacketData() {
  ensureDataDirectory();
  if (!fs.existsSync(REDPACKET_DATA_FILE)) {
    fs.writeFileSync(REDPACKET_DATA_FILE, JSON.stringify({}), "utf8");
  }
}

// 读取红包数据
function readRedPacketData() {
  initializeRedPacketData();
  try {
    const data = fs.readFileSync(REDPACKET_DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("读取红包数据失败:", error);
    return {};
  }
}

// 写入红包数据
function writeRedPacketData(data) {
  initializeRedPacketData();
  try {
    fs.writeFileSync(REDPACKET_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("写入红包数据失败:", error);
    return false;
  }
}

// 使用二倍均值法生成随机金额
function generateRandomAmounts(totalAmount, totalCount) {
  const amounts = [];
  let remainingAmount = totalAmount;
  let remainingCount = totalCount;
  
  // 设置最小金额为1积分
  for (let i = 0; i < totalCount - 1; i++) {
    // 二倍均值法: 每次随机金额在 [1, 剩余金额/剩余人数×2] 范围内
    const maxAmount = Math.floor((remainingAmount / remainingCount) * 2);
    const amount = Math.floor(Math.random() * (maxAmount - 1)) + 1;
    
    amounts.push(amount);
    remainingAmount -= amount;
    remainingCount--;
  }
  
  // 最后一个红包获得剩余所有金额
  amounts.push(remainingAmount);
  
  // 打乱顺序
  return shuffleArray(amounts);
}

// 数组打乱函数
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 检查并更新红包状态
function checkAndUpdateRedPacketStatus(redPacket) {
  const now = Date.now();
  
  // 检查是否过期
  if (now > redPacket.expireTime && redPacket.status !== RED_PACKET_STATUS.EXPIRED) {
    redPacket.status = RED_PACKET_STATUS.EXPIRED;
    return RED_PACKET_STATUS.EXPIRED;
  }
  
  // 检查是否已领完
  if (redPacket.remainingCount === 0 && redPacket.status !== RED_PACKET_STATUS.COMPLETED) {
    redPacket.status = RED_PACKET_STATUS.COMPLETED;
    return RED_PACKET_STATUS.COMPLETED;
  }
  
  return redPacket.status;
}

// 创建红包
function createRedPacket(senderCoreId, senderId, senderName, type, totalAmount, totalCount, greeting) {
  if (!senderCoreId || !senderId || !senderName || !type || !totalAmount || !totalCount) {
    return { success: false, message: "缺少必要参数" };
  }
  
  if (totalAmount < totalCount) {
    return { success: false, message: "总金额不能小于红包个数" };
  }
  
  // 生成红包ID
  const redPacketId = `rp_${uuidv4()}`;
  const now = Date.now();
  
  // 创建红包数据
  const redPacket = {
    id: redPacketId,
    senderId: senderId,
    senderName: senderName,
    senderCoreId: senderCoreId,
    type: type, // 'random' 或 'average'
    totalAmount: totalAmount,
    totalCount: totalCount,
    remainingAmount: totalAmount,
    remainingCount: totalCount,
    greeting: greeting || "恭喜发财，大吉大利",
    createTime: now,
    expireTime: now + 24 * 60 * 60 * 1000, // 24小时后过期
    status: RED_PACKET_STATUS.ACTIVE,
    receivers: []
  };
  
  // 如果是随机红包，预先生成随机金额序列
  if (type === 'random') {
    redPacket.amounts = generateRandomAmounts(totalAmount, totalCount);
  }
  
  // 保存红包数据
  const data = readRedPacketData();
  data[redPacketId] = redPacket;
  const success = writeRedPacketData(data);
  
  if (!success) {
    return { success: false, message: "保存红包数据失败" };
  }
  
  return { 
    success: true, 
    redPacketId: redPacketId,
    redPacket: {
      id: redPacket.id,
      type: redPacket.type,
      totalAmount: redPacket.totalAmount,
      totalCount: redPacket.totalCount,
      greeting: redPacket.greeting,
      status: redPacket.status
    }
  };
}

// 领取红包
function receiveRedPacket(redPacketId, receiverCoreId, receiverId, receiverName) {
  console.log(`[RECEIVE] 开始领取红包:`, {
    redPacketId,
    receiverCoreId,
    receiverId,
    receiverName
  });
  
  // 参数验证
  if (!redPacketId || !receiverCoreId || !receiverId || !receiverName) {
    console.log(`[RECEIVE] 参数验证失败`);
    return { 
      success: false, 
      message: "缺少必要参数" 
    };
  }
  
  try {
    // 读取红包数据
    const data = readRedPacketData();
    const redPacket = data[redPacketId];
    
    if (!redPacket) {
      console.log(`[RECEIVE] 红包不存在: ${redPacketId}`);
      return { 
        success: false, 
        message: "红包不存在" 
      };
    }
    
    console.log(`[RECEIVE] 找到红包:`, {
      id: redPacket.id,
      type: redPacket.type,
      totalAmount: redPacket.totalAmount,
      remainingAmount: redPacket.remainingAmount,
      remainingCount: redPacket.remainingCount
    });
    
    // 检查并更新红包状态
    checkAndUpdateRedPacketStatus(redPacket);
    
    // 检查红包是否已过期
    if (redPacket.status === RED_PACKET_STATUS.EXPIRED) {
      console.log(`[RECEIVE] 红包已过期`);
      return { 
        success: false, 
        message: "红包已过期" 
      };
    }
    
    // 检查红包是否已领完
    if (redPacket.status === RED_PACKET_STATUS.COMPLETED) {
      console.log(`[RECEIVE] 红包已领完`);
      return { 
        success: false, 
        message: "红包已领完" 
      };
    }
    
    // 检查用户是否已领取过
    const alreadyReceived = redPacket.receivers.find(r => r.coreId === receiverCoreId);
    if (alreadyReceived) {
      console.log(`[RECEIVE] 用户已领取过红包: ${receiverCoreId}`);
      return { 
        success: false, 
        message: "您已经领取过这个红包了" 
      };
    }
    
    // 计算领取金额
    let receiveAmount;
    if (redPacket.type === 'average') {
      // 普通红包，平均分配
      receiveAmount = Math.floor(redPacket.totalAmount / redPacket.totalCount);
    } else {
      // 随机红包，从预先生成的金额序列中取一个
      const nextIndex = redPacket.totalCount - redPacket.remainingCount;
      receiveAmount = redPacket.amounts[nextIndex];
    }
    
    console.log(`[RECEIVE] 计算领取金额: ${receiveAmount}`);
    
    // 更新红包状态
    redPacket.remainingAmount -= receiveAmount;
    redPacket.remainingCount -= 1;
    
    // 添加领取记录
    const receiverRecord = {
      userId: receiverId,
      username: receiverName,
      coreId: receiverCoreId,
      amount: receiveAmount,
      receiveTime: Date.now()
    };
    
    redPacket.receivers.push(receiverRecord);
    
    console.log(`[RECEIVE] 添加领取记录:`, receiverRecord);
    
    // 检查是否已领完
    checkAndUpdateRedPacketStatus(redPacket);
    
    console.log(`[RECEIVE] 更新后红包状态:`, {
      remainingAmount: redPacket.remainingAmount,
      remainingCount: redPacket.remainingCount,
      status: redPacket.status
    });
    
    // 保存红包数据
    console.log(`[RECEIVE] 保存红包数据...`);
    const saveSuccess = writeRedPacketData(data);
    
    if (!saveSuccess) {
      console.log(`[RECEIVE] 保存红包数据失败`);
      return { 
        success: false, 
        message: "保存红包数据失败" 
      };
    }
    
    console.log(`[RECEIVE] 红包数据保存成功`);
    
    // 返回成功结果
    const result = {
      success: true,
      amount: receiveAmount,
      remainingCount: redPacket.remainingCount,
      totalCount: redPacket.totalCount,
      status: redPacket.status,
      receiver: receiverRecord
    };
    
    console.log(`[RECEIVE] 返回结果:`, result);
    
    return result;
  } catch (error) {
    console.error(`[RECEIVE] 领取红包异常:`, error);
    return { 
      success: false, 
      message: "领取红包时发生异常" 
    };
  }
}

// 获取红包详情
function getRedPacketDetails(redPacketId, coreId) {
  if (!redPacketId) {
    return { success: false, message: "缺少红包ID" };
  }
  
  // 读取红包数据
  const data = readRedPacketData();
  const redPacket = data[redPacketId];
  
  if (!redPacket) {
    return { success: false, message: "红包不存在" };
  }
  
  // 检查并更新红包状态
  checkAndUpdateRedPacketStatus(redPacket);
  
  // 检查用户是否已领取
  const userReceived = redPacket.receivers.find(r => r.coreId === coreId);
  const receivedAmount = userReceived ? userReceived.amount : 0;
  
  // 构造返回数据
  const result = {
    success: true,
    id: redPacket.id,
    senderName: redPacket.senderName,
    type: redPacket.type,
    totalAmount: redPacket.totalAmount,
    totalCount: redPacket.totalCount,
    remainingCount: redPacket.remainingCount,
    greeting: redPacket.greeting,
    status: redPacket.status,
    createTime: redPacket.createTime,
    expireTime: redPacket.expireTime,
    isReceived: !!userReceived,
    receivedAmount: receivedAmount,
    receivers: redPacket.receivers
  };
  
  return result;
}

// 获取用户发送和接收的红包记录
function getUserRedPacketHistory(coreId, userId, limit = 20) {
  if (!coreId) {
    return { success: false, message: "缺少用户coreId" };
  }
  
  // 读取红包数据
  const data = readRedPacketData();
  
  const sentRedPackets = [];
  const receivedRedPackets = [];
  
  // 遍历所有红包
  for (const redPacketId in data) {
    const redPacket = data[redPacketId];
    
    // 检查并更新红包状态
    checkAndUpdateRedPacketStatus(redPacket);
    
    // 发送的红包
    if (redPacket.senderCoreId === coreId) {
      sentRedPackets.push({
        id: redPacket.id,
        type: redPacket.type,
        totalAmount: redPacket.totalAmount,
        totalCount: redPacket.totalCount,
        remainingCount: redPacket.remainingCount,
        greeting: redPacket.greeting,
        status: redPacket.status,
        createTime: redPacket.createTime
      });
    }
    
    // 接收的红包
    const receivedRecord = redPacket.receivers.find(r => r.coreId === coreId);
    if (receivedRecord) {
      receivedRedPackets.push({
        id: redPacket.id,
        senderName: redPacket.senderName,
        type: redPacket.type,
        amount: receivedRecord.amount,
        greeting: redPacket.greeting,
        receiveTime: receivedRecord.receiveTime
      });
    }
  }
  
  // 按时间排序
  sentRedPackets.sort((a, b) => b.createTime - a.createTime);
  receivedRedPackets.sort((a, b) => b.receiveTime - a.receiveTime);
  
  // 限制返回数量
  return {
    success: true,
    sent: sentRedPackets.slice(0, limit),
    received: receivedRedPackets.slice(0, limit)
  };
}

// 清理过期红包数据
function cleanupExpiredRedPackets() {
  const data = readRedPacketData();
  const now = Date.now();
  let cleanedCount = 0;
  
  // 遍历所有红包
  for (const redPacketId in data) {
    const redPacket = data[redPacketId];
    
    // 检查并更新红包状态
    checkAndUpdateRedPacketStatus(redPacket);
    
    // 删除超过7天的过期红包
    if (redPacket.status === RED_PACKET_STATUS.EXPIRED && 
        now - redPacket.expireTime > 7 * 24 * 60 * 60 * 1000) {
      delete data[redPacketId];
      cleanedCount++;
    }
  }
  
  // 保存更新后的数据
  if (cleanedCount > 0) {
    writeRedPacketData(data);
    console.log(`清理了 ${cleanedCount} 个过期红包数据`);
  }
  
  return cleanedCount;
}

// 设置定时清理过期红包
function scheduleCleanup() {
  // 每天凌晨3点执行一次清理
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(3, 0, 0, 0);
  
  const timeUntilTomorrow = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    cleanupExpiredRedPackets();
    // 递归调用，安排下一次清理
    scheduleCleanup();
  }, timeUntilTomorrow);
  
  console.log(`将在 ${tomorrow.toLocaleString()} 执行下一次过期红包清理`);
}

// 初始化时启动定时清理
scheduleCleanup();

module.exports = {
  RED_PACKET_STATUS,
  createRedPacket,
  receiveRedPacket,
  getRedPacketDetails,
  getUserRedPacketHistory,
  cleanupExpiredRedPackets
};