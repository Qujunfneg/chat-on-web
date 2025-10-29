<template>
  <div class="user-list">
    <!-- 加载状态 - 骨架屏 -->
    <div v-if="isLoading" class="skeleton-container">
      <h3>在线 (0)</h3>
      <div class="user-items">
        <!-- 生成5个骨架屏用户项 -->
        <div v-for="i in 5" :key="i" class="skeleton-user-item">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-username"></div>
          <div class="skeleton-hotness"></div>
        </div>
      </div>
    </div>
    <!-- 用户列表 -->
    <div v-else>
      <h3 class="user-list-title">在线 ({{ sortedUsers.length }})</h3>
      <div class="user-items">
        <div 
          v-for="user in sortedUsers" 
          :key="user.userId || user.username" 
          class="user-item"
          :class="{ 'current-user': isCurrentUser(user) }"
          @contextmenu="handleUserContextMenu($event, user)"
        >
          <div
            class="avatar"
            :style="{ backgroundColor: getAvatarColor(getDisplayUsername(user)) }"
          >
            {{ getAvatarText(getDisplayUsername(user)) }}
            <span v-if="isCurrentUser(user)" class="current-user-indicator">我</span>
          </div>
          <span class="username" :title="getDisplayUsername(user)">{{ formatUsername(getDisplayUsername(user)) }}</span>
          <span class="hotness">
            🔥 {{ getMessageCount(user) }}
          </span>
          <span class="points">
            💰 {{ getUserPoints(user) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { getAvatarColor, getAvatarText } from '../utils/chatUtils';

export default {
  name: 'UserList',
  props: {
    users: {
      type: Array,
      default: () => []
    },
    messages: {
      type: Array,
      default: () => []
    },
    userInfoMap: {
      type: Object,
      default: () => ({})
    },
    currentUsername: {
      type: String,
      default: ''
    },
    currentUserId: {
      type: String,
      default: ''
    },
    isLoading: {
      type: Boolean,
      default: true
    }
  },
  emits: ['userContextMenu'],
  setup(props, { emit }) {
    // 获取用户消息数量（热度）
    const getMessageCount = (user) => {
      const userId = user.userId
      return props.messages.filter((m) => m.userId === userId).length;
    };

    // 获取用户积分
    const getUserPoints = (user) => {
      // 直接使用用户对象中的points字段，而不是从userInfoMap获取
      return user?.points || 0;
    };

    // 获取显示的用户名（优先使用昵称）
    const getDisplayUsername = (user) => {
      if (typeof user === 'string') {
        return props.userInfoMap[user]?.nickname || user;
      }
      return props.userInfoMap[user.username]?.nickname || user.username || user;
    };

    // 判断是否为当前用户，优先使用userId
    const isCurrentUser = (user) => {
      // 如果提供了currentUserId，优先使用userId匹配
      if (props.currentUserId) {
        return typeof user === 'string' ? 
          false : // 字符串用户没有userId，无法匹配
          user.userId === props.currentUserId;
      }
      // 降级处理：如果没有提供userId，则使用username匹配（保持兼容性）
      const username = typeof user === 'string' ? user : user.username;
      return username === props.currentUsername;
    };

    // 处理用户名过长显示
    const formatUsername = (username) => {
      if (username.length > 12) {
        return username.substring(0, 10) + '...';
      }
      return username;
    };

    // 计算排序后的用户列表，当前用户置顶，其余按热度排序
    const sortedUsers = computed(() => {
      // 确保输入数据是对象数组
      const userObjects = props.users.map(user => {
        if (typeof user === 'string') {
          // 对于字符串用户，转换为对象格式，保留所有可能的字段
          return {
            username: user,
            userId: null, // 字符串用户没有userId
            points: 0 // 默认积分为0
          };
        }
        // 确保对象用户有points字段
        if (user.points === undefined) {
          user.points = 0;
        }
        return user;
      });
      
      // 使用Map进行去重，优先基于userId，没有userId再基于username
      const uniqueUsersMap = new Map();
      userObjects.forEach(user => {
        if (user.userId) {
          uniqueUsersMap.set(user.userId, user);
        } else {
          uniqueUsersMap.set(user.username, user);
        }
      });
      const uniqueUsers = Array.from(uniqueUsersMap.values());
      
      // 分离当前用户和其他用户
      const currentUser = uniqueUsers.find(user => isCurrentUser(user));
      const otherUsers = uniqueUsers.filter(user => !isCurrentUser(user));
      
      // 对其他用户按消息数量（热度）降序排序
      otherUsers.sort((a, b) => {
        const countA = getMessageCount(a);
        const countB = getMessageCount(b);
        return countB - countA;
      });
      
      // 组合结果，当前用户置顶
      return currentUser ? [currentUser, ...otherUsers] : otherUsers;
    });

    // 处理用户右键菜单
    const handleUserContextMenu = (event, user) => {
      event.preventDefault();
      emit('userContextMenu', { event, user });
    };

    return {
      getAvatarColor,
      getAvatarText,
      getMessageCount,
      getUserPoints,
      sortedUsers,
      getDisplayUsername,
      isCurrentUser,
      formatUsername,
      handleUserContextMenu
    };
  }
};
</script>

<style scoped>
.user-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--user-list-back-color);
  border-radius: 8px;
  padding: 0 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.user-list-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.user-list-title::before {
  content: "👥";
  margin-right: 8px;
  font-size: 20px;
}

.user-items {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  height: calc(100vh - 90px);
  /* Firefox浏览器滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) var(--background-tertiary);
}

/* WebKit浏览器 (Chrome, Safari, Edge) 滚动条样式 */
.user-items::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.user-items::-webkit-scrollbar-track {
  background: var(--background-tertiary);
  border-radius: 4px;
}

.user-items::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.user-items::-webkit-scrollbar-thumb:hover {
  background: var(--accent-primary-light);
}

.user-item {
  display: flex;
  align-items: center;
  padding: 8px;
  margin-bottom: 8px;
  background-color: var(--background-secondary);
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  border: 2px solid transparent;
}

.theme-dark .user-list .user-item:not(.current-user) {
  border-color: var(--user-border-color);
}

.user-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: var(--accent-primary-light);
}

.user-item.current-user {
  background-color: var(--user-back-color);
  border-color: var(--accent-primary);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 16px;
  margin-right: 12px;
  position: relative;
  flex-shrink: 0;
}

.current-user-indicator {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background-color: var(--success-color);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: normal;
  min-width: 18px;
  text-align: center;
  border: 2px solid var(--background-secondary);
}

.username {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hotness {
  font-size: 12px;
  color: var(--user-fire-color);
  font-weight: 500;
  background-color: var(--background-tertiary);
  padding: 2px 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  margin-right: 4px;
}

.points {
  font-size: 12px;
  color: var(--accent-primary);
  font-weight: 500;
  background-color: var(--background-tertiary);
  padding: 2px 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
}

.skeleton-container {
  padding: 16px 0;
}

.skeleton-user-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background-color: var(--background-secondary);
  border-radius: 8px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #e6f7ff;
  margin-right: 12px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-username {
  flex: 1;
  height: 16px;
  background-color: #f0f0f0;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-hotness {
  width: 50px;
  height: 20px;
  background-color: #fff7e6;
  border-radius: 10px;
  animation: skeleton-loading 1.5s infinite;
}

/* 暗黑模式下的骨架屏样式 */
.theme-dark .skeleton-avatar {
  background-color: var(--background-tertiary);
}

.theme-dark .skeleton-username {
  background-color: var(--background-tertiary);
}

.theme-dark .skeleton-hotness {
  background-color: var(--background-tertiary);
}

@keyframes skeleton-loading {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 0.6;
  }
}
</style>