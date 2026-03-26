# rsshub-twitter-lite

一个已经裁剪过的 RSSHub 风格模板，只保留了抓取 Twitter/X 的核心能力，适合直接部署到 Railway。

这是一个仅自用、实验性质的模板。
当前实现依赖 X 的非公开 Web 接口，不适合作为稳定生产方案，也不保证长期可用。

## 保留的路由

- `/twitter/user/:id`
- `/twitter/media/:id`
- `/twitter/tweet/:id/status/:status`
- `/twitter/keyword/:keyword`

每个路由都支持原版 Twitter RSSHub 路由里常见的 `routeParams` 风格参数，例如：

```text
/twitter/user/elonmusk/includeReplies=1&showAuthorInDesc=1
```

## 运行

```bash
npm install
npm start
```

默认监听 `PORT=1200`。

## Railway 环境变量

至少配置一项：

- `TWITTER_AUTH_TOKEN`
- `TWITTER_THIRD_PARTY_API`

建议优先使用：

```text
TWITTER_AUTH_TOKEN=token1,token2
```

如果你配置的是 `TWITTER_AUTH_TOKEN`，实际走的是 X Web 抓取方案。
这条链路依赖未公开接口，可能因为 query id 变化、风控、登录态失效而随时中断。

可选变量：

- `PORT=1200`
- `CACHE_ROUTE_EXPIRE=300`
- `CACHE_CONTENT_EXPIRE=3600`
- `REQUEST_TIMEOUT=30000`
- `REQUEST_RETRY=1`
- `PROXY_URI=http://user:pass@host:port`
- `DISALLOW_ROBOT=false`
- `LOG_LEVEL=info`

## Railway 部署建议

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/healthz`
- Node Version: `22`

仓库里已经附带：

- [railway.json](/Users/kaximoduoduo/Downloads/RSSHub-master/railway.json)
- [Procfile](/Users/kaximoduoduo/Downloads/RSSHub-master/Procfile)
- [.nvmrc](/Users/kaximoduoduo/Downloads/RSSHub-master/.nvmrc)

这个模板已经去掉 `Dockerfile`，默认就是给 Railway 的 Nixpacks/Node 方式部署用的。
如果你直接把这个仓库连到 Railway，通常不需要再手动补启动命令。

## 说明

这个模板已经删除了：

- 非 Twitter 路由
- 文档 API
- 测试
- Worker / Vercel / Cloudflare 相关构建
- Puppeteer 自动登录
- Redis / Sentry / OpenTelemetry / 多代理等重型模块

如果你后面只想继续围绕 Twitter 扩展，这个仓库现在更适合作为干净底座。

## 风险提示

- 这是自用实验版，不是稳定的生产抓取器
- X 网页内部接口变更后，可能直接返回 404、401 或空数据
- 更稳的替代方式是配置 `TWITTER_THIRD_PARTY_API`
