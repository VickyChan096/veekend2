<script lang="ts" setup>
import HeaderBar from '@/components/layouts/HeaderBar.vue'
import FooterBar from '@/components/layouts/FooterBar.vue'
import ScrollToTopButton from '@/components/layouts/ScrollToTopButton.vue'
</script>

<template>
  <div class="site">
    <!-- 鍵盤使用者不用 tab 過整個選單才能到內容 -->
    <a href="#main" class="site__skip">跳到主要內容</a>

    <HeaderBar />
    <main id="main" class="site__main" tabindex="-1">
      <slot />
    </main>
    <FooterBar />
    <ScrollToTopButton />
  </div>
</template>

<style lang="scss" scoped>
.site__main {
  // 補上 fixed header 的高度
  padding-top: var(--header-height);
  background-color: var(--surface);

  &:focus {
    outline: none;
  }
}

// 平常藏起來，鍵盤 tab 到才出現
.site__skip {
  @include body2-medium;
  position: fixed;
  top: -100px;
  left: 8px;
  z-index: calc(var(--z-header) + 1);
  padding: 10px 16px;
  color: var(--secondary);
  background-color: var(--primary);
  border-radius: 0 0 var(--border-radius-s) var(--border-radius-s);
  transition: top 0.2s ease-in-out;

  &:focus {
    top: 0;
    outline: var(--focus-visible);
  }
}
</style>
