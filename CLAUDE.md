# Veekend 重構專案 — 開發約定

把 `../legacy-app/`（jQuery + 靜態 db.json 的多頁式網站）重構成本 Nuxt 專案，SSG 輸出到 GitHub Pages。

慣例一律對齊 `D:\2026\2025_NPS_NatureDB\002_View`——那是同一套寫法的成熟範例。設定或目錄結構有疑問時，先去看它怎麼寫。

> **本專案只有 Vicky 一人開發。** 文件與註解裡不要出現其他人名或代稱。
> **動手前先問。** 不確定的地方（選型、範圍、設計取捨）一次問完再實作，不要邊做邊猜。
> **參考來源分工：** `../legacy-app/` 只參考**設計**；專案結構、元件切法、程式寫法一律依照 `D:\2026\2025_NPS_NatureDB\002_View`。

## 技術棧

| 項目 | 決定 |
|---|---|
| 框架 | Nuxt 4（`app/` 目錄結構），SSG：`nuxt generate` |
| 語言 | TypeScript strict |
| UI | Vuetify 3，用 `vite-plugin-vuetify`（**不是** `vuetify-nuxt-module`）+ `build.transpile: ['vuetify']` |
| 樣式 | Scoped SCSS；全域變數走 `vite.css.preprocessorOptions.scss.additionalData` 注入 |
| 地圖 | MapLibre GL（legacy 的 Leaflet 全部改寫） |
| 圖示 | `@nuxt/icon` + `mdi`（取代 Font Awesome） |
| 資料 | Google Apps Script 讀寫 Google Sheets |
| 模組 | `@nuxt/eslint`、`@nuxt/fonts`、`@nuxt/icon`、`@nuxt/image` |

目前 `package.json` 裡的 `@nuxt/content`、`@nuxt/a11y`、`better-sqlite3` 與本案無關，確認不用就移除。

## 硬規則

1. **顯式 import**：`imports.autoImport: false`、`components: { dirs: [], global: false }`。所有 composable、元件、工具函式都自己 import，不靠自動註冊。
2. **一律 `<script setup lang="ts">`**，不用 Options API。
3. **不准 `any`**。型別定義放 `app/types/`。
4. **瀏覽器相依的東西包 `<ClientOnly>` 或動態 import**——MapLibre GL、任何碰 `window` / `document` 的邏輯。`nuxt generate` 在 Node 跑，漏一個就 build 失敗。
5. **元件不直接打 API**。對外請求集中在 `app/services/`，元件透過 composable 取用。
6. **GitHub Pages 子路徑**：資源與連結一律走 `app.baseURL`（`<NuxtLink>`、`<NuxtImg>`、`useRuntimeConfig().app.baseURL`），不要寫死 `/`。
7. **SCSS partial 要自己 `@use`**——`vite.css.preprocessorOptions.additionalData` 只注入 Vite 的進入點（`main.scss`、各 `.vue` 的 `<style lang="scss">`），**不會**傳遞到被 `@use` 進來的 partial。partial 裡要用變數或 mixin，開頭自己寫 `@use 'preprocess' as *;`。

## 目錄結構

```
app/
  assets/{images,scss}    main.scss 進 nuxt.config 的 css[]；preprocess.scss 全域注入
  components/{common,layouts,pages}
  composables/{common,pages}
  constants/
  layouts/
  pages/
  plugins/
  services/               GAS 請求都在這
  types/{common,pages,api}
  utils/
```

`components` / `composables` / `types` 內部再依 `common / layouts / pages` 分層，與 002_View 一致。型別放 `app/types/`，不是根目錄 `types/`。

## 資料層

正式資料在 **Google Sheets**，透過 GAS Web App 讀取。設定與欄位定義見 `docs/gas-setup.md`。

