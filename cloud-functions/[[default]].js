/**
 * EdgeOne Pages Cloud Functions Entry Point
 * 网易云音乐 API — Hono 版本
 * Runtime: Node.js 20 (Cloud Functions)
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleRequest, getAvailableModules } from './request.js'

// 性能指标
const metrics = {
  requests: 0,
  errors: 0,
  totalTime: 0,
  startTime: Date.now()
}

// 限流
const RATE_LIMIT = { windowMs: 60000, maxRequests: 100, enabled: true }
const rateLimitStore = new Map()
let lastCleanup = Date.now()

function cleanupRateLimit() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.startTime > RATE_LIMIT.windowMs) rateLimitStore.delete(key)
  }
}

function checkRateLimit(ip) {
  if (!RATE_LIMIT.enabled) return { allowed: true }
  const now = Date.now()
  const record = rateLimitStore.get(ip)
  if (!record || now - record.startTime > RATE_LIMIT.windowMs) {
    rateLimitStore.set(ip, { count: 1, startTime: now })
    return { allowed: true }
  }
  if (record.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((RATE_LIMIT.windowMs - (now - record.startTime)) / 1000) }
  }
  record.count++
  return { allowed: true }
}

const app = new Hono()

// CORS
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = c.env.ALLOWED_ORIGINS
      ? c.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
      : null
    return allowed ? (allowed.includes(origin) ? origin : allowed[0]) : '*'
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Cookie', 'X-Requested-With'],
  credentials: true,
}))

// 限流中间件
app.use('*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Real-IP') ||
    c.env.clientIp ||
    'unknown'

  if (Date.now() - lastCleanup > 300000) {
    cleanupRateLimit()
    lastCleanup = Date.now()
  }

  const check = checkRateLimit(ip)
  if (!check.allowed) {
    return c.json({
      code: 429, data: null,
      msg: `请求过于频繁，请 ${check.retryAfter} 秒后重试`
    }, 429, {
      'Retry-After': String(check.retryAfter),
      'X-RateLimit-Limit': String(RATE_LIMIT.maxRequests),
      'X-RateLimit-Remaining': '0'
    })
  }

  c.set('clientIp', ip)
  await next()
})

// Cookie 解析
app.use('*', async (c, next) => {
  const header = c.req.header('Cookie') || ''
  const cookies = {}
  header.split(/;\s+/).forEach(pair => {
    const eq = pair.indexOf('=')
    if (eq > 0) {
      cookies[decodeURIComponent(pair.slice(0, eq).trim())] = decodeURIComponent(pair.slice(eq + 1).trim())
    }
  })
  c.set('cookies', cookies)
  await next()
})

// 首页
app.get('/', (c) => {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000)
  const avg = metrics.requests > 0 ? Math.round(metrics.totalTime / metrics.requests) : 0
  return c.json({
    code: 200,
    msg: 'NeteaseCloudMusicAPI - EdgeOne Pages (Hono)',
    version: '4.30.3',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
    metrics: { requests: metrics.requests, errors: metrics.errors, avgResponseTime: `${avg}ms` },
    modules: getAvailableModules().length
  })
})

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.get('/metrics', (c) => {
  const pw = c.env.METRICS_PASSWORD
  if (pw) {
    const auth = c.req.query('password') || c.req.header('X-Metrics-Password')
    if (auth !== pw) return c.json({ code: 401, msg: 'Unauthorized' }, 401)
  }
  return c.json({
    uptime_seconds: Math.floor((Date.now() - metrics.startTime) / 1000),
    requests_total: metrics.requests,
    errors_total: metrics.errors,
    avg_response_time_ms: metrics.requests > 0 ? Math.round(metrics.totalTime / metrics.requests) : 0,
    memory_cache_size: rateLimitStore.size,
    rate_limit: RATE_LIMIT
  })
})

app.get('/modules', (c) => c.json({ code: 200, data: getAvailableModules() }))

// API 路由 - 捕获所有 /:path
app.all('/:path*', async (c) => {
  const startTime = Date.now()
  const path = c.req.path
  const method = c.req.method

  let query = {}
  const url = new URL(c.req.url)
  url.searchParams.forEach((v, k) => { query[k] = v })

  let body = {}
  if (method === 'POST' || method === 'PUT') {
    try {
      const ct = c.req.header('Content-Type') || ''
      if (ct.includes('application/json')) {
        body = await c.req.json()
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const fd = await c.req.parseBody()
        body = { ...fd }
      }
    } catch (_) { }
  }

  const cookies = c.get('cookies') || {}
  if (!cookies.MUSIC_U && c.env.MUSIC_U) cookies.MUSIC_U = c.env.MUSIC_U

  const ip = c.get('clientIp') || '127.0.0.1'
  const params = { ...query, ...body, cookie: cookies, ip }

  try {
    const result = await handleRequest(path, params, c.env)

    if (result.cookie?.length) {
      result.cookie.forEach(cookie => {
        c.header('Set-Cookie', cookie, { append: true })
      })
    }

    if (result.redirectUrl) {
      return c.redirect(result.redirectUrl, result.status || 302)
    }

    metrics.requests++
    metrics.totalTime += Date.now() - startTime

    c.header('X-Response-Time', `${Date.now() - startTime}ms`)
    c.header('X-Cache-Status', result.cached ? 'HIT' : 'MISS')

    return c.json(result.body, result.status || 200)
  } catch (error) {
    metrics.requests++
    metrics.errors++
    metrics.totalTime += Date.now() - startTime
    console.error('Request error:', error)

    if (error.status && error.body) {
      c.header('X-Response-Time', `${Date.now() - startTime}ms`)
      return c.json(error.body, error.status)
    }

    return c.json({ code: 500, data: null, msg: error.message || 'Internal Server Error' }, 500)
  }
})

// 404
app.notFound((c) => c.json({ code: 404, data: null, msg: 'Not Found', hint: '访问 /modules 查看可用接口' }, 404))

// 错误处理
app.onError((err, c) => {
  metrics.errors++
  console.error('Global error:', err)
  return c.json({ code: 500, data: null, msg: err.message || 'Internal Server Error' }, 500)
})

// EdgeOne Cloud Functions 入口 — 直接导出 Hono app
export default app
