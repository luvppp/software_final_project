import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/base.scss'
import App from './App.vue'
import router from './router'
import { useUserStore } from '@/stores/userStore'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

const userStore = useUserStore(pinia)
userStore.init()

app.mount('#app')
