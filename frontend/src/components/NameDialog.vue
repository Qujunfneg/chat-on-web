<template>
  <el-dialog
    v-model="showDialog"
    :title="dialogTitle"
    width="30%"
    :before-close="handleClose"
  >
    <el-input
      v-model="username"
      :placeholder="placeholder"
      :maxlength="maxLength"
      show-word-limit
      @keyup.enter="confirmUsername"
    ></el-input>
    <div style="color: #909399; font-size: 12px; margin-top: 8px">
      {{ tipText }}
    </div>
    <div v-if="errorMessage" style="color: #f56c6c; font-size: 12px; margin-top: 4px">
      {{ errorMessage }}
    </div>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="isLoading" @click="confirmUsername">确认</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'NameDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    initialUsername: {
      type: String,
      default: ''
    },
    isUsernameDialog: {
      type: Boolean,
      default: true
    },
    currentUser: {
      type: String,
      default: ''
    },
    userId: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'confirmed'],
  setup(props, { emit }) {
    const showDialog = ref(props.modelValue);
    const username = ref(props.initialUsername);
    const isLoading = ref(false);
    const errorMessage = ref('');

    // 监听外部modelValue变化
    if (import.meta.hot) {
      import.meta.hot.on('props:modelValue', (newValue) => {
        showDialog.value = newValue;
      });
    }

    // 监听props变化
    watch(() => props.modelValue, (newValue) => {
      showDialog.value = newValue;
    });

    watch(() => props.initialUsername, (newValue) => {
      username.value = newValue;
    });

    // 根据模式计算对话框标题
    const dialogTitle = computed(() => {
      return props.isUsernameDialog ? '请输入用户名' : '修改昵称';
    });

    // 根据模式计算输入框占位符
    const placeholder = computed(() => {
      return props.isUsernameDialog 
        ? '请输入用户名（最多5个字符）' 
        : '请输入昵称（最多10个字符）';
    });

    // 根据模式计算最大长度
    const maxLength = computed(() => {
      return props.isUsernameDialog ? 5 : 10;
    });

    // 根据模式计算提示文本
    const tipText = computed(() => {
      return props.isUsernameDialog 
        ? '注册后将无法修改用户名' 
        : '修改后将同步更新聊天记录中的显示';
    });

    // 确认用户名或昵称
    const confirmUsername = async () => {
      const value = username.value.trim();
      if (!value) {
        ElMessage.warning(props.isUsernameDialog ? "请输入用户名" : "请输入昵称");
        return;
      }
      
      if (value.length < 2) {
        ElMessage.warning(props.isUsernameDialog ? "用户名至少需要2个字符" : "昵称至少需要2个字符");
        return;
      }
      
      isLoading.value = true;
      errorMessage.value = '';
      
      try {
        if (props.isUsernameDialog) {
          // 用户名注册逻辑
          const res = await fetch("/api/users");
          const data = await res.json();
          if (data.users.includes(value)) {
            ElMessage.error("用户名已被占用，请换一个");
            return;
          }
          localStorage.setItem("username", value);
        } else {
          // 昵称修改逻辑
          const res = await fetch("/api/update-nickname", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": props.userId
            },
            body: JSON.stringify({
              username: props.currentUser,
              nickname: value
            })
          });
          
          if (!res.ok) {
            throw new Error('修改失败');
          }
          
          const data = await res.json();
          if (data.success) {
            // 更新localStorage中的昵称
            localStorage.setItem("nickname", value);
          } else {
            throw new Error(data.message || '修改失败');
          }
        }
        
        showDialog.value = false;
        emit('update:modelValue', false);
        emit('confirmed', value);
        
      } catch (e) {
        console.error(props.isUsernameDialog ? "检测用户名失败:" : "修改昵称失败:", e);
        errorMessage.value = e.message || (props.isUsernameDialog ? "检测用户名失败，请重试" : "修改昵称失败，请重试");
      } finally {
        isLoading.value = false;
      }
    };

    // 处理弹窗关闭
    const handleClose = () => {
      username.value = '';
      errorMessage.value = '';
      showDialog.value = false;
      emit('update:modelValue', false);
    };

    return {
      showDialog,
      username,
      confirmUsername,
      handleClose,
      isLoading,
      errorMessage,
      dialogTitle,
      placeholder,
      maxLength,
      tipText
    };
  }
};
</script>