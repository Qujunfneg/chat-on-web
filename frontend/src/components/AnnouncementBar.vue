<template>
  <div>
    <!-- 收起后的按钮 -->
    <transition name="fade">
      <el-button v-if="!isOpen" type="primary" size="small" class="toggle-btn" @click="isOpen = true">
        📢 查看公告
      </el-button>
    </transition>

    <el-dialog v-model="isOpen" :show-close="false" width="30%">
      <template #header="{ close, titleId, titleClass }">
        <div class="my-header">
          <h4 :id="titleId" :class="titleClass">📢 公告</h4>
          <el-button type="danger" @click="close">
            <el-icon class="el-icon--left">
              <CircleCloseFilled />
            </el-icon>
            Close
          </el-button>
        </div>
      </template>
      <div class="drawer-content" v-html="renderedMarkdown"></div>
    </el-dialog>
  </div>
</template>

<script>
import { marked } from "marked"; // 用于渲染 markdown

export default {
  name: "AnnouncementBar",
  data() {
    return {
      content: "",
      isOpen: false,
      hasData: false,
    };
  },
  computed: {
    renderedMarkdown() {
      return marked.parse(this.content || "");
    },
  },
  mounted() {
    this.fetchNotice();
  },
  methods: {
    async fetchNotice() {
      try {
        const res = await fetch("/api/notices");
        const data = await res.json();
        if (data && data.content) {
          this.content = data.content;
          this.hasData = true;
          this.isOpen = true; // 有数据自动展开
        } else {
          this.hasData = false;
          this.isOpen = false;
        }
      } catch (err) {
        console.error("获取公告失败:", err);
        this.hasData = false;
      }
    },
  },
};
</script>

<style scoped>
/* 折叠按钮固定顶部 */
.toggle-btn {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
}

.my-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 16px;
}
</style>