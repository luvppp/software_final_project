<template>
  <div class="page-content">
    <el-card class="jobs-card">
      <h2>岗位推荐</h2>
      <p>内容占位，在此区域展示推荐的岗位内容</p>
    </el-card>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.page-content { padding: $spacing-xl; }
.jobs-card { border-radius: $border-radius-card; }
</style>