<template>
  <div class="page-content">
    <el-card class="welcome-card">
      <h2>首页内容占位</h2>
      <p>登录成功，欢迎使用。</p>
    </el-card>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.page-content { padding: $spacing-xl; }
.welcome-card { border-radius: $border-radius-card; }
</style>