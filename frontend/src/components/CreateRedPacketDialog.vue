<template>
  <div v-if="modelValue" class="create-red-packet-dialog-overlay" @click="closeDialog">
    <div class="create-red-packet-dialog" @click.stop>
      <div class="dialog-header">
        <h3>发红包</h3>
        <button class="close-btn" @click="closeDialog">×</button>
      </div>
      
      <div class="dialog-content">
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
      </div>
      
      <div class="dialog-footer">
        <button class="cancel-btn" @click="closeDialog">取消</button>
        <button class="create-btn" 
                @click="createRedPacket" 
                :disabled="!canCreate">
          发红包
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreateRedPacketDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    userPoints: {
      type: Number,
      required: true
    }
  },
  emits: ['update:modelValue', 'close', 'create'],
  data() {
    return {
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
    closeDialog() {
      this.$emit('update:modelValue', false);
      this.$emit('close');
    },
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
      this.$emit('update:modelValue', false);
    }
  }
}
</script>

<style scoped>
.create-red-packet-dialog-overlay {
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

.create-red-packet-dialog {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 360px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #f0f0f0;
  background-color: #fff;
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
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  color: #666;
  background-color: #f8f9fa;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #fff;
}

.red-packet-type-selector {
  display: flex;
  margin-bottom: 20px;
  gap: 10px;
}

.type-option {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.type-option.active {
  border-color: #ff4d4f;
  background-color: rgba(255, 77, 79, 0.1);
}

.type-icon {
  font-size: 20px;
  margin-bottom: 6px;
}

.type-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}



.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}



.form-group textarea {
  width: 100%;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  background-color: #f8f9fa;
  transition: border-color 0.3s;
}

.form-group textarea:focus {
  outline: none;
  border-color: #ff4d4f;
  background-color: #fff;
}

.simple-input {
  display: flex;
  align-items: center;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 0 12px;
  border: 1px solid #e9ecef;
  transition: border-color 0.3s;
}

.simple-input:focus-within {
  border-color: #ff4d4f;
}

.simple-input input {
  flex: 1;
  height: 40px;
  border: none;
  background: none;
  outline: none;
  font-size: 16px;
  padding: 0;
}

.input-unit {
  margin-left: 8px;
  color: #666;
  font-size: 14px;
  min-width: 30px;
}

.balance-info {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  text-align: right;
}

.char-count {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  text-align: right;
}



.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.cancel-btn {
  padding: 10px 20px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #fff;
  color: #6c757d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background-color: #f8f9fa;
  border-color: #dee2e6;
}

.create-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff6b6b, #ff4d4f);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(255, 77, 79, 0.2);
}

.create-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
}

.create-btn:disabled {
  background: #adb5bd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>