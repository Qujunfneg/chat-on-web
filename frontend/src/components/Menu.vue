<template>
  <div class="menu-container" @click="handleContainerClick">
    <ul class="menu">
      <li
        v-for="item in menuList"
        :class="{ active: currentMenu === item.name }"
        @click="setActiveMenu(item.name)"
        :key="item.name"
        :title="item.label"
      >
        <el-icon v-if="item.icon === 'chart'" class="icon"><ChatLineRound /></el-icon>
        <el-icon v-if="item.icon === 'music'" class="icon"><Service /></el-icon>
        <el-icon v-if="item.icon === 'profile'" class="icon"><User /></el-icon>
        <el-icon v-if="item.icon === 'settings'" class="icon"><Setting /></el-icon>
        <el-icon v-if="item.icon === 'ai' && showAiSettings" class="icon"><Cpu /></el-icon>
      </li>
    </ul>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ChatLineRound, Service, User, Setting, Cpu } from '@element-plus/icons-vue';

const menuList = [
  {
    label: "我的主页",
    name: "profile",
    icon: "profile",
  },
  {
    label: "公共大厅",
    name: "chart",
    icon: "chart",
  },
  {
    label: "音乐台",
    name: "music",
    icon: "music",
  },
  {
    label: "设置",
    name: "settings",
    icon: "settings",
  },
  {
    label: "AI配置",
    name: "aiSettings",
    icon: "ai",
  },
];
const currentMenu = ref("chart");
const emit = defineEmits(["menuClick"]);
const showAiSettings = ref(false); // 控制AI配置入口显示状态
let clickCount = 0; // 点击计数
let lastClickTime = 0; // 上次点击时间
const MAX_CLICK_TIME = 2000; // 两次点击之间的最大时间间隔（毫秒）
const REQUIRED_CLICKS = 5; // 所需的点击次数

// 从localStorage读取显示状态
onMounted(() => {
  const savedState = localStorage.getItem('showAiSettings');
  if (savedState === 'true') {
    showAiSettings.value = true;
  }
});

// 处理菜单容器点击事件
function handleContainerClick(event) {
  // 检查点击是否发生在菜单空白区域（非菜单项）
  if (event.target.classList.contains('menu-container')) {
    const now = Date.now();
    
    // 如果距离上次点击时间超过最大间隔，重置计数
    if (now - lastClickTime > MAX_CLICK_TIME) {
      clickCount = 0;
    }
    
    clickCount++;
    lastClickTime = now;
    
    // 达到所需点击次数，切换显示状态
    if (clickCount >= REQUIRED_CLICKS) {
      showAiSettings.value = !showAiSettings.value;
      // 保存状态到localStorage
      localStorage.setItem('showAiSettings', showAiSettings.value.toString());
      clickCount = 0; // 重置计数
    }
  }
}

function setActiveMenu(name) {
  currentMenu.value = name;
  emit("menuClick", name);
  if (name === 'chart') {
    window.location.href = '#/chat';
  } else if (name === 'music') {
    window.location.href = '#/music';
  } else if (name === 'profile') {
    window.location.href = '#/profile';
  } else if (name === 'settings') {
    // 设置页面处理
  } else if (name === 'aiSettings' && showAiSettings.value) {
    // AI设置页面处理
  }
}
</script>
<style scoped>
/* 菜单容器样式 */
.menu-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--background-secondary);
  border-right: 1px solid var(--border-color);
  width: 60px;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: default; /* 设置默认鼠标样式 */
}

/* 菜单列表样式 */
.menu {
  background-color: var(--background-secondary);
  border: none;
  margin: 0;
  padding: 16px 0;
  list-style: none;
  flex:  0 0 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* 菜单项基础样式 */
.menu li {
  width: 44px;
  height: 44px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary);
  font-size: 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* 菜单项悬停效果 */
.menu li:hover {
  background-color: var(--background-tertiary);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 菜单项激活状态 */
.menu li.active {
  background-color: var(--accent-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.menu li.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: var(--accent-secondary, var(--accent-primary));
  border-radius: 3px 3px 0 0;
}

/* 图标样式 */
.icon {
  font-size: 20px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: all 0.3s ease;
}

.menu li:hover .icon {
  transform: translateY(-2px);
}

.menu li.active .icon {
  transform: translateY(-2px);
}

/* 主题选择器容器样式 */
.theme-selector-container {
  padding: 12px 8px;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-tertiary);
  display: flex;
  justify-content: center;
}

.theme-selector {
  display: flex;
  justify-content: center;
}

.theme-select {
  width: 100%;
  max-width: 44px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .menu-container {
    width: 100%;
    height: auto;
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .menu {
    flex-direction: row;
    padding: 8px 16px;
    gap: 12px;
  }

  .menu li {
    width: 40px;
    height: 40px;
  }

  .menu li.active::before {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    width: 100%;
  }
}
</style>