<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseImage from '@/components/common/image/BaseImage.vue'
import type { Article } from '@/types/api/article'

const props = defineProps<{
  articles: Article[]
}>()

const activeIndex = ref(0)
const isDragging = ref(false)
const suppressClick = ref(false)
const dragStartX = ref(0)
const dragDistance = ref(0)
let autoplayTimer: ReturnType<typeof setInterval> | undefined

const activeArticleIndex = computed(() => {
  if (props.articles.length === 0) return 0
  return Math.min(activeIndex.value, props.articles.length - 1)
})

const selectSlide = (index: number) => {
  activeIndex.value = index
}

const nextSlide = () => {
  if (props.articles.length < 2) return
  activeIndex.value = (activeArticleIndex.value + 1) % props.articles.length
}

const startAutoplay = () => {
  if (autoplayTimer || props.articles.length < 2) return
  autoplayTimer = setInterval(nextSlide, 3500)
}

const stopAutoplay = () => {
  if (!autoplayTimer) return
  clearInterval(autoplayTimer)
  autoplayTimer = undefined
}

const pauseAutoplay = () => {
  stopAutoplay()
}

const resumeAutoplay = () => {
  startAutoplay()
}

const handlePointerDown = (event: PointerEvent) => {
  if (props.articles.length < 2) return

  event.preventDefault()
  isDragging.value = true
  suppressClick.value = false
  dragStartX.value = event.clientX
  dragDistance.value = 0
  pauseAutoplay()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return

  dragDistance.value = event.clientX - dragStartX.value
  if (Math.abs(dragDistance.value) > 8) {
    suppressClick.value = true
  }
}

const handlePointerUp = (event: PointerEvent) => {
  if (!isDragging.value) return

  if (Math.abs(dragDistance.value) > 50) {
    activeIndex.value =
      dragDistance.value < 0
        ? (activeArticleIndex.value + 1) % props.articles.length
        : (activeArticleIndex.value - 1 + props.articles.length) % props.articles.length
  }

  isDragging.value = false
  dragDistance.value = 0
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  resumeAutoplay()
}

const handleSlideClick = (event: MouseEvent) => {
  if (!suppressClick.value) return
  event.preventDefault()
  suppressClick.value = false
}

onMounted(startAutoplay)
onBeforeUnmount(stopAutoplay)
</script>

