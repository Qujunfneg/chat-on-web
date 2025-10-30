<template>
  <div class="chart-project-container">
    <div v-if="!hasUsername()" class="username-input-container">
      <!-- 用户名称输入页面 -->
      <div class="username-input-card">
        <div class="username-title">
            <el-icon class="title-icon"><Message /></el-icon>
            <h2>欢迎来到聊天室</h2>
          </div>
        <p class="input-tip">请输入您的昵称，开始您的聊天之旅吧！</p>
        <el-input 
            v-model="username" 
            placeholder="请输入您的昵称" 
            @keyup.enter="handleUsernameSubmit"
            :prefix-icon="User"
          ></el-input>
        <el-button 
          type="primary" 
          @click="handleUsernameSubmit" 
          :disabled="!username.trim()"
        >
          进入聊天室
        </el-button>
      </div>
    </div>
    <div v-else class="main-content">
      <Menu class="menu" @menuClick="setActiveMenu" />
      <div class="content-area">
        <Chart v-show="currentMenu === 'chart'"></Chart>
        <Music v-show="currentMenu === 'music'"/>
        <Profile v-show="currentMenu === 'profile'"/>
        <Setting v-if="currentMenu === 'settings'"/>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue";
import Chart from "./Chart.vue";
import { ElMessage } from "element-plus";
import { Message, User } from '@element-plus/icons-vue';
import Setting from "./components/Setting.vue";
import Menu from "./components/Menu.vue";
import Music from "./components/Music.vue";
import Profile from "./views/Profile.vue";
import { io } from "socket.io-client";
import './styles/theme.scss'; // 导入主题样式
const username = ref("");

// 生成永不重复的用户ID
const generateUserId = () => {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// 生成永不重复的coreId
const generateCoreId = () => {
  return 'core_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// 获取或生成coreId
const getCoreId = () => {
  let storedCoreId = localStorage.getItem("coreId");
  if (!storedCoreId) {
    storedCoreId = generateCoreId();
    localStorage.setItem("coreId", storedCoreId);
  }
  return storedCoreId;
};
const currentMenu = ref('chart');

// 检查用户是否已有用户名
const hasUsername = () => {
  const storedUsername = localStorage.getItem("username");
  const storedUserId = localStorage.getItem("userId");
  return !!storedUsername && !!storedUserId;
};

// 初始化时检查用户信息
onMounted(() => {
  // 如果用户已有信息，无需额外操作
  
  // 初始化主题
  const savedTheme = localStorage.getItem('theme') || 'default';
  document.body.classList.add(`theme-${savedTheme}`);
});

function setActiveMenu(name) {
  currentMenu.value = name;
}

// 获取或生成userId
const getUserId = () => {
  let storedUserId = localStorage.getItem("userId");
  if (!storedUserId) {
    storedUserId = generateUserId();
    localStorage.setItem("userId", storedUserId);
  }
  return storedUserId;
};

// 处理用户名提交
function handleUsernameSubmit() {
  if (username.value.trim()) {
    const kickTime = Number(localStorage.getItem("kickTime"));
    const duration = Number(localStorage.getItem("duration"));
    if (kickTime && duration) {
      const now = Date.now();
      const remainingTime = duration*60*1000 - (now - kickTime);
      if (remainingTime > 0) {
        ElMessage.error(`您已被禁言 ${Math.ceil(remainingTime / 60000)} 分钟`);
        return;
      }
    }
    // 获取或生成userId（使用已存在的，而不是每次都生成新的）
    const userId = getUserId();
    
    // 获取或生成coreId
    const coreId = getCoreId();
    
    // 存储到localStorage
    localStorage.removeItem("kickTime");
    localStorage.removeItem("duration");
    localStorage.removeItem("userKicked");
    localStorage.setItem("username", username.value.trim());
    localStorage.setItem("nickname", username.value.trim());
    // userId和coreId已经在getUserId和getCoreId函数中存储到localStorage
    
    // 创建临时WebSocket连接检查用户是否被踢
    // 使用相对路径，让WebSocket自动使用当前页面的主机地址
    const tempSocket = io();
    let isBanned = false;
    
    // 设置超时，如果1秒内没有收到user_banned事件，则认为用户未被踢
    const timeout = setTimeout(() => {
      if (!isBanned) {
        tempSocket.disconnect();
        ElMessage.success(`欢迎，${username.value.trim()}`);
        // 不再使用location.reload()，而是直接更新状态
        window.location.href = window.location.origin;
      }
    }, 1000);
    
    // 监听user_banned事件
    tempSocket.on('user_banned', (data) => {
      isBanned = true;
      clearTimeout(timeout);
      tempSocket.disconnect();
      
      // 显示被踢信息
      ElMessage.error({
        message: data.message,
        duration: 0, // 不自动关闭
        showClose: true
      });
      
      // 显示被踢原因和剩余时间
      ElMessage.error(`原因：${data.reason || "违反聊天室规定"}，剩余禁期：${data.remainingTime}`);
      
      // 清除用户信息
      localStorage.removeItem("username");
      localStorage.removeItem("nickname");
      localStorage.removeItem("userId");
      localStorage.removeItem("coreId");
      
      // 重置输入框
      username.value = "";
    });
    
    // 尝试加入聊天室
    tempSocket.emit('join', {
      userId,
      username: username.value.trim(),
      coreId
    });
  }
}

// 处理昵称更新
function handleNicknameUpdated(newNickname) {
  // 通知所有使用用户昵称的组件更新
  ElMessage.success(`昵称已更新为：${newNickname}`);
}
</script>

<style>
.chart-project-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  display: flex;
  width: 100%;
  height: 100%;
}

/* 用户名输入页面样式 */
.username-input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  background-color: var(--background-primary);
  transition: background-color 0.5s ease;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.username-input-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at top right, var(--accent-light) 0%, transparent 50%),
              radial-gradient(circle at bottom left, var(--accent-light) 0%, transparent 50%);
  opacity: 0.15;
  pointer-events: none;
}

