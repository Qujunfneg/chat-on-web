<template>
  <div
    v-if="showMenu"
    class="context-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <div
      class="context-menu-item"
      v-if="selectedUserForMention"
      @click="mentionUser"
    >
      @ 提及
    </div>
    <div class="context-menu-item" v-if="selectedMessage" @click="quoteMessage">
      💬 引用
    </div>
    <div
      class="context-menu-item"
      v-if="selectedImageUrl"
      @click="saveAsFavorite"
    >
      ⭐ 收藏为表情包
    </div>
    <div
      class="context-menu-item"
      v-if="selectedMessage && isMessageOwner"
      @click="recallMessage"
    >
      ↩️ 撤回
    </div>
    <div
      class="context-menu-item"
      v-if="selectedUserForMention && adminMode && !isCurrentUser"
      @click="kickUser"
    >
      👟 踢人
    </div>
    <div class="context-menu-item" @click="hideMenu">取消</div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'ContextMenu',
  props: {
    showMenu: {
      type: Boolean,
      default: false
    },
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    },
    selectedUserForMention: {
      type: [String, Object],
      default: null
    },
    selectedMessage: {
      type: Object,
      default: null
    },
    selectedImageUrl: {
      type: String,
      default: null
    },
    currentUserId: {
      type: String,
      default: ''
    }
  },
  emits: ['hideMenu', 'mentionUser', 'quoteMessage', 'saveAsFavorite', 'editNickname', 'recallMessage', 'kickUser'],
  setup(props, { emit }) {
    // 管理员模式状态
    const adminMode = ref(false);
    
    // 从localStorage读取管理员模式状态
    const isLocalAdminMode = computed(() => {
      try {
        const adminSettings = JSON.parse(localStorage.getItem('adminSettings') || '{}');
        return adminSettings.adminMode || false;
      } catch (error) {
        console.error('Failed to parse admin settings:', error);
        return false;
      }
    });

    // 初始化管理员模式状态
    adminMode.value = isLocalAdminMode.value;

    // 监听管理员模式变更事件
    const handleAdminModeChanged = (event) => {
      adminMode.value = event.detail.adminMode;
    };

    // 组件挂载时添加事件监听
    onMounted(() => {
      window.addEventListener('admin-mode-changed', handleAdminModeChanged);
    });

    // 组件卸载时移除事件监听
    onUnmounted(() => {
      window.removeEventListener('admin-mode-changed', handleAdminModeChanged);
    });

    // 检查是否为当前用户
    const isCurrentUser = computed(() => {
      if (!props.selectedUserForMention || !props.currentUserId) {
        return false;
      }
      
      // 如果selectedUserForMention是对象，检查userId
      if (typeof props.selectedUserForMention === 'object') {
        return props.selectedUserForMention.userId === props.currentUserId;
      }
      
      // 如果是字符串，无法比较ID，默认不显示修改昵称选项
      return false;
    });

    // 检查消息是否属于当前用户且未被撤回
    const isMessageOwner = computed(() => {
      if (!props.selectedMessage || !props.currentUserId) {
        return false;
      }
      
      // 检查消息的userId是否与当前用户ID匹配
      const isOwner = props.selectedMessage.userId === props.currentUserId;
      
      // 检查消息是否已被撤回
      const isRecalled = props.selectedMessage.recalled || props.selectedMessage.type === 'recalled';
      
      // 只有是消息所有者且消息未被撤回时才显示撤回按钮
      return isOwner && !isRecalled;
    });

    // 提及用户
    const mentionUser = () => {
      if (props.selectedUserForMention) {
        emit('mentionUser', props.selectedUserForMention);
      }
      emit('hideMenu');
    };

    // 引用消息
    const quoteMessage = () => {
      if (props.selectedMessage) {
        emit('quoteMessage', props.selectedMessage);
      }
      emit('hideMenu');
    };

    // 收藏表情包
    const saveAsFavorite = () => {
      if (props.selectedImageUrl) {
        emit('saveAsFavorite', props.selectedImageUrl);
      }
      emit('hideMenu');
    };

    // 修改昵称
    const editNickname = () => {
      if (props.selectedUserForMention) {
        emit('editNickname', props.selectedUserForMention);
      }
      emit('hideMenu');
    };

    // 撤回消息
    const recallMessage = () => {
      if (props.selectedMessage) {
        emit('recallMessage', props.selectedMessage);
      }
      emit('hideMenu');
    };

    // 踢人
    const kickUser = () => {
      if (props.selectedUserForMention) {
        emit('kickUser', props.selectedUserForMention);
      }
      emit('hideMenu');
    };

    // 隐藏菜单
    const hideMenu = () => {
      emit('hideMenu');
    };

    return {
      adminMode,
      mentionUser,
      quoteMessage,
      saveAsFavorite,
      editNickname,
      recallMessage,
      kickUser,
      hideMenu,
      isCurrentUser,
      isMessageOwner
    };
  }
};
</script>