<template>
  <section
    class="hero"
    aria-label="精選遊記"
    @mouseenter="pauseAutoplay"
    @mouseleave="resumeAutoplay"
  >
    <div
      class="hero__viewport"
      :class="{ 'is-dragging': isDragging }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @dragstart.prevent
    >
      <div
        v-for="(article, articleIndex) in articles"
        :key="article.week"
        class="hero__slide"
        :class="{ 'is-active': activeArticleIndex === articleIndex }"
        :aria-hidden="activeArticleIndex !== articleIndex"
      >
        <NuxtLink
          :to="`/article/${article.week}`"
          class="hero__link"
          @click="handleSlideClick"
        >
          <div class="hero__photo">
            <BaseImage
              :src="article.largeCoverUrl"
              :alt="`${article.city}${article.district}`"
              sizes="sm:100vw md:1280px"
              :lazy="articleIndex > 0"
            />
          </div>
          <div class="hero__caption">
            <div class="hero__week">
              <p>week</p>
              <strong>{{ String(article.week).padStart(2, '0') }}</strong>
            </div>
            <div class="hero__text">
              <p>{{ article.city }} {{ article.district }}</p>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <h2 v-html="article.title" />
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <div v-if="articles.length > 1" class="hero__pagination" aria-label="輪播頁面">
      <button
        v-for="(article, articleIndex) in articles"
        :key="article.week"
        type="button"
        class="hero__dot"
        :class="{ 'is-active': activeArticleIndex === articleIndex }"
        :aria-label="`顯示第 ${articleIndex + 1} 篇遊記`"
        :aria-current="activeArticleIndex === articleIndex ? 'true' : undefined"
        @click="selectSlide(articleIndex)"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.hero {
  position: relative;
  padding: 30px 0;

  @include mobile {
    padding: 16px 0;
  }

  &__viewport {
    position: relative;
    height: 450px;
    overflow: hidden;
    border-radius: var(--border-radius-m);
    cursor: grab;
    touch-action: pan-y;
    user-select: none;

    &.is-dragging {
      cursor: grabbing;
    }
  }

  &__slide {
    position: absolute;
    inset: 0;
    pointer-events: none;
    visibility: hidden;
    opacity: 0;
    transition: visibility 0s linear 0.8s, opacity 0.8s ease;

    &.is-active {
      pointer-events: auto;
      visibility: visible;
      opacity: 1;
      transition-delay: 0s;
    }
  }

  &__link {
    position: relative;
    display: block;
    height: 100%;
    color: var(--secondary);
  }

  &__photo {
    position: relative;
    height: 450px;
    overflow: hidden;
    border-radius: var(--border-radius-m);
    padding: 0 30px;
    box-sizing: border-box;

    @include mobile {
      padding: 0 15px;
    }

    :deep(.base-image) {
      display: block;
      width: 100%;
      height: 450px;
      object-fit: cover;
      border-radius: var(--border-radius-m);
      opacity: 0.1;
      transition: opacity 1s ease-out;
    }
  }

  &__slide.is-active &__photo :deep(.base-image) {
    opacity: 1;
  }

  &__caption {
    position: absolute;
    top: 280px;
    right: 0;
    z-index: 2;
    display: flex;
    width: 500px;
    height: 120px;
    text-align: center;
    opacity: 0;
    transition: opacity 0.8s ease-out;

    @media screen and (max-width: 1200px) {
      right: 30px;
    }

    @include mobile {
      top: 0;
      right: auto;
      left: 15px;
      width: calc(100% - 30px);
    }

    @include min-mobile {
      height: 80px;
    }
  }

  &__slide.is-active &__caption {
    opacity: 1;
  }

  &__week {
    display: flex;
    flex: 0 0 25%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    background-color: var(--secondary);

    @include mobile {
      border-radius: var(--border-radius-m) 0 0 0;
    }

    p {
      @include body1-regular;
      margin: 0;
      line-height: 1.1;
    }

    strong {
      @include display;
      display: block;
      margin-top: 2px;
      font-size: 60px;
      line-height: 0.9;
      opacity: 0;
      transform: scale(0.15);
      transition: opacity 1s ease-out, transform 1s ease-out;

      @include min-mobile {
        font-size: 30px;
      }
    }
  }

  &__slide.is-active &__week strong {
    opacity: 1;
    transform: scale(1);
  }

  &__text {
    display: flex;
    flex: 1 1 75%;
    flex-wrap: wrap;
    align-content: center;
    justify-content: center;
    padding: 0 20px;
    background-color: var(--primary);
    border-radius: 0 var(--border-radius-s) var(--border-radius-s) 0;

    @media (max-width: 1200px) {
      border-radius: 0;
    }

    @include mobile {
      justify-content: flex-start;
      text-align: left;
      border-radius: 0 var(--border-radius-m) 0 0;
    }

    @include min-mobile {
      padding: 0 10px;
    }

    p {
      @include subtitle1-regular;
      position: relative;
      z-index: 0;
      margin: 0;
      transform: translateX(30%);
      transition: transform 1s ease-out;

      &::after {
        content: '';
        position: absolute;
        top: 16px;
        left: 50%;
        z-index: -1;
        width: 110%;
        border-bottom: 10px solid #ffffff;
        transform: translateX(-50%);

        @include min-mobile {
          top: 6px;
          border-bottom-width: 8px;
        }
      }

      @include min-mobile {
        margin-bottom: 4px;
        font-size: 0.6rem;
      }
    }

    h2 {
      @include head2-medium;
      width: 100%;
      margin: 0;
      line-height: 1.2;
      transform: translateX(-100px);
      transition: transform 2s ease-out;

      @include min-mobile {
        font-size: 1rem;
      }
    }
  }

  &__slide.is-active &__text p,
  &__slide.is-active &__text h2 {
    transform: translateX(0);
  }

  &__pagination {
    position: absolute;
    right: 100px;
    bottom: 34px;
    z-index: 3;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  &__dot {
    width: 15px;
    height: 15px;
    padding: 0;
    cursor: pointer;
    background-color: var(--primary);
    border: 0;
    border-radius: 50%;
    opacity: 0.55;
    transition: opacity 0.2s ease, transform 0.2s ease;

    &.is-active {
      opacity: 1;
      transform: scale(1.15);
    }

    &:focus-visible {
      outline: var(--focus-visible);
      outline-offset: 3px;
    }
  }

  @include mobile {
    &__pagination {
      right: 40px;
      bottom: 20px;
      gap: 4px;
    }

    &__dot {
      width: 10px;
      height: 10px;
    }
  }
}
</style>
