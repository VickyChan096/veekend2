/**
 * 產生 sitemap.xml 與 robots.txt。
 *
 * 刻意不用 @nuxtjs/sitemap：這個站是純靜態產出，路由清單就攤在 .output/public 裡，
 * 掃資料夾比多裝一個模組（還要跟 autoImport: false 相處）簡單得多。
 *
 * 在 nuxt generate 之後跑，讀 .output/public 下所有 index.html 反推網址。
 *
 * 用法：node scripts/generate-sitemap.mjs
 * 需要 NUXT_PUBLIC_SITE_URL（例如 https://vickychan096.github.io/veekend2）。
 */
import fs from 'node:fs'
import path from 'node:path'

const OUT_DIR = path.resolve('.output/public')

// 這些頁面對搜尋引擎沒有意義：登入是假的、編輯頁要登入、元件庫是給我自己看的
const PRIVATE_ROUTES = ['/login', '/article/edit', '/example']

// Nuxt 產給 SPA fallback 用的殼，不是真的頁面
const FALLBACK_ROUTES = ['/200', '/404']

const EXCLUDED = [...PRIVATE_ROUTES, ...FALLBACK_ROUTES]

// 首頁最重要，文章次之，其他再次之
const priorityOf = (route) => {
  if (route === '/') return '1.0'
  if (route.startsWith('/article/')) return '0.8'
  return '0.5'
}

const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

// GitHub Pages 專案站會多一層 /<repo>/，掃資料夾得到的路由不含這一段，要自己補回去。
// NUXT_PUBLIC_SITE_URL 只有網域（見 deploy.yml 的 Compute site URL）。
const basePath = (process.env.NUXT_APP_BASE_URL ?? '/').replace(/\/$/, '')

/** 路由 → 完整網址 */
const toUrl = (route) => `${siteUrl}${basePath}${route === '/' ? '/' : route}`

if (!fs.existsSync(OUT_DIR)) {
  console.error('::error::找不到 .output/public，請先執行 nuxt generate')
  process.exit(1)
}

if (!siteUrl) {
  // 本機建置沒設網址是正常的，不該讓 build 掛掉——但要講清楚為什麼沒有 sitemap
  console.warn('⚠ 沒有 NUXT_PUBLIC_SITE_URL，跳過 sitemap.xml（部署環境才需要）')
  process.exit(0)
}

/** 遞迴收集所有 index.html 的所在路徑，換算成路由 */
const collectRoutes = (dir, base = '') => {
  const routes = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // _nuxt、_ipx 是資產目錄，不是路由
      if (entry.name.startsWith('_')) continue
      routes.push(...collectRoutes(path.join(dir, entry.name), `${base}/${entry.name}`))
    } else if (entry.name === 'index.html') {
      routes.push(base === '' ? '/' : base)
    }
  }
  return routes
}

const routes = collectRoutes(OUT_DIR)
  .filter((route) => !EXCLUDED.includes(route))
  .sort()

if (!routes.length) {
  console.error('::error::掃不到任何路由，sitemap 會是空的')
  process.exit(1)
}

// 用建置日期當 lastmod。文章沒有各自的更新時間，逐頁給假日期只會誤導
const today = new Date().toISOString().slice(0, 10)

const urls = routes
  .map(
    (route) =>
      `  <url>\n` +
      `    <loc>${toUrl(route)}</loc>\n` +
      `    <lastmod>${today}</lastmod>\n` +
      `    <priority>${priorityOf(route)}</priority>\n` +
      `  </url>`
  )
  .join('\n')

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`

fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), sitemap, 'utf8')

// ⚠ GitHub Pages 專案站的 robots.txt 會在 /<repo>/robots.txt，爬蟲只讀網域根目錄的那一份，
//   所以現在這份其實不會被讀到。還是產出來，是為了哪天換成自訂網域時直接就位。
const robots =
  `User-agent: *\n` +
  `Allow: /\n` +
  PRIVATE_ROUTES.map((route) => `Disallow: ${basePath}${route}\n`).join('') +
  `\nSitemap: ${siteUrl}${basePath}/sitemap.xml\n`

fs.writeFileSync(path.join(OUT_DIR, 'robots.txt'), robots, 'utf8')

console.log(`✓ sitemap.xml（${routes.length} 個網址）與 robots.txt 已產生`)
