# 网易云音乐 API 接口文档

基于 Cloudflare Workers 部署的网易云音乐 API 接口文档。

## 基础信息

**Base URL**: `https://你的域名.workers.dev`

**响应格式**:
```json
{
  "code": 200,
  "data": { ... },
  "msg": "success"
}
```

**错误格式**:
```json
{
  "code": 404,
  "data": null,
  "msg": "API not found"
}
```

---

## 系统接口

### GET / - 服务状态

查看服务状态、版本信息、性能指标。

**响应示例**:
```json
{
  "code": 200,
  "msg": "NeteaseCloudMusicAPI Enhanced - Cloudflare Workers",
  "version": "4.30.3",
  "uptime": "2h 30m 15s",
  "metrics": {
    "requests": 1234,
    "errors": 5,
    "avgResponseTime": "120ms"
  },
  "modules": 85
}
```

### GET /health - 健康检查

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2026-04-21T10:30:00.000Z"
}
```

### GET /modules - 可用模块列表

返回所有可用的 API 模块名称。

**响应示例**:
```json
{
  "code": 200,
  "data": [
    "album", "album_detail", "artist_detail", "banner",
    "lyric", "personalized", "playlist_detail",
    "search", "song_detail", "song_url", ...
  ]
}
```

### GET /metrics - 性能指标

可选密码保护。

**参数**:
| 参数名 | 类型 | 说明 |
|-------|------|------|
| password | string | 访问密码（当设置了 METRICS_PASSWORD 时必需）|

**响应示例**:
```json
{
  "uptime_seconds": 3600,
  "requests_total": 1234,
  "errors_total": 5,
  "avg_response_time_ms": 120,
  "memory_cache_size": 45,
  "rate_limit": {
    "windowMs": 60000,
    "maxRequests": 100,
    "enabled": true
  }
}
```

---

## 搜索接口

### GET /search - 搜索

**参数**:
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|-------|------|------|-------|-----|
| keywords | string | ✅ | - | 搜索关键词 |
| type | number | ❌ | 1 | 搜索类型 |
| limit | number | ❌ | 30 | 返回数量，最大 100 |
| offset | number | ❌ | 0 | 偏移量，用于分页 |

**type 类型**:
| 值 | 说明 |
|----|-----|
| 1 | 单曲 |
| 10 | 专辑 |
| 100 | 歌手 |
| 1000 | 歌单 |
| 1002 | 用户 |
| 1004 | MV |
| 1006 | 歌词 |
| 1009 | 电台 |
| 1014 | 视频 |

**示例**:
```bash
# 搜索单曲
curl "https://你的域名.workers.dev/search?keywords=周杰伦&limit=10"

# 搜索歌单
curl "https://你的域名.workers.dev/search?keywords=周杰伦&type=1000"

# 分页搜索
curl "https://你的域名.workers.dev/search?keywords=周杰伦&limit=10&offset=20"
```

### GET /search/suggest - 搜索建议

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| keywords | string | ✅ | 搜索关键词 |
| type | string | ❌ | `mobile` 或 `web` |

### GET /search/hot - 热门搜索（简略）

### GET /search/hot_detail - 热门搜索（详细）

### GET /search/default - 默认搜索词

### GET /search/multimatch - 多类型匹配

### GET /search/match - 搜索匹配

---

## 歌曲接口

### GET /song/detail - 歌曲详情

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| ids | string | ✅ | 歌曲ID，多个用逗号分隔，最多 1000 首 |

**示例**:
```bash
# 单首歌曲
curl "https://你的域名.workers.dev/song_detail?ids=255020"

