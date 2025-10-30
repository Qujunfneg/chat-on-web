<template>
  <div class="setting-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><SettingIcon /></el-icon>
        应用设置
      </h1>
      <p class="page-subtitle">管理您的应用偏好设置</p>
    </div>

    <!-- 设置卡片网格 -->
    <div class="settings-grid">
      <!-- 音乐源设置卡片 -->
      <el-card class="setting-card music-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="header-icon">
              <el-icon><MusicIcon /></el-icon>
            </div>
            <div class="header-content">
              <h3>音乐源设置</h3>
              <p>配置音乐播放服务</p>
            </div>
            <div class="header-actions">
              <el-button 
                v-if="!isEditing" 
                type="primary" 
                @click="startEditing" 
                class="edit-btn"
                size="small"
              >
                <el-icon><EditIcon /></el-icon>
                编辑
              </el-button>
              <div v-else class="edit-actions">
                <el-button 
                  type="success" 
                  @click="saveMusicSettings" 
                  :loading="musicSaving"
                  size="small"
                >
                  <el-icon><CheckIcon /></el-icon>
                  保存
                </el-button>
                <el-button @click="cancelEditing" size="small">
                  <el-icon><CloseIcon /></el-icon>
                  取消
                </el-button>
              </div>
            </div>
          </div>
        </template>
        
        <div class="card-content">
          <!-- 只读模式：显示当前音乐源信息 -->
          <div v-if="!isEditing" class="info-display">
            <div class="info-item">
              <div class="info-label">
                <el-icon><MusicIcon /></el-icon>
                <span>当前音乐源</span>
              </div>
              <div class="info-value">{{ currentMusicSourceName }}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">
                <el-icon><LinkIcon /></el-icon>
                <span>音乐源URL</span>
              </div>
              <div class="info-value url-value">{{ musicSettings.musicSource }}</div>
            </div>
          </div>
          
          <!-- 编辑模式：显示表单 -->
          <el-form 
            v-else
            ref="musicForm"
            :model="tempMusicSettings"
            label-position="top"
            class="compact-form"
            size="default"
          >
            <el-form-item 
              label="选择音乐源"
              prop="musicSource"
              :rules="[{ required: true, message: '请选择音乐源', trigger: 'change' }]"
            >
              <el-select 
                v-model="tempMusicSettings.musicSource" 
                placeholder="请选择音乐源" 
                class="w-full"
              >
                <el-option 
                  v-for="source in musicSources"
                  :key="source.name"
                  :label="source.name"
                  :value="source.url"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
      
      <!-- Core ID设置卡片 - 仅在客户端模式下显示 -->
      <el-card v-if="isElectron() && adminSettings.adminMode" class="setting-card core-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="header-icon">
              <el-icon><KeyIcon /></el-icon>
            </div>
            <div class="header-content">
              <h3>客户端ID设置</h3>
              <p>配置客户端身份标识</p>
            </div>
            <div class="header-actions">
              <el-button 
                v-if="!isEditingCore" 
                type="primary" 
                @click="startEditingCore" 
                class="edit-btn"
                size="small"
              >
                <el-icon><EditIcon /></el-icon>
                编辑
              </el-button>
              <div v-else class="edit-actions">
                <el-button 
                  type="success" 
                  @click="saveCoreSettings" 
                  :loading="coreSaving"
                  size="small"
                >
                  <el-icon><CheckIcon /></el-icon>
                  保存
                </el-button>
                <el-button @click="cancelEditingCore" size="small">
                  <el-icon><CloseIcon /></el-icon>
                  取消
                </el-button>
              </div>
            </div>
          </div>
        </template>
        
        <div class="card-content">
          <!-- 只读模式：显示当前Core ID -->
          <div v-if="!isEditingCore" class="info-display">
            <div class="info-item">
              <div class="info-label">
                <el-icon><KeyIcon /></el-icon>
                <span>当前客户端ID</span>
              </div>
              <div class="info-value">{{ coreSettings.coreId || '未设置' }}</div>
            </div>
          </div>
          
          <!-- 编辑模式：显示表单 -->
          <el-form 
            v-else
            ref="coreForm"
            :model="tempCoreSettings"
            label-position="top"
            class="compact-form"
            size="default"
          >
            <el-form-item 
              label="客户端ID"
              prop="coreId"
              :rules="[{ required: true, message: '请输入客户端ID', trigger: 'blur' }]"
            >
              <el-input 
                v-model="tempCoreSettings.coreId" 
                placeholder="请输入客户端ID" 
                class="w-full"
              />
            </el-form-item>
          </el-form>
        </div>
      </el-card>
      
      <!-- 管理员状态卡片 -->
      <el-card v-if="adminSettings.adminMode" class="settings-card admin-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon class="header-icon admin-header-icon"><UserIcon /></el-icon>
              <span class="card-title">管理员模式</span>
            </div>
          </div>
        </template>
        <div class="card-content">
          <div class="admin-status-content">
            <div class="admin-status-info">
              <el-icon class="admin-status-icon"><UserIcon /></el-icon>
              <span class="admin-status-text">管理员模式已启用</span>
            </div>
            <div class="admin-actions">
              <el-button 
                type="danger" 
                size="default"
                @click="disableAdminMode"
                class="admin-close-btn"
              >
                <el-icon><CloseIcon /></el-icon>
                关闭管理员模式
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { isElectron } from "../utils/electronUtils.js";

