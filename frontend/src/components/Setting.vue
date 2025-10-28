<template>
  <div class="setting-container">
    <el-card class="setting-card">
      <template #header>
        <div class="card-header">
          <span class="card-title"><el-icon><SettingIcon /></el-icon> 应用设置</span>
        </div>
      </template>
      
      <el-form 
        ref="settingForm"
        :model="settings"
        label-width="100px"
        class="setting-form"
        size="medium"
      >
        <!-- 音乐源设置 -->
        <el-form-item 
          label="音乐源"
          prop="musicSource"
          :rules="[{ required: true, message: '请选择音乐源', trigger: 'change' }]"
        >
          <el-select v-model="settings.musicSource" placeholder="请选择音乐源" class="w-full" @change="onMusicSourceChange">
            <el-option 
              v-for="source in musicSources"
              :key="source.name"
              :label="source.name"
              :value="source.url"
            ></el-option>
          </el-select>
        </el-form-item>

        <!-- 管理员模式设置 -->
        <el-divider content-position="left">管理员设置</el-divider>
        
        <el-form-item label="管理员模式">
          <el-switch 
            v-model="settings.adminMode" 
            active-text="启用" 
            inactive-text="禁用"
            @change="onAdminModeChange"
          />
          <div class="form-item-tip">启用后可在用户列表右键菜单中找到踢人功能</div>
        </el-form-item>

        <!-- 当前配置信息 -->
        <el-divider content-position="left">当前配置信息</el-divider>
        
        <el-form-item label="当前音乐源">
          <el-input 
            v-model="currentMusicSourceName"
            disabled
            placeholder="加载中..."
          ></el-input>
        </el-form-item>

        <el-form-item label="音乐源URL">
          <el-input 
            v-model="settings.musicSource"
            disabled
            placeholder="加载中..."
          ></el-input>
        </el-form-item>

        <!-- 按钮组 -->
        <div class="form-actions">
          <el-button type="primary" @click="saveSettings" :loading="saving">
            保存设置
          </el-button>
          <el-button @click="resetSettings">
            重置
          </el-button>
          <el-button @click="cancel">
            取消
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';

// 从element-plus导入所有需要的图标
import { Setting as SettingIcon } from '@element-plus/icons-vue';

export default {
  name: 'Setting',
  components: {
    SettingIcon
  },
  emits: ['close', 'settings-changed'],
  setup(props, { emit }) {
    const settingForm = ref(null);
    const saving = ref(false);
    
    // 音乐源列表
    const musicSources = ref([
      { name: '布谷音乐', url: 'https://www.buguyy.top/' },
      { name: 'qqmp3', url: 'https://www.qqmp3.vip/' }
    ]);
    
    // 设置数据模型
    const settings = reactive({
      musicSource: musicSources.value[0].url, // 默认使用第一个音乐源
      adminMode: false // 默认禁用管理员模式
    });
    
    // 计算当前选中的音乐源名称
    const currentMusicSourceName = computed(() => {
      const source = musicSources.value.find(item => item.url === settings.musicSource);
      return source ? source.name : '未知音乐源';
    });
    
    // 组件挂载时从localStorage加载设置
    onMounted(() => {
      loadSettings();
      
      // 从localStorage加载管理员模式状态
      const savedAdminMode = localStorage.getItem('adminMode');
      if (savedAdminMode !== null) {
        settings.adminMode = savedAdminMode === 'true';
      }
    });
    
    // 从localStorage加载设置
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          Object.assign(settings, parsedSettings);
        } else {
          // 如果没有保存的设置，使用默认值并保存
          saveSettingsToStorage();
        }
      } catch (error) {
        console.error('加载设置失败:', error);
        ElMessage.error('加载设置失败');
      }
    };
    
    // 保存设置到localStorage
    const saveSettings = async () => {
      saving.value = true;
      
      try {
        // 验证表单
        await settingForm.value.validate();
        
        // 保存到localStorage
        saveSettingsToStorage();
        
        // 触发设置变更事件，父组件可以监听此事件
        emit('settings-changed', { ...settings });
        
        // 发送全局事件，通知Music组件重新加载
        window.dispatchEvent(new CustomEvent('music-source-changed', {
          detail: { musicSource: settings.musicSource }
        }));
        
        // 显示保存成功提示
        ElMessage.success('设置保存成功，音乐源已更新');
      } catch (error) {
        console.error('保存设置失败:', error);
        ElMessage.error('保存设置失败，请检查输入');
      } finally {
        saving.value = false;
      }
    };
    
    // 单独的保存到localStorage的函数
    const saveSettingsToStorage = () => {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    };
    
    // 当音乐源变更时的处理
    const onMusicSourceChange = () => {
      // 可以在这里添加临时预览或其他逻辑
    };
    
    // 当管理员模式变更时的处理
    const onAdminModeChange = () => {
      // 发送全局事件，通知Chart组件更新管理员模式
      window.dispatchEvent(new CustomEvent('admin-mode-changed', {
        detail: { adminMode: settings.adminMode }
      }));
    };
    
    // 重置设置
    const resetSettings = () => {
      // 重置表单验证
      settingForm.value.resetFields();
      
      // 重置为默认值
      Object.assign(settings, {
        musicSource: musicSources.value[0].url,
        adminMode: false
      });
      
      ElMessage.info('设置已重置为默认值');
    };
    
    // 取消操作
    const cancel = () => {
      // 重新加载保存的设置
      loadSettings();
      
      // 触发关闭事件
      emit('close');
    };
    
    return {
      settingForm,
      saving,
      settings,
      musicSources,
      currentMusicSourceName,
      saveSettings,
      resetSettings,
      cancel,
      onMusicSourceChange,
      onAdminModeChange
    };
  }
};
</script>