# 多首歌曲
curl "https://你的域名.workers.dev/song_detail?ids=255020,255021,255022"
```

### GET /song/url - 获取歌曲播放链接

**参数**:
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|-------|------|------|-------|-----|
| id | string | ✅ | - | 歌曲ID，多个用逗号分隔 |
| br | number | ❌ | 999000 | 码率 (bps) |

**码率说明**:
| 码率 | 音质 |
|-----|-----|
| 128000 | 标准音质 |
| 192000 | 较高音质 |
| 320000 | 高品质 |
| 999000 | 无损音质（需要 VIP） |

**响应示例**:
```json
{
  "code": 200,
  "data": [{
    "id": 255020,
    "url": "https://...",
    "br": 320000,
    "size": 10240000,
    "type": "mp3"
  }]
}
```

### GET /song/url/v1 - 获取歌曲链接（新版）

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌曲ID |
| level | string | ❌ | 音质等级 |

**level 可选值**:
- `standard` - 标准
- `higher` - 较高
- `exhigh` - 高品质
- `lossless` - 无损
- `hires` - Hi-Res

### GET /lyric - 获取歌词

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌曲ID |

**响应示例**:
```json
{
  "code": 200,
  "lrc": {
    "lyric": "[00:00.00] 作词 : 方文山\n[00:01.00] 作曲 : 周杰伦\n..."
  },
  "tlyric": {
    "lyric": "翻译歌词..."
  },
  "romalrc": {
    "lyric": "罗马音歌词..."
  }
}
```

### GET /lyric/new - 逐字歌词

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌曲ID |

### GET /check_music - 检查歌曲是否可用

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌曲ID |

### GET /song/music/detail - 歌曲音乐详情

---

## 歌单接口

### GET /playlist/detail - 歌单详情

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌单ID |
| s | number | ❌ | 歌单最近的 s 个收藏者，默认 8 |

**示例**:
```bash
curl "https://你的域名.workers.dev/playlist_detail?id=3778678"
```

### GET /playlist/track/all - 歌单所有歌曲

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌单ID |
| limit | number | ❌ | 数量限制 |
| offset | number | ❌ | 偏移量 |

### GET /playlist/tracks - 歌单操作（需登录）

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| op | string | ✅ | 操作：`add` 添加，`del` 删除 |
| pid | string | ✅ | 歌单ID |
| tracks | string | ✅ | 歌曲ID，多个用逗号分隔 |

### GET /playlist/catlist - 歌单分类列表

### GET /playlist/hot - 热门歌单分类

### GET /top/playlist - 分类歌单

### GET /top/playlist/highquality - 精品歌单

### GET /playlist/highquality/tags - 精品歌单标签

### GET /playlist/track/add - 添加歌曲到歌单（需登录）

### GET /playlist/track/delete - 从歌单删除歌曲（需登录）

### GET /playlist/detail/dynamic - 歌单详情（动态）

---

## 排行榜接口

### GET /toplist - 所有排行榜

**示例**:
```bash
curl "https://你的域名.workers.dev/toplist"
```

### GET /toplist/detail - 排行榜详情

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 排行榜ID |

### GET /toplist/detail/v2 - 排行榜详情 V2

### GET /top/song - 新歌速递

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| type | number | ❌ | 地区类型 |

---

## 歌手接口

### GET /artist/detail - 歌手详情

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌手ID |

### GET /artist/songs - 歌手歌曲

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌手ID |
| limit | number | ❌ | 数量限制 |
| offset | number | ❌ | 偏移量 |

### GET /artist/album - 歌手专辑

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌手ID |
| limit | number | ❌ | 数量限制 |
| offset | number | ❌ | 偏移量 |

### GET /artist/mv - 歌手 MV

### GET /artist/desc - 歌手简介

### GET /artist/fans - 歌手粉丝

### GET /artist/top/song - 歌手热门歌曲

### GET /artist/sub - 收藏/取消收藏歌手（需登录）

### GET /artist/sublist - 收藏的歌手列表（需登录）

### GET /artist/new/song - 歌手新歌

### GET /artist/new/mv - 歌手新 MV

### GET /artist/video - 歌手视频

### GET /artist/follow/count - 歌手关注数

### GET /artists - 热门歌手

### GET /artist/list - 歌手分类列表

---

## 专辑接口

### GET /album/detail - 专辑详情

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 专辑ID |

### GET /album - 专辑详情（别名）

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 专辑ID |

### GET /album/new - 新专辑

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| area | string | ❌ | 地区：`ALL`, `ZH`, `EN`, `KR`, `JP` |
| limit | number | ❌ | 数量限制 |
| offset | number | ❌ | 偏移量 |

### GET /album/newest - 最新专辑

### GET /album/list - 专辑列表

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| limit | number | ❌ | 数量限制 |
| offset | number | ❌ | 偏移量 |

### GET /album/list/style - 专辑风格列表

### GET /album/sub - 收藏/取消收藏专辑（需登录）

### GET /album/sublist - 收藏的专辑列表（需登录）

### GET /album/privilege - 专辑权限

### GET /top/album - 新碟上架

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| offset | number | ❌ | 偏移量 |
| limit | number | ❌ | 数量限制 |
| area | string | ❌ | 地区 |

---

## 登录接口

### GET /login/qr/key - 获取二维码 Key

**响应**:
```json
{
  "code": 200,
  "data": {
    "unikey": "xxxxxx"
  }
}
```

### GET /login/qr/create - 生成二维码

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| key | string | ✅ | 从 `/login/qr/key` 获取 |
| qrimg | boolean | ❌ | 是否返回 base64 图片 |

**响应**:
```json
{
  "code": 200,
  "data": {
    "qrurl": "https://...",
    "qrimg": "data:image/png;base64,..."
  }
}
```

### GET /login/qr/check - 检查扫码状态

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| key | string | ✅ | 二维码 Key |

**状态码说明**:
| code | 说明 |
|------|-----|
| 800 | 二维码已过期 |
| 801 | 等待扫码 |
| 802 | 待确认（已扫码） |
| 803 | 授权登录成功 |

### GET /login/status - 登录状态

### GET /login/refresh - 刷新登录

### GET /register/anonimous - 匿名注册

### POST /daily_signin - 每日签到（需登录）

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| type | number | ❌ | 签到类型：`0` Android，`1` iOS |

---

## 推荐接口

### GET /personalized - 推荐歌单

### GET /personalized/newsong - 推荐新歌

### GET /personalized/mv - 推荐 MV

### GET /personalized/djprogram - 推荐电台

### GET /personalized/privatecontent - 独家放送

### GET /recommend/songs - 每日推荐歌曲（需登录）

### GET /recommend/resource - 每日推荐歌单（需登录）

### GET /recommend/songs/dislike - 不喜欢歌曲（需登录）

---

## 相似推荐接口

### GET /simi/song - 相似歌曲

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌曲ID |

### GET /simi/playlist - 相似歌单

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌单ID |

### GET /simi/artist - 相似歌手

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | 歌手ID |

### GET /simi/mv - 相似 MV

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| mvid | string | ✅ | MV ID |

---

## MV 接口

### GET /mv/url - MV 播放地址

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| id | string | ✅ | MV ID |
| r | number | ❌ | 分辨率，默认 1080 |

### GET /mv/detail - MV 详情

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| mvid | string | ✅ | MV ID |

### GET /top/mv - MV 排行榜

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| offset | number | ❌ | 偏移量 |
| limit | number | ❌ | 数量限制 |

---

## 其他接口

### GET /banner - 轮播图

**参数**:
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|-----|
| type | number | ❌ | 客户端类型 |

**type 值**:
| 值 | 说明 |
|----|-----|
| 0 | PC |
| 1 | Android |
| 2 | iPhone |
| 3 | iPad |

---

## 使用示例

### cURL

```bash
# 搜索歌曲
curl "https://你的域名.workers.dev/search?keywords=周杰伦&limit=10"

