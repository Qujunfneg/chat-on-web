<template>
  <div>
    <!-- 收起后的按钮 -->
    <transition name="fade">
     <span @click="isOpen = true, fetchNotice('manual')" class="toggle-btn"> 📢 </span>
    </transition>

    <el-dialog v-model="isOpen" :show-close="false" width="40%">
      <template #header="{ close, titleId, titleClass }">
        <div class="my-header">
          <h4 :id="titleId" :class="titleClass">📢 公告</h4>
        </div>
      </template>
      <div class="drawer-content" v-if="hasData" v-html="renderedMarkdown"></div>
      <el-empty v-else description="暂无公告" image-size="50px"/>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleCancel" v-if="!hasData">关闭</el-button>
          <el-button type="primary" @click="handleConfirm" v-else>确认收到</el-button>
        </div>
      </template>
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
      hasNewNotice: false,
      CONFIRM_KEY: 'announcement_confirmed'
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
    async fetchNotice(type) {
      try {
        const res = await fetch("/api/notices");
        const data = await res.json();
        if (data && data.content) {
          this.content = data.content;
          this.hasData = true;
          
          // 检查是否需要显示公告
          type !== 'manual' && this.checkIfNewAnnouncement();
        } else {
          this.hasData = false;
          this.isOpen = false;
          this.hasNewNotice = false;
        }
      } catch (err) {
        console.error("获取公告失败:", err);
        this.hasData = false;
        this.hasNewNotice = false;
      }
    },
    
    checkIfNewAnnouncement() {
      const confirmedAnnouncement = localStorage.getItem(this.CONFIRM_KEY);
      if (!confirmedAnnouncement) {
        // 没有确认过任何公告，显示公告
        this.isOpen = true;
        this.hasNewNotice = true;
        return;
      }
      
      try {
        const { content, timestamp } = JSON.parse(confirmedAnnouncement);
        // 比较当前公告与已确认公告是否相同
        if (content !== this.content) {
          this.isOpen = true;
          this.hasNewNotice = true;
        } else {
          this.isOpen = false;
          this.hasNewNotice = false;
        }
      } catch (error) {
        console.error("解析已确认公告失败:", error);
        this.isOpen = true;
        this.hasNewNotice = true;
      }
    },
    
    handleConfirm() {
      // 存储确认信息到localStorage
      const confirmInfo = {
        content: this.content,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CONFIRM_KEY, JSON.stringify(confirmInfo));
      
      this.isOpen = false;
      this.hasNewNotice = false;
    },
    
    handleCancel() {
      this.isOpen = false;
      // 取消不存储，下次打开应用仍会显示
    }
  },
};
</script>

<style scoped>
/* 折叠按钮固定顶部 */
.toggle-btn {
  cursor: pointer;
}

.my-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 16px;
}
.drawer-content {
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}
</style>