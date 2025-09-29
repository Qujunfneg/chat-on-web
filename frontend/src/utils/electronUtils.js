// 检测是否在Electron环境中
const isElectron = () => {
  // renderer process
  if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
    return true;
  }
  // main process
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
    return true;
  }
  // detect the user agent when the `nodeIntegration` option is set to false
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
    return true;
  }
  return false;
};

// 向主进程发送消息
const notifyNewMessage = () => {
  if (isElectron() && typeof window !== 'undefined' && window.require) {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('new-message');
    } catch (error) {
      console.error('Failed to notify Electron of new message:', error);
    }
  }
};

export {
  isElectron,
  notifyNewMessage
};