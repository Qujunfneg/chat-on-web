<template>
  <transition name="fade">
    <div v-if="visible" class="overlay" @click.self="close">
      <div class="popup-card" role="dialog" aria-live="polite">
        <button class="close-btn" @click="close" aria-label="关闭每日一语">&times;</button>

        <div v-if="loading" class="loading">正在加载每日灵感...</div>

        <div v-else-if="error" class="error">
          ❌ 获取失败，请检查网络
          <button class="retry" @click="fetchOne">重试</button>
        </div>

        <p v-else class="quote">“{{ oneText }}”</p>
        <div v-if="from" class="from">— {{ from }}</div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: "DailyOneFloating",
  data() {
    // ✅ 提前判断，防止渲染时出现弹窗
    const today = new Date().toISOString().slice(0, 10);
    const closedToday = localStorage.getItem("daily_one_closed_date") === today;

    return {
      visible: !closedToday, // ✅ 一开始就决定要不要显示
      oneText: "",
      from: "",
      loading: false,
      error: false,
    };
  },
  mounted() {
    // 如果没有关闭才请求
    if (this.visible) {
      this.fetchOne();
    }
  },
  methods: {
    today() {
      return new Date().toISOString().slice(0, 10);
    },
    markClosedToday() {
      localStorage.setItem("daily_one_closed_date", this.today());
    },
    close() {
      this.visible = false;
      this.markClosedToday();
    },
    async fetchOne() {
      this.loading = true;
      this.error = false;
      this.oneText = "";
      this.from = "";

      try {
        const weekday = new Date().getDay(); // 周日=0, 周四=4
        let url = "https://api.shadiao.pro/du";
        let isThursday = false;
        if (weekday === 4) {
          // ✅ 周四切换接口（你替换成真实地址）
          url = "https://api.shadiao.pro/kfc";
          isThursday = true;
        }
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        if (isThursday) {
          // 🧠 假设周四接口返回格式是：
          // { text: "一句话", type: "疯狂星期四"}
          this.oneText = data.data.text || "暂无内容";
          this.from = data.type || "";
        } else {
          // 📅 普通日接口解析（原来的格式）
          this.oneText =
            data.text || data?.data?.text || "暂无内容";
          this.from = data.type || data?.data?.type || "";
        }


      } catch (e) {
        console.error("fetchOne error", e);
        this.error = true;
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
/* 背景遮罩 */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(3px);
}

/* 弹窗 */
.popup-card {
  position: relative;
  width: 380px;
  max-width: 90%;
  background: linear-gradient(145deg, #ffffff, #f9f9f9);
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.18);
  text-align: center;
  font-family: "SF Pro Display", "Segoe UI", sans-serif;
  animation: slideUp 0.4s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.icon-area {
  font-size: 36px;
  margin-bottom: 12px;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 14px;
}

.quote {
  font-size: 17px;
  font-style: italic;
  line-height: 1.6;
  color: #444;
  margin: 0 0 10px 0;
}

.from {
  font-size: 14px;
  color: #888;
}

.loading {
  color: #666;
  font-size: 15px;
}

.error {
  color: #c0392b;
  font-size: 14px;
}

.retry {
  margin-top: 8px;
  padding: 4px 10px;
  border: none;
  background: #3498db;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.retry:hover {
  background: #2980b9;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 12px;
  border: none;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
  color: #aaa;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #555;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>