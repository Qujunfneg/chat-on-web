const { userInfoMap } = require('../services/userService');
const { getUserInfo } = require('../services/pointsService');

// 验证用户ID的中间件 - 使用X-User-Id头部
function validateUserId(req, res, next) {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ success: false, message: "未提供用户ID" });
  }
  
  // 首先检查userInfoMap中是否存在该用户（Socket.IO连接的用户）
  let userInfo = userInfoMap.get(userId);
  
  // 如果userInfoMap中没有，尝试从pointsService中获取用户信息
  if (!userInfo) {
    try {
      // 从pointsService获取用户信息
      const pointsUserInfo = getUserInfo(userId);
      if (pointsUserInfo) {
        // 如果pointsService中有该用户信息，创建一个临时的userInfo对象
        userInfo = {
          userId: userId,
          username: pointsUserInfo.username || `用户${userId}`,
          nickname: pointsUserInfo.nickname || pointsUserInfo.username || `用户${userId}`,
          coreId: userId
        };
        
        // 将用户信息添加到userInfoMap中，以便后续请求使用
        userInfoMap.set(userId, userInfo);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  }
  
  if (!userInfo) {
    return res.status(401).json({ success: false, message: "用户ID无效" });
  }
  
  req.user = {
    userId,
    username: userInfo.username,
    coreId: userInfo.coreId
  };
  next();
}

module.exports = { validateUserId };