# 获取歌曲详情
curl "https://你的域名.workers.dev/song_detail?ids=255020"

# 获取歌词
curl "https://你的域名.workers.dev/lyric?id=255020"

# 获取歌曲链接
curl "https://你的域名.workers.dev/song_url?id=255020&br=320000"

# 获取排行榜
curl "https://你的域名.workers.dev/toplist"

# 查看服务状态
curl "https://你的域名.workers.dev/"

# 查看性能指标
curl "https://你的域名.workers.dev/metrics"
```

### JavaScript

```javascript
const API_BASE = 'https://你的域名.workers.dev'

async function request(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })
  const response = await fetch(url)
  return response.json()
}

// 搜索歌曲
async function search(keyword, limit = 30, offset = 0) {
  return request('/search', { keywords: keyword, limit, offset })
}

// 获取歌曲详情
async function getSongDetail(ids) {
  return request('/song_detail', { ids: Array.isArray(ids) ? ids.join(',') : ids })
}

// 获取歌曲链接
async function getSongUrl(id, br = 320000) {
  return request('/song_url', { id, br })
}

// 获取歌词
async function getLyric(id) {
  return request('/lyric', { id })
}

// 使用示例
async function main() {
  const result = await search('周杰伦', 10)
  console.log('找到歌曲:', result.result.songs)

  const songId = result.result.songs[0].id
  const detail = await getSongDetail(songId)
  console.log('歌曲详情:', detail)

  const lyric = await getLyric(songId)
  console.log('歌词:', lyric.lrc.lyric)
}
main()
```

### Python

```python
import requests

