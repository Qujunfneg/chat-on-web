<template>
  <!-- :class="['message-item', (message.userId && message.userId === currentUserId) || (!message.userId && message.username === currentUsername) ? 'self' : 'other']" -->
  <div class="chat-messages" ref="messagesContainer">
    <!-- 加载状态 - 骨架屏 -->
    <div v-if="isLoading" class="skeleton-container">
      <!-- 生成8个骨架屏消息项 -->
      <div
        v-for="i in 8"
        :key="i"
        class="skeleton-message-item"
        :class="i % 2 === 0 ? 'self' : 'other'"
      >
        <div class="skeleton-message-header">
          <div class="skeleton-message-avatar"></div>
          <div class="skeleton-message-username"></div>
        </div>
        <div class="skeleton-message-content">
          <div class="skeleton-message-bubble">
            <div class="skeleton-message-line"></div>
            <div class="skeleton-message-line"></div>
            <div class="skeleton-message-line"></div>
          </div>
        </div>
        <div class="skeleton-message-time"></div>
      </div>
    </div>
    <!-- 聊天消息 -->
    <div v-else>
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-item"
        :class="getClass(message)"
      >
        <div class="message-header">
          <div
            class="avatar"
            :style="{
              backgroundColor: getAvatarColor(getDisplayUsername(message)),
            }"
            @contextmenu="
              ($event) => handleUserContextMenu(getDisplayUsername(message))
            "
          >
            {{ getAvatarText(getDisplayUsername(message)) }}
          </div>
          <span class="username">{{ getDisplayUsername(message) }}</span>
        </div>
        <div
          class="message-content"
          @contextmenu="handleMessageContextMenu(message)"
        >
          <!-- 引用消息显示 - 所有消息类型都可能包含引用 -->
          <div v-if="message.quote" class="quoted-message">
            <div class="quoted-header">
              回复 @{{ getDisplayUsername(message.quote) }}:
            </div>
            <div class="quoted-content">
              <!-- 引用图片消息时显示缩略图 -->
              <div
                v-if="message.quote.type === 'image'"
                class="quoted-image-container"
              >
                <el-image
                  style="max-width: 150px; max-height: 100px; cursor: pointer"
                  :src="message.quote.imgUrl"
                  :preview-src-list="[message.quote.imgUrl]"
                  fit="cover"
                ></el-image>
              </div>
              <!-- 引用文本消息时使用QuoteMessage组件处理表情 -->
              <QuoteMessage
                v-else
                :message="message.quote.content"
                :data-info="message.quote"
                :user-info-map="userInfoMap"
              />
            </div>
            <!-- 移除直接显示message.content的pre标签，让QuoteMessage组件来处理所有内容显示 -->
            <QuoteMessage
              v-if="
                (message.type === 'text' ||
                  message.type === 'emoText' ||
                  message.type === 'quote') &&
                message.content
              "
              class="message-bubble"
              :message="message.content"
              :data-info="message"
              :user-info-map="userInfoMap"
            ></QuoteMessage>
          </div>
          <!-- 引用消息类型 - 已经在上面显示了引用内容，这里不需要额外显示 -->
          <QuoteMessage
            v-else-if="
              (message.type === 'text' ||
                message.type === 'emoText' ||
                message.type === 'quote') &&
              message.content
            "
            class="message-bubble"
            :message="message.content"
            :data-info="message"
            :user-info-map="userInfoMap"
          ></QuoteMessage>
          <!-- 图片消息，带有收藏按钮和右键菜单 -->
          <div
            v-else-if="message.type === 'image'"
            class="message-image-container"
          >
            <!-- 上传中状态 -->
            <div v-if="message.uploading" class="uploading-indicator">
              <div class="uploading-spinner"></div>
              <span class="uploading-text">上传中...</span>
            </div>
            <!-- 正常图片显示 -->
            <el-image
              v-else
              style="max-width: 300px; cursor: pointer"
              :src="message.imgUrl"
              :preview-src-list="[message.imgUrl]"
              fit="cover"
            ></el-image>
          </div>
        </div>
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
    </div>
    <div
      class="new-message-alert"
      v-if="newMessageAlert"
      @click="
        scrollToBottom();
        newMessageAlert = false;
      "
    >
      <Bell class="alert-icon" />
      <span class="alert-text">您有新的消息</span>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, onUnmounted } from "vue";
import { ElMessage, ElImage } from "element-plus";
import { Bell } from "@element-plus/icons-vue";
import QuoteMessage from "./quoteMessage.vue";
import dayjs from "dayjs";

