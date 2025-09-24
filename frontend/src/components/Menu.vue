<template>
  <div class="menu-container">
    <ul class="menu">
      <li
        v-for="item in menuList"
        :class="{ active: currentMenu === item.name }"
        @click="setActiveMenu(item.name)"
        :key="item.name"
      >
        <el-icon v-if="item.icon === 'chart'" class="icon"><ChatLineRound /></el-icon>
        <el-icon v-if="item.icon === 'music'" class="icon"><Service /></el-icon>
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>
<script setup>
import { ref } from "vue";
import { ChatLineRound, Service, Setting } from '@element-plus/icons-vue';

const menuList = [
  {
    label: "公共大厅",
    name: "chart",
    icon: "chart",
  },
  {
    label: "音乐台",
    name: "music",
    icon: "music",
  }
];
const currentMenu = ref("chart");
const emit = defineEmits(["menuClick"]);
function setActiveMenu(name) {
  currentMenu.value = name;
  emit("menuClick", name);
  if (name === 'chart') {
    window.location.href = '#/chat';
  } else if (name === 'music') {
    window.location.href = '#/music';
  } else if (name === 'settings') {
    // 触发设置菜单事件，将在Chart.vue中处理
    window.dispatchEvent(new CustomEvent('show-settings'));
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
}

/* 菜单列表样式 */
.menu {
  background-color: var(--background-secondary);
  border-right: 1px solid var(--border-color);
  margin: 0;
  padding: 8px 0;
  list-style: none;
  border-radius: 0 4px 4px 0;
  flex: 0 0 180px
}

/* 菜单项基础样式 */
.menu li {
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary);
  font-size: 14px;
  border-left: 3px solid transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 菜单项悬停效果 */
.menu li:hover {
  background-color: var(--background-tertiary);
  color: var(--accent-primary);
  padding-left: 28px;
}

/* 菜单项激活状态 */
.menu li.active {
  background-color: var(--background-tertiary);
  color: var(--accent-primary);
  border-left-color: var(--accent-primary);
  font-weight: 500;
}

/* 图标样式 */
.icon {
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.menu li:hover .icon,
.menu li.active .icon {
  color: var(--accent-primary);
}

/* 主题选择器容器样式 */
.theme-selector-container {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-tertiary);
}

.theme-selector {
  display: flex;
  justify-content: center;
}

.theme-select {
  width: 100%;
  max-width: 140px;
}

/* 添加图标增强视觉效果 */  


/* 响应式设计 */
@media (max-width: 768px) {
  .menu-container {
    display: none;
  }
  
  .menu {
    width: 100%;
    display: flex;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    border-radius: 4px 4px 0 0;
    padding: 0;
  }

  .menu li {
    flex: 1;
    justify-content: center;
    border-left: none;
    border-bottom: 3px solid transparent;
  }

  .menu li.active {
    border-left-color: transparent;
    border-bottom-color: var(--accent-primary);
    background-color: transparent;
  }
}
</style>
