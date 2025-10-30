<template>
  <div
    class="app"
    v-bind="$attrs"
    element-loading-background="rgba(122, 122, 122, 0.6)"
  >
    <!-- 悬浮窗组件（放在页面任意位置即可） -->
    <DailyOneFloating />
    <!-- 手机端用户列表切换按钮 -->
    <button
      class="mobile-user-list-toggle"
      @click.stop="toggleUserList"
      @touchstart.stop="toggleUserList"
      title="显示/隐藏用户列表"
    >
      <span v-if="showUserList">✕</span>
      <span v-else>👥</span>
    </button>
    <!-- 聊天室主界面 -->
    <div 
      class="chat-container" 
      v-if="isLoggedIn"
      :style="getBackgroundStyle()"
    >
      <div class="chat-main">
        <!-- 左侧用户列表 -->
        <div class="user-list-container" :class="{ show: showUserList }">
          <div class="user-list-wrapper">
            <UserList
              :users="users"
              :messages="messages"
              :current-username="username"
              :current-user-id="userId"
              :user-info-map="userInfoMap"
              :is-loading="isLoadingUsers"
              @user-context-menu="handleUserContextMenu"
            >
            </UserList>
          </div>
        </div>

        <!-- 右侧聊天区域 -->
        <div
          class="message-area"
          @click="onMessageAreaClick"
          @touchstart="onMessageAreaClick"
        >
          
          <!-- 聊天头部 -->
          <div class="chat-header">
            <h2 @click="handleTitleClick" style="cursor: pointer;user-select:  none;">公共大厅</h2>
            <div class="chat-header-right">
              <ThemeSelector />
              <AnnouncementBar style="margin-right: 10px;"/>
              <button
                v-if="showAudioPermissionButton"
                class="audio-permission-button"
                size="small"
                @click="requestAudioPermission"
                title="点击授权音频播放"
              >
                🔊 启用提示音
              </button>
              
              <el-button
                type="primary"
                style="cursor: pointer"
                link
                @click="handleLogout"
                title="注销"
              >
                注销
              </el-button>
            </div>
          </div>
          
          <!-- 弹幕显示区域 -->
          <div class="danmu-display-area">
            <div
              v-for="danmu in danmuList"
              :key="danmu.id"
              class="danmu-item"
              :style="{
                color: danmu.color,
                left: danmu.position + 'px',
                top: danmu.top + 'px',
                animationDuration: danmu.speed + 's',
                fontSize: danmu.fontSize + 'px',
              }"
              @animationend="removeDanmu(danmu.id)"
            >
              {{ danmu.content }}
            </div>
          </div>
          <!-- 聊天消息区域 -->
          <MessageList
            :messages="messages"
            :current-username="username"
            :current-user-id="userId"
            :favorite-emojis="favoriteEmojis"
            :user-info-map="userInfoMap"
            :users="users"
            :is-loading="isLoadingMessages"
            :background="selectedBackground"
            @message-context-menu="handleMessageContextMenu"
            @user-context-menu="handleUserContextMenu"
            @open-red-packet="openRedPacketDialog"
          >
        </MessageList>

          <!-- 消息输入区域 -->
          <div class="chat-input-area">
            <div class="input-tools">
              <!-- 表情包按钮 -->
              <EmojiPanel
                v-model="showEmojiPanel"
                :favorite-emojis="favoriteEmojis"
                @select-emoji="handleSelectEmoji"
                @remove-favorite-emoji="handleRemoveFavoriteEmoji"
              ></EmojiPanel>

              <!-- 上传图片按钮 -->
              <el-upload
                ref="uploadRef"
                class="avatar-uploader"
                action=""
                :show-file-list="false"
                :on-change="handleImageSelect"
                accept="image/*"
                :auto-upload="false"
              >
                <el-button class="pic-upload-btn"
                  ><el-icon><camera-filled /></el-icon
                ></el-button>
              </el-upload>
              <el-popover
                placement="bottom"
                title="弹幕"
                :width="300"
                trigger="click"
              >
                <div class="danmu-box">
                    <div class="danmu-header">
                      <h4>发送弹幕</h4>
                    </div>
                    <el-input
                      v-model="danmuContent"
                      placeholder="输入弹幕内容"
                      :maxlength="30"
                      show-word-limit
                      @keydown.enter.native="sendDanmu"
                      class="danmu-input"
                    ></el-input>
                    <div class="danmu-color-picker">
                      <span>选择颜色:</span>
                      <div class="color-options">
                        <div
                          v-for="color in danmuColors"
                          :key="color"
                          class="color-option"
                          :class="{ active: danmuColor === color }"
                          :style="{ backgroundColor: color }"
                          @click="danmuColor = color"
                          :title="color.toUpperCase()"
                        >
                          <div v-if="danmuColor === color" class="selected-indicator">
                            <el-icon><check /></el-icon>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="danmu-tips">
                      <small>💡 弹幕会在聊天区域上方滚动显示</small>
                    </div>
                    <el-button
                      type="primary"
                      :disabled="!danmuContent.trim()"
                      @click="sendDanmu"
                      class="send-danmu-button"
                    >
                      发射弹幕
                    </el-button>
                  </div>
                <template #reference>
                  <el-button class="pic-upload-btn" style="margin-left: 10px;"
                    ><el-icon><chat-dot-round /></el-icon
                  ></el-button>
                </template>
              </el-popover>
              
              <!-- 背景图片选择器 -->
              <BackgroundSelector @background-changed="handleBackgroundChange"></BackgroundSelector>
              
              <!-- 红包按钮 -->
              <CreateRedPacketDialog
                :user-points="userPoints"
                @create="handleCreateRedPacket"
              ></CreateRedPacketDialog>
            </div>
            <div class="input-container">
              <el-input
                v-model="inputMessage"
                type="textarea"
                placeholder="输入消息（Shift+Enter换行，Enter发送）"
                :rows="10"
                :autosize="{ minRows: 3, maxRows: 20 }"
                @keydown.enter.native="handleEnter"
                @paste="handlePasteImage"
                resize="none"
                @input="handleInputChange"
              ></el-input>
              <el-button
                type="primary"
                :disabled="!inputMessage.trim() && !pastedImage"
                @click="sendMessage"
                class="send-button"
              >
                发送
              </el-button>
            </div>
            <!-- 图片预览区域 -->
            <div v-if="pastedImage" class="image-preview-container">
              <img
                style="width: 30px; height: 30px"
                :src="pastedImage"
                class="pasted-image-preview"
              />
              <el-button
                type="text"
                class="remove-image-btn"
                @click="removePastedImage"
              >
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 登录前骨架屏显示 -->
    <div v-else class="chat-container">
      <div class="chat-main">
        <!-- 左侧用户列表骨架屏 -->
        <div class="user-list-container">
          <div class="user-list-wrapper">
            <div class="skeleton-container">
              <h3>在线 (0)</h3>
              <div class="user-items">
                <!-- 生成5个骨架屏用户项 -->
                <div v-for="i in 5" :key="i" class="skeleton-user-item">
                  <div class="skeleton-avatar"></div>
                  <div class="skeleton-username"></div>
                  <div class="skeleton-hotness"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧聊天区域骨架屏 -->
        <div class="message-area">
          <!-- 聊天头部 -->
          <div class="chat-header">
            <h2>公共大厅</h2>
          </div>

          <!-- 聊天消息区域骨架屏 -->
          <div class="chat-messages">
            <div class="skeleton-container">
              <!-- 生成8个骨架屏消息项 -->
              <div
                v-for="i in 8"
                :key="i"
                class="skeleton-message-item"
                :class="i % 2 === 0 ? 'self' : 'other'"
              >
                <div class="skeleton-message-header">
                  <div class="skeleton-message-avatar"></div>
                  <div class="skeleton-message-username"></div>
                </div>
                <div class="skeleton-message-content">
                  <div class="skeleton-message-bubble">
                    <div class="skeleton-message-line"></div>
                    <div class="skeleton-message-line"></div>
                    <div class="skeleton-message-line"></div>
                  </div>
                </div>
                <div class="skeleton-message-time"></div>
              </div>
            </div>
          </div>

          <!-- 消息输入区域（禁用状态） -->
          <div
            class="chat-input-area"
            style="opacity: 0.6; pointer-events: none"
          >
            <div class="input-tools">
              <el-button disabled>上传图片</el-button>
            </div>
            <div class="input-container">
              <el-input
                type="textarea"
                placeholder="正在连接服务器..."
                :rows="3"
                disabled
              ></el-input>
              <el-button type="primary" disabled>发送</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :show-menu="showContextMenu"
      :x="contextMenuX"
      :y="contextMenuY"
      :selected-user-for-mention="selectedUserForMention"
      :selected-message="selectedMessage"
      :selected-image-url="selectedImageUrl"
      :current-user-id="userId"
      :is-admin-mode="isAdminMode"
      @hide-menu="hideContextMenu"
      @mention-user="handleMentionUser"
      @quote-message="handleQuoteMessage"
      @edit-nickname="handleEditNickname"
      @recall-message="handleRecallMessage"
      @kick-user="handleKickUser"
    ></ContextMenu>

    <!-- @用户弹层 -->
    <MentionPanel
      :show-panel="showMentionPanel"
      :x="mentionPanelX"
      :y="86"
      :users="users"
      @select-user="handleSelectUserForMention"
    ></MentionPanel>

    <!-- 修改昵称对话框 -->
    <NameDialog
      v-model="showNicknameDialog"
      :initial-username="editNicknameInitialValue"
      :is-username-dialog="false"
      :current-user="username"
      :userId="userId"
      @confirmed="handleSaveNickname"
    ></NameDialog>

    <!-- 踢人对话框 -->
    <el-dialog
      v-model="showKickDialog"
      title="踢人设置"
      width="30%"
      :before-close="cancelKickUser"
    >
      <div class="kick-dialog-content">
        <p v-if="selectedUserForKick">确定要踢出用户 <strong>{{ typeof selectedUserForKick === 'object' ? selectedUserForKick.username : selectedUserForKick }}</strong> 吗？</p>
        <p v-else>未选择要踢出的用户</p>
        <div class="kick-duration-setting">
          <label>下线时长：</label>
          <el-select v-model="kickDuration" placeholder="请选择">
            <el-option label="1分钟" :value="1"></el-option>
            <el-option label="5分钟" :value="5"></el-option>
            <el-option label="10分钟" :value="10"></el-option>
            <el-option label="30分钟" :value="30"></el-option>
            <el-option label="1小时" :value="60"></el-option>
            <el-option label="永久" :value="9999999"></el-option>
          </el-select>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelKickUser">取消</el-button>
          <el-button type="primary" @click="confirmKickUser" :disabled="!selectedUserForKick">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 红包详情对话框 -->
    <RedPacketDialog
      v-model="showRedPacketDialog"
      :red-packet-id="selectedRedPacketId"
      :sender-id="redPacketDetails?.senderId || ''"
      :sender-name="redPacketDetails?.senderName || ''"
      :sender-avatar="redPacketDetails?.senderAvatar || ''"
      :type="redPacketDetails?.type || 'average'"
      :total-amount="redPacketDetails?.totalAmount || 0"
      :count="redPacketDetails?.count || 0"
      :message="redPacketDetails?.message || ''"
      :timestamp="redPacketDetails?.timestamp || Date.now()"
      :status="redPacketDetails?.status || 'active'"
      :receivers="redPacketDetails?.receivers || []"
      :has-received="redPacketDetails?.hasReceived || false"
      :current-user-id="userId"
      :current-core-id="coreId"
      :show-all-amounts="true"
      @receive="handleReceiveRedPacket"
    ></RedPacketDialog>
  </div>
