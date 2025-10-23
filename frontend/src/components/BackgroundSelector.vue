<template>
  <el-popover placement="top" title="选择背景图片" :width="320" trigger="click">
    <div class="background-selector">
      <div class="background-options">
        <!-- 默认选项 -->
        <div
          class="background-option"
          :class="{ active: selectedBackground === 'default' }"
          @click="selectBackground('default')"
          title="默认背景"
        >
          <div class="default-background">
            <el-icon><picture-filled /></el-icon>
            <span>默认</span>
          </div>
          <div
            v-if="selectedBackground === 'default'"
            class="selected-indicator"
          >
            <el-icon><check /></el-icon>
          </div>
        </div>

        <!-- 内置背景图片选项 -->
        <div
          v-for="bg in backgroundImages"
          :key="bg.id"
          class="background-option"
          :class="{ active: selectedBackground === bg.path }"
          @click="selectBackground(bg.path)"
          :title="bg.name"
        >
          <img :src="bg.path" :alt="bg.name" class="background-thumbnail" />
          <div v-if="selectedBackground === bg.path" class="selected-indicator">
            <el-icon><check /></el-icon>
          </div>
        </div>
      </div>
    </div>
    <template #reference>
      <!-- <el-button class="background-btn" title="更换背景图片">
        <el-icon><picture-filled /></el-icon>
      </el-button> -->
      <el-button class="pic-upload-btn" style="margin-left: 10px"
        ><el-icon><PictureFilled /></el-icon>
      </el-button>
    </template>
  </el-popover>
</template>

<script>
import { ref, onMounted } from "vue";
import { PictureFilled, Check } from "@element-plus/icons-vue";

export default {
  name: "BackgroundSelector",
  components: {
    PictureFilled,
    Check,
  },
  emits: ["background-changed"],
  setup(props, { emit }) {
    const selectedBackground = ref("default");
    const backgroundImages = ref([
      { id: 1, name: "聊天背景1", path: "/background/chat1.jpg" },
      { id: 2, name: "聊天背景2", path: "/background/chat2.jpg" },
      { id: 3, name: "聊天背景3", path: "/background/chat3.jpg" },
      { id: 4, name: "聊天背景4", path: "/background/chat4.jpg" },
      { id: 5, name: "聊天背景6", path: "/background/chat6.jpg" },
    ]);

    // 从本地存储加载选中的背景
    onMounted(() => {
      const savedBackground = localStorage.getItem("selectedBackground");
      if (savedBackground) {
        selectedBackground.value = savedBackground;
        emit("background-changed", savedBackground);
      }
    });

    // 选择背景
    const selectBackground = (background) => {
      selectedBackground.value = background;
      localStorage.setItem("selectedBackground", background);
      emit("background-changed", background);
    };

    return {
      selectedBackground,
      backgroundImages,
      selectBackground,
    };
  },
};
</script>

<style scoped>
.background-selector {
  padding: 10px;
}

.background-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.background-option {
  position: relative;
  width: 90px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.background-option:hover {
  transform: scale(1.05);
  border-color: var(--accent-primary);
}

.background-option.active {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.default-background {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--background-secondary);
  color: var(--text-secondary);
}

.default-background .el-icon {
  font-size: 24px;
  margin-bottom: 4px;
  color: var(--text-secondary);
}

.default-background span {
  font-size: 12px;
  color: var(--text-secondary);
}

.background-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background-color: var(--accent-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
}

.background-btn {
  margin-left: 10px;
  padding: 8px;
  color: var(--text-secondary);
}

.background-btn .el-icon {
  color: var(--text-secondary);
}
</style>
