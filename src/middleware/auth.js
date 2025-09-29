const { userIdMap } = require('../services/userService');

// 验证用户ID的中间件 - 使用X-User-Id头部 (逻辑不变)
function validateUserId(req, res, next) {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ success: false, message: "未提供用户ID" });
  }

  const username = userIdMap.get(userId);
  if (!username) {
    return res.status(401).json({ success: false, message: "用户ID无效" });
  }

  req.user = {
    userId,
    username
  };
  next();
}

module.exports = { validateUserId };