- 四張表：`articles` / `destinations` / `blocks` / `parts`，`week` 當關聯鍵
- **讀取在 build 時**：`useArticles()` 用 `useAsyncData` 包住，prerender 時抓完寫進靜態頁
- **改內容會自動重建**：GAS 偵測到試算表被編輯 → 停手 60 秒 → 呼叫 GitHub API 觸發 `repository_dispatch`，約 3～4 分鐘後上線。不用手動按任何按鈕
- ⚠ **不要改成訪客即時抓 GAS**：實測 GAS 回應 4～15 秒、靜態頁 0.66 秒，且即時渲染會失去 SEO 與分享預覽，新文章網址還會 404
- **沒設定 `NUXT_PUBLIC_GAS_API_URL` 就退回** `app/assets/data/articles.json`，讓沒有 GAS 也能開發
- ⚠ **`useAsyncData` 會把錯誤收進 `error` ref 而不是往外拋**。在 service 裡 `throw` 擋不住建置——GAS 掛掉時會靜悄悄產出一個少了大半頁面的網站還回報成功。要在 composable 主動檢查 `error.value`，並用 `createError({ fatal: true })` 中斷 prerender
- ⚠ `gas/Code.gs` 的 `rebuildArticles()` 與 `scripts/build-from-rows.mjs` 是**同一套邏輯的兩份實作**（GAS 不支援 ES module import），改一邊要改另一邊
- `published` 欄是給**不想公開的草稿**用的。未完成但仍要展示的文章（week 7~12 的「趕稿中」佔位頁）要填 `TRUE`
- ⚠ legacy 的 `login.html` 是把明文密碼放在 db.json 的假登入。純靜態站做不了真正的驗證——**不要照抄**。`doPost` 已在 GAS 端就緒但尚未接前端，因為靜態站的 API 金鑰必然外洩，權限模型要另外決定

相關指令：

| 指令 | 用途 |
|---|---|
| `npm run sheets:export` | 由 `articles.json` 產生四份可匯入 Sheets 的 CSV |
| `npm run sheets:verify` | 匯出→重建→逐欄比對，證明 schema 無損 |
| `npm run data:parse` | 由 legacy 的 `db.json` 重新產生 `articles.json`（備份資料用） |

## legacy → Nuxt 對照

| legacy | 對應 |
|---|---|
| `index.html` + `js/index.js` | `pages/index.vue`（首頁輪播、文章列表、load more） |
| `article.html` + `js/article.js` | `pages/article/[week].vue`（內文已解析成區塊，見「文章內文」段落） |
| `articleEdit.html` | `pages/article/edit.vue` |
| `about.html` / `result.html` + `js/result.js` | `pages/about.vue` / `pages/result.vue` |
| `login.html` | `pages/login.vue`（尚未重構，目前是 `PagePlaceholder`） |
| `js/layout.js` + `js/aside.js` | `layouts/default.vue` + `components/layouts/` |
| `css/_variable.scss` `_mixin.scss` | 併入 `app/assets/scss/preprocess.scss` |
| `css/_reset.scss` `_layout.scss` | `app/assets/scss/main.scss` |
| `css/_aside.scss` `_articleList.scss` | 搬進對應元件的 `<style scoped lang="scss">` |
| jQuery DOM 操作 | 宣告式綁定 |
| Swiper | `BaseCarousel`（v-carousel） |
| SweetAlert（`js/common.js` 的 `errAlert`） | `v-dialog` / `v-snackbar` |
| Fancybox | `BaseLightbox`（v-overlay） |
| Leaflet | MapLibre GL，包在 `<ClientOnly>` |
| axios + `$.ajax` | `$fetch` / `useAsyncData` |

附屬套件的原則：**能用 Vuetify 就用 Vuetify**，不再引入 legacy 那批 CDN 套件。

## 每個元件的重構步驟

1. 讀 `../legacy-app/` 對應的 HTML / SCSS / JS。
2. 抽出反應式狀態成 `ref` / `reactive` / `computed`，DOM 操作換成宣告式綁定。
3. 先在 `app/types/` 定好 props 與資料模型，再寫元件。
4. 拆成單一職責元件放 `app/components/pages/<page>/`；跨頁共用的放 `common/`。
5. 收尾跑 typecheck 與 lint。

## 例行公事：Phase 收尾

工作以編號 phase 推進。每個 phase 結束時，AI 必須主動做完這三件事，不必等 Vicky 開口：

1. **更新 `NOTE.md`**——在總覽表加一列，並補上該 phase 的詳細段落（做了什麼、關鍵決定、產出、待確認事項）。Token 與費用欄位**留空**。
2. **提醒 Vicky 執行 `/cost`**，把數字填進 `NOTE.md`。AI 讀不到計費資料，**不要代填估算值**。
3. **給一份可直接複製的 markdown 總結**，方便 Vicky 貼進自己的筆記本。

## 共用元件庫

