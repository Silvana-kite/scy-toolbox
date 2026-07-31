# SCY 工具箱

原生微信小程序项目基础工程，已连接 CloudBase 环境，当前不包含业务页面、业务云函数或业务数据库集合。

## 保留的基础设施

| 路径 | 职责 |
| --- | --- |
| `miniprogram/app.js` | 初始化 `wx.cloud` |
| `miniprogram/config/project.js` | 非敏感 CloudBase 环境配置 |
| `miniprogram/services/cloud.js` | 后续页面调用云函数的统一客户端入口 |
| `miniprogram/pages/index/` | 最小应用壳，作为业务首页的起点 |
| `cloudfunctions/` | 预留给按业务领域拆分的云函数 |

## 数据库约定

数据库访问必须封装在云函数中，页面不得直接读写 CloudBase 数据库。每个业务领域的云函数内部按以下层次组织：

```text
cloudfunctions/<domain>/
├── index.js                 # 路由、身份和输入边界
├── services/                # 业务规则和事务编排
├── repositories/            # 数据库读写
└── validators/              # 输入校验
```

不要创建通用“任意集合 CRUD”接口。新建领域时，再为该领域定义集合、授权规则、仓储和云函数操作。

## 开始业务开发

1. 在 `miniprogram/pages/index/` 实现第一个业务页面，或新增业务页面并登记到 `app.json`。
2. 在 `cloudfunctions/` 下创建对应业务领域的云函数。
3. 页面统一通过 `services/cloud.js` 调用云函数。
4. 将密钥配置在 CloudBase 云函数环境变量，禁止进入小程序代码或 Git。

更多边界说明见 [架构约定](docs/ARCHITECTURE.md)。

## 开源配置

提交代码前的环境配置与密钥边界见[配置说明](docs/CONFIGURATION.md)。
