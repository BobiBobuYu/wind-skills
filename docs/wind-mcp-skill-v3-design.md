# wind-mcp-skill v3 设计：调用逻辑与骨架

> 状态：开发中（开发仓 main）。目标版本 3.0.0。本文是改造的唯一设计依据，改动先改这里再改代码。
> 实测日期：2026-09-07，所有结论来自对线上 MCP 的 `tools/list` 与少量 `tools/call`。
> 教训：9 月 5 日的 tools/list 快照到 9 月 7 日已有 3 站 11 个工具、40 处参数变化。**任何契约改动前先跑 `scripts/check-consistency.mjs --live`，以当天线上为准，不用旧快照。**

## 1. 范围

| server_type | 地址路径段 | 工具数 | 本次 |
| --- | --- | --- | --- |
| `stock_research` | vserver_stock_research | 15 | 替换 stock_data |
| `fund_research` | vserver_fund_research | 21 | 替换 fund_data |
| `edb_data` | vserver_edb_data | 3 | 替换 economic_data |
| `index_data` | vserver_index_data | 6 | 不变 |
| `bond_data` | vserver_bond_data | 4 | 不变 |
| `financial_docs` | vserver_financial_docs | 2 | 不变 |
| `analytics_data` | vserver_analytics_data | 1 | 不变 |
| `options_data` | vserver_options_data | 11 | 新增 |
| `futures_data` | vserver_futures_data | 7 | 新增 |
| `company_data` | vserver_company_data | 54 | 新增 |
| `finance_data` | vserver_finance_data | 13 | 新增 |

命名规则只有一条：`server_type` 等于地址路径段去掉 `vserver_` 前缀。references 文件名以 server_type 的首段开头。

合计 11 站 137 个工具（2026-09-07 线上 tools/list）。旧版 35 个工具中 stock/fund/economic 的 22 个全部下线，其余 13 个不变。

## 2. 调用逻辑（Agent 视角，四步不变）

```
① 定路由  SKILL.md 路由表：先按标的/意图选 server_type，再选该站下的一份 references 子文件，只读这一份
② 发命令  node scripts/cli.mjs call <server_type> <tool_name> '<params_json>'
③ 读回执  成功：数据对象（content[0].text 为 JSON 字符串或 Markdown 表格）；失败：{ok:false, code, message}
④ 收口    核对标的、附数据来源声明、给完成状态
```

相对 v2 的四处变化：

1. 行情路径改变。股票和基金的最新价、K 线、分钟走势不再在领域站，统一走 `finance_data` 的三个 `quote_*` 工具；指数仍走 `index_data` 自带的行情工具。
2. 企业库两步走。`company_data` 除 `company_search_entity` 和 `company_get_biz_enum` 外所有工具都要 `companyKey`，取值只能是 `company_search_entity` 返回的企业名称全称或统一社会信用代码。
3. 标的必须核对。新站按名称做 NER，实测传入 `不存在的公司XYZ` 会返回 Block Inc.（XYZ.N）的完整画像。返回体里的代码或名称与用户标的不一致时，不得作答，按 NER 失败处理。
4. 参数风格按站不同。新站用 camelCase（`windCode`、`startDate`），保留站用 snake_case（`windcode`、`begin_date`），EDB 从 `beginDate` 改为 `startDate`。以各自契约为准，CLI 不做跨风格改写。

## 3. 实测确认的后端行为（决定 CLI 怎么改）

