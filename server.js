const { server } = require('./src/app');

// 启动服务器
const PORT = process.env.PORT || 3001;
const BIND_ADDRESS = process.env.BIND_ADDRESS || "0.0.0.0";

server.listen(PORT, BIND_ADDRESS, () => {
  console.log(`服务器运行在 http://localhost:${PORT} 或 http://本机IP:${PORT}`);
  console.log(`同一局域网内的用户可以通过您的IP地址访问聊天室`);
});