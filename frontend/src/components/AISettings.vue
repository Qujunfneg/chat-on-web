<template>
  <div class="ai-settings-container">
    <h2 class="ai-settings-title">AI配置</h2>

    <el-card class="ai-config-card">
      <template #header>
        <div class="card-header">
          <span>AI增强功能</span>
          <el-button type="primary" v-if="!isEditing" @click="startEdit">
            编辑
          </el-button>
          <div v-else>
            <el-button @click="cancelEdit"> 取消 </el-button>
            <el-button type="primary" @click="saveConfig"> 保存 </el-button>
          </div>
        </div>
      </template>

      <div v-if="!isEditing" class="info-display">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">增强搜索:</span>
            <span class="info-value">{{
              aiConfig.enable_enhancement ? "启用" : "禁用"
            }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">AI身份描述:</span>
            <span class="info-value">{{
              aiConfig.systemPrompt || "未设置"
            }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">多样性阈值:</span>
            <span class="info-value">{{ aiConfig.temperature }}</span>
          </div>
        </div>
      </div>

      <div v-else class="form-container">
        <el-form ref="aiConfigForm" :model="tempAiConfig" label-width="140px">
          <el-form-item label="模型">
            <el-select v-model="tempAiConfig.model" placeholder="请选择模型">
              <el-option-group
                v-for="group in availableModelOptions"
                :key="group.label"
                :label="group.label"
              >
                <el-option
                  v-for="item in group.options"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                >
                  <div
                    style="
                      display: flex;
                      align-items: center;
                    "
                  >
                    <span>{{ item.label }}</span>
                    <el-tooltip
                      raw-content
                      :content="item.description"
                      placement="top"
                    >
                      <el-icon :size="20" color="#666">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </div>
                </el-option>
              </el-option-group>
            </el-select>
          </el-form-item>
          <el-form-item label="增强搜索">
            <el-switch v-model="tempAiConfig.enable_enhancement" />
            <el-tooltip
              raw-content
              content="<div>关闭时将直接由主模型生成回复内容，可以降低响应时延。</div>但在少数场景里，回复效果可能会下降。"
              placement="top"
            >
              <el-icon :size="20" color="#666">
                <InfoFilled style="margin-left: 4px" />
              </el-icon>
            </el-tooltip>
          </el-form-item>
          <el-form-item
            label="AI身份描述"
            prop="systemPrompt"
            :rules="[
              {
                required: true,
                message: '请输入AI的身份描述',
                trigger: ['blur', 'change'],
              },
              {
                min: 20,
                message: '不能少于20个字符',
                trigger: ['blur', 'change'],
              },
            ]"
          >
            <el-input
              v-model="tempAiConfig.systemPrompt"
              type="textarea"
              placeholder="请输入AI的身份描述"
              :rows="3"
            />
          </el-form-item>
          <el-form-item label="多样性阈值">
            <el-slider
              v-model="tempAiConfig.temperature"
              :min="0"
              :max="2"
              :step="0.1"
              show-input
            />
            <div class="form-tip">
              值越小回答越确定，值越大回答越多样（0-2）
            </div>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from "vue";
import {
  ElCard,
  ElButton,
  ElInput,
  ElForm,
  ElFormItem,
  ElSwitch,
  ElSlider,
  ElMessage,
  ElTooltip,
  ElIcon,
} from "element-plus";
import { InfoFilled } from "@element-plus/icons-vue";
const getUserId = () => {
  // 优先尝试获取userId
  let userId = localStorage.getItem("userId");
  
  // 如果没有userId，尝试使用coreId作为备用
  if (!userId) {
    userId = localStorage.getItem("coreId");
  }
  
  // 如果仍然没有ID，生成一个临时的ID
  if (!userId) {
    userId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userId", userId);
  }
  
  return userId;
};
export default {
  name: "AISettings",
  components: {
    ElCard,
    ElButton,
    ElInput,
    ElForm,
    ElFormItem,
    ElSwitch,
    ElSlider,
    ElTooltip,
    ElIcon,
    InfoFilled,
  },
  setup() {
    // AI配置相关
    const aiConfig = reactive({
      model: "hunyuan-turbos-latest",
      enable_enhancement: false,
      systemPrompt: "",
      temperature: 0.8,
    });
    const availableModelOptions = ref([
      {
        label: "通用文生文",
        options: [
          {
            value: "hunyuan-turbos-latest",
            label: "hunyuan-turbos-latest",
            description: `hunyuan-TurboS 混元旗舰大模型最新版本，具备更强的思考能力，更优的体验效果，已更新至最新版本。`,
          },
          {
            value: "hunyuan-turbos-20250716",
            label: "hunyuan-turbos-20250716",
            description: `<div>通用优化：提升文创的内容质量和丰富度，提升文科通用的理解能力、专业知识能力和指令遵循能力，提升理科的推理能力，解题能力</div>`,
          },
        ],
      },
      {
        label: "角色扮演",
        options: [
          {
            value: "hunyuan-large-role-latest",
            label: "hunyuan-large-role-latest",
            description: `适用场景：<div>AI 数字分身、AI 角色扮演、AI情感陪聊等</div>
<div>特性说明：显著提升了角色一致性与对话深度。通过在大规模高质量角色对话数据上的强化训练，模型能深度理解并稳定维持角色设定，有效减少 OOC（脱离角色）问题。</div>
不仅在多轮互动中保持上下文连贯，更大幅提升了聊天的趣味性和沉浸感，使每次对话都生动而富有深度。`,
          },
          {
            value: "hunyuan-role",
            label: "hunyuan-role",
            description: `混元最新版角色扮演模型，混元官方精调训练推出的角色扮演模型，基于混元模型结合角色扮演场景数据集进行增训，在角色扮演场景具有更好的基础效果。`,
          },
        ],
      },
      {
        label: "文生文-推理模型",
        options: [
          {
            value: "hunyuan-t1-latest",
            label: "hunyuan-t1-latest",
            description:
              "业内首个超大规模 Hybrid-Transformer-Mamba 推理模型，扩展推理能力，超强解码速度，进一步对齐人类偏好。",
          },
          {
            value: "hunyuan-t1-20250822",
            label: "hunyuan-t1-20250822",
            description: `<div>大幅提升主模型慢思考模型的高难数学、复杂推理、高难代码、指令遵循、文本创作质量等能力。</div>
<div>通用能力上，相比线上版本，数学难题提升5pp，逻辑推理提升1.8pp，科学提升3pp，代码竞赛提升4pp，文创写作质量提升3pp，知识问答提升4.8pp。</div>`,
          },
        ],
      },
    ]);
    const aiConfigForm = ref();
    const tempAiConfig = reactive({});
    const isEditing = ref(false);
    const userId = getUserId();
    // 加载AI配置
    const loadAiConfig = async () => {
      try {
        // 检查用户是否已经通过WebSocket连接加入聊天室
        if (!window.socket || !window.socket.connected) {
          console.log('用户未连接到聊天室，延迟加载AI配置');
          // 延迟1秒后重试
          setTimeout(loadAiConfig, 1000);
          return;
        }
        
        // 检查用户是否已经成功加入聊天室（通过检查isLoggedIn状态）
        if (typeof window.isLoggedIn === 'undefined' || !window.isLoggedIn) {
          console.log('用户尚未成功加入聊天室，延迟加载AI配置');
          // 延迟1秒后重试
          setTimeout(loadAiConfig, 1000);
          return;
        }
        
        // 检查是否在Electron环境中
        const isElectron = window.electronAPI || navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        
        // 在Electron环境中，直接使用本地API
        const apiUrl = isElectron ? '/api/ai-config' : '/api/ai-config';
        
        const response = await fetch(apiUrl, {
          headers: {
            "x-user-id": userId,
          },
        });
        const data = await response.json();
        if (data.success) {
          Object.assign(aiConfig, data.data);
        } else {
          ElMessage.error("加载AI配置失败: " + data.message);
        }
      } catch (error) {
        console.error("加载AI配置失败:", error);
        ElMessage.error("加载AI配置失败");
      }
    };

    // 开始编辑AI配置
    const startEdit = () => {
      Object.assign(tempAiConfig, aiConfig);
      isEditing.value = true;
    };

    // 取消编辑AI配置
    const cancelEdit = () => {
      isEditing.value = false;
    };

    // 保存AI配置
    const saveConfig = async () => {
      await aiConfigForm.value.validate();
      try {
        // 检查用户是否已经通过WebSocket连接加入聊天室
        if (!window.socket || !window.socket.connected) {
          ElMessage.error("请先连接到聊天室");
          return;
        }
        
        // 检查是否在Electron环境中
        const isElectron = window.electronAPI || navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        
        // 在Electron环境中，直接使用本地API
        const apiUrl = isElectron ? '/api/ai-config' : '/api/ai-config';
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify(tempAiConfig),
        });
        const data = await response.json();
        if (data.success) {
          Object.assign(aiConfig, tempAiConfig);
          isEditing.value = false;
          ElMessage.success("AI配置保存成功");
        } else {
          ElMessage.error("保存失败: " + data.message);
        }
      } catch (error) {
        console.error("保存AI配置失败:", error);
        ElMessage.error("保存AI配置失败");
      }
    };

    // 监听配置更新事件
    const handleConfigUpdate = (updatedConfig) => {
      Object.assign(aiConfig, updatedConfig);
    };

    onMounted(() => {
      loadAiConfig();
      // 监听配置更新事件
      if (window.io && window.socket) {
        window.socket.on("ai-config-updated", handleConfigUpdate);
      }
    });

    onUnmounted(() => {
      // 清理事件监听
      if (window.io && window.socket) {
        window.socket.off("ai-config-updated", handleConfigUpdate);
      }
    });

    return {
      aiConfig,
      tempAiConfig,
      isEditing,
      loadAiConfig,
      startEdit,
      cancelEdit,
      saveConfig,
      aiConfigForm,
      availableModelOptions,
    };
  },
};
</script>

<style scoped>
.ai-settings-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: var(--background-primary);
}

.ai-settings-title {
  margin-bottom: 20px;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.ai-config-card {
  margin: 0 auto;
  max-width: 80%;
  background-color: var(--background-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-display {
  padding: 16px 0;
}

.info-grid {
  display: grid;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-label {
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 100px;
}

.info-value {
  flex: 1;
  color: var(--text-primary);
  word-break: break-word;
}

.form-container {
  padding: 16px 0;
  margin-right: 16px;
}

.form-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 5px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-settings-container {
    padding: 12px;
  }

  .info-item {
    flex-direction: column;
    gap: 8px;
  }

  .info-label {
    min-width: auto;
  }
}
</style>