| 现象 | 实测证据 | CLI/契约对策 |
| --- | --- | --- |
| 所有站 HTTP 200 + SSE，错误用 `result.isError=true` + 一句文本 | 12 站全部一致 | 现有 `parseSSE` 与 `isError → backend_error` 保留 |
| 正文有两种：JSON 字符串（stock/edb/options/futures/finance）或 Markdown 表格（fund_research、company_data） | `fund_get_nav`、`company_get_registration_info` 返回 Markdown | `normalizeCallSuccess` 只处理 JSON，Markdown 原样透传；SKILL.md 说明两种形态 |
| 数组参数传字符串会被按字符拆开 | `windCodes:"CU.SHF"` 返回「未识别到有效的金融标的:C」 | manifest 记录参数类型，CLI 把逗号串收敛成数组 |
| 部分工具 isError=false 却返回纯文本错误 | `options_get_variety_series` 返回 `Invalid indicator: IV. Valid options: ...` | 纯文本正文匹配错误前缀（Invalid / 未识别 / 缺少 / 服务暂时不可用）时判 `backend_error` |
| 旧式内层信封仍存在 | `stock_screener`、`general_query_data` 返回 `{data:{...}, error:null}` | 现有 `data.code` / `error` 判定逻辑保留 |
| K 线默认不带日期列 | `quote_get_historical_data_series` 默认 headers 为 OPEN/HIGH/LOW/MATCH | 契约要求 `params.indexes` 显式包含 `TIME` |
| `type` 传整数或字符串都接受 | `type:1` 与 `type:"1"` 均成功 | 按 schema 声明收敛为整数 |
| `quote_get_realtime_indicators`、`options_get_sentiment_data` 当前不可用 | 多次调用均返回「服务暂时不可用」（其它工具同一时段正常） | 契约照写并标注，集成测试标记为已知问题，SKILL.md 不做特殊处理 |
| 37 个工具 `additionalProperties:false` | tools/list | 多传字段本地拦截，不发网络 |
| 网关间歇返回 502/503/504，同一工具几秒内成功与失败交替 | 冒烟 36 例连续调用时 26 例 5xx，单发多数成功 | CLI 对 502/503/504 重试 3 次（0.5s / 1.5s），仍失败判 `NETWORK_ERROR` 并带状态码；冒烟脚本用例间隔 1s |
| 后端 schema 两天内变化：期权下架 6 个定价/波动率工具，基金下架 2 个，期货下架 3 个新增 1 个，另有 40 处参数增删与必填放宽 | 9/5 快照 vs 9/7 线上 tools/list | manifest 以线上重新生成；契约按新 schema 重做；上线前必跑 `--live` |
| 额度耗尽时后端返回 isError 文本「余额不足，请先充值」，耗时可达 98s | 冒烟最后一例；充值后同一用例通过 | 收口为 `backend_error`；SKILL.md 按额度类错误直接报告（`BLOCKED_QUOTA`），不重试 |

## 4. 骨架

```
skills/wind-mcp-skill/
├── SKILL.md                         四步流程 + 两级路由表（站 → 子文件）+ 通用红线，≤150 行
├── scripts/
│   ├── cli.mjs                      SERVERS 11 站；call / list-tools / setup-key / open-portal / diagnose
│   ├── tool-manifest.json           v2：站 → 工具 → {required, params{type,enum,items}, strict}，由 tools/list 生成
│   ├── call-rules.json              v19：只剩 schema 表达不了的跨字段规则 + 指数 K 线周期映射
│   ├── check-consistency.mjs        名字层面一致性校验（4 项）；--live 与线上 tools/list 比对
│   └── update-check.mjs             不变
├── references/                      每站按主题拆分（31 个文件），单文件 ≤ 约 7000 token
│   ├── stock-market.md              stock-company.md
│   ├── fund-screen-profile.md       fund-nav-performance.md   fund-holdings.md   fund-attribution.md   fund-position-peers.md
│   ├── index.md                     index-indicators.md
│   ├── bond.md
│   ├── financial-docs.md
│   ├── edb.md
│   ├── analytics.md
│   ├── options-chain.md             options-variety.md   options-volatility.md   options-pricing-vanilla.md
│   ├── futures-market.md            futures-fundamentals.md
│   ├── company-registration.md      company-equity.md   company-business.md   company-tax-credit.md
│   ├── company-lawsuit.md           company-enforcement.md   company-status-risk.md   company-penalty-sentiment.md
│   ├── quote.md                     quote-indicators.md（由 stock-indicators.md 改名，内容对应 quote_* 的 indexes）
│   └── general-data.md              general-docs.md
└── tests/
    ├── README.md
    ├── mock-fetch.mjs               场景：isError 文本 / JSON 正文 / Markdown 正文 / 纯文本错误 / 旧式内层信封
    ├── mock-code.mjs                业务码边界（保留）
    ├── run-cli-contract-tests.mjs   argv、exit、错误码、类型收敛（数组/整数/布尔）、严格模式拦截
    ├── run-error-tests.mjs          后端错误形状统一塌缩为 backend_error
    ├── run-code-matrix-tests.mjs    data.code 成功边界
    └── run-smoke-real.mjs           集成：每个 references 文件至少一个真实调用（需凭据，手动）
```

