# 数据采集优化总结

## 当前状态

### 数据库统计
- **总案例数**: 3,982 条
- **已分类案例**: 93 条
  - 问题案例: 91 条
  - 充电案例: 2 条
- **未分类案例**: 3,889 条 (model_id = null，旧数据)

### 充电案例分布
- **BYD Dolphin**: 2 条充电案例
  - 充电器故障问题
  - 保修外维修费用 ~AUD 1,000

## 已完成的优化

### 1. 数据采集脚本
✅ **collect-reddit.ts** - 主采集器
  - 支持 ProductReview + Whirlpool
  - 自动分类 `content_type: 'problem' | 'charging'`
  - 双查询策略（问题 + 充电）

✅ **review-cases.ts** - 审核工具
  - 支持 `--approve-all` 批量审核
  - 保留 `content_type` 分类

✅ **view-charging-cases.ts** - 充电案例查看器
  - 按车型分组显示
  - 显示解决方案、费用、来源

### 2. 页面展示
✅ **充电页面** (`/[market]/charging/[model]`)
  - 显示充电网络信息
  - 显示家用充电桩推荐
  - 显示真实车主充电报告
  - BYD Dolphin 页面正确显示 2 条案例

### 3. 数据质量
✅ 替换虚假品牌（Ocular IQ → EVNEX E2）
✅ 价格改为链接到官方页面
✅ 添加数据免责声明
✅ 保留原始来源链接

## 数据积累策略

### 短期计划（1-2 周）

**每周运行 2-3 次**：
```bash
# 主力车型采集
pnpm collect:reddit --model byd-atto-3
pnpm collect:reddit --model mg-mg4
pnpm collect:reddit --model byd-dolphin

# 批量审核
pnpm review --approve-all

# 查看充电案例
npx dotenv-cli -e .env.local -- tsx scripts/view-charging-cases.ts
```

**预期增长**：
- 每次采集: 5-15 条
- 每周: 10-30 条
- 一个月: 40-120 条

### 中期计划（1-3 个月）

1. **扩展数据源**
   - Carsales.com.au 车主评论
   - Drive.com.au 评论区
   - Facebook EV 群组（手动采集）

2. **优化 Whirlpool 采集**
   - 目前 403 错误
   - 需要调整 User-Agent 或增加延迟

3. **Reddit API**（可选）
   - 如果获得 API 访问权限
   - 可以采集 r/electricvehicles, r/evaustralia, r/BYDAuto

### 长期计划（3-6 个月）

1. **数据清理**
   - 处理 3,889 条 model_id = null 的旧数据
   - 重新分类或删除

2. **多市场扩展**
   - 英国数据源
   - 阿联酋数据源

3. **数据质量提升**
   - 去重优化
   - 增加更多元数据（车辆年份、里程数等）

## 可用命令

```bash
# 数据采集
pnpm collect:reddit                    # 采集所有车型
pnpm collect:reddit --model byd-atto-3 # 采集特定车型
pnpm collect:reddit:dry                # 测试模式

# 数据审核
pnpm review                            # 逐条审核
pnpm review --approve-all              # 批量通过
pnpm review --list                     # 查看统计

# 数据查看
npx dotenv-cli -e .env.local -- tsx scripts/view-charging-cases.ts
npx dotenv-cli -e .env.local -- tsx scripts/check-charging-data.ts
```

## 下一步建议

1. **立即执行**：定期运行采集器（每周 2-3 次）
2. **一周内**：观察数据增长，调整采集频率
3. **一个月内**：评估是否需要添加新数据源
4. **三个月内**：清理旧数据，优化数据质量

## 注意事项

- ProductReview 数据质量最高（真实车主评论）
- Whirlpool 目前有 403 错误，暂时跳过
- Reddit API 需要申请，暂时不可用
- 充电案例相对较少，需要持续积累
