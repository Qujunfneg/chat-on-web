<template>
  <div class="theme-selector">
    <el-button 
      @click="toggleTheme"
      type="text"
      size="small"
      class="theme-toggle-btn"
      title="切换到暗黑模式"
      v-if="currentTheme === 'default'"
    >
      <el-icon><Sunny /></el-icon>
    </el-button>
    <el-button 
      @click="toggleTheme"
      type="text"
      size="small"
      class="theme-toggle-btn"
      title="切换到默认模式"
      v-else
    >
      <el-icon><Moon /></el-icon>
    </el-button>
  </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance } from 'vue';
import { emitGlobalEvent, useEventBus } from '../utils/eventBus.js';
import { GLOBAL_EVENTS } from '../utils/eventBus.js';
import { ElIcon } from 'element-plus';
import { Sunny, Moon } from '@element-plus/icons-vue';

const currentTheme = ref('default');

// 获取事件总线实例
const eventBus = useEventBus(getCurrentInstance());

// 初始化主题
onMounted(() => {
  // 从localStorage中读取上次选择的主题
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && ['default', 'dark', 'blue', 'purple'].includes(savedTheme)) {
    currentTheme.value = savedTheme;
  } else {
    // 默认使用default主题
    localStorage.setItem('theme', 'default');
  }
});

// 切换主题
const changeTheme = (theme) => {
  // 移除所有主题类
  document.body.classList.remove('theme-default', 'theme-dark', 'theme-blue', 'theme-purple');
  // 添加当前主题类
  document.body.classList.add(`theme-${theme}`);
  
  // 保存主题到localStorage
  localStorage.setItem('theme', theme);
  
  // 发出主题变化事件 - 正确传递事件总线实例和事件名称
  emitGlobalEvent(eventBus, GLOBAL_EVENTS.THEME_CHANGED, theme);
};

// 切换主题（切换按钮使用）
const toggleTheme = () => {
  const newTheme = currentTheme.value === 'default' ? 'dark' : 'default';
  currentTheme.value = newTheme;
  changeTheme(newTheme);
};
</script>

<style scoped>
.theme-selector {
  position: relative;
}

.theme-select {
  width: 120px;
}
.theme-toggle-btn{
  font-size: 18px;
}
</style>