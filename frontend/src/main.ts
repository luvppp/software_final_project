import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/base.scss'
import App from './App.vue'
import router from './router'
import { useUserStore } from '@/stores/userStore'

// 创建应用实例并挂载全局插件（Pinia、Router、Element Plus）
const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

const userStore = useUserStore(pinia)
// 初始化用户状态（从本地缓存恢复并拉取用户信息）
userStore.init()

app.mount('#app')
