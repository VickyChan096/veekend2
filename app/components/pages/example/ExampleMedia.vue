<script lang="ts" setup>
import { ref } from 'vue'
import ExampleSection from '@/components/pages/example/ExampleSection.vue'
import ExampleRow from '@/components/pages/example/ExampleRow.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import BaseLightbox from '@/components/common/lightbox/BaseLightbox.vue'
import BaseMap from '@/components/common/map/BaseMap.vue'

const open = defineModel<boolean>({ default: false })

const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

// 用純色 SVG data URI 當佔位圖，避免 example page 依賴實際圖檔
const placeholder = (label: string, color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="${color}"/><text x="50%" y="50%" font-family="sans-serif" font-size="48" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  )}`

const slides = [
  { src: placeholder('WEEK 01', '%23ffe60f'), alt: '第一週' },
  { src: placeholder('WEEK 02', '%23eeeeee'), alt: '第二週' },
  { src: placeholder('WEEK 03', '%23d4d4d4'), alt: '第三週' },
]

const openLightbox = (index: number) => {
  lightboxIndex.value = index
  lightboxOpen.value = true
}
</script>

<template>
  <ExampleSection
    v-model="open"
    title="媒體"
    note="BaseLightbox 取代 Fancybox、BaseMap 是 MapLibre GL（必須包 ClientOnly）"
  >
    <ExampleRow label="BaseLightbox">
      <BaseButton
        v-for="(item, itemIndex) in slides"
        :key="item.alt"
        :text="item.alt"
        styling="secondary"
        @click="openLightbox(itemIndex)"
      />
      <BaseLightbox v-model="lightboxOpen" v-model:index="lightboxIndex" :images="slides" />
    </ExampleRow>

    <ExampleRow label="BaseMap">
      <div class="media-demo">
        <ClientOnly>
          <BaseMap :center="[121.5222, 25.0719]" />
          <template #fallback>
            <div class="map-fallback">地圖載入中…</div>
          </template>
        </ClientOnly>
      </div>
    </ExampleRow>
  </ExampleSection>
</template>

<style lang="scss" scoped>
.media-demo {
  width: 100%;
  max-width: 640px;
}
.map-fallback {
  @include body2-regular;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 360px;
  color: var(--subtitle);
  background-color: var(--container);
  border-radius: var(--border-radius-m);
}
</style>
