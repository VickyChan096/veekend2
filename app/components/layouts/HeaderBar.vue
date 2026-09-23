<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'nuxt/app'
import { useAssetUrl } from '@/composables/common/useAssetUrl'
import { useAlert } from '@/composables/common/useAlert'
import { useThemeMode } from '@/composables/common/useThemeMode'
import BaseIconButton from '@/components/common/button/BaseIconButton.vue'

const { assetUrl } = useAssetUrl()
const router = useRouter()
const route = useRoute()
const { openAlert } = useAlert()
const { isDark, toggle: toggleTheme } = useThemeMode()

const navOpen = ref(false)
const openMenu = ref<string | null>(null)
const searchText = ref('')
const headerElement = ref<HTMLElement | null>(null)

const articleAreas = [
  { key: 'taipei', title: '台北市', query: '台北市' },
  { key: 'newTaipei', title: '新北市', query: '新北市' },
  { key: 'other', title: '其他', query: '其他' },
] as const

const closeNavigation = () => {
  navOpen.value = false
  openMenu.value = null
}

const toggleNavigation = () => {
  navOpen.value = !navOpen.value

  if (!navOpen.value) {
    openMenu.value = null
  }
}

const toggleMenu = (key: string) => {
  openMenu.value = openMenu.value === key ? null : key
}

const search = () => {
  if (!searchText.value.trim()) {
    openAlert({ type: 'error', title: '哇糟糕了', text: '請輸入欲搜尋的關鍵字喔！' })
    return
  }
  router.push({ path: '/result', query: { search: searchText.value.trim() } })
  closeNavigation()
}

const handlePointerDown = (event: PointerEvent) => {
  const target = event.target

  if (target instanceof Node && !headerElement.value?.contains(target)) {
    closeNavigation()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeNavigation()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown)
  document.removeEventListener('keydown', handleKeydown)
})

// 換頁時把選單收起來
watch(
  () => route.fullPath,
  closeNavigation
)

</script>

<template>
  <header ref="headerElement" class="header">
    <div class="header__inner">
      <div class="header__bar">
        <NuxtLink to="/" class="header__logo" aria-label="Veekend 首頁">
          <!--
            logo 刻意不用 h1：一頁只該有一個 h1，而且該是頁面主標題而非站名。
            legacy 用 h1 是舊時代的 SEO 習慣，現在反而讓頁面結構變得難讀。
          -->
          <span
            class="header__mark"
            :style="{ backgroundImage: `url(${assetUrl('images/logo.svg')})` }"
          >Veekend</span>
          <img :src="assetUrl('images/logo-veekend.svg')" alt="Veekend" >
        </NuxtLink>

        <button
          type="button"
          class="header__hamburger"
          :class="{ 'is-open': navOpen }"
          :aria-expanded="navOpen"
          :aria-label="navOpen ? '關閉選單' : '開啟選單'"
          aria-controls="site-nav"
          @click="toggleNavigation"
        >
          <span /><span /><span />
        </button>
      </div>

      <nav id="site-nav" class="header__nav" :class="{ 'is-open': navOpen }" aria-label="主選單">
        <div class="header__search">
          <input
            v-model="searchText"
            type="text"
            placeholder="搜尋"
            aria-label="搜尋文章"
            @keyup.enter="search"
          >
          <button type="button" aria-label="送出搜尋" @click="search">
            <Icon name="mdi:magnify" />
          </button>
        </div>

        <ul class="header__menu">
          <li class="menu">
            <button
              type="button"
              class="menu__title"
              :class="{ 'is-active': openMenu === 'articles' }"
              :aria-expanded="openMenu === 'articles'"
              @click="toggleMenu('articles')"
            >
              遊記
              <Icon name="mdi:chevron-down" class="menu__icon" aria-hidden="true" />
            </button>
            <div v-show="openMenu === 'articles'" class="menu__district">
              <ul>
                <li v-for="area in articleAreas" :key="area.key">
                  <NuxtLink :to="{ path: '/result', query: { all: area.query } }">
                    {{ area.title }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </li>
          <li class="menu">
            <NuxtLink to="/about" class="menu__title">
              關於
              <Icon name="mdi:information-outline" class="menu__icon" aria-hidden="true" />
            </NuxtLink>
          </li>
          <li class="menu">
            <NuxtLink to="/login" class="menu__title">
              登入
              <Icon name="mdi:login" class="menu__icon" aria-hidden="true" />
            </NuxtLink>
          </li>
          <li class="menu">
            <BaseIconButton
              :icon="isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'"
              :label="isDark ? '切換為淺色模式' : '切換為深色模式'"
              size="small"
              class="menu__theme"
              @click="toggleTheme"
            />
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  position: fixed;
  top: 0;
  z-index: var(--z-header);
  width: 100%;
  background-color: var(--primary);
  box-shadow: 0 4px 16px #00000018;

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    min-height: var(--header-height);
    margin: 0 auto;
    padding: 0 30px;
    gap: 32px;

    @media only screen and (min-width: 993px) {
      padding: 0 24px;
    }

    @include pad {
      flex-wrap: wrap;
      padding: 0 15px;
    }
  }

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0 0 auto;

    @include pad {
      width: 100%;
    }
  }

  &__logo {
    display: flex;
    align-items: center;
    color: var(--secondary);

    .header__mark {
      display: block;
      width: 40px;
      height: 40px;
      overflow: hidden;
      white-space: nowrap;
      text-indent: 101%;
      background-size: cover;
    }

    img {
      display: block;
      flex: 0 0 auto;
      width: 116px;
      height: auto;
    }
  }

  // legacy 的漢堡鍵：開啟後上下兩條交叉成 X
  &__hamburger {
    display: none;
    flex-direction: column;
    justify-content: center;
    width: 42px;
    height: 42px;
    padding: 0 10px;
    cursor: pointer;
    background-color: var(--secondary);
    border: 1px solid var(--secondary);
    border-radius: var(--border-radius-m);

    @include pad {
      display: flex;
    }

    span {
      display: block;
      height: 2px;
      background-color: var(--primary);
      border-radius: 999px;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    span + span {
      margin-top: 6px;
    }

    &.is-open span:nth-child(1) {
      transform: translateX(-4px);
      opacity: 0;
    }
    &.is-open span:nth-child(2) {
      transform: translateY(4px) rotate(-45deg);
    }
    &.is-open span:nth-child(3) {
      margin-top: -2px;
      transform: translateY(-4px) rotate(45deg);
    }
  }

  &__nav {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 1 1 auto;
    gap: 24px;
    min-width: 0;

    @media only screen and (min-width: 993px) {
      justify-content: space-between;
      gap: 28px;
    }

    @include pad {
      position: fixed;
      top: var(--header-height);
      left: 0;
      right: 0;
      display: block;
      width: 100%;
      height: calc(100dvh - var(--header-height));
      max-height: none;
      padding: 20px 16px 24px;
      overflow-y: auto;
      pointer-events: none;
      visibility: hidden;
      background-color: var(--surface);
      border-top: 1px solid #00000018;
      box-shadow: 0 14px 28px #00000018;
      opacity: 0;
      transform: translateY(-8px);
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
    }
  }

  &__nav.is-open {
    @include pad {
      pointer-events: auto;
      visibility: visible;
      opacity: 1;
      transform: translateY(0);
    }
  }

  &__search {
    display: flex;
    flex: 1 1 280px;
    min-width: 0;
    max-width: 320px;
    height: 42px;
    overflow: hidden;
    background-color: var(--surface);
    border: 2px solid var(--secondary);
    border-radius: var(--border-radius-xl);

    @media only screen and (min-width: 993px) {
      order: 2;
      flex: 0 1 220px;
      max-width: 220px;
      height: 38px;
      background-color: #ffffff;
      border: 0;
    }

    input {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      height: 100%;
      padding: 0 16px;
      // 小於 16px 會讓 iOS 聚焦時自動放大畫面
      font-size: 1rem;
      color: var(--font);
      background-color: var(--surface);
      border: 0;
      outline: 0;

      &::placeholder {
        color: var(--placeholder);
      }

      @include pad {
        padding: 0 14px;
      }
    }

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 42px;
      width: 42px;
      height: 100%;
      cursor: pointer;
      color: var(--secondary);
      background-color: transparent;
      border: 0;
      border-left: 1px solid var(--divider);
      transition: background-color 0.2s ease, color 0.2s ease;

      &:hover {
        color: var(--primary);
        background-color: var(--secondary);
      }

      &:focus-visible {
        outline: var(--focus-visible);
        outline-offset: -4px;
      }
    }

    @include pad {
      width: 100%;
      max-width: none;
    }
  }

  &__menu {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    margin: 0;

    @media only screen and (min-width: 993px) {
      order: 1;
      flex: 1 1 auto;
      justify-content: center;
    }

    @include pad {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
      margin-top: 12px;
    }
  }
}

