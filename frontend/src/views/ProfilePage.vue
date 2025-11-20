<template>
  <div class="page-content">
    <el-card class="profile-card">
      <h2>个人资料</h2>
      <p>内容占位，在此区域展示个人资料</p>
    </el-card>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.page-content { padding: $spacing-xl; }
.profile-card { border-radius: $border-radius-card; }
</style>