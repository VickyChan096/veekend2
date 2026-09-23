import { useRuntimeConfig } from 'nuxt/app'
import fallbackDb from '@/assets/data/articles.json'
import type { Article } from '@/types/api/article'

/**
 * 文章資料來源。
 *
 * 正式資料在 Google Sheets，透過 GAS Web App 讀取（設定見 docs/gas-setup.md）。
 * 讀取發生在 `nuxt generate` 的 prerender 階段，內容更新＝重跑 workflow。
 *
 * 沒設定 `NUXT_PUBLIC_GAS_API_URL` 時退回專案內的 articles.json，
 * 讓沒有 GAS 也能跑 dev 與建置。
 */
const fallbackArticles = fallbackDb.articles as unknown as Article[]
const gasRequestAttempts = 3
const gasRequestTimeout = 30000
const gasRetryDelays = [2000, 5000] as const

interface GasListResponse {
  articles?: Article[]
  count?: number
  error?: string
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

export class ArticleService {
  private cache: Article[] | null = null
  private pendingRequest: Promise<Article[]> | null = null

  private get apiUrl(): string {
    return useRuntimeConfig().public.gasApiUrl || ''
  }

  private async fetchFromGas(): Promise<Article[] | null> {
    const url = this.apiUrl
    if (!url) return null

    for (let attempt = 1; attempt <= gasRequestAttempts; attempt += 1) {
      try {
        const response = await $fetch<GasListResponse>(url, {
          // GAS 會把 /exec 轉址到 googleusercontent，要跟著跳
          redirect: 'follow',
          retry: 0,
          timeout: gasRequestTimeout,
        })

        if (response?.error) throw new Error(response.error)
        if (!Array.isArray(response?.articles) || !response.articles.length) {
          throw new Error('GAS 回傳的 articles 是空的')
        }

        return response.articles
      } catch (error) {
        const retryDelay = gasRetryDelays[attempt - 1]
        if (retryDelay !== undefined) {
          console.warn(
            `[ArticleService] GAS 讀取失敗（第 ${attempt}/${gasRequestAttempts} 次），`
              + `${retryDelay / 1000} 秒後重試：${getErrorMessage(error)}`,
          )
          await wait(retryDelay)
          continue
        }

        // 建置時抓不到就中斷，不要默默產出一份缺資料的網站
        if (import.meta.server) throw error
        console.error('[ArticleService] 讀取 GAS 失敗，改用專案內的備份資料', error)
        return null
      }
    }

    return null
  }

  async list(): Promise<Article[]> {
    if (this.cache) return this.cache

    this.pendingRequest ??= this.fetchFromGas()
      .then((fromGas) => {
        this.cache = fromGas ?? fallbackArticles
        return this.cache
      })
      .finally(() => {
        this.pendingRequest = null
      })

    return this.pendingRequest
  }

  async findByWeek(week: number): Promise<Article | null> {
    const articles = await this.list()
    return articles.find((article) => article.week === week) ?? null
  }

  /** 文章頁的上一篇／下一篇。依 week 排序，頭尾各自沒有鄰居 */
  async findNeighbours(week: number): Promise<{ prev: Article | null; next: Article | null }> {
    const articles = await this.list()
    const sorted = [...articles].sort((a, b) => a.week - b.week)
    const index = sorted.findIndex((article) => article.week === week)
    if (index === -1) return { prev: null, next: null }
    return {
      prev: sorted[index - 1] ?? null,
      next: sorted[index + 1] ?? null,
    }
  }
}

export const articleService = new ArticleService()
