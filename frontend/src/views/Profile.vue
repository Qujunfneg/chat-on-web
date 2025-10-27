<template>
  <div class="profile-page">
    <!-- 用户信息卡片 -->
    <div class="card user-card">
      <div class="user-info">
        <div class="user-avatar">
          <el-avatar :size="60" :src="userAvatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="status-indicator online"></div>
        </div>
        <div class="user-details">
          <h2 class="user-name">{{ username }}</h2>
          <p class="user-id">ID: {{ userId }}</p>
        </div>
      </div>
    </div>

    <!-- 积分卡片 -->
    <div class="card points-card">
      <div class="card-header">
        <h3 class="card-title">
          <el-icon><Coin /></el-icon>
          我的积分
        </h3>
        <el-button 
          type="primary" 
          size="default"
          :disabled="!canClaimDaily" 
          @click="claimDailyPoints"
          :loading="claiming"
          class="claim-btn"
        >
          {{ canClaimDaily ? "每日领取" : "已领取" }}
        </el-button>
      </div>
      
      <div class="points-content">
        <div class="points-main">
          <div class="points-value">{{ userPoints }}</div>
          <div class="points-label">积分（下一等级: {{ Math.ceil(userPoints / 100) * 100 }}）</div>
        </div>
        
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${Math.min(userPoints / 10, 100)}%` }"></div>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatTimeToHMS(dynamicOnlineMinutes) }}</div>
              <div class="stat-label">在线时长</div>
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatTime(lastClaimDate) }}</div>
              <div class="stat-label">上次领取</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 积分规则卡片 -->
    <div class="card rules-card">
      <div class="card-header">
        <h3 class="card-title">
          <el-icon><InfoFilled /></el-icon>
          积分规则
        </h3>
      </div>
      
      <div class="rules-content">
        <div class="rules-grid">
          <div class="rule-item">
            <div class="rule-icon">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="rule-text">
              <h4>在线奖励</h4>
              <p>每在线10分钟获得10积分</p>
            </div>
          </div>
          
          <div class="rule-item">
            <div class="rule-icon">
              <el-icon><Present /></el-icon>
            </div>
            <div class="rule-text">
              <h4>每日签到</h4>
              <p>每日登录可领取100积分</p>
            </div>
          </div>
          
          <div class="rule-item">
            <div class="rule-icon">
              <el-icon><Star /></el-icon>
            </div>
            <div class="rule-text">
              <h4>积分用途</h4>
              <p>积分可用于解锁特殊功能</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { User, Coin, Clock, Calendar, InfoFilled, Timer, Present, Star } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';

// 用户信息
const username = ref('');
const userId = ref('');
const coreId = ref('');
const userAvatar = ref('');

// 积分信息
const userPoints = ref(0);
const onlineMinutes = ref(0);
const canClaimDaily = ref(false);
const lastClaimDate = ref('');
const claiming = ref(false);

// 在线时长相关
const sessionStartTime = ref(Date.now()); // 记录会话开始时间
const timer = ref(null); // 计时器引用
const currentTime = ref(Date.now()); // 当前时间，用于触发计算属性更新

// 计算动态在线时长（会话时长 + 历史时长）
const dynamicOnlineMinutes = computed(() => {
  const sessionMinutes = (currentTime.value - sessionStartTime.value) / (1000 * 60); // 会话时长（分钟）
  return onlineMinutes.value + sessionMinutes;
});

// 格式化时间为HH:mm:ss
function formatTimeToHMS(totalMinutes) {
  const totalSeconds = Math.floor(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 从localStorage获取用户信息
function getUserInfo() {
  username.value = localStorage.getItem('username') || '';
  userId.value = localStorage.getItem('userId') || '';
  coreId.value = localStorage.getItem('coreId') || '';
}

function formatTime(time){
  return time?dayjs(time).format('YYYY-MM-DD HH:mm:ss'):'未领取'
}

// 格式化分钟数
function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${minutes}分钟`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
  }
}

