<template>
  <div v-if="modelValue" class="red-packet-dialog-overlay" @click="closeDialog">
    <div class="red-packet-dialog" @click.stop>
      <div class="dialog-header">
        <h3>红包详情</h3>
        <button class="close-btn" @click="closeDialog">×</button>
      </div>
      
      <div class="dialog-content">
        <div class="red-packet-info">
          <div class="sender-info">
            <div class="sender-avatar">
              <img :src="senderAvatar" :alt="senderName" v-if="senderAvatar">
              <div class="avatar-placeholder" v-else>{{ (senderName || 'U').charAt(0) }}</div>
            </div>
            <div class="sender-details">
              <div class="sender-name">{{ senderName }}</div>
              <div class="red-packet-type">
                {{ type === 'random' ? '随机红包' : '普通红包' }}
              </div>
            </div>
            <div class="red-packet-amount">
              <div class="amount-value">{{ totalAmount }}</div>
              <div class="amount-unit">积分</div>
            </div>
          </div>
          
          <div class="red-packet-message" v-if="message">{{ message }}</div>
          
          <div class="red-packet-status">
            <span v-if="status === 'active'">
              {{ receivedCount }}/{{ count }}个红包，{{ remainingAmount }}积分待领取
            </span>
            <span v-else-if="status === 'completed'">
              已被领完
            </span>
            <span v-else-if="status === 'expired'">
              已过期，{{ remainingAmount }}积分已退还
            </span>
          </div>
          
          <div class="red-packet-time">
            {{ formatTime(timestamp) }}
          </div>
        </div>
        
        <div class="receivers-section" v-if="receivers.length > 0">
          <div class="section-header">
            <h4>领取记录</h4>
            <span class="count-badge">{{ receivers.length }}/{{ count }}</span>
          </div>
          <div class="receivers-list">
            <div class="receiver-item" v-for="(receiver, index) in receivers" :key="index">
              <div class="receiver-avatar">
                <img :src="receiver.avatar" :alt="receiver.username" v-if="receiver.avatar">
                <div class="avatar-placeholder" v-else>{{ (receiver.username || 'U').charAt(0) }}</div>
              </div>
              <div class="receiver-info">
                <div class="receiver-name">{{ receiver.username }}</div>
                <div class="receiver-time">{{ formatTime(receiver.timestamp) }}</div>
              </div>
              <div class="receiver-amount">
                <span v-if="isCurrentUser(receiver.userId, receiver.coreId) || showAllAmounts" class="amount-value">{{ receiver.amount }}积分</span>
                <span v-else class="received-text">已领取</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="no-receivers" v-else>
          暂无领取记录
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="receive-btn" 
                v-if="status === 'active' && !hasReceived" 
                style="display: none;"
                @click="receiveRedPacket">
          领取红包
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RedPacketDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    redPacketId: {
      type: String,
      required: true
    },
    senderId: {
      type: String,
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderAvatar: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      required: true,
      validator: value => ['random', 'average'].includes(value)
    },
    totalAmount: {
      type: Number,
      required: true
    },
    count: {
      type: Number,
      required: true
    },
    message: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      required: true,
      validator: value => ['active', 'completed', 'expired'].includes(value)
    },
    receivers: {
      type: Array,
      default: () => []
    },
    hasReceived: {
      type: Boolean,
      default: false
    },
    currentUserId: {
      type: String,
      default: ''
    },
    currentCoreId: {
      type: String,
      default: ''
    },
    showAllAmounts: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'close', 'receive'],
  computed: {
    receivedCount() {
      return this.receivers.length;
    },
    remainingCount() {
      return this.count - this.receivers.length;
    },
    remainingAmount() {
      const receivedAmount = this.receivers.reduce((sum, receiver) => sum + receiver.amount, 0);
      return this.totalAmount - receivedAmount;
    }
  },
  watch: {
    modelValue(newVal) {
      // 当对话框打开且红包可领取时，自动触发领取操作
      if (newVal && this.status === 'active' && !this.hasReceived) {
        // 使用setTimeout确保DOM已完全渲染
        setTimeout(() => {
          this.receiveRedPacket();
        }, 100);
      }
    }
  },
  methods: {
    closeDialog() {
      this.$emit('update:modelValue', false);
      this.$emit('close');
    },
    receiveRedPacket() {
      this.$emit('receive', this.redPacketId);
    },
    isCurrentUser(userId, coreId) {
      // 优先使用coreId判断，如果没有coreId则使用userId
      if (this.currentCoreId && coreId) {
        return coreId === this.currentCoreId;
      }
      return userId === this.currentUserId;
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      // 如果是今天
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      }
      
      // 如果是昨天
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      }
      
      // 其他日期
      return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + 
             date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
  }
}
</script>

<style scoped>
.red-packet-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.red-packet-dialog {
  background: linear-gradient(135deg, #fff5f5, #fff);
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 30px rgba(255, 77, 79, 0.15);
  border: 1px solid #ffebe6;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  color: #666;
  background-color: #f5f5f5;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.red-packet-info {
  padding: 24px 20px;
  border-bottom: 8px solid #f8f8f8;
}

.sender-info {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.sender-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
}

.sender-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ff7875, #ff9c6e);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  color: white;
  font-weight: 600;
}

.sender-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.sender-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.red-packet-type {
  font-size: 13px;
  color: #fa541c;
  font-weight: 500;
}

.red-packet-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.amount-value {
  font-size: 16px;
  font-weight: 500;
  color: #8c8c8c;
  line-height: 1;
}

.amount-unit {
  font-size: 11px;
  color: #bfbfbf;
  margin-top: 2px;
}

.red-packet-message {
  font-size: 16px;
  color: #d4380d;
  margin: 16px 0;
  padding: 16px;
  background: linear-gradient(135deg, #fff2e8, #fff7ed);
  border-radius: 12px;
  line-height: 1.5;
  border-left: 4px solid #ff7875;
  box-shadow: 0 2px 8px rgba(255, 120, 117, 0.15);
  position: relative;
  font-weight: 500;
  text-align: center;
}

.red-packet-message::before {
  content: "💰";
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  padding: 0 8px;
  font-size: 18px;
}

.red-packet-status {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.red-packet-time {
  font-size: 12px;
  color: #999;
}

.receivers-section {
  padding: 12px 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.count-badge {
  background-color: #f0f0f0;
  color: #666;
  font-size: 11px;
  padding: 3px 7px;
  border-radius: 10px;
}

.receivers-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.receiver-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s;
}

.receiver-item:last-child {
  border-bottom: none;
}

.receiver-item:hover {
  background-color: #fafafa;
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 6px;
}

.receiver-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 10px;
  flex-shrink: 0;
}

.receiver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.receiver-info {
  flex: 1;
  min-width: 0;
}

.receiver-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.receiver-time {
  font-size: 11px;
  color: #999;
}

.receiver-amount {
  flex-shrink: 0;
  text-align: right;
}

.receiver-amount .amount-value {
  font-size: 12px;
  font-weight: 600;
  color: #ff4d4f;
}

.receiver-amount .received-text {
  font-size: 11px;
  color: #52c41a;
}

.no-receivers {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  gap: 12px;
}

.receive-btn {
  flex: 1;
  background: linear-gradient(135deg, #ff7875, #ff9c6e);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 0;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.receive-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
}

.receive-btn:active {
  transform: translateY(0);
}

.close-footer-btn {
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-footer-btn:hover {
  background: #e8e8e8;
}
</style>