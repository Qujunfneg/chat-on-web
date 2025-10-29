const fs = require('fs');
const path = require('path');

// 读取配置文件（同步读取，启动时加载一次）
let config = { stars: [], gradients: [] };
try {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'stars.json'), 'utf-8');
  config = JSON.parse(raw);
} catch (e) {
  console.error('[starReplyService] 读取 stars.json 失败：', e);
}

// 读取 AI 配置（可选）
let aiConfig = { enabled: false };
try {
  const rawAi = fs.readFileSync(path.join(__dirname, '..', 'config', 'aiConfig.json'), 'utf-8');
  aiConfig = JSON.parse(rawAi);
} catch (e) {
  // 不强制要求存在配置文件
  // console.warn('[starReplyService] 无 aiConfig.json，跳过 AI 集成（如果需要，请创建 src/config/aiConfig.json）');
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLocalStarReply(triggerText) {
  const topic = (triggerText || '').trim();
  const templates = [
    t => `关于「${t}」，我有几点想说：`,
    t => `作为艺人，从我的视角看「${t}」更多是情感和态度。`,
    t => `如果你喜欢「${t}」，我推荐你可以试试相关的幕后花絮或官方直播。`,
    t => `这件事真的很有话题性，尤其是大家对「${t}」的期待感越来越强。`,
    t => `老实说，我也经常被问到关于「${t}」的问题，感觉既兴奋又紧张。`,
    t => `如果让我亲自参与，我会把更多温暖和互动放进去，让大家感到被看见。`,
    t => `现场的氛围会影响一切，关于「${t}」的讨论会带来许多美好的记忆。`,
    t => `我会在微博/IG上分享一些小片段，大家可以去看看我的动态。`,
    t => `谢谢你提到「${t}」，真想知道你最关心哪一点呢？`,
    t => `哈哈，幕后其实有很多有趣的小故事，等有机会我慢慢讲给你听。`,
    t => `✨ 马上上线一段关于「${t}」的小彩蛋，别走开～`
  ];

  const tails = [ '❤️','🌟','🎤','💫','🔥','👏','😄','😉' ];

  const pieces = [];
  const count = 4 + Math.floor(Math.random() * 4); // 4-7句
  for (let i = 0; i < count; i++) {
    const pick = templates[Math.floor(Math.random() * templates.length)];
    const sentence = (typeof pick === 'function') ? pick(topic) : pick;
    pieces.push(sentence);
  }

  const interactions = [
    `你觉得「${topic}」最吸引人的地方是什么？我想听你的看法。`,
    `如果能现场见到大家，我会准备一些惊喜，大家会喜欢吗？`,
    `有没有哪个瞬间你特别期待被还原？告诉我名字，我也好做笔记～`,
    `我个人最中意的部分是细节设计，大家觉得呢？`
  ];
  if (topic) {
    pieces.splice(1, 0, pickRandom(interactions));
  }

  let result = pieces.join(' ');
  result += ' ' + pickRandom(tails);
  result += ' — 来自热心的顶流小助手';
  return result;
}

function pickStar() {
  const star = pickRandom(config.stars) || ('star_' + Math.floor(Math.random() * 1000));
  const gradient = pickRandom(config.gradients) || ['#FFD700','#FF6B6B'];
  return { name: star, gradient };
}

// 调用 OpenAI 兼容或自定义 endpoint
async function aiRequestJson(endpoint, apiKey, body, extraHeaders = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(endpoint);
      const isHttps = url.protocol === 'https:';
      const data = JSON.stringify(body);
      const options = {
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname + (url.search || ''),
        port: url.port || (isHttps ? 443 : 80),
        headers: Object.assign({
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }, extraHeaders)
      };

      if (apiKey) {
        options.headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const http = require(url.protocol === 'https:' ? 'https' : 'http');
      const req = http.request(options, (res) => {
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => buf += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(buf);
            resolve(parsed);
          } catch (parseErr) {
            // 返回非 JSON 的情况，直接返回原始文本
            resolve({ raw: buf });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(timeout, () => {
        req.destroy(new Error('AI request timeout'));
      });
      req.write(data);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function callAiForReply(topic) {
  if (!aiConfig || !aiConfig.enabled) return null;

  const endpoint = aiConfig.endpoint;
  const provider = (aiConfig.provider || 'openai-compatible').toLowerCase();
  const apiKey = process.env[aiConfig.apiKeyEnv] || aiConfig.apiKey || '';

  // 构建 prompt / body
  const systemPrompt = aiConfig.systemPrompt || '';
  const userTemplate = aiConfig.userPromptTemplate || '{{topic}}';
  const userPrompt = userTemplate.replace('{{topic}}', topic || '');

  let body = {};

  // 针对腾讯混元（hunyuan）使用的请求体结构（兼容其 Chat Completions 风格）
  if (provider.includes('hunyuan') || provider.includes('hunyuan-tencent') || provider.includes('hun')) {
    body = Object.assign({
      model: aiConfig.model || 'hunyuan-turbos-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }, aiConfig.customParams || {});

    // 混元专有参数（比如 enable_enhancement）如果在配置中设置则传递
    if (typeof aiConfig.enable_enhancement !== 'undefined') {
      body.enable_enhancement = aiConfig.enable_enhancement;
    }

  } else {
    // 默认使用 OpenAI Chat Completions 格式
    body = Object.assign({
      model: aiConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: aiConfig.temperature || 0.8,
      max_tokens: aiConfig.max_tokens || 600
    }, aiConfig.customParams || {});
  }

  try {
  // 混元的部分部署可能要求不同的 header，但一般遵循 Bearer token 认证
  const extraHeaders = aiConfig.extraHeaders || {};
  const res = await aiRequestJson(endpoint, apiKey, body, extraHeaders, aiConfig.timeout || 15000);

    // 尝试解析常见字段
    if (res && res.choices && Array.isArray(res.choices) && res.choices[0]) {
      // Chat completions
      const msg = res.choices[0].message;
      if (msg && msg.content) return msg.content;
      if (res.choices[0].text) return res.choices[0].text;
    }
    if (res && res.raw && typeof res.raw === 'string') return res.raw;
    // 兜底：把整个对象转为字符串
    return JSON.stringify(res);
  } catch (err) {
    console.error('[starReplyService] AI 调用失败：', err);
    return null;
  }
}

// 公共入口：优先尝试 AI 生成，否则回落到本地生成
async function generateStarReply(triggerText) {
  const aiResult = await callAiForReply(triggerText);
  if (aiResult && String(aiResult).trim().length > 0) return String(aiResult).trim();
  return generateLocalStarReply(triggerText);
}

module.exports = {
  generateStarReply,
  generateLocalStarReply,
  pickStar,
  _config: config,
  _aiConfig: aiConfig
};
