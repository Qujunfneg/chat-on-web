<template>
  <div
    v-show="showPanel"
    class="mention-panel"
    :style="{ left: x + 'px', bottom: y + 'px' }"
    style="max-height: 300px;overflow-y: auto;"
    @click.stop
  >
    <div class="mention-panel-title">选择联系人</div>
    <div class="mention-panel-items">
      <div
        v-for="user in users"
        :key="typeof user === 'object' ? user.username || user.userId : user"
        class="mention-panel-item"
        @click="selectUser(user)"
      >
        <div
          class="avatar"
          :style="{ backgroundColor: getAvatarColor(user) }"
        >
          {{ getAvatarText(user) }}
        </div>
        <span>{{ typeof user === 'object' ? user.username || user.userId : user }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'MentionPanel',
  props: {
    showPanel: {
      type: Boolean,
      default: false
    },
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 86
    },
    users: {
      type: Array,
      default: () => []
    }
  },
  emits: ['selectUser'],
  setup(props, { emit }) {
    // 获取用户名（兼容字符串和对象）
    const getUsername = (user) => {
      if (typeof user === 'object') {
        return user.username || user.userId || '';
      }
      return user || '';
    };

    // 生成头像颜色
    const getAvatarColor = (user) => {
      const username = getUsername(user);
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
    const getAvatarText = (user) => {
      const username = getUsername(user);
      return username.charAt(0).toUpperCase();
    };

    // 选择用户
    const selectUser = (user) => {
      emit('selectUser', user);
    };

    return {
      getAvatarColor,
      getAvatarText,
      selectUser
    };
  }
};
</script>