// 领取每日积分
function claimDailyPoints() {
  if (!canClaimDaily.value) return;
  
  claiming.value = true;
  
  // 发送领取积分请求
  if (window.socket) {
    window.socket.emit('claim_daily_points');
  }
  
  // 监听领取结果
  const handleClaimSuccess = (data) => {
    userPoints.value = data.points;
    canClaimDaily.value = data.canClaimDaily;
    lastClaimDate.value = new Date().toISOString();
    ElMessage.success(`成功领取${data.claimedPoints}积分！`);
    claiming.value = false;
    
    // 移除事件监听
    if (window.socket) {
      window.socket.off('claim_points_success', handleClaimSuccess);
      window.socket.off('claim_points_failed', handleClaimFailed);
    }
  };
  
  const handleClaimFailed = (data) => {
    ElMessage.error(data.message || '领取失败');
    claiming.value = false;
    
    // 移除事件监听
    if (window.socket) {
      window.socket.off('claim_points_success', handleClaimSuccess);
      window.socket.off('claim_points_failed', handleClaimFailed);
    }
  };
  
  if (window.socket) {
    window.socket.on('claim_points_success', handleClaimSuccess);
    window.socket.on('claim_points_failed', handleClaimFailed);
  }
}

// 组件挂载时获取用户信息
onMounted(() => {
  getUserInfo();
  
  // 设置定时器，每秒更新一次在线时长显示
  timer.value = setInterval(() => {
    // 更新当前时间，触发计算属性重新计算
    currentTime.value = Date.now();
  }, 1000);
  
  // 监听积分更新
  if (window.socket) {
    window.socket.on('points_updated', (data) => {
      userPoints.value = data.points;
      onlineMinutes.value = data.onlineMinutes || 0;
      // 只有在明确提供了canClaimDaily状态时才更新，否则保持当前状态
      if (data.canClaimDaily !== undefined) {
        canClaimDaily.value = data.canClaimDaily;
      }
      // 如果没有提供lastClaimDate，但canClaimDaily为false，说明已经领取过
      if (!data.lastClaimDate && !canClaimDaily.value) {
        lastClaimDate.value = new Date().toISOString();
      } else if (data.lastClaimDate) {
        lastClaimDate.value = data.lastClaimDate;
      }
    });
    
    // 监听积分信息
    window.socket.on('points_info', (data) => {
      userPoints.value = data.points;
      onlineMinutes.value = data.onlineMinutes || 0;
      canClaimDaily.value = data.canClaimDaily;
      lastClaimDate.value = data.lastClaimDate || '';
    });
    
    // 请求当前积分信息
    window.socket.emit('get_points');
  }
});

// 组件卸载时清除定时器
onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value);
  }
});
</script>

<style scoped>
.profile-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-height: calc(100vh - 64px); /* 减去可能的导航栏高度 */
  align-items: center;
}

/* 现代卡片样式 */
.card {
  width: 100%;
  max-width: 800px;
  background: linear-gradient(145deg, #ffffff, #f5f7fa);
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.card:hover {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  transform: translateY(-5px);
}

/* 用户卡片 */
.user-card {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 20px;
}

.user-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  text-align: left;
  gap: 20px;
  width: 100%;
  max-width: 500px;
}

.user-avatar {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.status-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 4px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.status-indicator.online {
  background-color: #52c41a;
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
}

.user-name {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.5px;
}

.user-id {
  margin: 0;
  font-size: 16px;
  color: #8c8c8c;
  font-weight: 500;
}

/* 积分卡片 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.card-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 12px;
}

.claim-btn {
  border-radius: 12px;
  font-weight: 600;
  padding: 10px 24px;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
  transition: all 0.2s ease;
}

.claim-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.4);
}

.points-content {
  padding: 0 32px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.points-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.points-value {
  font-size: 56px;
  font-weight: 800;
  color: #1890ff;
  line-height: 1;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.points-label {
  font-size: 18px;
  color: #8c8c8c;
  font-weight: 500;
}

.progress-section {
  width: 100%;
  max-width: 500px;
}

.progress-bar {
  height: 12px;
  background-color: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #36cfc9);
  border-radius: 6px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-text {
  font-size: 14px;
  color: #8c8c8c;
  text-align: center;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
}

.stat-item {
  display: flex;
  align-items: center;
  background: linear-gradient(145deg, #f8f9fa, #ffffff);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.15), rgba(54, 207, 201, 0.15));
  color: #1890ff;
  margin-right: 16px;
  font-size: 24px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-top: 4px;
  font-weight: 500;
}

/* 规则卡片 */
.rules-content {
  padding: 0 32px 32px;
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  justify-content: center;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
  max-width: 700px;
}

/* 自定义滚动条样式 */
.rules-content::-webkit-scrollbar {
  width: 8px;
}

.rules-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.rules-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.rules-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.rule-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 16px;
  background: linear-gradient(145deg, #f8f9fa, #ffffff);
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.rule-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

.rule-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.15), rgba(54, 207, 201, 0.15));
  color: #1890ff;
  margin-bottom: 16px;
  font-size: 28px;
}