`app/components/common/` 底下依用途分資料夾，一個資料夾一類元件（`button/`、`input/`、`dialog/`…），命名一律 `Base*`。

- **外觀變體用 `styling` prop，不要為了換顏色開新元件**（`styling="primary" | "secondary" | "text"`）。
- **樣式吃 CSS 變數與 typography mixin**：`var(--primary)`、`@include body1-regular`。不要寫死色碼或 px 字級。
- **提示與對話框不要自己掛元件**：`GlobalComponents.vue` 已在 `app.vue` 掛好，用 `useAlert().openAlert()`、`useDialog().openDialog()`、`useFetchLoading().wrap()` 呼叫。
- **`ariaLabel` 這個 prop 名稱會與原生 `aria-label` 撞名**，vue-tsc 認不出來。需要必填的無障礙標籤時，prop 叫 `label`（見 `BaseIconButton`）。
- **新增或改動共用元件，同一輪要在 `pages/example.vue` 補上展示**。那頁是唯一能一眼看完所有元件的地方，漏掉就等於沒人知道它存在。
- Example page 的示範連結**只能指向已存在的路由**——`nuxt generate` 的 crawler 會跟著爬，連到不存在的頁面會讓建置失敗。

深色模式：`useThemeMode()` 同時切 Vuetify 主題與 `<html data-theme>`，前者管 Vuetify 元件、後者管 `_theme.scss` 的 CSS 變數。改色票要**同時**改 `preprocess.scss` 的 `$theme-light` / `$theme-dark` 與 `plugins/vuetify.ts` 的兩組 theme。

## 文章內文

內文不是 HTML 字串——`db.json` 的 `content` 已由 `npm run data:parse`（`scripts/parse-articles.mjs`）解析成 `blocks[]`，成品在 `app/assets/data/articles.json`。

- **改內文要重跑 `npm run data:parse`**，不要手改 `articles.json`
- 區塊模型定義在 `app/types/api/articleContent.ts`；新增版型時同時改型別、腳本、`ArticleSection.vue`
- 只有段落與清單項目保留行內 HTML（`<a>` `<u>` `<mark>` `<br>`），其餘一律走元件
- ⚠ **legacy 改寫過 `mark` 與 `u` 的語意**，內文就是照那套寫的：`mark` 是**紅色波浪底線**（不是螢光筆）、`u` 是**刪除線**（不是底線）。定義在 `app/assets/scss/_reset.scss`，不要改回瀏覽器預設
- ⚠ **section 裡連續的文字元素要包在一個 `div` 裡**（`ArticleSection.vue` 的 `groups`）。圖文各半的版面靠那個 div 佔另外 50%；攤平的話標題、評分、清單會各自變成 50% 寬的 flex item，換行後評分掉到圖片下面。左右由 parts 的順序決定，**不要用 `row-reverse`**——那會把後面的元素一起倒過來
- 腳本遇到不認得的版型 class 會印警告並略過——跑完要看輸出有沒有警告

## 文字欄位裡的行內 HTML

`db.json` 的 `title` 與 `briefing` 夾雜 `<br>` 與 `<strong>`（legacy 用 innerHTML 塞所以會渲染）。

- **顯示的地方用 `v-html`**——用 `{{ }}` 會把標籤當字面文字印出來（Phase 4 就踩過，Phase 7 才發現）
- **`<title>`、meta description、`alt`、`aria-label` 用 `stripHtml()`**（`app/utils/common/text.ts`）
- 目前只有 week2 的 briefing、week4／week5 的 title 有，但新增文章時要留意

## 圖片

所有內容圖片走 `BaseImage`（`app/components/common/image/BaseImage.vue`），它包了 `<NuxtImg>` 與載入前的灰色骨架。

