/**
 * KV 存储模块 — EdgeOne Pages 版本
 * 内存缓存实现（EdgeOne Cloud Functions 无 KV 绑定）
 */

const DEFAULT_TTL = {
  ANONYMOUS_TOKEN: 7 * 24 * 60 * 60 * 1000,
  API_CACHE: 2 * 60 * 1000,
  MEMORY_CACHE: 60 * 1000
}

class MemoryCacheLayer {
  constructor(maxSize = 200) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key) {
    const item = this.cache.get(key)
    if (item && item.expiry > Date.now()) return item.value
    this.cache.delete(key)
    return null
  }

  set(key, value, ttl) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    this.cache.set(key, { value, expiry: Date.now() + ttl })
  }

  delete(key) { this.cache.delete(key) }
  clear() { this.cache.clear() }

  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry <= now) this.cache.delete(key)
    }
  }
}

const memoryCache = new MemoryCacheLayer()

export class KVStore {
  constructor(_kvNamespace, options = {}) {
    this.memoryCache = options.memoryCache !== false ? memoryCache : null
    this.prefix = options.prefix || ''
  }

  _key(key) { return this.prefix ? `${this.prefix}:${key}` : key }

  async get(key) {
    const fullKey = this._key(key)
    if (this.memoryCache) {
      const cached = this.memoryCache.get(fullKey)
      if (cached !== null) return cached
    }
    return null
  }

  async getJSON(key) {
    const fullKey = this._key(key)
    if (this.memoryCache) {
      const cached = this.memoryCache.get(fullKey)
      if (cached !== null) return cached
    }
    return null
  }

  async set(key, value, ttl) {
    const fullKey = this._key(key)
    if (this.memoryCache) {
      this.memoryCache.set(fullKey, value, ttl || DEFAULT_TTL.MEMORY_CACHE)
    }
    return true
  }

  async setJSON(key, value, ttl) {
    const fullKey = this._key(key)
    if (this.memoryCache) {
      this.memoryCache.set(fullKey, value, ttl || DEFAULT_TTL.MEMORY_CACHE)
    }
    return true
  }

  async delete(key) {
    const fullKey = this._key(key)
    if (this.memoryCache) this.memoryCache.delete(fullKey)
    return true
  }

  async getMultiple(keys) {
    const result = {}
    for (const key of keys) {
      const val = await this.get(key)
      if (val !== null) result[key] = val
    }
    return result
  }

  async setMultiple(items, ttl) {
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value, ttl)
    }
    return true
  }

  async getAnonymousToken() { return this.get('anonymous_token') }
  async setAnonymousToken(token) { return this.set('anonymous_token', token, DEFAULT_TTL.ANONYMOUS_TOKEN) }
  async getCache(cacheKey) { return this.getJSON(`cache:${cacheKey}`) }
  async setCache(cacheKey, data, ttl = DEFAULT_TTL.API_CACHE) { return this.setJSON(`cache:${cacheKey}`, data, ttl) }
  clearMemoryCache() { if (this.memoryCache) this.memoryCache.clear() }
}

export { DEFAULT_TTL, MemoryCacheLayer }
