<template>
  <!-- :class="['message-item', (message.userId && message.userId === currentUserId) || (!message.userId && message.username === currentUsername) ? 'self' : 'other']" -->
  <div 
    class="chat-messages" 
    ref="messagesContainer"
    :style="getBackgroundStyle()"
  >
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
        :class="[getClass(message), message.star ? 'star' : '']"
      >
        <div class="message-header">
          <div v-if="message.star"
            class="avatar star-avatar"
            :style="{
              backgroundImage: `linear-gradient(135deg, ${message.starGradient?.from || '#FFD700'}, ${message.starGradient?.to || '#FF6B6B'})`,
              boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
            }"
            @contextmenu="($event) => handleUserContextMenu(getDisplayUsername(message))"
          >
            <span class="star-avatar-text">{{ getAvatarText(getDisplayUsername(message)) }}</span>
            <span class="star-badge">⭐</span>
          </div>
          <div v-else
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
          <!-- 已撤回的消息显示 -->
          <div v-if="message.recalled || message.type === 'recalled'" class="recalled-message">
            <div class="recalled-content">
              <span class="recalled-icon">↩️</span>
              <span class="recalled-text">{{ message.content }}</span>
            </div>
          </div>
          <!-- 引用消息显示 - 所有消息类型都可能包含引用 -->
          <div v-else-if="message.quote" class="quoted-message">
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
              v-if="['text', 'emoText', 'quote','ai'].includes(message.type) && message.content"
              :class="['message-bubble', message.star ? 'star-bubble' : '']"
              :message="message.content"
              :data-info="message"
              :user-info-map="userInfoMap"
            ></QuoteMessage>
          </div>
          <!-- 引用消息类型 - 已经在上面显示了引用内容，这里不需要额外显示 -->
          <QuoteMessage
            v-else-if="['text', 'emoText', 'quote','ai'].includes(message.type) && message.content"
            :class="['message-bubble', message.star ? 'star-bubble' : '']"
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
            <div v-else class="image-with-refresh">
              <el-image
                ref="imageRef"
                style="max-width: 300px; cursor: pointer"
                :src="message.imgUrl"
                :preview-src-list="[message.imgUrl]"
                fit="cover"
                :key="message.imageKey || message.imgUrl"
              ></el-image>
              <!-- 刷新按钮 - 只在客户端模式显示 -->
              <el-button
                v-if="isElectron()"
                class="image-refresh-btn"
                type="primary"
                size="small"
                circle
                @click="refreshImage(message)"
                title="刷新图片"
              >
                <Refresh class="refresh-icon" />
              </el-button>
            </div>
          </div>
          <!-- 红包消息 -->
          <RedPacketMessage
            v-else-if="message.type === 'redPacket'"
            :id="message.redPacketData.id"
            :sender-id="message.redPacketData.senderId"
            :sender-name="message.redPacketData.senderName"
            :type="message.redPacketData.type"
            :total-amount="message.redPacketData.totalAmount"
            :count="message.redPacketData.count"
            :total-count="message.redPacketData.totalCount"
            :message="message.redPacketData.message"
            :timestamp="message.redPacketData.timestamp"
            :status="message.redPacketData.status"
            :remaining-count="message.redPacketData.remainingCount"
            @receive-red-packet="(redPacketId) => $emit('openRedPacket', redPacketId)"
            @open-details="(redPacketId) => $emit('openRedPacket', redPacketId)"
          ></RedPacketMessage>
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
import { Bell, Refresh } from "@element-plus/icons-vue";
import QuoteMessage from "./quoteMessage.vue";
import RedPacketMessage from "./RedPacketMessage.vue";
import { isElectron } from "../utils/electronUtils.js";
import dayjs from "dayjs";

export default {
  name: "MessageList",
  components: {
    QuoteMessage,
    RedPacketMessage,
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
    background: {
      type: String,
      default: "default",
    },
  },
  emits: ["messageContextMenu", "userContextMenu", "openRedPacket"],
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

    // 刷新图片
    const refreshImage = (message) => {
      // 通过更新imageKey来强制重新加载图片
      message.imageKey = `refresh_${Date.now()}_${Math.random()}`;
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

    // 获取背景样式
    const getBackgroundStyle = () => {
      if (props.background === 'default') {
        return {};
      }
      return {
        backgroundImage: `url(${props.background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
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
      getBackgroundStyle,
      refreshImage,
      isElectron,
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

/* 已撤回消息的样式 */
.recalled-message {
  padding: 8px 12px;
  margin: 4px 0;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  max-width: 70%;
  display: inline-block;
  min-width: 180px;
}

.recalled-content {
  display: flex;
  align-items: center;
  color: #999;
  font-size: 14px;
}

.recalled-icon {
  margin-right: 6px;
  font-size: 16px;
}

.recalled-text {
  font-style: italic;
}

/* 图片刷新按钮样式 */
.image-with-refresh {
  position: relative;
  display: inline-block;
}

.image-refresh-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
  background-color: rgba(64, 158, 255, 0.8);
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.image-refresh-btn:hover {
  background-color: rgba(64, 158, 255, 0.9);
  transform: scale(1.1);
}

.image-with-refresh:hover .image-refresh-btn {
  opacity: 1;
}

.refresh-icon {
  color: white;
  width: 14px;
  height: 14px;
}

/* 上传中状态样式 */
.uploading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.uploading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.uploading-text {
  color: #666;
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
/* 明星样式 */
.star-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  position: relative;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.6);
}
.star-avatar-text {
  font-size: 18px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.35);
}
.star-badge {
  position: absolute;
  right: -4px;
  bottom: -4px;
  background: rgba(255,255,255,0.95);
  color: #ffb400;
  border-radius: 50%;
  padding: 2px 4px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.star-bubble {
  
  border: 1px solid rgba(255,215,0,0.18);
  box-shadow: 0 6px 30px rgba(255,130,0,0.06);
  border-radius: 14px;
}
.message-item.star .message-time {
  color: #ffb400;
}
</style>