<style scoped>
.setting-container {
  padding: 20px;
  min-height: 100vh;
  background-color: var(--background-primary);
  transition: background-color 0.3s ease;
}

.setting-card {
  max-width: 600px;
  margin: 0 auto;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.setting-card:hover {
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
}

.card-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-title .el-icon {
  margin-right: 10px;
  font-size: 20px;
  color: var(--accent-primary);
}

.setting-form {
  padding: 30px 20px;
}

.setting-form .el-divider {
  margin: 25px 0;
  background-color: var(--border-color);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

/* 动画效果 */
.el-form-item {
  transition: all 0.3s ease;
}

.el-button {
  transition: all 0.3s ease;
  border-radius: 8px;
}

.el-select .el-input__wrapper {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.el-input .el-input__wrapper {
  border-radius: 8px;
}

/* 表单项提示样式 */
.form-item-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
  line-height: 1.4;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .setting-container {
    padding: 10px;
  }
  
  .setting-card {
    max-width: 100%;
    border-radius: 12px;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .form-actions .el-button {
    width: 100%;
  }
  
  .card-title {
    font-size: 16px;
  }
  
  .setting-form {
    padding: 20px 15px;
  }
}

/* 暗黑主题适配 - Element Plus组件 */
/* 输入框基础样式 */
.theme-dark :deep(.el-input__wrapper) {
  background-color: var(--background-tertiary) !important;
  border-color: var(--border-color) !important;
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

/* 禁用的输入框样式 */
.theme-dark :deep(.el-input__wrapper.is-disabled) {
  background-color: var(--background-tertiary) !important;
  border-color: var(--border-color) !important;
}

.theme-dark :deep(.el-input__wrapper.is-disabled .el-input__inner) {
  color: var(--text-secondary) !important;
  -webkit-text-fill-color: var(--text-secondary) !important;
  background-color: transparent !important;
}

/* 选择器样式 - 增强穿透 */
.theme-dark :deep(.el-select .el-input__wrapper) {
  background-color: var(--background-tertiary) !important;
  border-color: var(--border-color) !important;
}

.theme-dark :deep(.el-select .el-input__inner) {
  color: var(--text-primary) !important;
  background-color: transparent !important;
}

/* 按钮样式 - 增强穿透 */
.theme-dark :deep(.el-button) {
  background-color: var(--background-tertiary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

.theme-dark :deep(.el-button:hover) {
  background-color: var(--background-secondary) !important;
  border-color: var(--border-color) !important;
}

/* 主要按钮保持原有样式 */
.theme-dark :deep(.el-button--primary) {
  background-color: var(--accent-primary) !important;
  border-color: var(--accent-primary) !important;
  color: white !important;
}

.theme-dark :deep(.el-button--primary:hover) {
  background-color: var(--accent-primary-light) !important;
  border-color: var(--accent-primary-light) !important;
}

/* 确保表单元素在暗黑模式下完全适配 */
.theme-dark :deep(.el-form-item__label) {
  color: var(--text-primary) !important;
}

.theme-dark :deep(.el-divider__text) {
  color: var(--text-primary) !important;
}
</style>