export default {
  name: "MessageList",
  components: {
    QuoteMessage,
  },
  props: {
    messages: {
      type: Array,
      default: () => [],
    },
    currentUsername: {
      type: String,
      default: "",
    },
    userInfoMap: {
      type: Object,
      default: () => ({}),
    },
    currentUserId: {
      type: String,
      default: "",
    },
    favoriteEmojis: {
      type: Array,
      default: () => [],
    },
    isLoading: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["messageContextMenu", "userContextMenu"],
  setup(props, { emit }) {
    const messagesContainer = ref(null);
    const newMessageAlert = ref(false);

    // 监听props变化，调试currentUserId
    watch(
      () => props.currentUserId,
      (newValue, oldValue) => {
        console.log("currentUserId changed:", oldValue, "->", newValue);
      }
    );

    // 滚动到底部
    const scrollToBottom = () => {
      setTimeout(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop =
            messagesContainer.value.scrollHeight;
        }
      }, 100);
    };

    // 监听消息变化，自动滚动到底部并控制新消息提示显示
    watch(
      () => props.messages,
      () => {
        if (messagesContainer.value) {
          if (
            messagesContainer.value.scrollHeight -
              messagesContainer.value.scrollTop <
            1000
          ) {
            scrollToBottom();
            newMessageAlert.value = false; // 接近底部时隐藏提示
          } else {
            newMessageAlert.value = true;
          }
        }
      },
      { deep: true }
    );

    // 处理滚动事件，当用户滚动到接近底部时隐藏新消息提示
    const handleScroll = () => {
      if (messagesContainer.value) {
        if (
          messagesContainer.value.scrollHeight -
            messagesContainer.value.scrollTop <
          1000
        ) {
          newMessageAlert.value = false;
        }
      }
    };

    // 组件挂载后滚动到底部并添加滚动事件监听
    onMounted(() => {
      scrollToBottom();
      if (messagesContainer.value) {
        messagesContainer.value.addEventListener("scroll", handleScroll);
      }
    });

    // 组件卸载时移除滚动事件监听
    onUnmounted(() => {
      if (messagesContainer.value) {
        messagesContainer.value.removeEventListener("scroll", handleScroll);
      }
    });

    // 获取显示的用户名（优先使用昵称）
    const getDisplayUsername = (messageOrUser) => {
      let username;

      // 如果是消息对象
      if (typeof messageOrUser === "object" && messageOrUser) {
        username = messageOrUser.username || messageOrUser.userName;
      } else {
        username = messageOrUser;
      }

      // 优先使用昵称
      return props.userInfoMap[username]?.nickname || username || "未知用户";
    };

    // 生成头像颜色
    const getAvatarColor = (username) => {
      // 空值检查，防止访问undefined的length属性
      if (!username) {
        return "#CCCCCC"; // 提供默认颜色
      }

      let hash = 0;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FFEAA7",
        "#DDA0DD",
        "#98D8C8",
        "#F7DC6F",
      ];
      return colors[Math.abs(hash) % colors.length];
    };

    // 获取头像文字
    const getAvatarText = (username) => {
      // 空值检查，防止访问undefined的charAt方法
      if (!username) {
        return "?";
      }
      return username.charAt(0).toUpperCase();
    };

    // 处理消息右键点击事件
    const handleMessageContextMenu = (message) => {
      event.preventDefault();
      emit("messageContextMenu", { event, message });
    };

    // 处理用户头像右键菜单
    const handleUserContextMenu = (user) => {
      event.preventDefault();
      emit("userContextMenu", { event, user });
    };

    const getClass = (message) => {
      return message.userId === props.currentUserId ? "self" : "other";
    };

    // 格式化时间戳显示
    const formatTime = (timestamp) => {
      if (!timestamp) return "";
      // 如果timestamp已经是格式化过的字符串，直接返回
      if (typeof timestamp === "string" && timestamp.includes(":")) {
        return timestamp;
      }
      // 否则使用dayjs格式化时间戳
      return dayjs(timestamp).format('HH:mm:ss');
    };

    return {
      messagesContainer,
      getAvatarColor,
      getAvatarText,
      handleMessageContextMenu,
      handleUserContextMenu,
      scrollToBottom,
      getClass,
      getDisplayUsername,
      newMessageAlert,
      formatTime,
    };
  },
};
</script>
<style scoped>
.new-message-alert {
  position: fixed;
  width: 179px;
  bottom: 194px;
  transform: translateX(-10px);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 11px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
  color: white;
  border-radius: 25px;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  border: none;
  overflow: hidden;
  animation: slideIn 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  transition: all 0.3s ease;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.new-message-alert:hover {
  transform: translateX(-10px) translateY(-6px) scale(1.05);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.5);
  background: linear-gradient(135deg, rgba(90, 103, 216, 0.95) 0%, rgba(107, 70, 193, 0.95) 100%);
}

.new-message-alert:active {
  transform: translateX(-10px) translateY(-2px) scale(0.98);
}

.alert-icon {
  width: 24px;
  height: 24px;
  color: white;
  animation: bellRing 1s ease-in-out infinite alternate;
  flex-shrink: 0;
}

@keyframes bellRing {
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-10deg);
  }
  75% {
    transform: rotate(10deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

.alert-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

@keyframes slideIn {
  from {
    transform: translateX(-10px) translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateX(-10px) translateY(0);
    opacity: 1;
  }
}

/* 确保提示框始终显示在内容上方 */
.chat-messages {
  position: relative;
  height: 100%;
  overflow-y: auto;
}
</style>