.menu {
  position: relative;
  display: flex;
  align-items: center;
  margin: 0;

  @include pad {
    flex-wrap: wrap;
    width: 100%;
    margin: 0;
  }

  &__title {
    @include body1-regular;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 8px 12px;
    cursor: pointer;
    color: var(--secondary);
    background: none;
    border: 0;
    border-radius: var(--border-radius-s);
    transition: background-color 0.2s ease, color 0.2s ease;

    @media only screen and (min-width: 993px) {
      min-height: 38px;
      padding: 7px 13px;
      font-size: 0.9375rem;
      font-weight: 500;
      letter-spacing: 0.04em;
    }

    @include hover {
      &:hover {
        color: var(--primary);
        background-color: var(--secondary);
      }
    }

    &.is-active {
      color: var(--primary);
      background-color: var(--secondary);
    }

    &:focus-visible {
      outline: var(--focus-visible);
      outline-offset: 2px;
    }

    @include pad {
      justify-content: space-between;
      width: 100%;
      color: var(--font);
      background-color: var(--container);
      border: 1px solid var(--divider);

      &.is-active {
        background-color: var(--primary);
        color: #000000;
      }
    }
  }

  &__icon {
    margin-left: 4px;
    font-size: 0.75rem;
    color: var(--primary-darken);
    transition: var(--transition-fast);

    @include pad {
      display: none;
    }
  }

  &:hover &__icon {
    color: var(--secondary);
  }

  &__district {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 2;

    @include pad {
      position: relative;
      top: 0;
      right: 0;
      width: 100%;
    }
  }

  &__district > ul {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    width: min(360px, calc(100vw - 32px));
    padding: 12px;
    background-color: var(--surface);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius-m);
    box-shadow: 0 12px 24px #00000016;

    @include pad {
      width: 100%;
      max-height: 300px;
      padding: 8px;
      overflow-y: auto;
    }
  }

  &__district > ul > li {
    @include body2-regular;
    width: 100%;
    padding: 8px 12px;
    color: var(--subtitle);
    border: 1px solid transparent;
    border-radius: var(--border-radius-s);
    transition: var(--transition-fast);

    @include pad {
      padding: 10px 12px;
      margin: 0;
      border-color: var(--divider);
      border-radius: 0;
    }
  }

  &__district > ul > li:hover {
    @include hover {
      background-color: var(--primary);
      color: var(--secondary);
    }
  }
}
</style>
