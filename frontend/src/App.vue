<template>
  <div class="chart-project-container">
    <div v-if="!hasUsername()" class="username-input-container">
      <!-- 用户名称输入页面 -->
      <h2>欢迎来到聊天室</h2>
      <el-input v-model="username" placeholder="请输入您的昵称" @keyup.enter="handleUsernameSubmit"></el-input>
      <el-button type="primary" @click="handleUsernameSubmit" :disabled="!username.trim()">进入聊天室</el-button>
    </div>
    <div v-else class="main-content">
      <Menu @menuClick="menuClick"></Menu>
      <div class="content-area">
        <Chart
          :style="{ display: current === 'chart' ? 'block' : 'none' }"
        ></Chart>
        <Music
          :style="{ display: current === 'music' ? 'block' : 'none' }"
        ></Music>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue";
import Menu from "./components/menu.vue";
import Chart from "./Chart.vue";
import Music from "./components/music.vue";
import { ElMessage } from "element-plus";
import Setting from "./components/Setting.vue";

const current = ref("chart");
const username = ref("");

// 生成永不重复的用户ID
const generateUserId = () => {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// 检查用户是否已有用户名
const hasUsername = () => {
  const storedUsername = localStorage.getItem("username");
  const storedUserId = localStorage.getItem("userId");
  return !!storedUsername && !!storedUserId;
};

// 初始化时检查用户信息
onMounted(() => {
  // 如果用户已有信息，无需额外操作
});

function menuClick(name) {
  current.value = name;
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
  background-color: #f5f7fa;
}

.username-input-container h2 {
  margin-bottom: 30px;
  color: #303133;
}

.username-input-container .el-input {
  width: 300px;
  margin-bottom: 20px;
}

.username-input-container .el-button {
  width: 300px;
  height: 40px;
}

.content-area {
  flex: 1;
  overflow: hidden;
}
</style>
