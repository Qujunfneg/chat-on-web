const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

// 获取应用程序目录
let appDir = path.dirname(process.execPath);

// 配置文件路径 - extraResources配置的文件会放在resources目录下
let confPath;

// 检查是否是打包后的应用
if (app.isPackaged) {
  // 打包后的应用，配置文件在resources目录下
  confPath = path.join(process.resourcesPath, 'conf.json');
} else {
  // 开发模式，配置文件在应用程序根目录
  confPath = path.join(appDir, 'conf.json');
}

// 内部默认配置文件路径（作为备选）
const internalConfPath = path.join(__dirname, 'conf.json');

console.log(`应用程序根目录: ${appDir}`);
console.log(`当前执行路径: ${process.execPath}`);
console.log(`是否打包模式: ${app.isPackaged}`);
console.log(`配置文件路径: ${confPath}`);
console.log(`内部默认配置文件路径: ${internalConfPath}`);

// 读取配置文件，只使用根目录配置文件和内部默认配置
let config, serverUrl;
let configLoadedFrom = '';

try {
  // 优先尝试加载根目录配置文件
  if (fs.existsSync(confPath)) {
    try {
      config = JSON.parse(fs.readFileSync(confPath, 'utf-8'));
      configLoadedFrom = '根目录配置文件';
      console.log(`成功加载根目录配置文件: ${confPath}`);
    } catch (error) {
      console.error(`根目录配置文件格式错误: ${error.message}`);
      // 尝试加载内部默认配置
      config = JSON.parse(fs.readFileSync(internalConfPath, 'utf-8'));
      configLoadedFrom = '内部默认配置 (根目录配置文件格式错误)';
      console.log('使用内部默认配置');
      
      // 尝试修复根目录配置文件
      try {
        fs.writeFileSync(confPath, JSON.stringify(config, null, 2), 'utf-8');
        console.log(`已修复根目录配置文件: ${confPath}`);
      } catch (repairError) {
        console.error('修复根目录配置文件失败:', repairError.message);
      }
    }
  } else {
    // 根目录没有配置文件，使用内部默认配置
    config = JSON.parse(fs.readFileSync(internalConfPath, 'utf-8'));
    configLoadedFrom = '内部默认配置';
    console.log('根目录配置文件不存在，使用内部默认配置');
    
    // 尝试在根目录创建配置文件，方便用户修改
    try {
      fs.writeFileSync(confPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`已在应用程序根目录创建配置文件: ${confPath}`);
      console.log('您可以编辑此文件来自定义服务器地址等配置');
    } catch (createError) {
      console.error('创建根目录配置文件失败:', createError.message);
    }
  }
  
  // 验证配置是否包含必要的字段
  if (!config.serverUrl) {
    console.error('配置文件缺少必要的serverUrl字段');
    // 使用默认值
    config.serverUrl = '';
    console.log('使用默认服务器地址:', config.serverUrl);
  }
  
  serverUrl = config.serverUrl;
  console.log(`配置加载成功 (${configLoadedFrom})，服务器地址: ${serverUrl}`);
} catch (error) {
  console.error('配置文件加载失败，使用硬编码的默认配置:', error.message);
  // 使用硬编码的默认配置作为最后的后备方案
  config = {
    serverUrl: ''
  };
  serverUrl = config.serverUrl;
  console.log('使用硬编码的默认服务器地址:', serverUrl);
}

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
  changeOrigin: true,
  logLevel: 'debug'
}));

// 本地API处理器 - 处理AI配置请求
staticApp.get('/api/ai-config', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const aiConfigPath = path.join(__dirname, '..', 'src', 'config', 'aiConfig.json');
    
    if (fs.existsSync(aiConfigPath)) {
      const rawConfig = fs.readFileSync(aiConfigPath, 'utf-8');
      const config = JSON.parse(rawConfig);
      // 只返回需要暴露的三个字段
      res.json({
        success: true,
        data: {
          enable_enhancement: config.enable_enhancement || false,
          systemPrompt: config.systemPrompt || '',
          temperature: config.customParams?.temperature || 0.8,
          model: config.model || 'hunyuan-turbos-latest',
        }
      });
    } else {
      // 如果配置文件不存在，返回默认值
      res.json({
        success: true,
        data: {
          enable_enhancement: false,
          systemPrompt: '',
          temperature: 0.8
        }
      });
    }
  } catch (error) {
    console.error('读取AI配置失败:', error);
    res.status(500).json({
      success: false,
      message: '读取配置失败'
    });
  }
});

