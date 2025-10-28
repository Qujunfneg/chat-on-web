<template>
  <div
    class="red-packet-message"
    :class="{ received: isReceived, expired: isExpired }"
  >
    <div
      class="red-packet-container"
      @click="openRedPacket"
      @contextmenu.prevent="showContextMenu"
    >
      <div class="red-packet-icon">
        <svg class="icon" viewBox="0 0 24 24">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            fill="#ff4d4f"
          />
        </svg>
      </div>
      <div class="red-packet-content">
        <div class="red-packet-title">{{ senderName }}的红包</div>
        <div class="red-packet-message" v-if="message">{{ message }}</div>
        <div class="red-packet-status">
          <span v-if="status === 'active'"
            >{{ remainingCount }}/{{ totalCount }}个红包</span
          >
          <span v-else-if="status === 'completed'">已被领完</span>
          <span v-else-if="status === 'expired'">已过期</span>
        </div>
      </div>
    </div>
    <div class="red-packet-time">{{ formatTime(timestamp) }}</div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="contextMenuStyle"
      @click.stop
    >
      <div
        v-if="!isReceived && status === 'active'"
        class="menu-item"
        @click="receiveRedPacket"
      >
        <span class="menu-icon">🧧</span>
        <span>直接领取</span>
      </div>
      <div class="menu-item" @click="openDetails">
        <span class="menu-icon">👁️</span>
        <span>查看详情</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "RedPacketMessage",
  props: {
    id: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      validator: (value) => ["random", "average"].includes(value),
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    count: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      validator: (value) => ["active", "completed", "expired"].includes(value),
    },
    isReceived: {
      type: Boolean,
      default: false,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    remainingCount: {
      type: Number,
      default: 0,
    },
    totalCount: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      contextMenuVisible: false,
      contextMenuStyle: {
        position: "absolute",
        left: "0px",
        top: "0px",
      },
    };
  },
  mounted() {
    // 点击其他地方关闭右键菜单
    document.addEventListener("click", this.hideContextMenu);
  },
  beforeUnmount() {
    document.removeEventListener("click", this.hideContextMenu);
  },
  methods: {
    openRedPacket() {
      // 如果已经领取或已过期，则打开详情
      if (this.isReceived || this.isExpired || this.status === "completed") {
        this.openDetails();
      } else {
        // 否则直接尝试领取红包
        this.receiveRedPacket();
      }
    },
    receiveRedPacket() {
      this.hideContextMenu();
      this.$emit("receive-red-packet", this.id);
    },
    openDetails() {
      this.hideContextMenu();
      this.$emit("open-details", this.id);
    },
    showContextMenu(event) {
      this.contextMenuVisible = true;
      this.contextMenuStyle = {
        position: "absolute",
        left: `${event.clientX}px`,
        top: `${event.clientY}px`,
      };
    },
    hideContextMenu() {
      this.contextMenuVisible = false;
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      // 如果是今天
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // 如果是昨天
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return (
          "昨天 " +
          date.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }

      // 其他日期
      return (
        date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) +
        " " +
        date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      );
    },
  },
};
</script>

<style scoped>
.red-packet-message {
  margin: 10px 0;
  max-width: 80%;
  align-self: flex-start;
  position: relative;
}

.red-packet-container {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #ff6b6b, #ff4d4f);
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
  position: relative;
  overflow: hidden;
}

.red-packet-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0)
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.red-packet-container:hover::before {
  opacity: 1;
}

.red-packet-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
}

.red-packet-icon {
  margin-right: 12px;
}

.red-packet-icon .icon {
  width: 36px;
  height: 36px;
  fill: #fff;
}

.red-packet-content {
  flex: 1;
  color: #fff;
  overflow: hidden;
}

.red-packet-title {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 4px;
}

.red-packet-message {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
  max-width: 245px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.red-packet-status {
  font-size: 12px;
  opacity: 0.8;
}

.red-packet-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  text-align: left;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  z-index: 1000;
  min-width: 120px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-icon {
  margin-right: 8px;
  font-size: 16px;
}

/* 已领取状态 */
.red-packet-message.received .red-packet-container {
  background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
}

.red-packet-message.received .red-packet-content {
  color: #666;
}

.red-packet-message.received .red-packet-icon .icon {
  fill: #999;
}

/* 已过期状态 */
.red-packet-message.expired .red-packet-container {
  background: linear-gradient(135deg, #e0e0e0, #d0d0d0);
}

.red-packet-message.expired .red-packet-content {
  color: #888;
}

.red-packet-message.expired .red-packet-icon .icon {
  fill: #aaa;
}
</style>
