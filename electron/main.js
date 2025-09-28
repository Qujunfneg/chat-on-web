const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

// 获取应用程序目录（对于便携版，这是exe文件所在目录）
let appDir = process.resourcesPath;
if (process.platform === 'win32') {
  // 在Windows上，对于便携版应用，exe文件和resources文件夹在同一目录
  appDir = path.dirname(process.execPath);
}

// 外部配置文件路径（在应用程序目录下）
const externalConfPath = path.join(appDir, 'conf.json');
// 内部配置文件路径（作为默认配置）
const internalConfPath = path.join(__dirname, 'conf.json');

// 读取配置文件，优先使用外部配置
let config, serverUrl;
if (fs.existsSync(externalConfPath)) {
  // 使用外部配置文件
  config = JSON.parse(fs.readFileSync(externalConfPath, 'utf-8'));
} else {
  // 使用内部配置文件作为默认配置
  config = JSON.parse(fs.readFileSync(internalConfPath, 'utf-8'));
  // 如果外部配置文件不存在，创建一个默认的
  try {
    fs.writeFileSync(externalConfPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`已在应用程序目录下创建默认配置文件: ${externalConfPath}`);
  } catch (error) {
    console.error('创建外部配置文件失败:', error.message);
  }
}
serverUrl = config.serverUrl;

// 创建Express应用用于静态文件服务和代理
const staticApp = express();
const staticServer = http.createServer(staticApp);
const PORT = 9999;

// 设置静态文件目录
staticApp.use(express.static(path.join(__dirname, '../public')));

// 设置代理转发
staticApp.use('/socket.io', createProxyMiddleware({
  target: serverUrl,
  ws: true,
  changeOrigin: true
}));

staticApp.use('/api', createProxyMiddleware({
  target: serverUrl,
  changeOrigin: true
}));

staticApp.use('/emojis', createProxyMiddleware({
  target: serverUrl,
  changeOrigin: true
}));

staticApp.use('/cdn-images', createProxyMiddleware({
  target: serverUrl,
  changeOrigin: true
}));

// 启动静态文件服务器
staticServer.listen(PORT, () => {
  console.log(`静态文件服务启动在 http://localhost:${PORT}`);
});

// 全局变量
let mainWindow;
let tray = null;
let iconFlashing = false;
let originalIcon = null;
let blankIcon = null;
let flashInterval = null;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'favicon.ico')
  });

  // 加载本地服务
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // 修改关闭按钮行为，使其最小化到托盘而不是关闭
  mainWindow.on('close', function(e) {
    e.preventDefault(); // 阻止窗口真正关闭
    mainWindow.hide(); // 隐藏窗口到托盘
  });

  // 当窗口真正关闭时触发
  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  // 窗口获得焦点时停止图标闪烁
  mainWindow.on('focus', () => {
    stopIconFlashing();
  });

  // 创建系统托盘
  createTray();
}

// 创建系统托盘
function createTray() {
  // 创建原始图标和空白图标
  originalIcon = nativeImage.createFromPath(path.join(__dirname, 'favicon.ico'));
  // 创建一个16x16的空白图标（避免使用setSize方法）
  blankIcon = nativeImage.createFromBuffer(Buffer.from([0, 0, 0, 0]), { width: 16, height: 16 });

  tray = new Tray(originalIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
        stopIconFlashing();
      }
    },
    {      
      label: '退出',
      click: () => {
        // 确保所有资源都被清理
        if (mainWindow) {
          mainWindow.removeAllListeners();
          mainWindow.destroy();
        }
        // 确保服务器关闭
        if (staticServer) {
          staticServer.close();
        }
        // 确保定时器被清除
        if (flashInterval) {
          clearInterval(flashInterval);
        }
        // 强制退出应用
        app.exit(0);
      }
    }
  ]);

  tray.setToolTip('Chat on Web');
  tray.setContextMenu(contextMenu);

  // 点击托盘显示/隐藏窗口
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      stopIconFlashing();
    }
  });
}

// 开始图标闪烁
function startIconFlashing() {
  if (iconFlashing || !tray || !mainWindow) return;

  iconFlashing = true;
  let isOriginal = false;

  // Windows系统下启用任务栏图标闪烁
  if (process.platform === 'win32') {
    mainWindow.flashFrame(true);
  }

  // 继续托盘图标闪烁
  flashInterval = setInterval(() => {
    if (isOriginal) {
      tray.setImage(originalIcon);
    } else {
      tray.setImage(blankIcon);
    }
    isOriginal = !isOriginal;
  }, 500);
}

// 停止图标闪烁
function stopIconFlashing() {
  if (!iconFlashing || !tray) return;

  iconFlashing = false;
  // 停止任务栏图标闪烁
  if (mainWindow && process.platform === 'win32') {
    mainWindow.flashFrame(false);
  }
  // 停止托盘图标闪烁
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }
  tray.setImage(originalIcon);
}

// 当应用准备就绪时创建窗口
app.on('ready', createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 在macOS上，点击Dock图标时重新创建窗口
app.on('activate', function() {
  if (mainWindow === null) {
    createWindow();
  }
});

// 监听来自渲染进程的消息
ipcMain.on('new-message', () => {
  if (!mainWindow.isFocused()) {
    startIconFlashing();
  }
});

// 应用退出时关闭服务器
app.on('before-quit', () => {
  console.log('应用正在退出，清理资源...');
  
  // 确保服务器关闭
  if (staticServer) {
    staticServer.close((err) => {
      if (err) {
        console.error('关闭服务器时出错:', err);
      } else {
        console.log('服务器已关闭');
      }
    });
  }
  
  // 确保定时器被清除
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
    console.log('定时器已清除');
  }
  
  // 确保主窗口被销毁
  if (mainWindow) {
    mainWindow.removeAllListeners();
    mainWindow.destroy();
    mainWindow = null;
    console.log('主窗口已销毁');
  }
  
  // 确保托盘被销毁
  if (tray) {
    tray.destroy();
    tray = null;
    console.log('托盘已销毁');
  }
});