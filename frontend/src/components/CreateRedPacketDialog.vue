<template>
  <el-popover
    placement="top"
    :width="300"
    trigger="click"
    v-model="visible"
    popper-class="red-packet-popper"
  >
    <div class="red-packet-box">
      <div class="red-packet-content">
        <div class="red-packet-header">
          <h4>发红包</h4>
        </div>
        
        <div class="red-packet-type-selector">
          <div class="type-option" 
               :class="{ active: type === 'random' }" 
               @click="selectType('random')">
            <div class="type-icon">🎲</div>
            <div class="type-name">随机红包</div>
          </div>
          <div class="type-option" 
               :class="{ active: type === 'average' }" 
               @click="selectType('average')">
            <div class="type-icon">💰</div>
            <div class="type-name">普通红包</div>
          </div>
        </div>
        
        <div class="form-group">
          <label>红包个数</label>
          <div class="simple-input">
            <input type="number" v-model.number="count" min="2" max="100">
            <span class="input-unit">个</span>
          </div>
        </div>
        
        <div class="form-group">
          <label>总积分</label>
          <div class="simple-input">
            <input type="number" v-model.number="totalAmount" min="2">
            <span class="input-unit">积分</span>
          </div>
          <div class="balance-info">当前余额: {{ userPoints }} 积分</div>
        </div>
        
        <div class="form-group">
          <label>祝福语</label>
          <textarea 
            v-model="message" 
            placeholder="恭喜发财，大吉大利" 
            maxlength="20"
            rows="2"></textarea>
          <div class="char-count">{{ message.length }}/20</div>
        </div>
        
        <div class="red-packet-tips">
          <small>💡 红包发出后24小时未被领取将自动退款</small>
        </div>
        
        <el-button
          type="primary"
          :disabled="!canCreate"
          @click="createRedPacket"
          class="send-red-packet-button"
        >
          发红包
        </el-button>
      </div>
    </div>
    <template #reference>
      <el-button class="red-packet-trigger-btn" title="发红包">
        <el-icon><present /></el-icon>
      </el-button>
    </template>
  </el-popover>
</template>

<script>
export default {
  name: 'CreateRedPacketDialog',
  props: {
    userPoints: {
      type: Number,
      required: true
    }
  },
  emits: ['create'],
  data() {
    return {
      visible: false,
      type: 'random', // 'random' 或 'average'
      count: 2,
      totalAmount: 20,
      message: ''
    };
  },
  computed: {
    canCreate() {
      return this.count > 0 && 
             this.totalAmount > 0 && 
             this.totalAmount <= this.userPoints &&
             this.count <= 100;
    },
    minAmount() {
      if (this.type === 'average') {
        return Math.floor(this.totalAmount / this.count);
      } else {
        // 随机红包最小金额为1
        return 1;
      }
    },
    maxAmount() {
      if (this.type === 'average') {
        return Math.floor(this.totalAmount / this.count);
      } else {
        // 随机红包最大金额不能超过总金额的60%
        return Math.floor(this.totalAmount * 0.6);
      }
    }
  },
  methods: {
    selectType(type) {
      this.type = type;
    },
    createRedPacket() {
      if (!this.canCreate) return;
      
      this.$emit('create', {
        type: this.type,
        count: this.count,
        totalAmount: this.totalAmount,
        message: this.message
      });
      
      // 重置表单
      this.type = 'random';
      this.count = 2;
      this.totalAmount = 20;
      this.message = '';
      
      // 关闭弹框
      this.visible = false;
    }
  }
}
</script>

<style scoped>
/* 红包弹出框整体样式 */
.red-packet-box {
  background-color: var(--background-secondary, #fff);
  border-radius: 12px;
  border: 1px solid var(--border-color, #f0f0f0);
  box-shadow: var(--shadow-light, 0 4px 12px rgba(0, 0, 0, 0.15));
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 内容区域，使用百分比高度 */
.red-packet-content {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 自定义滚动条样式 */
.red-packet-content::-webkit-scrollbar {
  width: 4px;
}

.red-packet-content::-webkit-scrollbar-track {
  background: var(--background-secondary, #f1f1f1);
  border-radius: 2px;
}

.red-packet-content::-webkit-scrollbar-thumb {
  background: var(--border-color, #c1c1c1);
  border-radius: 2px;
}

.red-packet-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary, #a8a8a8);
}

/* 红包弹出框头部 */
.red-packet-header {
  margin-bottom: 12px;
  text-align: center;
  flex-shrink: 0;
}

.red-packet-header h4 {
  margin: 0;
  color: var(--text-primary, #333);
  font-size: 16px;
  font-weight: 600;
}

/* 红包类型选择器 */
.red-packet-type-selector {
  display: flex;
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color, #e0e0e0);
  flex-shrink: 0;
}

.type-option {
  flex: 1;
  padding: 8px;
  text-align: center;
  cursor: pointer;
  background-color: var(--background-primary, #f9f9f9);
  transition: all 0.3s;
}

.type-option.active {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.type-option:hover:not(.active) {
  background-color: var(--background-hover, #f0f0f0);
}

.type-icon {
  font-size: 18px;
  margin-bottom: 2px;
}

.type-name {
  font-size: 11px;
  font-weight: 500;
}

/* 表单样式 */
.form-group {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.simple-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color, #d9d9d9);
  border-radius: 6px;
  overflow: hidden;
}

.simple-input input {
  flex: 1;
  border: none;
  outline: none;
  padding: 6px 10px;
  font-size: 13px;
  background-color: var(--background-primary, #fff);
  color: var(--text-primary, #333);
}

.input-unit {
  padding: 0 10px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  background-color: var(--background-secondary, #f5f5f5);
}

.balance-info {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-secondary, #999);
}

.form-group textarea {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-color, #d9d9d9);
  border-radius: 6px;
  resize: none;
  font-size: 13px;
  background-color: var(--background-primary, #fff);
  color: var(--text-primary, #333);
  outline: none;
  transition: border-color 0.3s;
}

.form-group textarea:focus {
  border-color: #ff4d4f;
}

.char-count {
  margin-top: 2px;
  text-align: right;
  font-size: 11px;
  color: var(--text-secondary, #999);
}

/* 提示信息 */
.red-packet-tips {
  margin-bottom: 12px;
  padding: 6px 0;
  text-align: center;
  flex-shrink: 0;
}

.red-packet-tips small {
  color: var(--text-secondary, #999);
  font-size: 11px;
}

/* 发送按钮 */
.send-red-packet-button {
  width: 100%;
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  border: none;
  border-radius: 6px;
  font-weight: 500;
  height: 32px;
  font-size: 13px;
  flex-shrink: 0;
}

.send-red-packet-button:hover {
  background: linear-gradient(135deg, #ff7875, #ff9c9c);
}

.send-red-packet-button:disabled {
  background: var(--background-disabled, #f5f5f5);
  color: var(--text-disabled, #bbb);
}

/* 触发按钮样式 */
.red-packet-trigger-btn {
  margin-left: 10px;
  background: linear-gradient(135deg, #ff4d4d, #ff7875);
  border: none;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 36px;
}

.red-packet-trigger-btn:hover {
  background: linear-gradient(135deg, #ff7875, #ff9c9c);
  transform: scale(1.05);
}
</style>

<style>
/* 全局样式，用于弹出框 */
.red-packet-popper {
  height: 70vh !important;
  max-height: 494px !important;
  overflow: hidden !important;
}
</style>