const { MAX_HISTORY } = require('../config/constants');

// 存储在线用户信息 - 使用后台缓存维护
const onlineUsers = new Map(); // socket.id => username
// 存储用户信息映射 - 后台缓存维护userList
const userInfoMap = new Map(); // username => {userId, username, nickname}
// 存储用户ID和用户名的映射关系
const userIdMap = new Map(); // userId => username
// 存储聊天历史
const chatHistory = []; // 注意：这里就是原始代码中的 chatHistory 数组

// 存储临时上传签名信息 (原在全局，现移入服务层)
const tempUploads = new Map();

/**
 * 获取完整在线用户列表（包含ID和昵称）
 * @returns {Array<object>}
 */
function getOnlineUserList() {
    return Array.from(onlineUsers.entries()).map(([socketId, user]) => {
        const userInfo = userInfoMap.get(user);
        return userInfo || { username: user, userId: null };
    });
}

// 暴露 chatHistory 以便 API 路由可以更新它
module.exports = {
  onlineUsers,
  userInfoMap,
  userIdMap,
  chatHistory,
  tempUploads,
  getOnlineUserList
};