// 应用启动入口：
// - 加载本地环境变量（支持当前目录与上级目录的 .env）
// - 校验并填充 AI 相关配置（DeepSeek）
// - 连接 MongoDB，再启动 HTTP 服务
import app from './app.js';
import { connectMongo } from './config/mongoose.js';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 3000;

// 从 .env 文件加载环境变量（仅在进程未设置时覆盖）
const loadLocalEnv = () => {
  try {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../.env'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        for (const raw of content.split(/\r?\n/)) {
          const line = raw.trim();
          if (!line || line.startsWith('#')) continue;
          const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
          if (!m) continue;
          const key = m[1];
          let val = m[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!(key in process.env)) {
            process.env[key] = val;
          }
        }
        break;
      }
    }
  } catch {}
};

// 校验 AI 服务所需的环境变量；为可选项设置默认值
const validateAIEnv = () => {
  const required = ['DEEPSEEK_API_KEY'];
  const defaults = [
    { key: 'DEEPSEEK_BASE_URL', value: 'https://api.deepseek.com' },
    { key: 'DEEPSEEK_MODEL', value: 'deepseek-chat' },
  ];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
  for (const d of defaults) {
    if (!process.env[d.key] || String(process.env[d.key]).trim() === '') {
      process.env[d.key] = d.value;
    }
  }
  if (missing.length) {
    // 以告警模式启动：AI 接口会返回“未配置”，但服务不崩溃
    console.warn(`⚠️ 缺少必需的 AI 配置环境变量: ${missing.join(', ')}`);
    console.warn('请在 .env 或系统环境中设置 DEEPSEEK_API_KEY（当前将以禁用 AI 模式启动）');
    process.env.AI_ENABLED = 'false';
  } else {
    console.log('✅ AI 配置已就绪');
    process.env.AI_ENABLED = 'true';
  }
};

// 启动流程：先连接数据库，再启动 HTTP 服务（端口可通过环境变量配置）
const bootstrap = async () => {
  loadLocalEnv();
  validateAIEnv();
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
};

bootstrap();