删除：`references/stock.md`、`fund.md`、`economic.md`、`fund-indicators.md`、`economic_analysis_conclusion.md`（结论并入 edb.md）、旧 `tests/` 全部脚本与 `error-suite.cases.json`。

## 5. CLI 内部流程

```
argv → loadParamsInput(@file 或内联) → JSON.parse
  → getServer(server_type)                    SERVERS 查表，失败 ROUTE_ERROR
  → manifest[server_type][tool_name]          失败 ROUTE_ERROR
  → coerceTypes(args, manifest.params)        类型收敛（见 5.1）
  → normalizeCodes(args)                      windcode / windCode / windCodes 大小写与港股前导 0，不猜后缀
  → validate(args)                            required / strict 未知字段 / 标量 enum / call-rules 跨字段（数组的 items_enum 不本地校验：后端多数接受中文别名且枚举只是常见值）
  → mcp initialize → tools/call
  → 信封：isError → backend_error；纯文本错误前缀 → backend_error；内层 data.code / error → backend_error
  → stdout JSON（成功附 cli_meta）
```

### 5.1 类型收敛规则（按 manifest 中该参数的 type）

| 声明类型 | 收到 | 处理 |
| --- | --- | --- |
| integer / number | 数字字符串 | 转 Number |
| boolean | `"true"` / `"false"` | 转布尔 |
| array | 字符串 | 按英文逗号拆分并 trim；非字符串标量包成单元素数组 |
| string | 数字 / 布尔 | `String()` |
| object | 能解析为对象的 JSON 字符串 | `JSON.parse` |

收敛失败不报错，原值透传给后端，由后端报错。只对顶层参数生效，嵌套对象（如 `quote_get_historical_data_series.params`）不动。

### 5.2 call-rules v19 保留的内容

- `kline_period_map`：仅用于 `index_data.get_index_kline` 的 `period` 公开值到后端值映射（`1d`→`10`）。
- 跨字段规则：`ordered_dates`（startDate/endDate、begin/end、begin_date/end_date、timeFrom/timeTo）、EDB 的 `paired` 与 `mutually_exclusive`。
- 删除：`tool_by_domain` 跨域改写、`basic.string_keys` 全局字符串键（由 manifest 类型取代）、旧工具的 required 列表（由 manifest 取代）。

## 6. references 写法

每个文件固定三段：

1. 文件头：本文件覆盖的 server_type、主题、何时读本文件、本主题特有的约束（3 到 8 条）。
2. 逐工具契约：`### \`tool_name\``、后端描述（功能 / 适用场景 / 返回 / 边界 原文）、参数表（参数 / 必填 / 类型 / 枚举 / 示例或默认 / 官方说明）。
3. 一个可直接运行的 `cli.mjs call` 例子。

company 系列文件开头统一放同一段 `company_search_entity` 入口契约，是唯一允许的重复。

## 7. 一致性检查（`scripts/check-consistency.mjs`）

只做四项，全部是名字层面：

1. `cli.mjs` 的 SERVERS key 与 manifest 的 server key 完全相等。
2. manifest 中每个工具在 references 里恰好出现一次（`### \`tool\`` 标题），反向亦然；`company_search_entity` 允许多次。
3. `call-rules.json` 与 `cli.mjs` CALL_EXAMPLES 里的工具名都在 manifest 内。
4. `--live`：对每站 `tools/list`，比对工具名集合与 required/type 是否和 manifest 一致；发版前手动跑。

## 8. 待决（议题 3）

`finance_data.general_query_documents` 与 `financial_docs`、`finance_data.general_query_data` 与 `analytics_data` 的取舍待评审。当前：契约全部写，manifest 全收，路由表里两组重叠对的仲裁行标注「待评审」。评审后只改 SKILL.md 对应行和 manifest 的 `excluded`。
