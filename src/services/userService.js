const { MAX_HISTORY } = require('../config/constants');

// 存储在线用户信息 - 使用后台缓存维护
// 现在将 onlineUsers 映射为 socket.id => userId，确保同名用户可共存
const onlineUsers = new Map(); // socket.id => userId
// 存储用户信息映射，使用 userId 作为唯一键，允许用户名重复
const userInfoMap = new Map(); // userId => {userId, username, nickname}
// userIdMap 已不再需要，保留空 Map 仅用于兼容可能遗漏的引用
const userIdMap = new Map(); // userId => username（兼容字段）
// 存储聊天历史
const chatHistory = []; // 注意：这里就是原始代码中的 chatHistory 数组

// 存储临时上传签名信息 (原在全局，现移入服务层)
const tempUploads = new Map();

/**
 * 获取完整在线用户列表（包含ID和昵称）
 * @returns {Array<object>}
 */
function getOnlineUserList() {
    return Array.from(onlineUsers.entries()).map(([socketId, userId]) => {
        const userInfo = userInfoMap.get(userId);
        // 如果没有找到用户信息，仍然返回 userId，以便前端可识别
        return userInfo || { userId, username: null };
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