</template>

<script>
import { io } from "socket.io-client";
import { ref, computed, onMounted, onUnmounted, nextTick, getCurrentInstance } from "vue";
import { ElMessage, ElIcon, } from "element-plus";
import { useEventBus, useGlobalEvents } from "./utils/eventBus.js";
import { Delete, CircleCloseFilled } from "@element-plus/icons-vue";


// 导入组件
import MessageList from "./components/MessageList.vue";
import EmojiPanel from "./components/EmojiPanel.vue";
import UserList from "./components/UserList.vue";
import ContextMenu from "./components/ContextMenu.vue";
import MentionPanel from "./components/MentionPanel.vue";
import NameDialog from "./components/NameDialog.vue";
import ThemeSelector from "./components/ThemeSelector.vue";
import DailyOneFloating from './components/DailyOneFloating.vue';
import AnnouncementBar from './components/AnnouncementBar.vue';
import BackgroundSelector from './components/BackgroundSelector.vue';
import RedPacketDialog from './components/RedPacketDialog.vue';
import CreateRedPacketDialog from './components/CreateRedPacketDialog.vue';

// 导入工具函数
import { compressImage, dataURItoFile, isImageUrl } from "./utils/chatUtils.js";
import { notifyNewMessage } from './utils/electronUtils.js';

// 导入qq.mp3音频文件
import qqSound from "./qq.mp3";

// 导入样式
import "./styles/chatStyles.css";
import "./styles/chart/commonStyles.css";
import "./styles/chart/danmuStyles.css";
import "./styles/chart/responsiveStyles.css";

