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
    <div class="context-menu-item" @click="hideMenu">取消</div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

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
  emits: ['hideMenu', 'mentionUser', 'quoteMessage', 'saveAsFavorite', 'editNickname'],
  setup(props, { emit }) {
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

    // 隐藏菜单
    const hideMenu = () => {
      emit('hideMenu');
    };

    return {
      mentionUser,
      quoteMessage,
      saveAsFavorite,
      editNickname,
      hideMenu,
      isCurrentUser
    };
  }
};
</script>