- ⚠ **一定要給 `sizes`**。只給 `quality` 的話 ipx 只會重新編碼，檔案反而**變大**（實測 -1%~-6%）。省下來的量全部來自縮尺寸
- ⚠ **`BaseImage` 直接渲染成 `<img>`，不包外層 `<div>`**。包 wrapper 會讓所有既有的 `img { ... }` 樣式失效——側欄頭像、熱門文章縮圖、廣告都曾因此高度變成 0。要調尺寸就照舊直接寫在 `img` 上
- ⚠ **預先渲染的 HTML 會讓瀏覽器搶在 Vue 之前下載圖片**。下載若在 hydration 前完成，`load` 事件早就過去了，`@load` 收不到、骨架會一直卡著。`BaseImage` 在 `onMounted` 補檢查 `complete`
- ⚠ **斷點與 `sizes` 寫法要收斂**。每多一種都會多出一整批變體：曾經產出 527 個變體、57MB，比原圖還大。目前只留四個斷點
- `densities: [1]` 只影響用 `width/height` 指定尺寸的情況；用 `sizes` 時仍會自動補 2 倍 srcset 給高解析螢幕，那是正確行為
- SVG、logo、社群小圖示**不要**用 `BaseImage`，走 `useAssetUrl()` 的普通 `<img>` 就好
- 燈箱（`BaseLightbox`）刻意顯示原圖，不走 ipx

## 登入與編輯

`/login` 與 `/article/edit` 是**示範用**的：登入是假驗證，送出只把資料印到 Console。實際新增內容在 Google 試算表操作。

**為什麼不能做真的**：GitHub Pages 只送檔案、不執行程式，所有判斷邏輯都得在瀏覽器裡跑——使用者看得到也改得動。寫入 API 的金鑰同理，要能送出請求就必須存在瀏覽器裡。這是架構限制，不是寫法問題。

**分層**（搬到有後端的環境時只換最底層）：

```
表單元件  ──►  DTO（契約）  ──►  ArticleWriteService / useAuth
（不用動）      （不用動）         （搬家時只換這兩個）
```

- DTO 在 `app/types/api/dto/`，用 zod 定義，**型別由 schema 推導**（`z.infer`）——驗證與型別同一份來源
- DTO 刻意與 domain 型別（`types/api/article.ts`）分開：domain 是「畫面要用的形狀」，DTO 是「跟後端往來的形狀」
- ⚠ **zod 不要出現在全域 plugin 引入的東西裡**。`useAuth` 曾用 zod 驗 session，導致它被打包進共用 chunk，每一頁的訪客都要多下載 66KB。全域 plugin 引入的相依會進共用 chunk，加之前先想清楚
- ⚠ **`definePageMeta` 在 `imports.autoImport: false` 下 TypeScript 認不得**。路由設定放 `nuxt.config` 的 `routeRules`，middleware 用 `auth.global.ts` + 路徑清單
- `RepeaterField`（`components/common/form/`）是可新增／刪除／排序的清單欄位，景點、內文區塊、區塊內元素、三欄圖文共用

## 部署

**站台：https://vickychan096.github.io/veekend2/**（repo `VickyChan096/veekend2`）

push 到 `main` 就由 `.github/workflows/deploy.yml` 自動建置並發布。

- workflow 用 `NUXT_APP_BASE_URL: /${{ github.event.repository.name }}/` 自動組出子路徑，**改名或搬 repo 都不用改設定**
- 建置前跑 `npm run check`（typecheck），失敗就不部署
- actions 一律用 v5——v4 是為 Node 20 寫的，runner 會強制它跑在 Node 24 上
- 本機重現正式建置：複製 `.env.example` 成 `.env.production` 填好 `NUXT_APP_BASE_URL`，跑 `npm run generate:gh`
- `npm run generate` 結尾會跑 `scripts/generate-sitemap.mjs`，掃 `.output/public` 的 `index.html` 產出 sitemap.xml 與 robots.txt。沒設 `NUXT_PUBLIC_SITE_URL` 就跳過（本機建置沒有網址是正常的）

踩過的坑：

- ⚠ **動過相依之後一定要重建 `package-lock.json`**。在 Windows 上跑 `npm install <套件>` 時，npm 會增量更新 lock 並把當下平台用不到的相依裁掉（`@emnapi/*`、`@parcel/watcher`）——**本機 `npm ci` 一路綠燈但 CI 在 Linux 上秒炸**（EUSAGE / Missing from lock file）。
  解法：`rm -rf node_modules package-lock.json && npm install`
  這個坑 Phase 6 與 Phase 10 各踩過一次，所以加了 `npm run deps:check`（已併進 `npm run check`）在本機就攔下來。**提交前跑一次 `npm run check`**