API_BASE = 'https://你的域名.workers.dev'

def search(keyword, limit=30, offset=0):
    response = requests.get(f'{API_BASE}/search', params={
        'keywords': keyword,
        'limit': limit,
        'offset': offset
    })
    return response.json()

def get_song_detail(ids):
    if isinstance(ids, list):
        ids = ','.join(map(str, ids))
    response = requests.get(f'{API_BASE}/song_detail', params={'ids': ids})
    return response.json()

def get_song_url(id, br=320000):
    response = requests.get(f'{API_BASE}/song_url', params={'id': id, 'br': br})
    return response.json()

def get_lyric(id):
    response = requests.get(f'{API_BASE}/lyric', params={'id': id})
    return response.json()

if __name__ == '__main__':
    result = search('周杰伦', limit=10)
    print(f"找到 {result['result']['songCount']} 首歌曲")
```

---

## 认证说明

### 需要登录的接口

以下接口需要登录状态才能访问：

- `/daily_signin` - 每日签到
- `/recommend/songs` - 每日推荐歌曲
- `/recommend/resource` - 每日推荐歌单
- `/playlist/tracks` - 歌单操作
- `/artist/sub` - 收藏歌手
- `/artist/sublist` - 收藏的歌手列表
- `/album/sub` - 收藏专辑
- `/album/sublist` - 收藏的专辑列表

### 认证方式

**方式一：请求头传递 Cookie**

```javascript
const MUSIC_U = '你的MUSIC_U值'

async function getRecommendSongs() {
  const response = await fetch(`${API_BASE}/recommend/songs`, {
    headers: {
      'Cookie': `MUSIC_U=${MUSIC_U}`
    }
  })
  return response.json()
}
```

**方式二：环境变量配置（推荐）**

在 Cloudflare Dashboard 设置环境变量 `MUSIC_U`，即可直接调用需要登录的接口。

### 获取 MUSIC_U Token

1. 打开 [网易云音乐网页版](https://music.163.com) 并登录
2. 按 `F12` 打开开发者工具
3. 切换到 **Application** (Chrome) 或 **存储** (Firefox) 标签
4. 展开 **Cookies** -> `https://music.163.com`
5. 找到 `MUSIC_U` 并复制其值

---

## 性能说明

### 响应头

每个 API 响应都包含以下性能头：

| Header | 说明 |
|--------|------|
| `X-Response-Time` | 请求处理时间（毫秒） |
| `X-Cache-Status` | `HIT` 缓存命中，`MISS` 缓存未命中 |

### 缓存策略

- 内存缓存：60 秒 TTL，最多 500 条
- 可缓存接口：搜索、歌曲详情、歌词、排行榜等 GET 请求
- KV 存储：用于持久化登录状态等数据

### 限流策略

- 每 IP 每分钟最多 100 请求
- 超限返回 `429` 状态码
- 响应头包含 `Retry-After` 提示等待时间

---

## 错误码

| code | 说明 |
|------|-----|
| 200 | 成功 |
| 400 | 请求错误 |
| 401 | 未授权 |
| 404 | 接口不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 登录状态码

| code | 说明 |
|------|-----|
| 800 | 二维码已过期 |
| 801 | 等待扫码 |
| 802 | 待确认 |
| 803 | 授权登录成功 |