.rule-text h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.rule-text p {
  margin: 0;
  font-size: 14px;
  color: #8c8c8c;
  line-height: 1.5;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .profile-page {
    padding: 24px;
    gap: 24px;
  }
  
  .card {
    max-width: 100%;
  }
  
  .card-header {
    padding: 20px 24px 16px;
  }
  
  .points-content,
  .rules-content {
    padding: 0 24px 24px;
  }
}

@media (max-width: 768px) {
  .profile-page {
    padding: 20px;
    gap: 20px;
  }
  
  .user-card {
    padding: 30px 20px;
  }
  
  .user-name {
    font-size: 24px;
  }
  
  .card-header {
    padding: 16px 20px 12px;
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .points-content,
  .rules-content {
    padding: 0 20px 20px;
  }
  
  .points-value {
    font-size: 48px;
  }
  
  .card-title {
    font-size: 20px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .rules-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .stat-item,
  .rule-item {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .profile-page {
    padding: 16px;
    gap: 16px;
  }
  
  .user-card {
    padding: 20px 16px;
  }
  
  .user-name {
    font-size: 22px;
  }
  
  .card-header {
    padding: 14px 16px 10px;
  }
  
  .points-content,
  .rules-content {
    padding: 0 16px 16px;
  }
  
  .points-value {
    font-size: 40px;
  }
  
  .points-label {
    font-size: 16px;
  }
  
  .card-title {
    font-size: 18px;
  }
  
  .stat-item,
  .rule-item {
    padding: 14px;
  }
  
  .stat-icon,
  .rule-icon {
    width: 45px;
    height: 45px;
    font-size: 22px;
  }
  
  .rule-icon {
    margin-bottom: 12px;
  }
  
  .stat-value {
    font-size: 15px;
  }
  
  .stat-label {
    font-size: 13px;
  }
  
  .rule-text h4 {
    font-size: 16px;
  }
  
  .rule-text p {
    font-size: 13px;
  }
}

@media (max-width: 360px) {
  .profile-page {
    padding: 12px;
    gap: 12px;
  }
  
  .user-card {
    padding: 16px 12px;
  }
  
  .user-name {
    font-size: 20px;
  }
  
  .card-header {
    padding: 12px 14px 8px;
  }
  
  .points-content,
  .rules-content {
    padding: 0 14px 14px;
  }
  
  .points-value {
    font-size: 36px;
  }
  
  .points-label {
    font-size: 15px;
  }
  
  .card-title {
    font-size: 17px;
  }
  
  .stat-item,
  .rule-item {
    padding: 12px;
  }
  
  .stat-icon,
  .rule-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  .rule-icon {
    margin-bottom: 10px;
  }
  
  .stat-value {
    font-size: 14px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .rule-text h4 {
    font-size: 15px;
  }
  
  .rule-text p {
    font-size: 12px;
  }
  
  .user-id {
    font-size: 14px;
  }
}
</style>
