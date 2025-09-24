// Vue 3 事件总线使用指南

/**
 * 在Vue 3中使用事件总线
 * 
 * 我们已经在main.js中创建了自定义的EventBus类实例并将其挂载到全局属性上，
 * 同时还提供了常用的全局事件常量。您可以在任何组件中通过以下方式使用它：
 * 
 * 1. 在组件中访问事件总线
 *    - 在选项式API中：this.$eventBus
 *    - 在组合式API中：通过getCurrentInstance().appContext.app.config.globalProperties.$eventBus
 * 
 * 2. 事件总线的主要方法
 *    - emit(eventName, ...args): 触发事件
 *    - on(eventName, callback): 监听事件，返回移除监听器的函数
 *    - once(eventName, callback): 监听事件，但只触发一次
 *    - off(eventName, callback): 移除事件监听器
 * 
 * 3. 访问全局事件常量
 *    - 在选项式API中：this.$GLOBAL_EVENTS
 *    - 在组合式API中：通过getCurrentInstance().appContext.app.config.globalProperties.$GLOBAL_EVENTS
 * 
 * 下面提供了一些实用的工具函数，帮助您更方便地使用事件总线
 */

/**
 * 在组合式API中获取事件总线
 * @param {Object} instance - 通过getCurrentInstance()获取的组件实例
 * @returns {Object} 事件总线实例
 */
export function useEventBus(instance) {
  if (!instance || !instance.appContext || !instance.appContext.app) {
    console.error('无法获取事件总线，请确保传入正确的组件实例');
    return null;
  }
  return instance.appContext.app.config.globalProperties.$eventBus;
}

/**
 * 在组合式API中获取全局事件常量
 * @param {Object} instance - 通过getCurrentInstance()获取的组件实例
 * @returns {Object} 全局事件常量对象
 */
export function useGlobalEvents(instance) {
  if (!instance || !instance.appContext || !instance.appContext.app) {
    console.error('无法获取全局事件常量，请确保传入正确的组件实例');
    return null;
  }
  return instance.appContext.app.config.globalProperties.$GLOBAL_EVENTS;
}

/**
 * 触发全局事件
 * @param {Object} eventBus - 事件总线实例
 * @param {string} eventName - 事件名称
 * @param {...any} args - 传递给事件监听器的参数
 */
export function emitGlobalEvent(eventBus, eventName, ...args) {
  if (!eventBus || !eventName) {
    console.error('触发全局事件失败：缺少事件总线或事件名称');
    return;
  }
  eventBus.emit(eventName, ...args);
}

/**
 * 监听全局事件
 * @param {Object} eventBus - 事件总线实例
 * @param {string} eventName - 事件名称
 * @param {Function} callback - 事件回调函数
 * @returns {Function} 移除监听器的函数
 */
export function onGlobalEvent(eventBus, eventName, callback) {
  if (!eventBus || !eventName || typeof callback !== 'function') {
    console.error('监听全局事件失败：参数不合法');
    return () => {};
  }
  return eventBus.on(eventName, callback);
}

/**
 * 移除全局事件监听器
 * @param {Object} eventBus - 事件总线实例
 * @param {string} eventName - 事件名称
 * @param {Function} callback - 要移除的事件回调函数（可选，不提供则移除该事件的所有监听器）
 */
export function offGlobalEvent(eventBus, eventName, callback) {
  if (!eventBus || !eventName) {
    console.error('移除全局事件监听器失败：缺少事件总线或事件名称');
    return;
  }
  eventBus.off(eventName, callback);
}

/**
 * 监听全局事件（只触发一次）
 * @param {Object} eventBus - 事件总线实例
 * @param {string} eventName - 事件名称
 * @param {Function} callback - 事件回调函数
 */
export function onceGlobalEvent(eventBus, eventName, callback) {
  if (!eventBus || !eventName || typeof callback !== 'function') {
    console.error('监听全局事件（一次）失败：参数不合法');
    return;
  }
  eventBus.once(eventName, callback);
}

// 常用事件名称常量（可以根据项目需求扩展）
export const GLOBAL_EVENTS = {
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  USER_INFO_UPDATE: 'user:info:update',
  CHAT_MESSAGE_SEND: 'chat:message:send',
  CHAT_MESSAGE_RECEIVE: 'chat:message:receive',
  SYSTEM_NOTIFICATION: 'system:notification',
  THEME_CHANGED: 'theme:changed',
};