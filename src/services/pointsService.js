const fs = require("fs");
const path = require("path");

// 积分数据存储文件路径
const POINTS_DATA_FILE = path.join(__dirname, "..", "data", "points.json");

// 确保数据目录存在
function ensureDataDirectory() {
  const dataDir = path.dirname(POINTS_DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 初始化积分数据文件
function initializePointsData() {
  ensureDataDirectory();
  if (!fs.existsSync(POINTS_DATA_FILE)) {
    fs.writeFileSync(POINTS_DATA_FILE, JSON.stringify({}), "utf8");
  }
}

// 读取积分数据
function readPointsData() {
  initializePointsData();
  try {
    const data = fs.readFileSync(POINTS_DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("读取积分数据失败:", error);
    return {};
  }
}

// 写入积分数据
function writePointsData(data) {
  initializePointsData();
  try {
    fs.writeFileSync(POINTS_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("写入积分数据失败:", error);
    return false;
  }
}

// 获取用户积分
function getUserPoints(coreId) {
  if (!coreId) return 0;
  
  const data = readPointsData();
  const userPoints = data[coreId];
  
  if (!userPoints) {
    return 0;
  }
  
  return userPoints.points || 0;
}

// 增加用户积分
function addUserPoints(coreId, points) {
  if (!coreId || points <= 0) return false;
  
  const data = readPointsData();
  
  if (!data[coreId]) {
    data[coreId] = {
      coreId: coreId,
      points: 0,
      createdAt: new Date().toISOString(),
      lastDailyClaim: null,
      onlineMinutes: 0
    };
  }
  
  data[coreId].points += points;
  data[coreId].updatedAt = new Date().toISOString();
  
  return writePointsData(data);
}

// 减少用户积分
function reduceUserPoints(coreId, points) {
  if (!coreId || points <= 0) return false;
  
  const data = readPointsData();
  
  if (!data[coreId] || data[coreId].points < points) {
    return false;
  }
  
  data[coreId].points -= points;
  data[coreId].updatedAt = new Date().toISOString();
  
  return writePointsData(data);
}

// 检查用户是否可以领取每日积分
function canClaimDailyPoints(coreId) {
  if (!coreId) return false;
  
  const data = readPointsData();
  const userPoints = data[coreId];
  
  if (!userPoints || !userPoints.lastDailyClaim) {
    return true;
  }
  
  const lastClaimDate = new Date(userPoints.lastDailyClaim);
  const today = new Date();
  
  // 检查是否是同一天
  return (
    lastClaimDate.getFullYear() !== today.getFullYear() ||
    lastClaimDate.getMonth() !== today.getMonth() ||
    lastClaimDate.getDate() !== today.getDate()
  );
}

// 领取每日积分
function claimDailyPoints(coreId, dailyPoints = 100) {
  if (!coreId || !canClaimDailyPoints(coreId)) return false;
  
  const data = readPointsData();
  
  if (!data[coreId]) {
    data[coreId] = {
      coreId: coreId,
      points: 0,
      createdAt: new Date().toISOString(),
      lastDailyClaim: null,
      onlineMinutes: 0
    };
  }
  
  data[coreId].points += dailyPoints;
  data[coreId].lastDailyClaim = new Date().toISOString();
  data[coreId].updatedAt = new Date().toISOString();
  
  return writePointsData(data);
}

// 增加用户在线时长（分钟）
function addUserOnlineMinutes(coreId, minutes) {
  if (!coreId || minutes <= 0) return false;
  
  const data = readPointsData();
  
  if (!data[coreId]) {
    data[coreId] = {
      coreId: coreId,
      points: 0,
      createdAt: new Date().toISOString(),
      lastDailyClaim: null,
      onlineMinutes: 0
    };
  }
  
  data[coreId].onlineMinutes = (data[coreId].onlineMinutes || 0) + minutes;
  data[coreId].updatedAt = new Date().toISOString();
  
  return writePointsData(data);
}

// 重置用户在线时长（分钟）
function resetUserOnlineMinutes(coreId) {
  if (!coreId) return false;
  
  const data = readPointsData();
  
  if (!data[coreId]) {
    data[coreId] = {
      coreId: coreId,
      points: 0,
      createdAt: new Date().toISOString(),
      lastDailyClaim: null,
      onlineMinutes: 0
    };
  }
  
  data[coreId].onlineMinutes = 0;
  data[coreId].updatedAt = new Date().toISOString();
  
  return writePointsData(data);
}

// 获取用户详细信息
function getUserInfo(coreId) {
  if (!coreId) return null;
  
  const data = readPointsData();
  return data[coreId] || null;
}

// 清理不活跃用户（50天未活跃）
function cleanupInactiveUsers() {
  const data = readPointsData();
  const now = new Date();
  const fiftyDaysAgo = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
  
  let cleanedCount = 0;
  const newData = {};
  
  // 遍历所有用户，保留活跃用户
  Object.keys(data).forEach(coreId => {
    const user = data[coreId];
    const lastActiveDate = new Date(user.updatedAt || user.createdAt);
    
    // 如果用户在50天内活跃过，则保留
    if (lastActiveDate > fiftyDaysAgo) {
      newData[coreId] = user;
    } else {
      cleanedCount++;
      console.log(`清理不活跃用户: ${coreId}, 最后活跃时间: ${lastActiveDate.toISOString()}`);
    }
  });
  
  // 如果有用户被清理，则更新数据文件
  if (cleanedCount > 0) {
    writePointsData(newData);
    console.log(`清理完成，共清理了 ${cleanedCount} 个不活跃用户`);
  }
  
  return cleanedCount;
}

// 导出所有功能
module.exports = {
  getUserPoints,
  addUserPoints,
  reduceUserPoints,
  canClaimDailyPoints,
  claimDailyPoints,
  addUserOnlineMinutes,
  resetUserOnlineMinutes,
  getUserInfo,
  cleanupInactiveUsers,
  POINTS_DATA_FILE
};