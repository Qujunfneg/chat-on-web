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
import './styles/theme.scss'; // 导入主题样式
const username = ref("");

// 生成永不重复的用户ID
const generateUserId = () => {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

// 处理用户名提交
function handleUsernameSubmit() {
  if (username.value.trim()) {
    // 生成用户ID
    const userId = generateUserId();
    
    // 存储到localStorage
    localStorage.setItem("username", username.value.trim());
    localStorage.setItem("userId", userId);
    localStorage.setItem("nickname", username.value.trim());
    
    ElMessage.success(`欢迎，${username.value.trim()}`);
    
    // 强制重新渲染以确保视图更新
    // 由于Vue的响应式系统可能不会立即检测到localStorage的变化
    // 我们可以通过重新加载页面来确保用户立即进入聊天室
    location.reload();
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
  overflow: hidden;
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
