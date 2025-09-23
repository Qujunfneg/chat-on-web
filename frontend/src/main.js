import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
// 导入事件常量
import { GLOBAL_EVENTS } from './utils/eventBus.js'

// 创建Vue应用实例
const app = createApp(App)

// 创建Vue 3事件总线 - 使用更适合Vue 3的实现方式
class EventBus {
  constructor() {
    this.events = {}
  }
  
  // 触发事件
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        callback.apply(null, args)
      })
    }
  }
  
  // 监听事件
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
    
    // 返回移除监听器的函数
    return () => this.off(event, callback)
  }
  
  // 监听事件（只触发一次）
  once(event, callback) {
    const onceCallback = (...args) => {
      callback.apply(null, args)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }
  
  // 移除事件监听器
  off(event, callback) {
    if (!this.events[event]) return
    
    if (callback) {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    } else {
      // 如果没有提供回调函数，则移除该事件的所有监听器
      delete this.events[event]
    }
  }
}

// 创建事件总线实例
const eventBus = new EventBus()

// 将事件总线和事件常量挂载到全局属性，以便所有组件都能访问
app.config.globalProperties.$eventBus = eventBus
app.config.globalProperties.$GLOBAL_EVENTS = GLOBAL_EVENTS
app.use(ElementPlus)

// 全局注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')