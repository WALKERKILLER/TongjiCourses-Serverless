<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted, ref } from 'vue'

const { Layout } = DefaultTheme

const showBack = ref(false)

onMounted(() => {
  try {
    showBack.value = window.self === window.top
  } catch {
    showBack.value = true
  }
})

function goMain() {
  window.location.href = 'https://xk.yourtj.de/'
}
</script>

<template>
  <Layout />
  <button
    v-if="showBack"
    type="button"
    class="yourtj-back-to-main"
    aria-label="回到YOURTJ选课社区"
    @click="goMain"
  >
    回主站
  </button>
</template>
