<template>
  <ul class="munu">
    <li
      v-for="item in menuList"
      :class="{ active: currentMenu === item.name }"
      @click="setActiveMenu(item.name)"
      :key="item.name"
    >
      <el-icon v-if="item.icon === 'chart'"><ChatLineRound /></el-icon>
      <el-icon v-if="item.icon === 'music'"><Service /></el-icon>
      {{ item.label }}
    </li>
  </ul>
</template>
<script setup>
import { ref } from "vue";

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
.munu {
  width: 180px;
  background-color: #fff;
  border-right: 1px solid #e0e0e0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  margin: 0;
  padding: 16px 0;
  list-style: none;
  border-radius: 0 4px 4px 0;
}

/* 菜单项基础样式 */
.munu li {
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #333;
  font-size: 14px;
  border-left: 3px solid transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 菜单项悬停效果 */
.munu li:hover {
  background-color: #f5f5f5;
  color: #1890ff;
  padding-left: 28px;
}

/* 菜单项激活状态 */
.munu li.active {
  background-color: #e6f7ff;
  color: #1890ff;
  border-left-color: #1890ff;
  font-weight: 500;
}

/* 添加图标增强视觉效果 */  


/* 响应式设计 */
@media (max-width: 768px) {
  .munu {
    width: 100%;
    display: flex;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
    border-radius: 4px 4px 0 0;
    padding: 0;
  }

  .munu li {
    flex: 1;
    justify-content: center;
    border-left: none;
    border-bottom: 3px solid transparent;
  }

  .munu li.active {
    border-left-color: transparent;
    border-bottom-color: #1890ff;
    background-color: transparent;
  }
}
</style>