// 从element-plus导入所有需要的图标
import { 
  Setting as SettingIcon,
  VideoPlay as MusicIcon,
  User as UserIcon,
  InfoFilled as InfoIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Key as KeyIcon
} from '@element-plus/icons-vue';

export default {
  name: 'Setting',
  components: {
    SettingIcon,
    MusicIcon,
    UserIcon,
    InfoIcon,
    CheckIcon,
    RefreshIcon,
    LinkIcon,
    EditIcon,
    CloseIcon,
    KeyIcon
  },
  emits: ['close', 'settings-changed'],
  setup(props, { emit }) {
    const musicForm = ref(null);
    const coreForm = ref(null);
    const musicSaving = ref(false);
    const coreSaving = ref(false);
    const isEditing = ref(false);
    const isEditingCore = ref(false);
    
    
    // 音乐源列表
    const musicSources = ref([
      { name: '布谷音乐', url: 'https://www.buguyy.top/' },
      { name: 'qqmp3', url: 'https://www.qqmp3.vip/' }
    ]);
    
    // 音乐源设置数据模型
    const musicSettings = reactive({
      musicSource: musicSources.value[0].url // 默认使用第一个音乐源
    });
    
    // 临时音乐源设置，用于编辑模式
    const tempMusicSettings = reactive({
      musicSource: musicSettings.musicSource
    });
    
    // Core ID设置数据模型
    const coreSettings = reactive({
      coreId: localStorage.getItem('coreId') || ''
    });
    
    // 临时Core ID设置，用于编辑模式
    const tempCoreSettings = reactive({
      coreId: coreSettings.coreId
    });
    
    // 管理员设置数据模型
    const adminSettings = reactive({
      adminMode: false // 默认禁用管理员模式
    });
    
    // 计算当前选中的音乐源名称
    const currentMusicSourceName = computed(() => {
      const source = musicSources.value.find(item => item.url === musicSettings.musicSource);
      return source ? source.name : '未知音乐源';
    });
    
    // 组件挂载时从localStorage加载设置
    onMounted(() => {
      loadMusicSettings();
      loadCoreSettings();
      loadAdminSettings();
      
      // 监听管理员模式变更事件
      window.addEventListener('admin-mode-changed', handleAdminModeChange);
    });
    
    // 处理管理员模式变更事件
    const handleAdminModeChange = (event) => {
      if (event.detail && event.detail.adminMode !== undefined) {
        adminSettings.adminMode = event.detail.adminMode;
        saveAdminSettingsToStorage();
      }
    };
    
    // 从localStorage加载Core ID设置
    const loadCoreSettings = () => {
      try {
        const savedCoreId = localStorage.getItem('coreId');
        if (savedCoreId) {
          coreSettings.coreId = savedCoreId;
          tempCoreSettings.coreId = savedCoreId;
        }
      } catch (error) {
        console.error('加载Core ID设置失败:', error);
        ElMessage.error('加载Core ID设置失败');
      }
    };
    
    // 从localStorage加载音乐源设置
    const loadMusicSettings = () => {
      try {
        const savedSettings = localStorage.getItem('musicSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          Object.assign(musicSettings, parsedSettings);
          Object.assign(tempMusicSettings, parsedSettings);
        } else {
          // 如果没有保存的设置，使用默认值并保存
          saveMusicSettingsToStorage();
        }
      } catch (error) {
        console.error('加载音乐源设置失败:', error);
        ElMessage.error('加载音乐源设置失败');
      }
    };
    
    // 从localStorage加载管理员设置
    const loadAdminSettings = () => {
      try {
        const savedSettings = localStorage.getItem('adminSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          Object.assign(adminSettings, parsedSettings);
        } else {
          // 如果没有保存的设置，使用默认值并保存
          saveAdminSettingsToStorage();
        }
      } catch (error) {
        console.error('加载管理员设置失败:', error);
        ElMessage.error('加载管理员设置失败');
      }
    };
    
    // 开始编辑
    const startEditing = () => {
      isEditing.value = true;
      // 重置临时设置为当前设置
      Object.assign(tempMusicSettings, musicSettings);
    };
    
    // 取消编辑
    const cancelEditing = () => {
      isEditing.value = false;
      // 重置临时设置为当前设置
      Object.assign(tempMusicSettings, musicSettings);
    };
    
    // 开始编辑Core ID
    const startEditingCore = () => {
      isEditingCore.value = true;
      // 重置临时设置为当前设置
      Object.assign(tempCoreSettings, coreSettings);
    };
    
    // 取消编辑Core ID
    const cancelEditingCore = () => {
      isEditingCore.value = false;
      // 重置临时设置为当前设置
      Object.assign(tempCoreSettings, coreSettings);
    };
    
    // 保存Core ID设置
    const saveCoreSettings = async () => {
      coreSaving.value = true;
      
      try {
        // 验证表单
        await coreForm.value.validate();
        
        // 更新实际设置
        Object.assign(coreSettings, tempCoreSettings);
        
        // 保存到localStorage
        localStorage.setItem('coreId', coreSettings.coreId);
        
        
        // 退出编辑模式
        isEditingCore.value = false;
        
        // 显示保存成功提示
        ElMessage.success('客户端ID设置保存成功，即将重载应用');
        
        // 延迟重载应用，让用户看到成功提示
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error('保存Core ID设置失败:', error);
        ElMessage.error('保存Core ID设置失败，请检查输入');
      } finally {
        coreSaving.value = false;
      }
    };
    
    // 保存音乐源设置
    const saveMusicSettings = async () => {
      musicSaving.value = true;
      
      try {
        // 验证表单
        await musicForm.value.validate();
        
        // 更新实际设置
        Object.assign(musicSettings, tempMusicSettings);
        
        // 保存到localStorage
        saveMusicSettingsToStorage();
        
        // 触发设置变更事件，父组件可以监听此事件
        emit('settings-changed', { type: 'music', ...musicSettings });
        
        // 发送全局事件，通知Music组件重新加载
        window.dispatchEvent(new CustomEvent('music-source-changed', {
          detail: { musicSource: musicSettings.musicSource }
        }));
        
        // 退出编辑模式
        isEditing.value = false;
        
        // 显示保存成功提示
        ElMessage.success('音乐源设置保存成功');
      } catch (error) {
        console.error('保存音乐源设置失败:', error);
        ElMessage.error('保存音乐源设置失败，请检查输入');
      } finally {
        musicSaving.value = false;
      }
    };
    
    // 单独的保存到localStorage的函数
    const saveMusicSettingsToStorage = () => {
      localStorage.setItem('musicSettings', JSON.stringify(musicSettings));
    };
    
    const saveAdminSettingsToStorage = () => {
      localStorage.setItem('adminSettings', JSON.stringify(adminSettings));
    };
    
    // 关闭管理员模式
    const disableAdminMode = () => {
      adminSettings.adminMode = false;
      saveAdminSettingsToStorage();
      
      // 发送全局事件，通知Chart组件更新管理员模式
      window.dispatchEvent(new CustomEvent('admin-mode-changed', {
        detail: { adminMode: false }
      }));
      
      ElMessage.info('管理员模式已关闭，需要通过连续点击公共大厅标题重新启用');
    };
    
    return {
      musicForm,
      coreForm,
      musicSaving,
      coreSaving,
      isEditing,
      isEditingCore,
      musicSettings,
      tempMusicSettings,
      coreSettings,
      tempCoreSettings,
      adminSettings,
      musicSources,
      currentMusicSourceName,
      startEditing,
      cancelEditing,
      startEditingCore,
      cancelEditingCore,
      saveMusicSettings,
      saveCoreSettings,
      disableAdminMode,
      isElectron
    };
  }
};
</script>

