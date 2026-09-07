---
name: wind-mcp-skill
description: >-
  查询、筛选、比较或验证 Wind 金融数据时使用。覆盖 A股、港股、美股、基金、ETF、指数、板块、债券、期货、期权的行情与研究数据，以及公司、公告、新闻、研报、宏观、行业、汇率和企业风控数据。不用于无需实时或权威数据的通用金融知识问答。
---

<!-- ENCODING: UTF-8. If Chinese text looks garbled, re-read this file as UTF-8 before routing. -->

# Wind 金融数据查询

通过本 Skill 自带 CLI 调用 Wind MCP。只基于 Wind 返回结果回答，不把模型记忆、Web Search 或常识补全伪装成已核验数据。

按需渐进加载：**拆分问题 → 选择一个或多个 `server_type` → 只读对应 reference → 选择工具并调用 CLI → 核验结果**。endpoint、请求头、认证和传输由 CLI 负责；模型不构造这些实现细节。

## 1. 定路由

先按业务意图选择 `server_type`，再读取该行 reference。一个问题涉及多个业务域时拆成多次调用，保留每次结果的来源和口径。

| `server_type` | 优先处理 | 按需加载 |
| --- | --- | --- |
| `stock_research` | 股票市场、行业、公司画像、财务分析、盈利预测、估值、事件、资金流、技术、实时分析、选股 | 按下方业务类型读取 `references/stock/` 中的一份 |
| `fund_research` | 基金筛选、档案、净值、规模、申赎、业绩、持仓、归因、风格和仓位 | 按下方业务类型读取 `references/fund/` 中的一份 |
| `options_data` | 期权合约、期限指标、波动率、情绪、香草及奇异期权定价 | 按下方业务类型读取 `references/options/` 中的一份 |
| `futures_data` | 期货仓单、合约条款、相关证券、基差、资金、持仓、研报观点和供需 | `references/futures.md` |
| `company_data` | 非上市与上市企业工商、股权关系、人员、客户供应商、知识产权、司法、税务和经营风险 | 按下方业务类型读取 `references/company/` 中的一份；枚举按需另读 |
| `finance_data` | 全球跨资产实时行情、历史序列、专业指标、报表、文档、研报和自然语言标准取数 | `references/finance.md` |
| `edb_data` | 宏观、行业、区域和汇率 EDB 指标 | `references/economic.md` |
| `index_data` | 指数和板块档案、基本面、技术、实时行情、K 线和分钟行情 | `references/index.md`；构造行情 `indexes` 时再读 `references/index-indicators.md` |
| `bond_data` | 债券档案、发行人、行情估值和主体财务 | `references/bond.md` |
| `financial_docs` | 公司公告和财经新闻的自然语言检索 | `references/financial-docs.md` |
| `analytics_data` | 专项工具无法表达的跨标的聚合、排名或复合指标计算 | `references/analytics.md` |

### 大型业务契约渐进读取

- `stock/`：市场概览读 `references/stock/market-overview.md`；行业板块读 `references/stock/industry-sector.md`；公司研究读 `references/stock/company-research.md`；资金、技术和盘中分析读 `references/stock/trading-analysis.md`；选股读 `references/stock/screener.md`。
- `fund/`：发现和档案读 `references/fund/discovery-profile.md`；业绩和归因读 `references/fund/performance-attribution.md`；配置和持仓读 `references/fund/allocation-holdings.md`；净值和交易读 `references/fund/nav-trading.md`；规模和财务读 `references/fund/size-financials.md`；筛选读 `references/fund/screener.md`。
- `options/`：合约和行情读 `references/options/contract-market.md`；波动率读 `references/options/volatility.md`；定价读 `references/options/pricing.md`；情绪读 `references/options/sentiment.md`。
- `company/`：主体和工商读 `references/company/discovery-registration.md`；股权治理读 `references/company/ownership-governance.md`；商业关系读 `references/company/business-relations.md`；知识产权和资质读 `references/company/intellectual-property-qualifications.md`；司法执行读 `references/company/judicial-enforcement.md`；处罚失信和税务读 `references/company/compliance-tax.md`；经营、融资和舆情风险读 `references/company/operating-financing-risk.md`；只有工具参数需要风险枚举时再读 `references/company/risk-enums.md`。

### 路由优先级

1. 公告、年报、季报、招股书、监管披露和财经新闻优先 `financial_docs`；需要研报、文档列表、单篇全文或精确类型/日期过滤时使用 `finance_data` 的文档链路。
2. 指数和板块优先 `index_data`；债券优先 `bond_data`。
3. 股票研究结论类请求走 `stock_research`；股票最新价、历史行情或严格指标代码取数走 `finance_data`。
4. 基金研究、持仓和归因走 `fund_research`；跨资产行情比较走 `finance_data`。
5. `analytics_data` 仅作跨域结构化计算补充，不替代专项行情、K 线、文档、筛选或 EDB 工具。

标的类型或意图不属于上述范围时返回 `OUT_OF_SCOPE`。认证、额度、网络、后端或路由失败时直接报告，不得切换到其它工具伪装成功。

