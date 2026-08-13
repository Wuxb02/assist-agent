<script setup>
import { RouterView } from 'vue-router'
import { useUserStore } from './stores/user'

const userStore = useUserStore()
</script>

<template>
  <div class="app-container" :class="userStore.theme">
    <RouterView />
  </div>
</template>