<style scoped>
.setting-container {
  padding: 24px;
  min-height: 100vh;
  background-color: var(--background-primary);
  box-sizing: border-box;
}

/* 页面标题区域 */
.page-header {
  margin-bottom: 32px;
  text-align: center;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.page-title .el-icon {
  margin-right: 12px;
  font-size: 28px;
  color: var(--accent-primary);
}

.page-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 400;
}

/* 设置卡片网格 */
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

/* 卡片样式 */
.setting-card {
  border-radius: 16px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: fit-content;
}

.setting-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.music-card .header-icon {
  background: linear-gradient(135deg, #ff7e5f, #feb47b);
  color: white;
}

.core-card .header-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.header-icon .el-icon {
  font-size: 24px;
}

.header-content h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 头部操作区域 */
.header-actions {
  display: flex;
  align-items: center;
}

.edit-btn {
  display: flex;
  align-items: center;
  border-radius: 8px;
  font-weight: 500;
}

.edit-btn .el-icon {
  margin-right: 6px;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

/* 卡片内容 */
  .card-content {
    padding: 0;
  }
  
  /* 管理员卡片样式 */
  .admin-card {
    border: 1px solid var(--el-color-danger-light-7);
  }
  
  .admin-header-icon {
    background: linear-gradient(135deg, #f56c6c, #e64242);
    color: white;
  }
  
  .admin-status-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
  }
  
  .admin-status-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background-color: var(--el-color-danger-light-9);
    border-radius: 8px;
    border-left: 4px solid var(--el-color-danger);
  }
  
  .admin-status-icon {
    color: var(--el-color-danger);
    font-size: 24px;
  }
  
  .admin-status-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
  
  .admin-actions {
    display: flex;
    justify-content: center;
  }
  
  .admin-close-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
  }

