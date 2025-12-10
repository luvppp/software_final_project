import app from './app.js';
import { connectMongo } from './config/mongoose.js';

const PORT = process.env.PORT || 3000;

// 启动流程：先连接数据库，再启动 HTTP 服务（端口可通过环境变量配置）
const bootstrap = async () => {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
};

bootstrap();

