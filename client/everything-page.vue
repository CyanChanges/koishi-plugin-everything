<script lang="ts" setup>
import { computed } from 'vue'
import { store, useContext, send } from '@koishijs/client'
// const ctx = useContext()
const everything = computed(() => store.everything)
async function handle() {
  await send("everything/collect", true)
}
</script>

<template>
  <k-layout>
    <p>正在制作, 即将到来</p>
    <k-button :onclick="handle()">刷新 Everything Registry</k-button>
    <li v-for="thing in store.everything">
      {{ thing.name }}
    </li>
  </k-layout>
</template>
