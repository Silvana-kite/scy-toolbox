# Web 账号部署

Web 账号使用与小程序相同的 CloudBase 环境中的 `web_users` 集合。Web 不调用小程序云函数或 `users` 集合；工具目录和使用统计复用该环境中的 `tools`、`tool_usages`。

## CloudBase

1. 在现有 CloudBase 环境的 API Key 管理中创建服务端 API Key。
2. 在该环境的“文档型数据库”手动创建集合 `web_users`，为 `username`、`userId` 各创建一个唯一升序索引。
3. 禁止浏览器客户端直接访问 `web_users`。只有 Nuxt Server API 通过服务端 API Key 读写该集合。

集合的公开资料字段为 `username`、`userId`、`nickname`、`avatarUrl`、`status`、三个 Date 时间字段及对应的文本时间键。`passwordHash` 和 `passwordSalt` 为内部字段，不能返回给浏览器。

## Vercel

在 Vercel 的 Production、Preview 和 Development 私密环境变量中填写 `.env.example` 的三项值：

- `AUTH_SESSION_SECRET`：至少 32 个随机字符。
- `CLOUDBASE_ENV_ID`：与小程序一致的 CloudBase 环境 ID。
- `CLOUDBASE_APIKEY`：该环境的服务端 API Key。

不要配置或保留 `WEB_USERS_FUNCTION_URL`、`WEB_USERS_SHARED_SECRET`、微信 OAuth 变量。部署后注册或登录通过 `/api/auth/register`、`/api/auth/login` 直接访问 Web 环境的 `web_users`。