/* 主内容卡片 */
.username-input-card {
  background-color: var(--background-secondary);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
  text-align: center;
  z-index: 1;
  transition: all 0.5s ease;
  max-width: 400px;
  width: 100%;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.username-input-card:hover {
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.username-input-container h2 {
  margin-bottom: 30px;
  color: var(--text-primary);
  font-size: 28px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-primary-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
}

.username-input-container .el-input {
  width: 100%;
  max-width: 300px;
  margin: 0 auto 24px;
  transition: all 0.3s ease;
}

.username-input-container .el-input:hover .el-input__wrapper {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.username-input-container .el-input__wrapper {
  border-radius: 12px;
  height: 50px;
}

.username-input-container .el-input__inner {
  height: 50px;
  font-size: 16px;
}

.username-input-container .el-button {
  width: 100%;
  max-width: 300px;
  height: 50px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.username-input-container .el-button--primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

/* 页面标题样式增强 */
.username-title {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 12px;
  margin-bottom: 30px;
}

.title-icon {
  font-size: 32px;
  color: var(--accent-primary);
  animation: pulse 2s infinite;
  margin-top: 4px;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* 输入提示文本 */
.input-tip {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.4;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  height: 100%;
  background-color: var(--bg-secondary);
  transition: all 0.3s ease;
}

/* 菜单容器样式 */
.main-content > .menu {
  flex-shrink: 0;
}
</style>

<style>
/* 响应式媒体查询 - 手机端布局优化 */
@media screen and (max-width: 768px) {
  /* 用户名输入页面在手机端的样式调整 */
  .username-input-container .el-input {
    width: 100%;
    max-width: 300px;
  }
  
  .username-input-container .el-button {
    width: 100%;
    max-width: 300px;
  }
  
  /* 主内容区域在手机端的样式调整 */
  .main-content {
    flex-direction: column;
  }
  
  /* 手机端隐藏导航菜单 */
  .main-content > .menu {
    display: none !important;
  }
  
  /* 确保内容区域在手机端充满屏幕 */
  .content-area {
    width: 100%;
    height: 100%;
  }
}

/* PC端样式保持不变 - 不需要额外修改 */
</style>