- ⚠ **CI 的 job log 需要 repo admin 權限**才讀得到。workflow 裡的 `Install dependencies` 會把 npm 輸出用 `::error::` 寫成 annotation，那個走公開 API 就讀得到——CI 出問題先看 annotation，不要盲猜
- ⚠ **不要在 Git Bash 用行內環境變數**：`NUXT_APP_BASE_URL=/x/ npm run generate` 會被 MSYS 的 POSIX 路徑轉換改寫成 `C:/Program Files/Git/x/`，建置**回報成功**但每頁只產出 `"Redirecting..."`。要嘛加 `MSYS_NO_PATHCONV=1`，要嘛走 `--dotenv`（讀檔不經過 shell）
- ⚠ **`public/` 底下的資源路徑不會自動補 baseURL**。資料裡帶路徑的圖片（例如 `largeCoverUrl`）一律經過 `useAssetUrl()`
- ⚠ **prerender 的 crawler 會跟著站內連結爬**。連到不存在的路由會讓建置失敗，所以還沒重構的頁面要先用 `PagePlaceholder` 佔住路由
- ⚠ **CSS 不要內嵌**（`features.inlineStyles: false`）。Noto Sans TC 的 `@font-face` 宣告有 425KB，內嵌會讓每個用到字型的元件各塞一份——首頁曾因此變成 4.3MB（gzip 後 1.67MB），而且內嵌就不能跨頁快取
- ⚠ **`nitro.prerender.concurrency: 4` 不能拿掉**。ipx 與頁面 prerender 搶資源會讓隨機頁面冒出 `[unhandled] 500`，三次建置會掛一次，而且每次錯在不同頁面
- ⚠ **`og:image` / `og:url` 一定要絕對網址**。社群平台不吃相對路徑，分享出去不會有預覽圖。用 `useAssetUrl().absoluteUrl()`，站台網址由 workflow 依 repo 自動組出
- ⚠ **圖示要進 client bundle**：`icon.clientBundle.scan` 只掃得到原始碼裡寫死的名稱，Vuetify 執行期才從 alias 取的圖示掃不到，要在 `nuxt.config.ts` 的 `VUETIFY_ICONS` 點名

## 現況

Phase 1–12 完成：legacy 的頁面已全部移植，資料改用 Google Sheets，補上示範用的登入與編輯頁，並收尾了深色模式、標題結構、SEO 與無障礙。`nuxt generate`、`npm run check`、`npm run lint` 皆通過。

已就緒：
- 設定與樣式基礎——SSG、深色模式、design token、六階 typography mixin
- `app/components/common/`——30 個共用元件；`app/pages/example.vue` 為展示頁（footer 有連結）
- `app/components/layouts/`——HeaderBar、FooterBar、ScrollToTopButton、SiteAside
- `app/pages/index.vue`——輪播、文章列表（LOAD MORE）、景點地圖、側欄
- `app/pages/article/[week].vue`——hero、結構化內文、燈箱、本週地圖、上下篇導覽
- `app/pages/result.vue`——三種查詢模式（`?tags=` / `?all=` / `?search=`），client 端篩選
- `app/pages/about.vue`——錯位色塊的關於頁
- `app/pages/login.vue`、`app/pages/article/edit.vue`——**示範用**，假登入與 console.log 送出
- 資料層——`ArticleService` 建置時讀 GAS（Google Sheets），未設定則退回本地 JSON
- 內文解析——`npm run data:parse`（備份資料用）；正式內容改在 Sheets 編輯
- 資產——`public/images/`（132 檔），建置時由 ipx 產生縮圖與 WebP
- 效能——首頁 gzip 8.7KB（CSS 外部化前是 1672KB）；封面圖手機尺寸 34KB（原圖 453KB）
- `app/error.vue`——自訂 404／錯誤頁。**不吃 layout**，header／footer 要自己放；按鈕用 `clearError({ redirect })`，用 NuxtLink 會留著錯誤狀態
- SEO——`scripts/generate-sitemap.mjs` 在 generate 後產出 sitemap.xml
- 無障礙——每頁剛好一個 `<h1>`（站名 logo 不是 h1）、`layouts/default.vue` 有 skip link、header 有深淺色切換鍵

尚未處理：
- 編輯頁只能新增，還不能載入既有文章來修改（要做的話是 `/article/edit/[week]`）
- `doPost` 寫入 API 已就緒但未接前端——真正要能寫入，得先搬到有後端的環境
- 沒有自動化測試（Phase 12 盤點時列出，你決定先跳過）
