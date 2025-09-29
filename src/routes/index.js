const express = require("express");
const path = require("path");
const router = express.Router();
const { PUBLIC_DIR } = require('../config/constants');

// 所有其他路由都指向index.html（用于SPA路由）
router.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

module.exports = router;