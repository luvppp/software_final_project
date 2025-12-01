<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">职业智能匹配系统</div>
      <div class="user-area">
        <el-dropdown>
          <span class="el-dropdown-link">
            {{ username }}
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="gotoProfile">个人资料</el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="main">
      <aside class="sidebar">
        <router-link class="menu-item" :class="{ active: isActive('/') }" to="/">
          <el-icon><Monitor /></el-icon>
          <span>首页</span>
        </router-link>
        <router-link class="menu-item" :class="{ active: isActive('/jobs') }" to="/jobs">
          <el-icon><Briefcase /></el-icon>
          <span>岗位推荐</span>
        </router-link>
        <router-link class="menu-item" :class="{ active: isActive('/profile') }" to="/profile">
          <el-icon><User /></el-icon>
          <span>个人资料</span>
        </router-link>
        <router-link class="menu-item" :class="{ active: isActive('/learning') }" to="/learning">
          <el-icon><Reading /></el-icon>
          <span>学习计划</span>
        </router-link>
      </aside>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { Monitor, Briefcase, User, Reading } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 显示当前登录用户名（无信息时显示占位）
const username = computed(() => userStore.userInfo?.username || '用户')
// 菜单高亮判断
const isActive = (path: string) => route.path === path

// 退出登录：清除状态并跳转登录页
const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

// 跳转个人资料
const gotoProfile = () => router.push('/profile')
</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.app-shell {
  height: 100vh;
  background: $color-background;
}

.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-xl;
  background: #fff;
  border-bottom: 1px solid $color-border;
}

.brand {
  font-weight: 600;
  color: $color-title;
}

.user-area {
  color: $color-body;
  margin-right:20px;
}

.main {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: calc(100vh - 56px);
}

.sidebar {
  background: #fff;
  border-right: 1px solid $color-border;
  padding: $spacing-lg $spacing-md;
  height: 100%;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius;
  color: $color-body;
  text-decoration: none;
}

.menu-item:hover { background: #f2f5ff; }
.menu-item.active { background: #eaf2ff; color: $color-primary; font-weight: 600; }

.content { padding: $spacing-xl; }
</style>
