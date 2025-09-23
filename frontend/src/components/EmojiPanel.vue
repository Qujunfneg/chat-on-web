<template>
  <el-popover
    placement="top-start"
    width="414"
    trigger="click"
    v-model="showPanel"
  >
    <template #reference>
      <el-button class="emoji-button"> 😊 </el-button>
    </template>
    <!-- 表情包面板 -->
    <div class="emoji-panel">
      <!-- 表情包分类标签 -->
      <div class="emoji-tabs">
        <div
          v-for="(tab, index) in emojiTabs"
          :key="index"
          :class="['emoji-tab', { active: activeTab === index }]"
          @click="activeTab = index"
        >
          {{ tab.icon }}
          <span>{{ tab.name }}</span>
        </div>
      </div>

      <!-- 表情包内容区域 -->
      <div class="emoji-content">
        <!-- 默认表情 -->
        <div v-if="activeTab === 0" class="emoji-grid">
          <div
            v-for="(emoji, index) in defaultEmojis"
            :key="index"
            class="emoji-item"
            @click="selectEmoji(emoji)"
          >
            {{ emoji }}
          </div>
        </div>
        
        <!-- 动态表情 -->
        <div v-else-if="activeTab === 1">
          <!-- 加载状态显示 -->
          <div v-if="loadingEmojis" class="emoji-loading">
            <div class="loading-spinner"></div>
            <span>加载表情中...</span>
          </div>
          
          <!-- 动态表情列表 -->
          <div v-else-if="dynamicEmojis.length > 0" class="dynamic-emoji-grid">
            <div 
              v-for="emoji in dynamicEmojis" 
              :key="emoji.url"
              class="dynamic-emoji-item"
              @click="selectDynamicEmoji(emoji)"
              :title="emoji.name"
            >
              <img :src="emoji.url" :alt="emoji.name" />
            </div>
          </div>
          
          <!-- 空状态显示 -->
          <div v-else class="no-emojis">
            暂无动态表情
          </div>
        </div>

        <div v-else-if="activeTab === 2">
          <!-- 加载状态显示 -->
          <div v-if="loadingEmojis" class="emoji-loading">
            <div class="loading-spinner"></div>
            <span>加载表情中...</span>
          </div>
          
          <!-- 动态表情列表 -->
          <div v-else-if="huajiEmojis.length > 0" class="dynamic-emoji-grid">
            <div 
              v-for="emoji in huajiEmojis" 
              :key="emoji.url"
              class="dynamic-emoji-item"
              @click="selectDynamicEmoji(emoji)"
              :title="emoji.name"
            >
              <img :src="emoji.url" :alt="emoji.name" />
            </div>
          </div>
          
          <!-- 空状态显示 -->
          <div v-else class="no-emojis">
            暂无动态表情
          </div>
        </div>

        <div v-else-if="activeTab === 3">
          <!-- 加载状态显示 -->
          <div v-if="loadingEmojis" class="emoji-loading">
            <div class="loading-spinner"></div>
            <span>加载表情中...</span>
          </div>
          
          <!-- 动态表情列表 -->
          <div v-else-if="yelloEmojis.length > 0" class="dynamic-emoji-grid">
            <div 
              v-for="emoji in yelloEmojis" 
              :key="emoji.url"
              class="dynamic-emoji-item"
              @click="selectDynamicEmoji(emoji)"
              :title="emoji.name"
            >
              <img :src="emoji.url" :alt="emoji.name" />
            </div>
          </div>
          
          <!-- 空状态显示 -->
          <div v-else class="no-emojis">
            暂无动态表情
          </div>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'EmojiPanel',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    favoriteEmojis: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:modelValue', 'selectEmoji', 'removeFavoriteEmoji'],
  setup(props, { emit }) {
    const showPanel = ref(props.modelValue);
    const activeTab = ref(0);
    const emojiTabs = [
      { name: "默认", icon: "😊" },
      { name: "动态", icon: "💫" },
      { name: "滑稽", icon: "😘" },
      { name: "大黄人", icon: "🤪" },
    ];
    
    // 动态表情包数据
    const dynamicEmojis = ref([]);
    const loadingEmojis = ref(false);
    const huajiEmojis = ref([]);
    const yelloEmojis = ref([]);
    

   async function fetchEmo(path,filed){
      loadingEmojis.value = true;
      try {
        // 使用修改后的API路径参数名
        const response = await fetch(`/api/emojis/${path}`);
        const data = await response.json();
        
        if (data.success) {
      
          filed.value = data.data;
        } else {
          ElMessage.error('获取表情包失败: ' + data.message);
        }
      } catch (error) {
        console.error('获取表情包错误:', error);
        ElMessage.error('获取表情包失败，请稍后重试');
        
        // 出错时提供备用表情数据
        filed.value = []
      } finally {
        loadingEmojis.value = false;
      }
    }
    
    // 组件挂载时获取表情包数据
    onMounted(() => {
      fetchEmo('qq',dynamicEmojis);
      fetchEmo('funny',huajiEmojis);
      fetchEmo('bigface',yelloEmojis);
    });
    
    // 默认表情包列表
    const defaultEmojis = [
      "😊", "😂", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "🤨", "🧐", "🤓", "😎",
      "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩", "🥺", "😢", "😭",
      "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭",
      "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪",
      "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡"
    ];

    // 监听面板显示状态变化
    const unwatch = import.meta.hot?.on('props:modelValue', (newValue) => {
      showPanel.value = newValue;
    });

    // 选择表情包
    const selectEmoji = (emoji) => {
      emit('selectEmoji', emoji);
      showPanel.value = false;
      emit('update:modelValue', false);
    };

    // 选择动态表情
    const selectDynamicEmoji = (emoji) => {
      emit('selectEmoji', emoji);
      showPanel.value = false;
      emit('update:modelValue', false);
    };

    // 删除收藏表情
    const removeFavoriteEmoji = (index) => {
      emit('removeFavoriteEmoji', index);
    };

    // 检查是否为图片URL
    const isImageUrl = (url) => {
      if (typeof url !== "string") return false;
      return url.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;
    };

    return {
      showPanel,
      activeTab,
      emojiTabs,
      defaultEmojis,
      dynamicEmojis,
      huajiEmojis,
      yelloEmojis,
      loadingEmojis,
      selectEmoji,
      selectDynamicEmoji,
      removeFavoriteEmoji,
      isImageUrl
    };
  }
};
</script>

<style scoped>
/* 加载状态样式 */
.emoji-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #666;
}

/* 加载动画 */
.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 空状态样式 */
.no-emojis {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: #999;
  font-size: 14px;
}
</style>