export default {
  name: "Chat",
  components: {
    MessageList,
    EmojiPanel,
    UserList,
    ContextMenu,
    MentionPanel,
    NameDialog,
    ThemeSelector,
    DailyOneFloating,
    AnnouncementBar,
    BackgroundSelector,
    RedPacketDialog,
    CreateRedPacketDialog,
  },
  setup() {
    // 基本状态
    const username = ref("");
    // 移除nickname变量，统一使用username
    // const nickname = ref(""); // 添加昵称状态
    const userId = ref("");
    const coreId = ref("");
    const isLoggedIn = ref(false);
    const messages = ref([]);
    const inputMessage = ref("");
    const uploadRef = ref(null);
    const users = ref([]);
    const userInfoMap = ref({});
    // loading状态
    const isLoadingMessages = ref(true);
    const isLoadingUsers = ref(true);
    let socket = null;
    let hasUnreadMessage = ref(false);
    let hasMentionedMessage = ref(false); // 跟踪是否有被@的未读消息
    let originalTitle = document.title;
    let titleInterval = null;
    let hasFocus = true;

    // 更新用户信息映射
    const updateUserInfoMap = (username, newUsername) => {
      userInfoMap.value[username] = {
        username,
        nickname: newUsername || username,
      };
      // 持久化保存userInfoMap到localStorage
      localStorage.setItem("userInfoMap", JSON.stringify(userInfoMap.value));
    };

    // 图片相关
    const pastedImage = ref("");

    // 音频相关 - 客户端自动授予音频权限
    const audioPermissionGranted = ref(true);
    const showAudioPermissionButton = ref(false); // 始终隐藏授权按钮
    const lastPlaySoundTime = ref(0);
    const soundInterval = 1000;

    // 右键菜单相关
    const showContextMenu = ref(false);
    const contextMenuX = ref(0);
    const contextMenuY = ref(0);
    const selectedImageUrl = ref("");
    const selectedMessage = ref(null);
    const quotedMessage = ref(null);
    const selectedUserForMention = ref(null);

    // @用户弹层相关
    const showMentionPanel = ref(false);
    const mentionPanelX = ref(0);

    // 表情包相关
    const showEmojiPanel = ref(false);
    const favoriteEmojis = ref(
      JSON.parse(localStorage.getItem("favoriteEmojis") || "[]")
    );

    // 红包相关
    const showRedPacketDialog = ref(false);
    const selectedRedPacketId = ref("");
    const redPacketDetails = ref(null); // 红包详情数据
    const userPoints = ref(0); // 初始用户积分，将从服务器获取

    // 动态表情映射表
    const dynamicEmojis = {
      微笑: "/images/smile.gif",
      哭泣: "/images/cry.gif",
      生气: "/images/angry.gif",
      开心: "/images/happy.gif",
      惊讶: "/images/surprised.gif",
      爱心: "/images/love.gif",
    };

    // 修改昵称相关
    const showNicknameDialog = ref(false);
    const editNicknameInitialValue = ref("");

    // 背景图片相关
    const selectedBackground = ref(
      localStorage.getItem("selectedBackground") || "default"
    );

    // 处理背景图片切换
    const handleBackgroundChange = (background) => {
      selectedBackground.value = background;
      localStorage.setItem("selectedBackground", background);
    };

    // 获取背景图片样式
    const getBackgroundStyle = () => {
      // 检查是否为暗黑模式
      const isDarkMode = document.documentElement.classList.contains('theme-dark');
      
      // 如果是暗黑模式，不应用背景图片
      if (isDarkMode) {
        return {};
      }
      
      // 非暗黑模式下，根据选中的背景返回样式
      if (selectedBackground.value === 'default') {
        return {};
      }
      
      // 背景图片映射
      const backgroundMap = {
        'bg1': '/images/bg1.jpg',
        'bg2': '/images/bg2.jpg',
        'bg3': '/images/bg3.jpg',
        'bg4': '/images/bg4.jpg',
        'bg5': '/images/bg5.jpg'
      };
      
      const backgroundImage = backgroundMap[selectedBackground.value];
      if (backgroundImage) {
        return {
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        };
      }
      
      return {};
    };

    // 手机端用户列表显示控制
    const showUserList = ref(false);

    // 切换用户列表显示/隐藏
    const toggleUserList = () => {
      showUserList.value = !showUserList.value;
    };

    // 点击聊天区域关闭用户列表
    const onMessageAreaClick = () => {
      if (showUserList.value) {
        showUserList.value = false;
      }
    };

    // 心跳包计时器ID
    let heartbeatInterval;

    // 初始化WebSocket连接
    const initSocket = () => {
      // 如果已有连接，先关闭它
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      // 清除之前的心跳包计时器
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      // 从localStorage获取userId、username和coreId
      const storedUserId = localStorage.getItem("userId");
      const storedUsername = localStorage.getItem("username");
      const storedCoreId = localStorage.getItem("coreId");
      // 移除对nickname的获取
      // const storedNickname = localStorage.getItem('nickname');
      if (!storedUserId || !storedUsername || !storedCoreId) {
        handleLogout();
        return;
      }

      // 确保响应式变量被正确设置
      userId.value = storedUserId;
      username.value = storedUsername;
      coreId.value = storedCoreId;
      // 移除nickname的设置
      // nickname.value = storedNickname || storedUsername;
      // 更新用户信息映射，使用username作为nickname
      updateUserInfoMap(username.value, username.value);

      // 使用相对路径，让WebSocket自动使用当前页面的主机地址
      socket = io();
      
      // 将socket挂载到window对象上，使其他组件可以访问
      window.socket = socket;

      // 设置验证超时计时器
      let validationTimeout;

      // 连接成功
      socket.on("connect", () => {
        console.log("WebSocket连接成功");
        // 发送userId、username和coreId加入聊天室
        socket.emit("join", { userId: userId.value, username: username.value, coreId: coreId.value });

        // 优化：将验证超时从500毫秒减少到200毫秒，进一步提高用户体验
        validationTimeout = setTimeout(() => {
          console.log("用户ID验证通过，进入聊天室");
          isLoggedIn.value = true;
        }, 200);
      });

      // 在验证失败时清除计时器
      socket.on("user_id_failed", () => {
        if (validationTimeout) {
          clearTimeout(validationTimeout);
        }
      });

      // 监听用户昵称更新事件
      socket.on("user_nickname_updated", (data) => {
        console.log("用户昵称更新:", data);

        // 更新用户信息映射
        updateUserInfoMap(data.username, data.newNickname);

        // 如果是当前用户更新了昵称
        if (data.username === username.value) {
          // 移除nickname更新，直接更新username和localStorage
          // nickname.value = data.newNickname;
          // localStorage.setItem('nickname', data.newNickname);
          username.value = data.newNickname;
          localStorage.setItem("username", data.newNickname);
        } else {
        }
      });

      // 用户ID验证失败处理
      socket.on("user_id_failed", (data) => {
        console.log("用户ID验证失败:", data.message);
        handleLogout();
        ElMessage.error("用户验证失败，请重新输入用户名。");
      });

      // 接收聊天历史
      socket.on("chat_history", (history) => {
        // 为每条历史消息添加userId字段（如果消息的用户名与当前用户相同）
        const enrichedHistory = history.map((message) => {
          // 如果消息已经有userId，保持不变
          if (message.userId) return message;

          // 如果消息的用户名与当前用户相同，添加userId
          if (
            message.username === username.value ||
            message.userName === username.value
          ) {
            return {
              ...message,
              userId: userId.value,
            };
          }

          // 其他消息保持不变
          return message;
        });

        messages.value = enrichedHistory;
        // 聊天历史加载完成，更新loading状态
        isLoadingMessages.value = false;
      });

      // 接收新消息
      socket.on("chat_message", (message) => {
        // 确保消息有username字段，如果没有则使用userName作为后备
        if (!message.username && message.userName) {
          message.username = message.userName;
        }

        // 检查是否是当前客户端发送的消息（通过localId识别）
        const isSentByCurrentClient =
          message.localId &&
          messages.value.some((m) => m.id === message.localId);

        // 如果不是当前客户端发送的消息，才添加到列表中
        if (!isSentByCurrentClient) {
          // 添加到消息列表
          messages.value.push(message);
        } else {
          // 是当前客户端发送的消息，更新本地消息的ID为服务器生成的ID
          const localMessageIndex = messages.value.findIndex(m => m.id === message.localId);
          if (localMessageIndex !== -1) {
            // 保留本地消息的其他属性，但更新ID为服务器生成的ID
            messages.value[localMessageIndex] = {
              ...messages.value[localMessageIndex],
              id: message.id, // 使用服务器生成的ID
              timestamp: message.timestamp, // 使用服务器的时间戳
              uploading: false // 如果是图片消息，标记上传完成
            };
          }
          console.log("更新本地消息ID为服务器生成的ID");
        }

        // 只有当消息不是当前用户发送时才显示通知
        if (message.username !== username.value) {
          // 检查是否被@
          const isMentioned =
            message.mentions && message.mentions.includes(username.value);
          // 显示浏览器通知
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            // 如果被@，显示特殊通知
            const notificationTitle = isMentioned
              ? `【有人@你】新消息`
              : "新消息";
            const notification = new Notification(notificationTitle, {
              body: `${message.username}: ${getNotificationBody(message)}`,
              icon: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%2345B7D1' d='M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 36c-8.82 0-16-7.18-16-16S15.18 8 24 8s16 7.18 16 16-7.18 16-16 16z'/%3E%3Cpath fill='%2345B7D1' d='M22 16h4v16h-4zm0 20h4v4h-4z'/%3E%3C/svg%3E",
              tag: "chat-message",
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
            };

            // 5秒后自动关闭通知
            setTimeout(() => notification.close(), 5000);
          }

          // 启动标题闪烁和播放提示音
          hasUnreadMessage.value = true;

          // 如果@，使用特殊的标题闪烁效果
          if (isMentioned) {
            // 使用特殊的标题闪烁提醒被@
            startMentionBlink();
          } else {
            startTitleBlink();
          }

          // 自动播放声音，因为客户端已授予权限
          playNotificationSound(isMentioned);
          
          // 通知Electron主进程进行图标闪烁
          notifyNewMessage();
        }
      });

      // 用户加入
      socket.on("user_join", (data) => {
        // 直接使用服务器返回的包含userId的用户列表
        users.value = data.users;
        // 更新用户信息映射
        updateUserInfoMap(data.username, data.nickname);
        
        // 获取当前用户的积分
        const currentUser = users.value.find(user => user.coreId === coreId.value);
        if (currentUser && currentUser.points !== undefined) {
          userPoints.value = currentUser.points;
          console.log(`获取当前用户 ${currentUser.username} 的积分为 ${currentUser.points}`);
        }
        
        // 用户列表加载完成，更新loading状态
        isLoadingUsers.value = false;
      });

      // 用户离开
      socket.on("user_leave", (data) => {
        // 直接使用服务器返回的包含userId的用户列表
        users.value = data.users;
      });

      // 连接断开
      socket.on("disconnect", () => {
        console.log("WebSocket连接断开");
        // 清除心跳包计时器
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      });

      // 心跳包，保持连接活跃
      heartbeatInterval = setInterval(() => {
        // 检查socket是否存在且已连接
        if (socket && socket.connected) {
          socket.emit("heartbeat");
        }
      }, 30000); // 每30秒发送一次

      // 接收弹幕消息
      socket.on("danmu_message", (data) => {
        addDanmu(data);
      });

      // 处理消息撤回成功事件
      socket.on("message_recalled", (data) => {
        // 查找并更新消息
        const messageIndex = messages.value.findIndex(msg => msg.id === data.messageId);
        if (messageIndex !== -1) {
          // 标记消息为已撤回
          messages.value[messageIndex] = {
            ...messages.value[messageIndex],
            recalled: true,
            content: "此消息已被撤回",
            type: "recalled"
          };
        }
      });

      // 处理积分更新事件
      socket.on("points_updated", (data) => {
        console.log("积分更新:", data);
        
        // 更新用户列表中对应coreId的用户的积分
        if (data.coreId && data.points !== undefined) {
          const userIndex = users.value.findIndex(user => user.coreId === data.coreId);
          if (userIndex !== -1) {
            users.value[userIndex].points = data.points;
            console.log(`更新用户 ${users.value[userIndex].username} 的积分为 ${data.points}`);
          }
          
          // 如果是当前用户的积分更新，也更新userPoints
          if (data.coreId === coreId.value) {
            userPoints.value = data.points;
            console.log(`更新当前用户积分为 ${data.points}`);
          }
        }
      });

      // 处理用户列表更新事件
      socket.on("users_updated", (data) => {
        console.log("用户列表更新:", data);
        if (Array.isArray(data)) {
          users.value = data;
          
          // 获取当前用户的积分
          const currentUser = users.value.find(user => user.coreId === coreId.value);
          if (currentUser && currentUser.points !== undefined) {
            userPoints.value = currentUser.points;
            console.log(`更新当前用户 ${currentUser.username} 的积分为 ${currentUser.points}`);
          }
        }
      });

      // 处理消息撤回失败事件
      socket.on("recall_failed", (data) => {
        ElMessage.error(data.message || "消息撤回失败");
      });

      // 处理被踢事件
      socket.on("user_kicked", (data) => {
        ElMessage.error({
          message: data.message,
          duration: 0, // 不自动关闭
          showClose: true
        });
        
        // 显示被踢原因和时长
        const durationText = data.duration === 0 ? '永久' : data.duration + '分钟';
        ElMessage.error(`原因：${data.reason || "违反聊天室规定"}，禁期：${durationText}`);
        
        // 断开socket连接
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        
        // 清除用户信息
        username.value = "";
        userId.value = "";
        coreId.value = "";
        isLoggedIn.value = false;
        localStorage.setItem("kickTime", Date.now());
        localStorage.setItem("duration", data.duration);
        // 清除localStorage中的用户信息
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
        
        // 延迟跳转到登录页，让用户看到被踢信息
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 3000);
      });

      // 处理踢人成功事件
      socket.on("kick_success", (data) => {
        ElMessage.success({
          message: data.message,
          duration: 3000
        });
      });

      // 处理踢人失败事件
      socket.on("kick_failed", (data) => {
        ElMessage.error({
          message: data.message || "踢人失败",
          duration: 3000
        });
      });

      // 处理用户被禁事件（尝试重新连接时）
      socket.on("user_banned", (data) => {
        ElMessage.error({
          message: data.message,
          duration: 0, // 不自动关闭
          showClose: true
        });
        
        // 显示被踢原因和剩余时间
        ElMessage.error(`原因：${data.reason || "违反聊天室规定"}，剩余禁期：${data.remainingTime}`);
        
        // 断开socket连接
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        
        // 清除用户信息
        username.value = "";
        userId.value = "";
        coreId.value = "";
        isLoggedIn.value = false;
        
        // 清除localStorage中的用户信息
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
        
        // 延迟跳转到登录页，让用户看到被踢信息
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 3000);
      });

      // 处理红包创建成功事件
      socket.on("create_red_packet_success", (data) => {
        console.log("红包创建成功:", data);
        // 更新用户积分
        userPoints.value = data.remainingPoints;
        
        // 更新用户列表中当前用户的积分
        const userIndex = users.value.findIndex(user => user.coreId === coreId.value);
        if (userIndex !== -1) {
          users.value[userIndex].points = data.remainingPoints;
          console.log(`更新用户列表中 ${users.value[userIndex].username} 的积分为 ${data.remainingPoints}`);
        }
        
        // 关闭创建红包对话框
        showCreateRedPacketDialog.value = false;
      });

      // 处理红包创建失败事件
      socket.on("create_red_packet_failed", (data) => {
        console.error("红包创建失败:", data);
        ElMessage.error(data.message || "红包创建失败");
      });

      // 处理红包领取成功事件
      socket.on("receive_red_packet_success", (data) => {
        console.log("红包领取成功:", data);
        // 更新用户积分
        userPoints.value = data.remainingPoints;
        
        // 更新用户列表中当前用户的积分
        const userIndex = users.value.findIndex(user => user.coreId === coreId.value);
        if (userIndex !== -1) {
          users.value[userIndex].points = data.remainingPoints;
          console.log(`更新用户列表中 ${users.value[userIndex].username} 的积分为 ${data.remainingPoints}`);
        }
        
        ElMessage.success(`恭喜您领取了${data.amount}积分！`);
        
        // 如果红包详情对话框正在显示，刷新红包详情
        if (showRedPacketDialog.value && selectedRedPacketId.value === data.redPacketId) {
          socket.emit('get_red_packet_details', {
            redPacketId: data.redPacketId,
            userId: userId.value,
            coreId: coreId.value
          });
        }
      });

      // 处理红包领取失败事件
      socket.on("receive_red_packet_failed", (data) => {
        console.error("红包领取失败:", data);
        ElMessage.error(data.message || "红包领取失败");
      });

      // 处理获取红包详情成功事件
      socket.on("get_red_packet_details_success", (data) => {
        console.log("获取红包详情成功:", data);
        // 更新红包详情数据
        redPacketDetails.value = data;
        // 显示红包详情对话框
        showRedPacketDialog.value = true;
      });

      // 处理获取红包详情失败事件
      socket.on("get_red_packet_details_failed", (data) => {
        console.error("获取红包详情失败:", data);
        ElMessage.error(data.message || "获取红包详情失败");
      });

      // 处理新红包消息
      socket.on("new_red_packet", (data) => {
        // 将红包消息添加到消息列表
        const redPacketMessage = {
          id: `red_packet_${data.id}`,
          userId: data.senderId,
          username: data.senderName,
          type: "redPacket",
          content: data.message || "发了一个红包",
          redPacketId: data.id,
          redPacketData: {
            id: data.id,
            senderId: data.senderId,
            senderName: data.senderName,
            type: data.type,
            totalAmount: data.totalAmount,
            count: data.count,
            totalCount: data.totalCount,
            message: data.message,
            timestamp: data.timestamp,
            status: data.status,
            remainingCount: data.remainingCount
          },
          timestamp: data.timestamp
        };
        
        messages.value.push(redPacketMessage);
        
        // 播放提示音
        if (audioPermissionGranted.value) {
          const audio = new Audio(qqSound);
          audio.play().catch(error => console.warn("播放提示音失败:", error));
        }
        
        // 如果页面不在焦点，显示通知
        if (!document.hasFocus()) {
          showNotification(`${data.senderName}发了一个红包`, data.message || "发了一个红包");
        }
      });

      // 处理红包状态更新
      socket.on("red_packet_status_update", (data) => {
        // 查找对应的红包消息
        const messageIndex = messages.value.findIndex(msg => 
          msg.type === "redPacket" && msg.redPacketId === data.redPacketId
        );
        
        if (messageIndex !== -1) {
          // 更新红包状态
          messages.value[messageIndex].redPacketData.status = data.status;
          messages.value[messageIndex].redPacketData.remainingCount = data.remainingCount;
        }
      });

      // 处理红包完成事件
      socket.on("red_packet_completed", (data) => {
        // 查找对应的红包消息
        const messageIndex = messages.value.findIndex(msg => 
          msg.type === "redPacket" && msg.redPacketId === data.redPacketId
        );
        
        if (messageIndex !== -1) {
          // 更新红包状态为已完成
          messages.value[messageIndex].redPacketData.status = "completed";
          messages.value[messageIndex].redPacketData.remainingCount = 0;
        }
      });
    };

    // 显示浏览器通知
    const showNotification = (title, body) => {
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(title, {
          body: body,
          icon: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%2345B7D1' d='M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 36c-8.82 0-16-7.18-16-16S15.18 8 24 8s16 7.18 16 16-7.18 16-16 16z'/%3E%3Cpath fill='%2345B7D1' d='M22 16h4v16h-4zm0 20h4v4h-4z'/%3E%3C/svg%3E",
          tag: "chat-message",
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // 5秒后自动关闭通知
        setTimeout(() => notification.close(), 5000);
      }
    };

    // 获取通知内容
    const getNotificationBody = (message) => {
      if (message.type === "image") {
        return "发送了一张图片";
      } else if (message.type === "emoText") {
        return "发送了动态表情和文字";
      } else if (message.type === "quote") {
        return `回复了@${message.quote?.username || ""}的消息`;
      } else if (message.content) {
        return message.content.length > 50
          ? message.content.substring(0, 50) + "..."
          : message.content;
      }
      return "发送了一条消息";
    };

    // 生成临时用户ID，确保MessageList组件始终有currentUserId
    const generateTempUserId = () => {
      // 从localStorage尝试获取已有的临时ID，避免每次刷新都生成新ID
      let tempId = localStorage.getItem("tempUserId");
      if (!tempId) {
        // 生成新的临时ID
        tempId =
          "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("tempUserId", tempId);
      }
      return tempId;
    };

    // 处理动态表情文本，将[表情名称]替换为对应的URL
    const processEmojiText = (text) => {
      let processedText = text;
      // 查找所有[表情名称]格式的文本
      const emojiRegex = /\[(\w+)\]/g;
      const matches = text.match(emojiRegex);

      if (matches) {
        matches.forEach((match) => {
          const emojiName = match.substring(1, match.length - 1);
          const emojiUrl = dynamicEmojis[emojiName];
          if (emojiUrl) {
            // 这里我们只标记文本包含动态表情，实际的显示逻辑会在前端模板中处理
            processedText = processedText.replace(match, emojiUrl);
          }
        });
      }

      return processedText;
    };

    // 处理登录成功
    const handleLoginSuccess = (userData) => {
      username.value = userData.username;
      // 移除nickname变量，统一使用username
      // nickname.value = userData.nickname || userData.username;
      userId.value = userData.userId;
      isLoggedIn.value = true;
      localStorage.setItem("username", userData.username);
      localStorage.setItem("userId", userData.userId);
      // 移除对nickname的localStorage存储
      // localStorage.setItem('nickname', userData.nickname || userData.username);

      // 更新用户信息映射，统一使用username
      updateUserInfoMap(userData.username, userData.username);

      initSocket();
    };

    // 获取当前组件实例
    const instance = getCurrentInstance();
    // 获取事件总线
    const eventBus = useEventBus(instance);
    // 获取全局事件常量
    const GLOBAL_EVENTS = useGlobalEvents(instance);

    // 处理登出
    const handleLogout = () => {
      // 清除用户信息
      username.value = "";
      userId.value = "";
      coreId.value = ""; // 清除coreId的响应式变量，但不从localStorage中清除
      // 移除对nickname的清除
      // nickname.value = "";
      isLoggedIn.value = false;
      messages.value = [];
      users.value = [];
      userInfoMap.value = {};

      // 断开socket连接
      if (socket) {
        socket.disconnect();
        socket = null;
      }

      // 清除localStorage中的用户信息
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      // 移除对nickname的localStorage清除
      // localStorage.removeItem('nickname');
      // 注意：不删除localStorage中的coreId，因为coreId绑定的积分是唯一值

      // 重定向到首页（用户名输入页面）
      window.location.href = window.location.origin;
    };

    // 请求音频播放权限
    const requestAudioPermission = () => {
      try {
        // 尝试播放一个静音的音频来获得权限
        const audio = new Audio(qqSound);
        audio.volume = 0;
        audio
          .play()
          .then(() => {
            audioPermissionGranted.value = true;
            showAudioPermissionButton.value = false;
            ElMessage.success("音频权限已授权，您现在可以听到消息提示音了");
            audio.pause();
          })
          .catch((error) => {
            console.warn("获取音频权限失败:", error);
            ElMessage.warning("需要您先与页面交互才能播放声音");
          });
      } catch (error) {
        console.warn("创建音频对象失败:", error);
        ElMessage.warning("需要您先与页面交互才能播放声音");
      }
    };

    // 播放通知声音
    const playNotificationSound = (isMentioned = false) => {
      const now = Date.now();
      // 检查是否超过了播放间隔
      if (now - lastPlaySoundTime.value > soundInterval) {
        try {
          // 使用导入的音频文件URL
          const audio = new Audio(qqSound);
          // 如果是被@的消息，可以调整音量
          if (isMentioned) {
            audio.volume = 0.8; // 比普通消息声音大一些
          } else {
            audio.volume = 0.5; // 普通消息音量
          }
          audio
            .play()
            .then(() => {
              // 更新上次播放时间
              lastPlaySoundTime.value = now;
            })
            .catch((error) => {
              console.warn("播放提示音失败:", error);
              // 如果播放失败，可能是权限问题，显示授权按钮
              if (!audioPermissionGranted.value) {
                showAudioPermissionButton.value = true;
              }
            });
        } catch (error) {
          console.warn("创建音频对象失败:", error);
        }
      }
    };

    // 处理图片选择
    const handleImageSelect = async (file) => {
      // 手动触发上传流程
      await handleImageUpload(file.raw);
      // 清除选择，允许重复选择同一文件
      uploadRef.value.clearFiles();
    };

    // 处理图片上传
    const handleImageUpload = async (file) => {
      // 1. 前端基本验证
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(file.type)) {
        ElMessage.error("只支持JPG、PNG、GIF和WebP格式的图片！");
        return false;
      }

      if (file.size > maxSize) {
        ElMessage.error("图片大小不能超过10MB！");
        return false;
      }

      try {
        // 2. 创建本地预览
        const reader = new FileReader();
        const previewUrl = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error("读取图片失败"));
          reader.readAsDataURL(file);
        });

        // 3. 创建本地展示的消息对象
        const localMessage = {
          type: "image",
          userName: username.value,
          userId: localStorage.getItem("userId"),
          content: "", // 图片类型的content留空
          imgUrl: previewUrl, // 使用本地预览URL
          quote: quotedMessage.value || null,
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          uploading: true, // 标记为上传中
        };

        // 添加到本地消息列表
        messages.value.push(localMessage);

        // 4. 获取临时签名URL
        const userId = localStorage.getItem("userId");
        const presignedResponse = await fetch("/api/get-presigned-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
          },
          body: JSON.stringify({
            filename: file.name,
            fileType: file.type,
          }),
        });

        const presignedData = await presignedResponse.json();
        if (!presignedData.success) {
          throw new Error(presignedData.message || "获取上传链接失败");
        }

        // 5. 使用签名URL直接上传图片到模拟的对象存储
        const uploadResponse = await fetch(presignedData.uploadUrl, {
          method: "PUT",
          body: file,
        });

        const uploadData = await uploadResponse.json();
        if (!uploadData.success) {
          throw new Error(uploadData.message || "图片上传失败");
        }

        // 6. 获取永久可访问的CDN URL
        const imageUrl = uploadData.cdnUrl;

        // 7. 发送消息到服务器（包含图片URL）
        if (socket) {
          const messageData = {
            type: "image",
            userName: username.value,
            userId: userId,
            content: "", // 图片类型的content留空
            imgUrl: imageUrl, // 使用服务器返回的CDN URL
            quote: quotedMessage.value || null,
          };

          socket.emit("chat_message", {
            ...messageData,
            localId: localMessage.id, // 添加localId以便接收时识别
          });

          // 更新本地消息的imgUrl
          const index = messages.value.findIndex(
            (msg) => msg.id === localMessage.id
          );
          if (index !== -1) {
            messages.value[index].imgUrl = imageUrl;
            messages.value[index].uploading = false;
          }
        }

        return true; // 发送成功返回true
      } catch (error) {
        console.error("图片处理失败:", error);
        // 移除上传失败的消息
        const index = messages.value.findIndex(
          (msg) => msg.id === localMessage?.id
        );
        if (index !== -1) {
          messages.value.splice(index, 1);
        }
        ElMessage.error(error.message || "图片处理失败，请重试");
        return false;
      }
    };

    // 处理回车发送消息
    const handleEnter = (event) => {
      if (!event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    };

    // 处理粘贴图片
    const handlePasteImage = (event) => {
      const items = event.clipboardData && event.clipboardData.items;
      if (items) {
        // 遍历所有剪贴板项
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            // 创建图片预览
            const reader = new FileReader();
            reader.onload = (e) => {
              pastedImage.value = e.target.result;
            };
            reader.readAsDataURL(file);
            event.preventDefault();
          }
        }
      }
    };

    // 移除粘贴的图片
    const handleRemovePastedImage = () => {
      pastedImage.value = "";
    };

    // 处理选择表情
    const handleSelectEmoji = (emoji) => {
      if (typeof emoji !== "object") {
        inputMessage.value += emoji;
      } else {
        const { url, name } = emoji;
        const emoPath = url.split("/")[2];
        inputMessage.value += `[${emoPath} ${name}]`;
      }

      showEmojiPanel.value = false;
    };

    // 处理移除收藏表情
    const handleRemoveFavoriteEmoji = (emoji) => {
      favoriteEmojis.value = favoriteEmojis.value.filter((e) => e !== emoji);
      localStorage.setItem(
        "favoriteEmojis",
        JSON.stringify(favoriteEmojis.value)
      );
    };

    // 发送消息
    const sendMessage = async () => {
      // 检查是否有消息内容或粘贴的图片
      const messageContent = inputMessage.value.trim();
      if (!messageContent && !pastedImage.value) {
        return;
      }

      // 处理粘贴的图片
      if (pastedImage.value) {
        try {
          // 将DataURL转换为Blob
          const byteString = atob(pastedImage.value.split(",")[1]);
          const mimeString = pastedImage.value
            .split(",")[0]
            .split(":")[1]
            .split(";")[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          const file = new File([blob], `pasted-image-${Date.now()}.png`, {
            type: mimeString,
          });

          // 上传图片
          const result = await handleImageUpload(file);
          // 无论上传是否成功，都清空输入和粘贴的图片，防止重复发送
          inputMessage.value = "";
          pastedImage.value = "";
          quotedMessage.value = null;
        } catch (error) {
          console.error("处理粘贴的图片失败:", error);
          ElMessage.error("发送图片失败，请重试");
          // 出错时也清空，防止重复发送
          inputMessage.value = "";
          pastedImage.value = "";
          quotedMessage.value = null;
        }
        return;
      }

      // 检查内容是否全是空白字符
      if (!messageContent) {
        return;
      }

      // 如果消息内容中不包含[回复 ]格式的数据，将quotedMessage设为空
      const replyPattern = /\[回复：.*?:.*?\]/;
      if (quotedMessage.value && !replyPattern.test(messageContent)) {
        quotedMessage.value = null;
      }

      // 提取消息内容中的非引用部分作为实际消息内容
      let actualMessageContent = messageContent;
      if (quotedMessage.value && replyPattern.test(messageContent)) {
        // 移除引用标记，保留剩余部分作为实际消息内容
        actualMessageContent = messageContent.replace(replyPattern, "").trim();
        // 如果移除引用标记后内容为空，使用一个空格作为默认内容
        if (!actualMessageContent) {
          actualMessageContent = " ";
        }
      }

      // 检查内容是否包含动态表情
      let messageType = "text";
      let processedContent = actualMessageContent;
      if (actualMessageContent.includes("[")) {
        messageType = "emoText";
        processedContent = processEmojiText(actualMessageContent);
      }

      // 处理@用户功能
      // 提取消息中@的所有用户，改进正则表达式以匹配所有@用户格式
      const mentionedUsers = [];
      const mentionRegex = /@(\S+)/g; // 移除末尾的空格要求，匹配所有@用户格式
      let match;
      // 重置正则表达式的lastIndex以确保多次调用时正确工作
      mentionRegex.lastIndex = 0;
      while ((match = mentionRegex.exec(messageContent)) !== null) {
        const mentionedUser = match[1];
        // 检查是否是有效的在线用户
        if (
          users.value.includes(mentionedUser) &&
          mentionedUser !== username.value
        ) {
          // 避免重复添加同一个用户
          if (!mentionedUsers.includes(mentionedUser)) {
            mentionedUsers.push(mentionedUser);
          }
        }
      }

      // 创建消息对象，确保quote属性不包含循环引用
      const messageData = {
        type: messageType,
        userName: username.value,
        userId: userId.value,
        content: processedContent,
        // 深拷贝quotedMessage并移除可能导致循环引用的属性
        quote: quotedMessage.value
          ? {
              id: quotedMessage.value.id,
              username:
                quotedMessage.value.username || quotedMessage.value.userName,
              userId: quotedMessage.value.userId || "", // 确保userId存在，即使为空字符串
              content: quotedMessage.value.content,
              type: quotedMessage.value.type,
              timestamp: quotedMessage.value.timestamp,
              imgUrl: quotedMessage.value.imgUrl, // 确保包含图片URL
            }
          : null,
        mentions: mentionedUsers, // 添加被@的用户列表
      };

      // 创建唯一ID标识本次发送的消息
      const messageId = Date.now().toString();

      // 创建本地展示的消息对象
      const localMessage = {
        ...messageData,
        id: messageId,
        timestamp: Date.now(), // 使用时间戳而不是格式化后的字符串
      };

      // 添加到本地消息列表
      messages.value.push(localMessage);

      // 存储当前正在发送的消息ID，用于避免重复添加
      const currentSendingMessageId = messageId;

      // 发送消息到服务器
      if (socket) {
        socket.emit("chat_message", {
          ...messageData,
          localId: currentSendingMessageId, // 附加本地ID
        });
      }

      // 清空输入框和引用消息
      inputMessage.value = "";
      quotedMessage.value = null;
    };

    // 弹幕相关数据
    const danmuContent = ref("");
    const danmuColor = ref("#303133");
    const danmuList = ref([]);
    const isDarkTheme = ref(false);
    
    // 监听主题变化
    onMounted(() => {
      // 检查当前主题
      isDarkTheme.value = document.documentElement.classList.contains('theme-dark');
      
      // 监听主题变化
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.attributeName === 'class') {
            isDarkTheme.value = document.documentElement.classList.contains('theme-dark');
          }
        });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      
      return () => observer.disconnect();
    });
    
    // 动态计算适合当前主题的弹幕颜色列表
    const danmuColors = computed(() => {
      // 默认主题颜色 - 移除了白色
      const defaultColors = [
        "#303133", // 深灰色
        "#E6A23C", // 橙色
        "#F56C6C", // 红色
        "#409EFF", // 蓝色
        "#67C23A", // 绿色
        "#909399", // 浅灰色
        "#C06C84", // 粉色
        "#7C5CBF", // 紫色
      ];
      
      // 暗黑主题颜色 - 移除了黑色，使用更适合暗黑背景的颜色
      const darkColors = [
        "#E4E7ED", // 浅灰色
        "#E6A23C", // 橙色
        "#F56C6C", // 红色
        "#409EFF", // 蓝色
        "#67C23A", // 绿色
        "#909399", // 中灰色
        "#C06C84", // 粉色
        "#7C5CBF", // 紫色
      ];
      
      return isDarkTheme.value ? darkColors : defaultColors;
    });

    // 发送弹幕
    const sendDanmu = () => {
      if (!danmuContent.value.trim() || !socket || !socket.connected) {
        return;
      }

      const danmuData = {
        content: danmuContent.value.trim(),
        color: danmuColor.value,
        username: username.value,
        userId: userId.value,
        timestamp: Date.now(),
      };

      // 发送弹幕到服务器
      socket.emit("danmu_message", danmuData);

      // 清空输入框
      danmuContent.value = "";
    };

    // 添加弹幕到显示列表
    const addDanmu = (data) => {
      const displayArea = document.querySelector(".danmu-display-area");
      if (!displayArea) return;

      const displayWidth = displayArea.clientWidth;
      const displayHeight = displayArea.clientHeight;
      const fontSize = 20;
      const speed = 6 + Math.random() * 3; // 4-7秒，更快的速度

      // 随机垂直位置，但确保在显示区域内
      const top = Math.floor(Math.random() * (displayHeight - fontSize * 2));

      const danmu = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        content: data.content,
        color: data.color || "#303133",
        position: displayWidth,
        top: Math.max(0, top),
        speed: speed,
        fontSize: fontSize,
      };

      danmuList.value.push(danmu);
    };

    // 移除已完成动画的弹幕
    const removeDanmu = (id) => {
      danmuList.value = danmuList.value.filter((danmu) => danmu.id !== id);
    };

    // 处理输入变化
    const handleInputChange = () => {
      // 这里可以添加输入变化的处理逻辑，例如自动完成@用户等
    };

    // 处理消息右键菜单
    const handleMessageContextMenu = (data) => {
      const { event, message, imageUrl } = data;
      if(message.type==="recalled") return
      event.preventDefault();
      showContextMenu.value = true;
      contextMenuX.value =
        document.body.offsetWidth - event.clientX < 150
          ? document.body.offsetWidth - 150
          : event.clientX;
      contextMenuY.value = event.clientY;
      selectedMessage.value = message;
      selectedImageUrl.value = imageUrl;
    };

    // 处理用户右键菜单
    const handleUserContextMenu = (data) => {
      
      const { event, user } = data;
      event.preventDefault();
      showContextMenu.value = true;
      contextMenuX.value =
        document.body.offsetWidth - event.clientX < 150
          ? document.body.offsetWidth - 150
          : event.clientX;
      contextMenuY.value = event.clientY;
      selectedUserForMention.value = user;
    };

    // 隐藏右键菜单
    const hideContextMenu = () => {
      showContextMenu.value = false;
      selectedMessage.value = null;
      selectedImageUrl.value = "";
      selectedUserForMention.value = null;
    };

    // 处理@用户
    const handleMentionUser = (user) => {
      if (typeof user === "object") {
        inputMessage.value += `@${user.username} `;
      } else {
        inputMessage.value += `@${user} `;
      }

      hideContextMenu();
      // 聚焦输入框
      nextTick(() => {
        const input = document.querySelector(".el-textarea__inner");
        if (input) {
          input.focus();
        }
      });
    };

    // 处理引用消息
    const handleQuoteMessage = (message) => {
      // 确保引用消息对象中始终有userId字段
      const messageWithUserId = {
        ...message,
        userId: message.userId || "",
      };
      quotedMessage.value = messageWithUserId;
      // 将引用内容以[回复： **** ]格式添加到输入框
      let quotedContent = "";
      if (message.type === "image") {
        quotedContent = "[图片]";
      } else if (message.content) {
        // 截取部分内容，避免输入框过长
        quotedContent =
          message.content.length > 30
            ? message.content.substring(0, 30) + "..."
            : message.content;
      }
      // 格式化为[回复：用户名: 内容]
      const formattedQuote = `[回复：${
        message.username || message.userName
      }: ${quotedContent}]\n `;

      // 如果输入框已有内容，先清空
      inputMessage.value = formattedQuote;
      hideContextMenu();
      // 聚焦输入框
      nextTick(() => {
        const input = document.querySelector(".el-textarea__inner");
        if (input) {
          input.focus();
        }
      });
    };

    // 处理撤回消息
    const handleRecallMessage = (message) => {
      // 验证消息是否属于当前用户
      if (message.userId !== userId.value) {
        ElMessage.error("只能撤回自己的消息");
        return;
      }

      // 向服务器发送撤回请求
      if (socket) {
        socket.emit("recall_message", {
          messageId: message.id,
          userId: userId.value
        });
      } else {
        ElMessage.error("网络连接异常，请稍后再试");
      }
    };

    // 处理选择用户用于@
    const handleSelectUserForMention = (user) => {
      // 用户可能是字符串或对象，需要兼容处理
      const username = typeof user === "string" ? user : user.username;
      inputMessage.value += `@${username} `;
      showMentionPanel.value = false;
      // 聚焦输入框
      nextTick(() => {
        const input = document.querySelector(".el-textarea__inner");
        if (input) {
          input.focus();
        }
      });
    };

    // 管理员模式相关状态
    const isAdminMode = ref(false);
    const titleClickCount = ref(0);
    const titleClickTimer = ref(null);
    
    // 踢人对话框相关状态
    const showKickDialog = ref(false);
    const selectedUserForKick = ref(null);
    const kickDuration = ref(1); // 默认1分钟
    
    // 处理标题点击事件
    const handleTitleClick = () => {
      titleClickCount.value++;
      
      // 清除之前的定时器
      if (titleClickTimer.value) {
        clearTimeout(titleClickTimer.value);
      }
      
      // 设置新的定时器，3秒后重置计数
      titleClickTimer.value = setTimeout(() => {
        titleClickCount.value = 0;
      }, 3000);
      
      // 如果点击次数达到10次，激活管理员模式
      if (titleClickCount.value >= 10) {
        isAdminMode.value = true;
        titleClickCount.value = 0;
        ElMessage.success("已进入管理员模式");
        
        // 更新localStorage中的管理员模式设置
        localStorage.setItem('adminSettings', JSON.stringify({ adminMode: true }));
        
        // 发送全局事件，通知其他组件管理员模式已启用
        window.dispatchEvent(new CustomEvent('admin-mode-changed', {
          detail: { adminMode: true }
        }));
        
        // 清除定时器
        if (titleClickTimer.value) {
          clearTimeout(titleClickTimer.value);
          titleClickTimer.value = null;
        }
      }
    };

    // 踢人处理函数
    const handleKickUser = (user) => {
      // 确保user对象有效，并标准化为对象格式
      if (!user) {
        ElMessage.error("无效的用户信息");
        return;
      }
      
      // 标准化用户对象
      const normalizedUser = typeof user === 'object' ? user : { username: user };
      
      // 确保用户对象有username属性
      if (!normalizedUser.username) {
        ElMessage.error("用户信息缺少用户名");
        return;
      }
      
      selectedUserForKick.value = normalizedUser;
      showKickDialog.value = true;
      kickDuration.value = 1; // 重置为默认值
    };

    // 确认踢人
    const confirmKickUser = () => {
      if (!selectedUserForKick.value) {
        ElMessage.error("未选择要踢出的用户");
        return;
      }

      const userToKick = typeof selectedUserForKick.value === 'object' 
        ? selectedUserForKick.value 
        : { username: selectedUserForKick.value };
      
      // 再次验证用户对象
      if (!userToKick.username) {
        ElMessage.error("用户信息无效");
        return;
      }

      // 发送踢人请求到服务器
      socket.emit('kick_user', {
        userId: userToKick.userId,
        username: userToKick.username,
        duration: kickDuration.value,
        adminId: userId.value,
        adminName: username.value
      });

      // 关闭对话框
      showKickDialog.value = false;
      selectedUserForKick.value = null;

      // 不再立即显示成功消息，等待服务器返回成功事件
      ElMessage.info(`正在踢出 ${userToKick.username}，请稍候...`);
    };

    // 取消踢人
    const cancelKickUser = () => {
      showKickDialog.value = false;
      selectedUserForKick.value = null;
    };

    // 处理窗口获得焦点
    const handleWindowFocus = () => {
      hasFocus = true;
      hasUnreadMessage.value = false;
      hasMentionedMessage.value = false;
      if (titleInterval) {
        clearInterval(titleInterval);
        document.title = originalTitle;
      }
    };

    // 处理窗口失去焦点
    const handleWindowBlur = () => {
      hasFocus = false;
    };

    // 开始标题闪烁
    const startTitleBlink = () => {
      if (!hasFocus && !titleInterval) {
        let isOriginalTitle = true;
        titleInterval = setInterval(() => {
          if (hasUnreadMessage.value) {
            document.title = isOriginalTitle
              ? `【新消息】${originalTitle}`
              : originalTitle;
            isOriginalTitle = !isOriginalTitle;
          } else {
            clearInterval(titleInterval);
            document.title = originalTitle;
            titleInterval = null;
          }
        }, 1000);
      }
    };

    // 开始被@时的标题闪烁（更明显的提醒）
    const startMentionBlink = () => {
      if (!hasFocus && !titleInterval) {
        hasMentionedMessage.value = true;
        let blinkCount = 0;
        let isUrgentTitle = false;
        titleInterval = setInterval(() => {
          if (hasUnreadMessage.value && hasMentionedMessage.value) {
            // 更明显的闪烁效果，前3次闪烁加快
            const blinkSpeed = blinkCount < 3 ? 500 : 1000;
            if (blinkCount % Math.floor(1000 / blinkSpeed) === 0) {
              document.title = isUrgentTitle
                ? `【有人@你】${originalTitle}`
                : originalTitle;
              isUrgentTitle = !isUrgentTitle;
              blinkCount++;
            }
          } else {
            clearInterval(titleInterval);
            document.title = originalTitle;
            titleInterval = null;
            hasMentionedMessage.value = false;
          }
        }, 100); // 更频繁的检查，但实际闪烁速度由blinkSpeed控制
      }
    };

    // 处理全局点击以获取音频权限
    const handleGlobalClickForAudioPermission = () => {
      if (!audioPermissionGranted.value && showAudioPermissionButton.value) {
        requestAudioPermission();
      }
    };

    // 处理修改昵称
    const handleEditNickname = (user) => {
      // 检查参数类型，兼容字符串用户名和用户对象
      const targetUsername = typeof user === "string" ? user : user.username;
      const targetUserId =
        typeof user === "object" && user.userId ? user.userId : null;

      // 验证是否是当前用户
      const isCurrentUser =
        targetUsername === username.value &&
        (!targetUserId || targetUserId === userId.value);

      if (isCurrentUser) {
        // 设置初始值为当前用户名（不再使用nickname）
        editNicknameInitialValue.value = username.value;
        // 显示修改昵称对话框
        showNicknameDialog.value = true;
      } else {
        ElMessage.warning("只能修改自己的昵称");
      }
    };

    // 处理保存昵称
    const handleSaveNickname = async (newUsername) => {
      if (!socket) {
        ElMessage.error("网络连接异常，请稍后再试");
        return;
      }

      try {
        // 保存旧用户名，用于更新历史消息的映射
        const oldUsername = username.value;

        // 向服务器发送更新昵称请求
        socket.emit("update_nickname", {
          username: oldUsername,
          newNickname: newUsername, // 保持API参数名称一致
          userId: userId.value, // 添加userId信息
        });

        // 更新本地用户名状态
        username.value = newUsername;

        // 更新用户信息映射，同时维护旧用户名和新用户名的映射
        // 保持旧用户名到新用户名的映射，以便历史消息也能正确显示
        updateUserInfoMap(oldUsername, newUsername);
        // 同时添加新用户名到新用户名的映射
        updateUserInfoMap(newUsername, newUsername);

        // 保存到localStorage，直接更新username
        localStorage.setItem("username", newUsername);

        // 在用户列表中找到当前用户并更新用户名
        const userIndex = users.value.findIndex((u) => {
          if (typeof u === "object") {
            return u.username === oldUsername || u.userId === userId.value;
          }
          return u === oldUsername;
        });

        if (userIndex !== -1 && typeof users.value[userIndex] === "object") {
          users.value[userIndex] = {
            ...users.value[userIndex],
            username: newUsername,
          };
        }

        // 同步更新聊天记录中所有该用户ID对应的消息用户名
        // 使用新的引用方式确保Vue响应式系统能够检测到变化
        messages.value = messages.value.map((message) => {
          // 检查消息的用户ID是否匹配当前用户ID
          if (message.userId === userId.value) {
            // 创建新对象以触发Vue的响应式更新
            return {
              ...message,
              username: newUsername,
              userName: newUsername,
            };
          }

          // 检查引用消息中的用户ID是否匹配当前用户ID
          if (message.quote && message.quote.userId === userId.value) {
            // 创建新的引用消息对象
            return {
              ...message,
              quote: {
                ...message.quote,
                username: newUsername,
                userName: newUsername,
              },
            };
          }

          return message;
        });

        // 通知更新消息记录中的用户显示名称
        eventBus.emit("user_nickname_changed", {
          username: oldUsername,
          newNickname: newUsername,
        });

        // 关闭对话框
        showNicknameDialog.value = false;
      } catch (error) {
        console.error("修改昵称失败:", error);
        ElMessage.error("修改昵称失败，请稍后再试");
      }
    };

    // 组件挂载时执行
    onMounted(() => {
      // 检查用户是否已登录
      const localStorageUsername = localStorage.getItem("username");
      const localStorageUserId = localStorage.getItem("userId");

      if (localStorageUsername && localStorageUserId) {
        // 临时保存用户信息，但不立即标记为已登录
        username.value = localStorageUsername;
        userId.value = localStorageUserId || generateTempUserId();
        // 移除对nickname的获取和设置
        // const localStorageNickname = localStorage.getItem('nickname');
        // nickname.value = localStorageNickname || localStorageUsername;
        console.log("User initialized with ID:", userId.value);

        // 从localStorage恢复userInfoMap
        const storedUserInfoMap = localStorage.getItem("userInfoMap");
        if (storedUserInfoMap) {
          try {
            userInfoMap.value = JSON.parse(storedUserInfoMap);
          } catch (error) {
            console.error("Failed to parse stored userInfoMap:", error);
          }
        }

        // 确保当前用户的信息在映射表中，统一使用username
        updateUserInfoMap(username.value, username.value);

        // 初始化WebSocket连接，在连接成功后再标记为已登录
        initSocket();
      } else {
        // 用户未登录，跳转到用户名输入页面
        window.location.href = window.location.origin;
      }

      // 添加窗口焦点事件监听器
      window.addEventListener("focus", handleWindowFocus);
      window.addEventListener("blur", handleWindowBlur);

      // 添加右键菜单事件监听器
      window.addEventListener("click", hideContextMenu);
      window.addEventListener("contextmenu", () => {});

      // 添加音频权限事件监听器
      window.addEventListener("click", handleGlobalClickForAudioPermission);
      
      // 从localStorage加载管理员模式状态
      const savedAdminSettings = localStorage.getItem('adminSettings');
      if (savedAdminSettings !== null) {
        try {
          const adminSettings = JSON.parse(savedAdminSettings);
          isAdminMode.value = adminSettings.adminMode || false;
        } catch (error) {
          console.error('Failed to parse admin settings:', error);
          isAdminMode.value = false;
        }
      }
      
      // 监听管理员模式变更事件
      window.addEventListener('admin-mode-changed', (event) => {
        isAdminMode.value = event.detail.adminMode;
        // 保存管理员模式状态到localStorage
        const adminSettings = { adminMode: isAdminMode.value };
        localStorage.setItem('adminSettings', JSON.stringify(adminSettings));
      });
    });

    // 组件卸载时执行
    onUnmounted(() => {
      // 断开WebSocket连接
      if (socket) {
        socket.disconnect();
        socket = null;
      }

      // 清理事件监听器
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      // 移除右键菜单事件监听器
      window.removeEventListener("click", hideContextMenu);
      window.removeEventListener("contextmenu", () => {});
      // 移除音频权限事件监听器
      window.removeEventListener("click", handleGlobalClickForAudioPermission);
      // 移除管理员模式变更事件监听器
      window.removeEventListener('admin-mode-changed', () => {});
      // 清理标题闪烁定时器
      if (titleInterval) {
        clearInterval(titleInterval);
        document.title = originalTitle;
      }
    });

    // 打开红包详情对话框
    const openRedPacketDialog = (redPacketId) => {
      selectedRedPacketId.value = redPacketId;
      // 先获取红包详情
      if (socket) {
        socket.emit('get_red_packet_details', {
          redPacketId: redPacketId,
          userId: userId.value,
          coreId: coreId.value // 添加coreId参数
        });
      }
    };

    // 处理创建红包
    const handleCreateRedPacket = (redPacketData) => {
      // 通过socket发送红包数据
      if (socket) {
        socket.emit('create_red_packet', {
          type: redPacketData.type,
          count: redPacketData.count,
          totalAmount: redPacketData.totalAmount,
          message: redPacketData.message,
          userId: userId.value,
          username: username.value,
          coreId: coreId.value // 添加coreId参数
        });
      }
    };

    // 处理领取红包
    const handleReceiveRedPacket = (redPacketId) => {
      // 通过socket发送领取红包请求
      if (socket) {
        socket.emit('receive_red_packet', {
          redPacketId: redPacketId,
          userId: userId.value,
          username: username.value,
          coreId: coreId.value // 添加coreId参数
        });
      }
    };

    return {
      coreId,
      username,
      isLoggedIn,
      messages,
      inputMessage,
      users,
      userInfoMap,
      userId,
      pastedImage,
      showEmojiPanel,
      favoriteEmojis,
      showContextMenu,
      contextMenuX,
      contextMenuY,
      selectedImageUrl,
      selectedMessage,
      selectedUserForMention,
      showMentionPanel,
      mentionPanelX,
      showAudioPermissionButton,
      isLoadingMessages,
      isLoadingUsers,
      isAdminMode,
      showKickDialog,
      selectedUserForKick,
      kickDuration,
      handleLoginSuccess,
      requestAudioPermission,
      handleImageUpload,
      handleEnter,
      handlePasteImage,
      removePastedImage: handleRemovePastedImage,
      handleSelectEmoji,
      handleRemoveFavoriteEmoji,
      sendMessage,
      handleInputChange,
      handleMessageContextMenu,
      handleUserContextMenu,
      hideContextMenu,
      handleMentionUser,
      handleQuoteMessage,
      handleRecallMessage,
      handleSelectUserForMention,
      handleKickUser,
      confirmKickUser,
      cancelKickUser,
      showNicknameDialog,
      editNicknameInitialValue,
      handleEditNickname,
      handleSaveNickname,
      handleLogout,
      showUserList,
      toggleUserList,
      handleImageSelect,
      handleTitleClick,
      danmuContent,
      danmuColor,
      danmuList,
      danmuColors,
      sendDanmu,
      removeDanmu,
      selectedBackground,
      handleBackgroundChange,
      getBackgroundStyle,
      showRedPacketDialog,
      selectedRedPacketId,
      redPacketDetails,
      userPoints,
      openRedPacketDialog,
      handleCreateRedPacket,
      handleReceiveRedPacket,
      updateUserInfoMap,
    };
  },
};
</script>

<style scoped>
.kick-dialog-content {
  padding: 20px 0;
}

.kick-dialog-content p {
  margin-bottom: 20px;
  font-size: 16px;
}

.kick-duration-setting {
  display: flex;
  align-items: center;
}

.kick-duration-setting label {
  margin-right: 10px;
  font-weight: bold;
  min-width: 100px;
}
</style>
