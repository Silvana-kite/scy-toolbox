# 共享工具库

Web 端与小程序共用同一个 CloudBase 环境，并复用其中的 `tools` 与 `tool_usages`，不创建新的工具目录或使用统计集合。Web 用户账户 `web_users` 也使用该环境。

Nuxt Server 通过既有的 `CLOUDBASE_ENV_ID`、`CLOUDBASE_APIKEY` 访问所有集合；这两项只能配置在服务端环境变量中，浏览器不能直接访问集合。

## 使用记录

小程序记录保留真实微信 `openid`。Web 登录用户写入 `openid: web:<userId>` 与 `platform: web`，因此可直接复用现有 `openid + toolId` 唯一索引和个人排行索引。该字段在 Web 记录中是内部身份键，不是微信 OpenID。

`tools.totalUseCount` 汇总两端用户进入工具页的次数。图片内容、掩膜、笔迹和修复结果不会写入 CloudBase，也不会发送到 Nuxt API。

首页和目录缓存有效期为 24 小时。工具打开后不主动刷新排行；用户点击页面刷新按钮时强制拉取新数据。浏览器清除 Storage 后会作为正常缓存失效处理。

Web 隐私说明仅覆盖 CloudBase 工具使用数据；当前不接入第三方分析服务。后续如引入第三方分析，必须单独说明其收集范围。
