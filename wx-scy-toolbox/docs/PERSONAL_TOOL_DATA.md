# 个人中心数据设计

## 身份边界

微信小程序使用 `users` 集合，Web 使用 `web_users` 集合。它们只共用同一个 CloudBase 环境和工具行为集合，绝不共用用户记录，也不提供账户绑定、迁移或互相查询。

所有个人行为记录由服务端生成归属键：微信为 `wx:<微信用户编号>`，Web 为 `web:<网页用户编号>`。客户端不能传入、修改或按归属键查询任何集合；小程序只经过 `tools` 云函数，Web 只经过 Nuxt 服务端接口。

## 集合

| 集合 | 作用 | 关键字段 |
| --- | --- | --- |
| `tools` | 共享工具目录和全局使用次数 | `toolId`、`isEnabled`、`totalUseCount`、`lastUsedAt` |

| `tool_usages` | 每个用户对每个工具的累计次数 | `ownerKey`、`ownerType`、`ownerUserId`、`toolId`、`useCount`、`firstUsedAt`、`lastUsedAt`、`lastCountedAt` |

| `tool_favorites` | 个人收藏 | `ownerKey`、`ownerType`、`ownerUserId`、`toolId`、`createdAt` |

| `tool_usage_history` | 成功执行的展示历史 | `ownerKey`、`ownerType`、`ownerUserId`、`toolId`、`usedAt`、`createdAt` |

| `user_tool_stats` | 个人页汇总 | `ownerKey`、`favoriteCount`、`usageCount`、`topToolId`、`topToolUseCount`、`topToolLastUsedAt` |

| `tool_request_dedup` | 使用请求幂等记录 | `ownerKey`、`toolId`、`requestId`、`counted`、`historyId`、`totalUseCount`、`expiresAt` |

不要保存工具输入、计算输出、图片、掩膜、笔触或处理结果。历史只记录“哪个工具在何时成功执行”。

## 索引与权限

在 CloudBase 控制台创建以下索引：

| 集合 | 索引 |
| --- | --- |
| `tool_usages` | 唯一：`ownerKey ASC, toolId ASC`；排序：`ownerKey ASC, useCount DESC, lastUsedAt DESC` |
| `tool_favorites` | 唯一：`ownerKey ASC, toolId ASC`；列表：`ownerKey ASC, createdAt DESC` |
| `tool_usage_history` | `ownerKey ASC, usedAt DESC, _id DESC` |
| `user_tool_stats` | 唯一：`ownerKey ASC` |
| `tool_request_dedup` | 唯一：`ownerKey ASC, toolId ASC, requestId ASC` |

所有上述集合均禁止客户端直接读写。只有部署后的微信云函数和 Web 服务端 API Key 可以访问。CloudBase 当前文档型数据库控制台没有 TTL 索引配置项，因此不要求创建 TTL 索引：`expiresAt` 由服务端用于判断 24 小时幂等窗口，过期的同请求记录会在下次收到该请求时先删除再重新写入，不影响统计和历史。

### 已存在错误索引时的修复

任何个人行为集合都不能把 `toolId` 单独设为唯一索引。这个错误索引会让同一个工具全库只能写入一次，微信和 Web 即使是不同账户也会互相冲突，出现 `E11000 ... index: toolId`。

在 CloudBase 控制台的“数据库”中打开 `tool_favorites` 的“索引”：

1. 删除字段只有 `toolId ASC` 且勾选“唯一”的旧索引；**不要删除集合或已有收藏文档**。
2. 新建唯一组合索引，字段顺序为 `ownerKey ASC`、`toolId ASC`，并勾选“唯一”。
3. 新建普通列表索引，字段顺序为 `ownerKey ASC`、`createdAt DESC`，不要勾选“唯一”。

还要依次检查并修复：

| 集合 | 应删除的错误索引 | 正确的唯一组合索引 |
| --- | --- | --- |
| `tool_usages` | 仅 `toolId ASC` | `ownerKey ASC, toolId ASC` |
| `tool_request_dedup` | 仅 `toolId ASC` | `ownerKey ASC, toolId ASC, requestId ASC` |

保存后等待索引状态显示“可用”，无需删除已有数据或重新部署 Web、微信代码。之后再次执行工具，使用历史才会写入。

## 待同步与故障提示

- 小程序和 Web 在工具真实成功后，先把仅含 `toolId`、`requestId`、创建时间的待同步事件写入本地队列，再调用服务端记录使用。队列最多 20 条，超过 20 小时自动丢弃；不保存图片、输入、输出或工具结果。
- 网络失败、云函数未部署、集合未创建时，页面明确显示服务端中文错误，不能将失败显示为“暂无记录”。重新进入“我的”、网络恢复后的下一次请求，以及 Web 会话初始化完成后都会重试。
- 同一个待同步事件重试时始终沿用原 `requestId`，由 `tool_request_dedup` 保证不会重复计数。
- 云函数默认动作错误提示“重新部署 tools 云函数”；集合错误提示“按本文档创建集合与索引”。部署后需重新发布 `tools` 云函数及小程序代码。

## CRUD 与页面

- 收藏前校验工具已启用；重复收藏不改变 `createdAt`，因此列表顺序稳定。单用户上限 200 条。
- 工具成功执行才写使用记录；打开工具页、失败执行、取消执行均不计数。
- 服务端事务依次校验工具状态和请求幂等、检查 5 秒防连点、写入历史与累计表、更新个人汇总和全局次数。相同 `requestId` 返回首次结果，不重复计数。
- 常用工具按累计次数优先、最后使用时间次之更新。首次执行同时创建 `user_tool_stats`。
- 历史按 `usedAt DESC, _id DESC` 分页，每页最多 50 条。清除历史只删除 `tool_usage_history`，绝不回退累计次数、常用工具或全局次数。
- 微信“我的”页显示概览，菜单进入收藏和历史列表；Web “我的”页显示预览，并进入完整列表。已下线工具保留记录，显示“已下线”，不可执行。

## 旧数据迁移

旧 `tool_usages` 不能直接建立新唯一索引。先按 `(openid, toolId)` 聚合：`useCount` 相加，首次使用时间取最早，最后使用和最后计数时间取最新。微信 OpenID 必须通过 `users` 映射为微信用户编号；以 `web:` 开头的旧键映射为 Web 用户编号。确认写入新的 `ownerKey` 字段和索引后，移除原始 `openid`。无法映射的记录移入隔离集合，不参与个人查询。

小程序和浏览器旧本地收藏、结果历史不会自动上传，避免把结果内容或不可信的本地计数写入云端。
