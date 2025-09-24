<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2>个人设置</h2>
    </div>
    <el-form
      class="settings-form"
      :model="form"
      label-width="100px"
      :rules="rules"
    >
      <el-form-item label="昵称" prop="name" class="form-item-animation">
        <el-input
          v-model="form.name"
          placeholder="请输入您的昵称"
          prefix-icon="InfoFilled"
        >
        </el-input>
        <div class="form-hint">
          设置一个个性化的昵称，让其他用户更容易记住您
        </div>
      </el-form-item>

      <el-form-item class="form-actions">
        <el-button
          type="primary"
          @click="onSubmit"
          :loading="loading"
          class="submit-button"
        >
          保存设置
        </el-button>
        <el-button @click="onCancel" class="cancel-button"> 取消 </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { InfoFilled } from '@element-plus/icons-vue';

// 定义事件发射器，用于通知父组件更新用户昵称
const emit = defineEmits(['nickname-updated']);

const loading = ref(false);

// 表单数据
const form = reactive({
  name: "",
});

// 表单验证规则
const rules = {
  name: [
    { required: true, message: "请输入昵称", trigger: "blur" },
    {
      min: 2,
      max: 10,
      message: "昵称长度应在 2 到 10 个字符之间",
      trigger: "blur",
    },
  ],
};

// 组件初始化时，从localStorage获取昵称
onMounted(() => {
  const nickname = localStorage.getItem('nickname');
  const username = localStorage.getItem('username');
  // 如果没有昵称，则使用用户名作为默认昵称
  form.name = nickname || username || "";
});

const onSubmit = async () => {
  loading.value = true;
  
  try {
    // 获取用户认证信息
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (!token || !username) {
      ElMessage.error("请先登录");
      loading.value = false;
      return;
    }
    
    // 调用后端API更新昵称
    const response = await fetch('/api/update-nickname', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-username': username
      },
      body: JSON.stringify({ nickname: form.name.trim() })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 更新localStorage中的昵称
      localStorage.setItem('nickname', form.name.trim());
      
      // 发送事件通知父组件更新用户昵称
      emit('nickname-updated', form.name.trim());
      
      // 显示成功消息
      ElMessage.success("昵称设置成功！");
    } else {
      ElMessage.error(data.message || "昵称更新失败");
    }
  } catch (error) {
    console.error("更新昵称失败:", error);
    ElMessage.error("网络错误，请稍后重试");
  } finally {
    loading.value = false;
  }
};

const onCancel = () => {
  // 取消时恢复原来的昵称
  const nickname = localStorage.getItem('nickname');
  const username = localStorage.getItem('username');
  form.name = nickname || username || "";
  ElMessage.info("已取消设置");
};
</script>

<style scoped>
.settings-container {
  padding: 30px;
  max-width: 600px;
  margin: 0 auto;
  background: var(--background-secondary);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  position: relative;
  top: 50%;
  transform: translateY(-50%);
}

.settings-container:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.settings-header {
  text-align: center;
  margin-bottom: 30px;
}

.settings-header h2 {
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  position: relative;
  display: inline-block;
}

.settings-header h2::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, var(--success-color) 0%, var(--accent-primary) 100%);
  border-radius: 2px;
}

.settings-form {
  padding: 0 20px;
}

.form-item-animation {
  transition: all 0.3s ease;
}

.form-item-animation:hover .el-input__wrapper {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.form-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.submit-button {
  width: 120px;
  margin-right: 15px;
  background: linear-gradient(90deg, var(--success-color) 0%, var(--accent-primary) 100%);
  border: none;
  transition: all 0.3s ease;
}

.submit-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(64, 158, 255, 0.3);
}

.cancel-button {
  width: 120px;
  transition: all 0.3s ease;
}

.cancel-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 输入框动画效果 */
.el-input__wrapper {
  transition: all 0.3s ease;
  border-radius: 6px !important;
}

/* 按钮动画效果 */
.el-button {
  border-radius: 6px !important;
  font-weight: 500 !important;
}
</style>