.compact-form {
  padding: 0;
}

.compact-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.compact-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-primary);
  padding-bottom: 8px;
}

/* 信息展示区域 */
.info-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.info-label .el-icon {
  margin-right: 8px;
  font-size: 16px;
  color: var(--accent-primary);
}

.info-value {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}

.url-value {
  word-break: break-all;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  background-color: var(--background-tertiary);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .setting-container {
    padding: 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-subtitle {
    font-size: 14px;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

/* 暗黑主题适配 - Element Plus组件 */
/* 输入框基础样式 */
.theme-dark :deep(.el-input__wrapper) {
  background-color: var(--background-secondary) !important;
  border-color: var(--border-color) !important;
  box-shadow: none !important;
}

.theme-dark :deep(.el-input__wrapper:hover) {
  border-color: var(--border-color) !important;
}

.theme-dark :deep(.el-input__wrapper.is-focus) {
  border-color: var(--accent-primary) !important;
  box-shadow: 0 0 0 2px rgba(144, 147, 153, 0.1) !important;
}

.theme-dark :deep(.el-input__inner) {
  color: var(--text-primary) !important;
  background-color: transparent !important;
}

/* 选择器样式 */
.theme-dark :deep(.el-select .el-input__wrapper) {
  background-color: var(--background-secondary) !important;
  border-color: var(--border-color) !important;
}

.theme-dark :deep(.el-select .el-input__inner) {
  color: var(--text-primary) !important;
  background-color: transparent !important;
}

/* 卡片样式 */
.theme-dark :deep(.el-card) {
  background-color: var(--background-secondary) !important;
  border-color: var(--border-color) !important;
}

.theme-dark :deep(.el-card__header) {
  border-bottom-color: var(--border-color) !important;
}

/* 标签样式 */
.theme-dark :deep(.el-tag) {
  background-color: var(--background-tertiary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

.theme-dark :deep(.el-tag.el-tag--success) {
  background-color: rgba(103, 194, 58, 0.2) !important;
  border-color: rgba(103, 194, 58, 0.3) !important;
  color: #67c23a !important;
}

.theme-dark :deep(.el-tag.el-tag--info) {
  background-color: rgba(144, 147, 153, 0.2) !important;
  border-color: rgba(144, 147, 153, 0.3) !important;
  color: #909399 !important;
}
</style>