## 2. 读契约

读取且只读取当前调用所需的 reference；一个问题涉及多个 `server_type` 时，分别读取对应文档。reference 用于选择工具和构造参数，MCP Server 负责最终校验。如 reference 与线上不一致，运行 `list-tools` 查看实时契约，不得猜参数。

Wind 代码字段必须按当前工具 `inputSchema` 的大小写和复数形式传递：`windcode`、`windCode`、`windCodes` 不是同义字段。CLI 只做空白清理、逗号分隔字符串拆分和已带后缀代码的大小写归一化（数组和字符串均支持），不会为中文名称或无后缀代码猜交易所后缀；期货/期权合约等特殊代码保持原样交给后端解析。

标的未识别或 NER 失败时，询问用户准确全称或 Wind 标准代码；不得自行补交易所后缀。涉及行业且用户未指定分类体系时，使用 Wind 行业分类。

## 3. 发命令

先切换到本 `SKILL.md` 所在目录，再执行：

```bash
node scripts/cli.mjs call <server_type> <tool_name> '<params_json>'
```

示例：

```bash
node scripts/cli.mjs call stock_research stock_get_company_profile '{"windCode":"600519.SH"}'
node scripts/cli.mjs call fund_research fund_get_basic_info '{"windCodes":["005827.OF"]}'
node scripts/cli.mjs call company_data company_search_entity '{"searchKey":"贵州茅台"}'
node scripts/cli.mjs call edb_data economic_search_indicator '{"question":"中国GDP相关指标"}'
```

PowerShell、cmd 或被执行器二次包装时，优先将 UTF-8 JSON 从 stdin 传入并把最后一个参数写为 `-`，避免命令行转义破坏 JSON，也不需要向 Skill 安装目录写临时文件：

```powershell
$requestJson='{"windCodes":"600519.SH","indexes":"\u6700\u65b0\u6210\u4ea4\u4ef7,\u4ea4\u6613\u65f6\u95f4"}'
$requestJson | node scripts/cli.mjs call finance_data quote_get_realtime_indicators -
```

经过可能改写命令文本的 Windows 执行器时，命令中的非 ASCII JSON 值使用 `\uXXXX` 转义。已有 UTF-8 JSON 文件时也可用 `@<文件路径>` 传入；临时文件必须位于客户端允许写入的临时目录或工作区，不得写入 Skill 安装目录，也不得复用共享请求文件。

认证由 CLI 处理。仅当真实调用返回 `AUTH_ERROR` 时报告认证问题；不得在输出、日志或交付文件中写入 Key。

### 批量与并发

默认串行。对多个标的逐项调用时，先调用第一个作为探针；探针成功后再继续。探针出现 `RATE_LIMIT_ERROR`、`backend_error` 或认证错误时立即停止该批次。用户明确要求并发时上限 10。

## 4. 验回执

成功时 stdout 为 MCP 结果对象，后端正文通常位于 `content[0].text`，CLI 另附 `cli_meta`。优先解析 `content[0].text` 中的 JSON；数量、单位、量级、币种、频率和时间口径一律以返回元数据为准，缺失时保留原值并说明未知，不得自行换算。

返回体中的证券代码、公司名称、基金代码等实体标识必须与用户目标一致；名称解析到其它实体或存在歧义时，不得用该结果作答，应请用户提供准确全称或 Wind 标准代码。空的 `data` / `metrics`、无匹配记录或没有公开记录属于 `NO_RESULTS`，不得改写为服务错误或补造结果。

失败时 stdout 为 `{ "ok": false, "code": "...", "message": "..." }`。按 `message` 指出的字段修正；除非工具契约证明原工具无法表达需求，不得随意切换 `server_type` 或 `tool_name`。

后端返回 `backend_error` 时保留 CLI 原始错误并停止当前批次，不猜测替代 endpoint、不改写工具名或业务参数。多个 server 返回相同后端错误时标记 `BLOCKED_BACKEND`；只有没有结构化后端错误、仅有本地异常时才标记 `BLOCKED_RUNTIME`。

修正后重试前逐项检查：

- 保持用户原始业务条件，不擅自增删筛选条件、时间范围或口径。
- 参数名、类型、枚举和必填项来自当前工具 `inputSchema`。
- 只修正错误明确指出的字段。
- 日期范围、成对字段和互斥字段保持一致。
- 返回空数据时报告 `NO_RESULTS`，不得补造结果。
- 同一 `server_type + tool_name + 参数` 不得原样重发；成功结果直接复用，失败后必须有契约或错误信息支持的参数修正。`backend_error` 原样调用最多报告一次。

成功返回数据时，在答复末尾附与用户语言一致的来源声明：

> 数据来源于 Wind Alice 万得金融数据服务。

> Data sourced from Wind Alice Financial Data Service.

完成状态：`DONE`、`DONE_WITH_LIMITS`、`NO_RESULTS`、`BLOCKED_KEY`、`BLOCKED_QUOTA`、`BLOCKED_BACKEND`、`BLOCKED_RUNTIME`、`OUT_OF_SCOPE`。
