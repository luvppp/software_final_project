import app from './app.js';
import { connectMongo } from './config/mongoose.js';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 3000;

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
    console.error(`❌ 缺少必需的 AI 配置环境变量: ${missing.join(', ')}`);
    console.error('请在 .env 或系统环境中设置 DEEPSEEK_API_KEY');
    process.exit(1);
  } else {
    console.log('✅ AI 配置已就绪');
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

