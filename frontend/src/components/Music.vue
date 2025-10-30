<template>
  <div class="music-container">
    <div class="music-header">
      <h2 class="music-title">
        <el-icon><Service /></el-icon> 在线音乐
      </h2>
      <div class="music-info">
        <span class="current-source" v-if="currentMusicSourceName">当前音乐源: {{ currentMusicSourceName }}</span>
        <el-button type="info" size="small" @click="refreshMusic" v-if="!loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>
    
    <div class="iframe-container" :class="{ loading: loading }">
      <div v-if="loading" class="loading-overlay">
        <p>{{ loadingText }}</p>
      </div>
      <iframe 
        :src="musicSourceUrl" 
        frameborder="0" 
        style="width: 100%; height: calc(100vh - 60px);" 
        @load="onIframeLoaded"
        @error="onIframeError"
      ></iframe>
    </div>
    
    <div v-if="errorMessage" class="error-message">
      <el-alert 
        :title="'加载错误: ' + errorMessage" 
        type="error" 
        show-icon
        :closable="false"
      >
        <template #desc>
          <div>
            <p>请尝试以下解决方法:</p>
            <ol>
              <li>检查网络连接</li>
              <li>刷新页面</li>
              <li>在设置中更换音乐源</li>
            </ol>
            <el-button type="primary" size="small" @click="refreshMusic" style="margin-top: 10px;">
              重试
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Service } from '@element-plus/icons-vue';

export default {
  name: 'Music',
  components: {
    Service,
    Refresh
  },
  setup() {
    // 音乐源列表
    const musicSources = ref([
      { name: '布谷音乐', url: 'https://www.buguyy.top/' },
      { name: 'qqmp3', url: 'https://www.qqmp3.vip/' }
    ]);
    
    // 音乐源URL
    const musicSourceUrl = ref('');
    
    // 加载状态
    const loading = ref(true);
    const loadingText = ref('加载音乐源中...');
    const errorMessage = ref('');
    
    // 计算当前音乐源名称
    const currentMusicSourceName = computed(() => {
      if (!musicSourceUrl.value) return '';
      const source = musicSources.value.find(item => item.url === musicSourceUrl.value);
      return source ? source.name : '自定义音乐源';
    });
    
    // 从localStorage加载音乐源配置
    const loadMusicSource = () => {
      try {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          if (parsedSettings.musicSource) {
            musicSourceUrl.value = parsedSettings.musicSource;
            return;
          }
        }
        // 默认使用第一个音乐源
        musicSourceUrl.value = musicSources.value[0].url;
      } catch (error) {
        console.error('加载音乐源配置失败:', error);
        ElMessage.error('加载音乐源配置失败，使用默认配置');
        musicSourceUrl.value = musicSources.value[0].url;
      }
    };
    
    // 刷新音乐源
    const refreshMusic = () => {
      loading.value = true;
      errorMessage.value = '';
      loadingText.value = '重新加载音乐源中...';
      
      // 强制刷新iframe
      const tempUrl = musicSourceUrl.value;
      // 添加时间戳防止缓存
      const timestamp = new Date().getTime();
      const separator = tempUrl.includes('?') ? '&' : '?';
      musicSourceUrl.value = tempUrl + separator + 't=' + timestamp;
      
      // 重置回原始URL（如果需要）
      setTimeout(() => {
        musicSourceUrl.value = tempUrl;
      }, 0);
    };
    
    // iframe加载完成
    const onIframeLoaded = () => {
      loading.value = false;
      errorMessage.value = '';
      // 可以在这里添加额外的逻辑
    };
    
    // iframe加载错误
    const onIframeError = (event) => {
      loading.value = false;
      errorMessage.value = '音乐源加载失败，请检查网络或尝试其他音乐源';
      console.error('音乐源加载错误:', event);
      ElMessage.error(errorMessage.value);
    };
    
    // 处理音乐源变更事件
    const handleMusicSourceChange = (event) => {
      if (event && event.detail && event.detail.musicSource) {
        musicSourceUrl.value = event.detail.musicSource;
        loading.value = true;
        errorMessage.value = '';
        loadingText.value = '切换音乐源中...';
        ElMessage.success('正在切换到: ' + currentMusicSourceName.value);
      }
    };
    
    // 组件挂载
    onMounted(() => {
      loadMusicSource();
      // 监听音乐源变更事件
      window.addEventListener('music-source-changed', handleMusicSourceChange);
    });
    
    // 组件卸载
    onUnmounted(() => {
      // 移除事件监听
      window.removeEventListener('music-source-changed', handleMusicSourceChange);
    });
    
    return {
      musicSourceUrl,
      loading,
      loadingText,
      errorMessage,
      currentMusicSourceName,
      refreshMusic,
      onIframeLoaded,
      onIframeError
    };
  }
};
</script>

<style scoped>
.music-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  position: relative;
}

.music-header {
  padding: 10px 20px;
  background-color: var(--background-secondary);
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  box-sizing: border-box;
}

.music-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.music-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.current-source {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.iframe-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.iframe-container.loading {
  background-color: var(--el-bg-color-page);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

:deep(.theme-dark) .loading-overlay {
  background-color: rgba(20, 20, 20, 0.8);
}

.loading-overlay p {
  margin-top: 15px;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.error-message {
  position: absolute;
  top: 70px;
  left: 20px;
  right: 20px;
  z-index: 20;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .music-header {
    padding: 10px 15px;
    flex-direction: column;
    height: auto;
    gap: 10px;
  }
  
  .music-title {
    font-size: 16px;
  }
  
  .music-info {
    width: 100%;
    justify-content: space-between;
  }
  
  .iframe-container iframe {
    height: calc(100vh - 100px);
  }
  
  .error-message {
    top: 110px;
    left: 10px;
    right: 10px;
  }
}

/* 动画效果 */
.music-header {
  transition: all 0.3s ease;
}

.el-button {
  transition: all 0.3s ease;
}

.loading-overlay {
  transition: opacity 0.3s ease;
}
</style>