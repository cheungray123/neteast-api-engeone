/**
 * EdgeOne Pages Cloud Functions Entry Point
 * 网易云音乐 API — 全路由捕获处理器
 * Runtime: Node.js 20 (Cloud Functions)
 */

import { handleRequest, getAvailableModules } from '../request.js'

// 性能指标收集
const metrics = {
  requests: 0,
  errors: 0,
  totalTime: 0,
  startTime: Date.now()
}

// 请求限流
const RATE_LIMIT = {
  windowMs: 60000,
  maxRequests: 100,
  enabled: true
}

const rateLimitStore = new Map()
let lastCleanup = Date.now()

function cleanupRateLimit() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.startTime > RATE_LIMIT.windowMs) {
      rateLimitStore.delete(key)
    }
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
    return {
      allowed: false,
      retryAfter: Math.ceil((RATE_LIMIT.windowMs - (now - record.startTime)) / 1000)
    }
  }

  record.count++
  return { allowed: true }
}

function parseCookies(header) {
  const cookies = {}
  if (!header) return cookies
  header.split(/;\s+/).forEach(pair => {
    const eq = pair.indexOf('=')
    if (eq > 0) {
      cookies[decodeURIComponent(pair.slice(0, eq).trim())] = decodeURIComponent(pair.slice(eq + 1).trim())
    }
  })
  return cookies
}

function getCorsHeaders(env, origin) {
  const allowed = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : null

  return {
    'Access-Control-Allow-Origin': allowed ? (allowed.includes(origin) ? origin : allowed[0]) : '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  }
}

/**
 * Handles all incoming HTTP requests (catch-all route)
 */
export async function onRequest(context) {
  const { request, env, clientIp } = context
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method
  const startTime = Date.now()

  // 一次计算所有响应共享的 CORS 头
  const corsHeaders = getCorsHeaders(env, request.headers.get('Origin') || '')

  const json = (data, status = 200, extraHeaders = {}) =>
    Response.json(data, { status, headers: { ...corsHeaders, ...extraHeaders } })

  // OPTIONS 预检
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 限流
  const ip = clientIp ||
    request.headers.get('X-Real-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'

  if (Date.now() - lastCleanup > 300000) {
    cleanupRateLimit()
    lastCleanup = Date.now()
  }

  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return json({
      code: 429,
      data: null,
      msg: `请求过于频繁，请 ${rateCheck.retryAfter} 秒后重试`
    }, 429, {
      'Retry-After': String(rateCheck.retryAfter),
      'X-RateLimit-Limit': String(RATE_LIMIT.maxRequests),
      'X-RateLimit-Remaining': '0'
    })
  }

  try {
    // === 路由分发 ===

    if ((path === '/' || path === '') && method === 'GET') {
      const uptime = Math.floor((Date.now() - metrics.startTime) / 1000)
      const avgTime = metrics.requests > 0 ? Math.round(metrics.totalTime / metrics.requests) : 0
      return json({
        code: 200,
        msg: 'NeteaseCloudMusicAPI - EdgeOne Pages',
        version: '4.30.3',
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
        metrics: { requests: metrics.requests, errors: metrics.errors, avgResponseTime: `${avgTime}ms` },
        modules: getAvailableModules().length
      })
    }

    if (path === '/health' && method === 'GET') {
      return json({ status: 'ok', timestamp: new Date().toISOString() })
    }

    if (path === '/metrics' && method === 'GET') {
      const pw = env.METRICS_PASSWORD
      if (pw) {
        const auth = url.searchParams.get('password') || request.headers.get('X-Metrics-Password')
        if (auth !== pw) return json({ code: 401, msg: 'Unauthorized' }, 401)
      }
      return json({
        uptime_seconds: Math.floor((Date.now() - metrics.startTime) / 1000),
        requests_total: metrics.requests,
        errors_total: metrics.errors,
        avg_response_time_ms: metrics.requests > 0 ? Math.round(metrics.totalTime / metrics.requests) : 0,
        memory_cache_size: rateLimitStore.size,
        rate_limit: RATE_LIMIT
      })
    }

    if (path === '/modules' && method === 'GET') {
      return json({ code: 200, data: getAvailableModules() })
    }

    // === API 路由 ===
    let query = {}
    url.searchParams.forEach((v, k) => { query[k] = v })

    let body = {}
    if (method === 'POST' || method === 'PUT') {
      try {
        const ct = request.headers.get('Content-Type') || ''
        if (ct.includes('application/json')) {
          body = await request.json()
        } else if (ct.includes('application/x-www-form-urlencoded')) {
          const fd = await request.formData()
          for (const [k, v] of fd) body[k] = v
        }
      } catch (_) { /* ignore parse errors */ }
    }

    const cookies = parseCookies(request.headers.get('Cookie') || '')
    if (!cookies.MUSIC_U && env.MUSIC_U) cookies.MUSIC_U = env.MUSIC_U

    const result = await handleRequest(path, { ...query, ...body, cookie: cookies, ip }, env)

    // 重定向
    if (result.redirectUrl) {
      return new Response(null, {
        status: result.status || 302,
        headers: { Location: result.redirectUrl, ...corsHeaders }
      })
    }

    // 指标
    metrics.requests++
    metrics.totalTime += Date.now() - startTime

    // Cookie
    const respHeaders = { ...corsHeaders }
    if (result.cookie?.length) {
      respHeaders['Set-Cookie'] = result.cookie.join(', ')
    }

    return new Response(JSON.stringify(result.body), {
      status: result.status || 200,
      headers: {
        ...respHeaders,
        'Content-Type': 'application/json',
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-Cache-Status': result.cached ? 'HIT' : 'MISS'
      }
    })

  } catch (error) {
    metrics.requests++
    metrics.errors++
    metrics.totalTime += Date.now() - startTime
    console.error('Request error:', error)

    if (error.status && error.body) {
      return new Response(JSON.stringify(error.body), {
        status: error.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    return json({ code: 500, data: null, msg: error.message || 'Internal Server Error' }, 500, {
      'X-Response-Time': `${Date.now() - startTime}ms`
    })
  }
}
