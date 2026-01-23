<template>
  <div class="h-full rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
    <div class="h-full p-4 flex flex-col">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-2xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-500 text-xs font-bold">
            <img v-if="reviewerAvatar" :src="reviewerAvatar" alt="" class="w-full h-full object-cover" />
            <span v-else>评</span>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-extrabold text-slate-800 truncate">{{ reviewerName }}</div>
            <div class="text-[11px] text-slate-500 truncate">{{ semester }}</div>
          </div>
        </div>
        <div class="shrink-0 text-[11px] text-slate-600">
          <span v-if="typeof review?.rating === 'number'">评分 {{ review.rating }}</span>
        </div>
      </div>

      <div class="mt-3 flex-1 overflow-y-auto pr-1">
        <div class="text-[13px] leading-snug text-slate-700 whitespace-pre-wrap break-words">
          {{ comment }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ReviewFanCard',
  props: {
    review: { type: Object, required: true },
  },
  computed: {
    reviewerName(): string {
      // @ts-ignore
      return (this.review?.reviewer_name as string) || '匿名用户'
    },
    reviewerAvatar(): string {
      // @ts-ignore
      return (this.review?.reviewer_avatar as string) || ''
    },
    semester(): string {
      // @ts-ignore
      return (this.review?.semester as string) || ''
    },
    comment(): string {
      // @ts-ignore
      return (this.review?.comment as string) || ''
    },
  }
}
</script>

