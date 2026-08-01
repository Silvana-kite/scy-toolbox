# 工具目录与常用排行部署

`tools` 云函数是工具目录和常用排行的唯一数据入口。小程序只能通过
`miniprogram/services/tool-catalog.js` 调用云函数，不可直接读写数据库。
所有启用工具对所有用户可见，不存在工具权限控制。

## 集合

### `tools`

目录中的每一条工具记录包含 `toolId`、`name`、`description`、`icon`、`symbol`、
`route`、`isEnabled`、`sortOrder`、`totalUseCount`、`lastUsedAt`、时间字段和动态
分类字段：`categoryId`、`categoryName`、`categorySymbol`、`categoryOrder`。

首次调用 `listCatalog`、`listHome` 或 `recordUse` 时，函数会幂等写入
`image-repair`（图片去水印）工具，初始 `totalUseCount` 为 `0`。后续工具直接在
该集合新增启用记录即可；小程序会根据非空分类自动渲染，无需发版。

### `tool_usages`

每个用户和工具只保留一条聚合记录。字段为服务端内部的 `openid`、`toolId`、
`useCount`、`firstUsedAt`、`lastUsedAt`、`lastCountedAt` 与创建/更新时间。
`openid` 永不返回给小程序。

工具打开时会异步调用 `recordUse`。同一用户同一工具 5 秒内的重复请求不会计数；
事务内同时递增该用户的 `useCount` 和工具的 `totalUseCount`。图片、掩膜、笔迹和
处理结果不进入上述集合。

## 索引和权限

在 CloudBase 控制台创建集合与下列索引：

| 集合 | 索引字段 | 用途 |
| --- | --- | --- |
| `tools` | `isEnabled ASC, categoryOrder ASC, sortOrder ASC` | 目录排序 |
| `tools` | `isEnabled ASC, totalUseCount DESC, lastUsedAt DESC` | 全局常用排行 |
| `tool_usages` | `openid ASC, toolId ASC`（唯一） | 用户工具聚合 |
| `tool_usages` | `openid ASC, useCount DESC, lastUsedAt DESC` | 个人常用排行 |

将两个集合配置为客户端无直接读写权限，只允许部署后的 `tools` 云函数访问。

## Web 复用

`web-scy-toolbox` 通过既有的 CloudBase 服务端 API Key 复用本环境的 `tools` 与
`tool_usages`，不会新建工具目录或统计集合。Web 登录账号写入
`openid: web:<userId>` 和 `platform: web`；此处 `openid` 是复用既有唯一索引的内部
身份键，不是微信 OpenID。小程序记录仍只写入真实微信 OpenID。

两端均以进入工具页作为一次使用，使用 `totalUseCount` 汇总全局次数。Web 侧说明见
`web-scy-toolbox/docs/TOOLS.md`。

## 接口与降级

- `listCatalog` 返回全部启用工具。
- `listHome(limit, offset)` 返回当前用户的累计使用次数排行；没有个人记录时回退到
  全局排行。首版页面固定请求前 10 条，接口保留分页参数。
- `recordUse(toolId)` 校验启用状态并进行 5 秒去重。

前端会分别缓存目录和首页排行 24 小时。网络失败时仍会展示未过期缓存并标记为
“离线数据”；无有效缓存时显示重试入口。工具本身的本地页面不依赖统计请求成功。

## 部署

1. 在微信开发者工具中为 `cloudfunctions/tools` 安装依赖并部署到当前 CloudBase 环境。
2. 创建集合、索引与上述数据库权限。若要在部署前手动初始化目录，在 `tools` 集合的“导入”中选择 JSON 格式并上传 [`database-seed/tools.json`](../database-seed/tools.json)，导入模式选择“Upsert”。该文件是 UTF-8 JSON Lines 格式，只有一条 `image-repair` 工具记录。
3. 打开工具大全验证图片去水印被自动创建并归入“图片处理”。
4. 多次打开工具，间隔超过 5 秒后验证个人常用排行与 `totalUseCount` 均递增。