// 本地API处理器 - 处理AI配置更新
staticApp.post('/api/ai-config', (req, res) => {
  try {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const fs = require('fs');
        const path = require('path');
        const data = JSON.parse(body);
        const aiConfigPath = path.join(__dirname, '..', 'src', 'config', 'aiConfig.json');
        
        // 读取现有配置
        let existingConfig = {};
        if (fs.existsSync(aiConfigPath)) {
          const rawConfig = fs.readFileSync(aiConfigPath, 'utf-8');
          existingConfig = JSON.parse(rawConfig);
        }

        // 更新指定的三个字段
        existingConfig.enable_enhancement = data.enable_enhancement || false;
        existingConfig.systemPrompt = data.systemPrompt || '';
        existingConfig.customParams = existingConfig.customParams || {};
        // 更新模型
        existingConfig.model = data.model || 'hunyuan-turbos-latest';
        const temperature = parseFloat(data.temperature);
        existingConfig.customParams.temperature = isNaN(temperature) ? 0.8 : Math.max(0, Math.min(2, temperature));

        // 写回配置文件
        fs.writeFileSync(aiConfigPath, JSON.stringify(existingConfig, null, 2), 'utf-8');

        // 通知所有客户端配置已更新（如果有WebSocket连接）
        console.log('AI配置已更新:', existingConfig);

        res.json({ success: true, message: '配置更新成功' });
      } catch (error) {
        console.error('解析请求数据失败:', error);
        res.status(400).json({ success: false, message: '请求数据格式错误' });
      }
    });
  } catch (error) {
    console.error('更新AI配置失败:', error);
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
});

staticApp.use('/api', createProxyMiddleware({
  target: serverUrl,
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    // 确保请求头正确传递
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
    }
    if (req.headers['content-type']) {
      proxyReq.setHeader('content-type', req.headers['content-type']);
    }
  },
  onError: (err, req, res) => {
    console.error('代理错误:', err);
    res.status(500).json({
      success: false,
      message: '代理服务器错误'
    });
  }
}));

// 客户端模式下，表情包直接从本地提供，不需要转发到远程服务器
if (app.isPackaged) {
  // 在客户端模式下，设置本地表情包目录的静态文件服务
  const emojisPath = path.join(process.resourcesPath, 'emojis');
  console.log(`客户端模式：从本地提供表情包，路径：${emojisPath}`);
  staticApp.use('/emojis', express.static(emojisPath));
  
  // 添加localEmojis接口，用于获取本地表情包列表
  staticApp.get('/api/localEmojis', (req, res) => {
    try {
      // 读取emojis目录下的所有子目录和文件
      const categories = ['bigface', 'funny', 'qq'];
      const emojiList = {};
      
      categories.forEach(category => {
        const categoryPath = path.join(emojisPath, category);
        if (fs.existsSync(categoryPath)) {
          const files = fs.readdirSync(categoryPath).filter(file => 
            file.endsWith('.gif')
          );
          emojiList[category] = files;
        }
      });
      
      res.json({
        success: true,
        data: emojiList
      });
    } catch (error) {
      console.error('获取本地表情包列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取表情包失败'
      });
    }
  });
} else {
  // 开发模式下，继续使用代理转发
  staticApp.use('/emojis', createProxyMiddleware({
    target: serverUrl,
    changeOrigin: true
  }));
}

staticApp.use('/cdn-images', createProxyMiddleware({
  target: serverUrl,
  changeOrigin: true
}));

// 启动静态文件服务器
staticServer.listen(PORT, () => {
  console.log(`静态文件服务启动在 http://localhost:${PORT}`);
}).on('error', (err) => {
  // 检查是否是端口被占用的错误
  if (err.code === 'EADDRINUSE') {
    console.log('端口9999已被占用，应用程序可能已经在运行。');
    // 创建一个对话框提示用户应用已启动
    // 确保app已经准备就绪
    if (app.isReady()) {
      dialog.showMessageBoxSync({
        title: '应用已启动',
        message: 'Chat on Web应用程序已经在运行中。\n请检查任务栏或系统托盘。',
        type: 'info',
        buttons: ['确定']
      });
    } else {
      // 如果app还没准备好，先等待app.ready事件
      app.once('ready', () => {
        dialog.showMessageBoxSync({
          title: '应用已启动',
          message: 'Chat on Web应用程序已经在运行中。\n请检查任务栏或系统托盘。',
          type: 'info',
          buttons: ['确定']
        });
      });
    }
    // 终止当前错误进程
    setTimeout(() => {
      process.exit(0);
    }, 100);
  } else {
    console.error('启动服务器时出错:', err);
  }
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
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'favicon.ico')
  });

  // 加载本地服务
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // 当页面加载完成后，设置coreId到localStorage（如果配置了coreId）
  mainWindow.webContents.once('did-finish-load', () => {
      console.log('设置coreId到localStorage:', config.coreId);
      mainWindow.webContents.executeJavaScript(`
        localStorage.setItem('coreId', '${config.coreId}');
        console.log('coreId已设置到localStorage:', '${config.coreId}');
      `);
  });

  // 移除应用程序菜单栏，这样就不会显示file、edit、view/window等工具条
  // Menu.setApplicationMenu(null);

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