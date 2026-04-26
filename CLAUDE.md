# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

网易云音乐 API，基于 EdgeOne Pages Cloud Functions 部署（Node.js 20 运行时）。

**Platform**: EdgeOne Pages | **Runtime**: Node.js 20 (Cloud Functions)

## Development Commands

```bash
npm install                    # 安装依赖
npx edgeone pages dev          # 本地开发 (http://localhost:8088)
npx edgeone pages link         # 链接远程项目（首次部署前必做）
npx edgeone pages env pull     # 拉取远程环境变量到本地 .env
npx edgeone pages deploy       # 部署到生产环境
```

## Project Structure

```
├── cloud-functions/
│   └── index.js               # EdgeOne 入口 — CORS、限流、路由分发
├── request.js                 # 请求处理与路由分发
├── modules/                   # API 模块目录（85+ 个接口）
│   ├── index.js               # 模块索引
│   ├── search.js              # 搜索相关
│   ├── song_detail.js         # 歌曲详情
│   ├── song_url.js            # 歌曲链接
│   ├── lyric.js               # 歌词
│   ├── playlist_*.js          # 歌单相关
│   ├── artist_*.js            # 歌手相关
│   ├── album_*.js             # 专辑相关
│   ├── login_*.js             # 登录相关
│   └── ...
└── util/
    ├── crypto.js              # AES/RSA/MD5 加密
    ├── fetch.js               # HTTP 请求（缓存/重试/超时）
    ├── option.js              # 请求选项
    ├── helper.js              # 辅助函数
    ├── kv-store.js            # 内存缓存封装
    └── logger.js              # 日志
```

## Architecture

**请求流程**:
1. `cloud-functions/index.js` 接收请求 → CORS → 限流 → Cookie 解析
2. 调用 `request.js` 处理
3. `pathToModuleName()` 将路径转为模块名（`/search` → `search`, `/song/detail` → `song_detail`）
4. 调用对应模块 → 模块调用 `request(uri, data, options)` 发起请求
5. `fetch.js` 负责加密请求、发送网易云 API、缓存响应

**入口函数** (cloud-functions/index.js):
```javascript
export async function onRequest(context) {
  const { request, env } = context
  // 使用 Hono 框架
}
```

## Key Implementation Details

### 限流
- 内存 Map 存储，每 IP 每分钟最多 100 请求
- 启用：响应头 `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`

### 缓存
- 内存缓存（函数实例级别），60s TTL，500 条上限
- 可缓存路径：`/api/search/get`, `/api/v3/song/detail`, `/api/song/lyric` 等

### 加密方式
- `eapi` - 移动端加密（最常用），需要 `X-antiCheatToken`
- `weapi` - 网页加密
- `linuxapi` - Linux 客户端加密
- `api` - 不加密

### 请求配置 (fetch.js)
- 超时：10s
- 重试：最多 2 次，延迟 500ms * (attempt + 1)
- User-Agent：默认移动端 iPhone

## Environment Variables

在 EdgeOne Pages 控制台设置，或通过 `npx edgeone pages env pull` 拉取到本地 `.env`：

| Variable | Description |
|----------|-------------|
| `MUSIC_U` | 登录 Token（用于获取个性化推荐） |
| `ALLOWED_ORIGINS` | CORS 允许的域名（逗号分隔） |
| `METRICS_PASSWORD` | `/metrics` 访问密码 |

**获取 MUSIC_U**: 登录 music.163.com → F12 → Application → Cookies → 找 `MUSIC_U`

**注意**: EdgeOne Cloud Functions 不支持 KV 绑定。缓存和限流均使用内存存储，函数重启后重置。

## Adding a New API Endpoint

1. 创建 `modules/your_module.js`:
```javascript
import { createOption } from '../util/option.js'

export default (query, request) => {
  const data = { id: query.id }
  return request('/api/your/endpoint', data, createOption(query))
}
```

2. 在 `modules/index.js` 添加 import/export

3. 路径转换规则：
   - `/search` → `search`
   - `/song/detail` → `song_detail`
   - `/a/b/c` → `a_b_c`

## Response Format

```json
{
  "code": 200,
  "data": { ... },
  "msg": "success"
}
```

错误响应：
```json
{
  "code": 404,
  "data": null,
  "msg": "API not found: /xxx"
}
```

## Performance Headers

每个响应包含：
- `X-Response-Time`: 处理时间（ms）
- `X-Cache-Status`: `HIT` / `MISS`