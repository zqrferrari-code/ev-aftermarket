# Reddit API 设置指南

## 1. 创建 Reddit App

1. 访问 https://www.reddit.com/prefs/apps
2. 登录你的 Reddit 账号
3. 点击 "create another app..." 或 "are you a developer? create an app..."
4. 填写表单:
   - **name**: `ev-aftermarket-collector` (或任意名称)
   - **App type**: 选择 **script**
   - **description**: `Data collection for EV owner resource website`
   - **about url**: 留空
   - **redirect uri**: `http://localhost:8000` (必填，但 script 类型不会用到)
5. 点击 "create app"

## 2. 获取凭证

创建成功后，你会看到:

```
personal use script
<这是你的 CLIENT_ID>

secret
<这是你的 CLIENT_SECRET>
```

## 3. 配置环境变量

在 `.env.local` 中添加:

```bash
# Reddit API
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT="script:ev-aftermarket:v1.0 (by /u/your_reddit_username)"
```

**重要**:
- `REDDIT_USER_AGENT` 中的 `/u/your_reddit_username` 替换为你的 Reddit 用户名
- User-Agent 格式必须是 `<platform>:<app ID>:<version> (by /u/<reddit username>)`
- Reddit 要求所有 API 请求都有唯一的 User-Agent

## 4. 测试

运行 dry-run 测试:

```bash
pnpm collect:reddit-api:dry --model byd-atto-3 --limit 5
```

如果配置正确，你会看到:

```
=== Reddit API 案例采集 ===

━━ byd-atto3 ━━

[Reddit r/electricvehicles] "BYD Atto 3" charging issues
  找到 5 个帖子
  ✓ [charging] BYD Atto 3 slow DC charging at Chargefox
    Owner reports DC charging capped at 60kW instead of advertised 88kW...
```

## 5. 正式运行

```bash
# 采集所有车型
pnpm collect:reddit-api

# 采集特定车型
pnpm collect:reddit-api --model byd-atto-3

# 限制每次搜索结果数量（默认 25）
pnpm collect:reddit-api --limit 50

# 审核采集的案例
pnpm review --model byd-atto-3
```

## API 限制

Reddit API 限制:
- **未认证**: 10 请求/分钟
- **OAuth 认证** (script 类型): 60 请求/分钟

脚本已内置 2 秒延迟，正常使用不会触发限制。

## 目标 Subreddits

脚本会搜索以下 subreddits:
- `r/electricvehicles` - 最大的 EV 社区
- `r/evaustralia` - 澳洲 EV 车主
- `r/BYDAuto` - BYD 车主社区

每个车型会执行两类搜索:
1. **充电问题**: `"BYD Atto 3" (charging OR charger OR "slow charge" OR wallbox)`
2. **一般问题**: `"BYD Atto 3" (problem OR issue OR fault OR error)`

## 故障排查

### 401 Unauthorized
- 检查 `REDDIT_CLIENT_ID` 和 `REDDIT_CLIENT_SECRET` 是否正确
- 确认 app 类型是 **script**，不是 web app

### 429 Too Many Requests
- 脚本请求过快，增加延迟时间
- 等待 1 分钟后重试

### 403 Forbidden
- 检查 `REDDIT_USER_AGENT` 格式是否正确
- 确保包含你的真实 Reddit 用户名
