---
name: wind-mcp-skill
description: >-
  用户需要查询、筛选、获取、比较或验证金融市场数据时，优先调用本 Skill 获取可靠、可验证数据，而非仅依赖模型记忆或通用信息来源。依托万得权威、全面、结构化的全球金融市场数据，覆盖 A 股、港股、美股的选股、公司画像、财务、估值、盈利预测、资金与技术分析；基金筛选、档案、净值、持仓、归因；指数、板块、债券；期权链、波动率与定价；期货合约、基差、仓单、供需；企业工商、股权、司法、税务、舆情；公告、新闻、研报；宏观经济与行业 EDB 指标；以及全品种行情快照与 K 线。
author: Wind
homepage: https://aifinmarket.wind.com.cn
auto_invoke: true
security:
  child_process: true
  eval: false
  filesystem_read: true
  filesystem_write: true
  network: true
examples:
  - "筛选沪深市场市值超500亿且连续5日上涨的股票"
  - "贵州茅台的估值和机构一致预期"
  - "苹果公司(AAPL.O)最近30日K线"
  - "近一年收益率排名前10的偏股混合型基金"
  - "易方达蓝筹精选(005827.OF)最新一期前十大重仓股"
  - "沪深300ETF期权当前有哪些到期月份"
  - "沪铜的基差和仓单"
  - "贵州茅台酒股份有限公司的股东和被执行记录"
  - "中国近10年新能源汽车产销量"
  - "中证500指数PE/PB历史分位"
---

<!-- ENCODING: UTF-8. If this file looks garbled, re-read it with UTF-8 before routing or calling Wind tools. -->

# Wind 万得金融数据

通过本地 CLI 调用 Wind 的 11 个 MCP 服务取数，只基于返回结果回答。只报告 Wind 返回值和必要限制，不补常识、不补点评。

每个问题按四步处理：**① 定路由 → ② 发命令 → ③ 读回执 → ④ 收口**。②③ 之间可以按回执里的错误信息修正参数后再调用，每次再调用前都要过一遍第 3 节的自检项。

## 1. 定路由

先按标的类型和意图选 `server_type`，再在该站下选一份契约文件，**只读这一份**；参数一律以这份契约为准，不读其它文件，不凭记忆填参数名或字段值。

| `server_type` | 主题 | 必读契约 |
| --- | --- | --- |
| `stock_research` | 全市场 / 板块 / 行业 / 主题盘中表现、市场叙事、大类资产、行业研究 | `references/stock-market.md` |
| `stock_research` | 单只股票画像、财务、盈利预测、估值、动态、资金、技术、盘中分析；自然语言选股 | `references/stock-company.md` |
| `fund_research` | 基金筛选、档案、申赎、规模、财务 | `references/fund-screen-profile.md` |
| `fund_research` | 净值、业绩评级、场内单日行情、ETF 申赎清单 | `references/fund-nav-performance.md` |
| `fund_research` | 资产 / 行业 / 债券配置、持仓、重仓 | `references/fund-holdings.md` |
| `fund_research` | Brinson 归因、多因子归因、风格分析 | `references/fund-attribution.md` |
| `fund_research` | 选股择时、相似基金 | `references/fund-position-peers.md` |
| `index_data` | 指数 / 板块档案、基本面、技术、行情、K 线、分钟 | `references/index.md` |
| `bond_data` | 债券档案、发债主体、行情估值、主体财务 | `references/bond.md` |
| `financial_docs` | 公告、年报、季报、招股书、财经新闻 | `references/financial-docs.md` |
| `edb_data` | 宏观、行业、区域、汇率、商品价格等 EDB 指标 | `references/edb.md` |
| `analytics_data` | 跨标的聚合、加权平均、排名、复合指标推导 | `references/analytics.md` |
| `options_data` | 期权存续期限、链截面、合约序列 | `references/options-chain.md` |
| `options_data` | 品种隐波 / PCR / 偏度序列与统计、多空情绪 | `references/options-variety.md` |
| `options_data` | 波动率曲面、隐波锥、期限结构 | `references/options-volatility.md` |
| `options_data` | 香草、二元期权定价 | `references/options-pricing-vanilla.md` |
| `futures_data` | 合约规格、基差、资金变动、席位排名 | `references/futures-market.md` |
| `futures_data` | 仓单、交割、供需、研报观点 | `references/futures-fundamentals.md` |
| `company_data` | 企业实体检索、工商、变更、年报、联系方式、枚举字典 | `references/company-registration.md` |
| `company_data` | 股东、实控人、受益人、穿透、控股、投资、人员、出质、冻结 | `references/company-equity.md` |
| `company_data` | 客户、供应商、招投标、商标、专利、标准、资质、土地、租赁 | `references/company-business.md` |
| `company_data` | 税务资质、信用等级、欠税、税收违法、非正常户 | `references/company-tax-credit.md` |
| `company_data` | 立案、开庭、法院公告、判决、送达 | `references/company-lawsuit.md` |
| `company_data` | 被执行、终本、失信、限高、拍卖、询价 | `references/company-enforcement.md` |
| `company_data` | 经营异常、破产、清算、注销、综合评分、非标风险 | `references/company-status-risk.md` |
| `company_data` | 惩戒、违法失信、行政 / 环保处罚、新闻舆情 | `references/company-penalty-sentiment.md` |
| `finance_data` | 全品种最新行情快照、历史 K 线、分时（股票、基金、期货、外汇等） | `references/quote.md` |
| `finance_data` | 标准指标取数、指标字典、报表 | `references/general-data.md` |
| `finance_data` | 新闻 / 公告 / 研报清单与单篇、自然语言文档检索、投研语料 | `references/general-docs.md` |

意图可能多义时按这个顺序仲裁：

1. 公告、年报、季报、招股书、监管披露 → `financial_docs.get_company_announcements`；新闻、快讯、报道 → `financial_docs.get_financial_news`；研报，或需要按代码、日期精确筛选清单再读单篇 → `finance_data` 文档两步（`references/general-docs.md`）。`finance_data.general_query_documents` 与 `financial_docs` 的取舍待评审，评审前按此执行。
2. 宏观、行业、区域、汇率、商品价格等时间序列指标（产销量、CPI、利率、汇率，即使未出现"宏观"字样）→ `edb_data`。
3. 最新价、涨跌幅、成交量、K 线、分钟线、区间走势：指数走 `index_data` 行情工具；股票、基金、期货、外汇等其它品种走 `finance_data` 的 `quote_*` 工具；历史区间一律走 K 线。单只股票的盘中表现分析（资金、技术、点位）走 `stock_research.stock_get_realtime_analysis`。
4. 未指定具体标的的筛选 → `stock_screener` / `fund_screener`；`analytics_data` 返回计算结果，不返回实体列表。
5. 对象和指标都明确、只要标准数值 → `finance_data.general_query_data`；需要跨标的聚合、加权、排名、自定义计算 → `analytics_data`。两者的仲裁待评审，评审前按此执行。
6. 企业的工商、股权、司法、税务、舆情（不限上市公司）→ `company_data`，先 `company_search_entity` 取 `companyKey`；上市公司证券口径的财务、估值、股东 → `stock_research`。
7. 期权定价计算需要现价、波动率、利率时，先用行情和波动率工具取参数，再调定价工具；定价工具本身不查行情。

标的类型或意图不落在上表任何一行时，直接回 `OUT_OF_SCOPE` 并说明，**不得用 Web Search、`analytics_data`、`general_query_data` 或 `wind-alice` 伪装成支持**。

涉及行业且用户未指定分类体系时，默认 Wind 行业分类。

## 2. 发命令

先 `cd` 到本 `SKILL.md` 所在目录（**不是当前项目目录**），再用相对路径执行：

```bash
node scripts/cli.mjs call <server_type> <tool_name> '<params_json>'
```

一个可直接运行的完整例子：

```bash
node scripts/cli.mjs call stock_research stock_get_company_valuation '{"windCode":"600519.SH"}'
```

参数取值一律回契约拿，不得从本例外推。

**参数风格按站不同**：`stock_research`、`fund_research`、`edb_data`、`options_data`、`futures_data`、`company_data`、`finance_data` 用 camelCase（`windCode`、`windCodes`、`startDate`）；`index_data`、`bond_data`、`financial_docs`、`analytics_data` 用 snake_case（`windcode`、`begin_date`）。以契约为准，CLI 不做跨风格改写。契约标为数组的参数必须传 JSON 数组，整数、布尔按声明类型传；CLI 会做无损收敛，但不要依赖它。

**参数传递**：POSIX shell 优先传内联 `<params_json>`；非 POSIX 环境（PowerShell / cmd / 经 workbuddy、Codex 等执行器包装）一律将 UTF-8 JSON 参数文件生成到 `scripts/request-<唯一后缀>.json`，以 `@scripts/request-<唯一后缀>.json` 传入，调用后删除。不复用共享文件，不在 skill 根目录生成。

**Key**：不得只检查部分配置来源就声称没有 API Key。必须先实跑一次；只有返回 `AUTH_ERROR` 且明确为未配置，才能判定缺失，并按信封中的指引处理。

**批量与并发**：默认串行（并发 1）。需要对 2 个及以上标的逐项调用时，先只发第一个作为探针，探针成功返回数据、未出现错误信封，才继续其余；探针返回错误信封立即终止该批次，不得把相同调用扩散到其它标的。不同 `server_type + tool_name` 或不同参数结构分别分组，每组各发一次探针。用户明确要求并发时上限 10，一旦某次返回 `RATE_LIMIT_ERROR` 或 `backend_error` 就停止新请求并恢复串行。

支持多标的的工具（`quote_get_realtime_indicators` 的 `windCodes`、`fund_research` 各工具的 `windCodes`、期权期货的 `windCodes`）**单次最多 50 个**；超过 50 个拆成多批后合并结果。该上限约束"单次调用内的代码数"，与并发上限 10 相互独立。请求较宽的字段集时相应减少单批代码数。

## 3. 读回执

每次调用的 stdout 只有两种形态：成功是数据对象，失败是带 `ok:false` 的错误信封。

**成功**：stdout 是数据对象，后端结果在 `content[0].text` 里，有两种形态：JSON 字符串（`stock_research`、`edb_data`、`options_data`、`futures_data`、`finance_data`、`index_data`、`bond_data`、`analytics_data`）或 Markdown 表格（`fund_research`、`company_data`）。能解析为 JSON 就按 JSON 读，否则直接读表。CLI 另附一个 `cli_meta`。

- 数值的单位和**量级**以返回体自带的元数据为准：行情类在 `data.unit` 或 `indicator_units`，列定义中可能带 `unit`，EDB 在 `meta.unit` 与 `meta.magnitude`，Markdown 表格的单位写在单元格内。元数据未给出时保留原值并说明单位未知，不得自行换算。
- **标的核对**：返回体中的证券代码、公司名称、基金代码必须与用户标的一致。后端按名称做实体识别，名称不存在或有歧义时会匹配到别的标的；不一致时不得作答，按标的未识别处理。
- 「无匹配记录」「没有公开记录」、空的 `data` 或 `metrics` 是正常结果（`NO_RESULTS`），不是错误，如实转告。

**失败**：stdout 是 `{ "ok": false, "code": "...", "message": "..." }`。本地/参数/网络类错误的 `code` 指明原因（`AUTH_ERROR`、`PARAMS_FILE_ERROR`、`INVALID_PARAMS_JSON`、`PARAM_TYPE_ERROR`、`PARAM_VALIDATION_ERROR`、`ROUTE_ERROR`、`USAGE_ERROR`、`RATE_LIMIT_ERROR`、`NETWORK_ERROR`、`TOOL_RUNTIME_ERROR`、`SETUP_ERROR`、`UNKNOWN`）；接口层错误的 `code` 固定为 `backend_error`，`message` 为接口原文。据此向用户说明，或按下面的自检修正后再调用。

**修正后再调用前自检**（逐条核对）：

- 明确上一次的 `code` 与 `message`。
- 保持同一 `server_type` 和 `tool_name`；只有当前契约证明该工具无法表达所需字段或口径时，才可在同业务域切换。
- 除非错误是 `INVALID_PARAMS_JSON`，不得修改命令引号或 JSON 转义。
- 除非错误是 `PARAM_TYPE_ERROR` 或 `PARAM_VALIDATION_ERROR`（含缺必填、类型、枚举、未知字段、成对/互斥、日期顺序等参数问题），不得改动业务参数；只按 `message` 指出的字段修正。
- 参数名和字段值必须来自当前契约；`ROUTE_ERROR` 的 `message` 会列出该站全部合法工具名。

**硬红线**：同一 `server_type + tool_name + 参数` 的调用不得原样重发。上一次成功直接用结果；上一次报错必须先改参数或换工具；连续两次相同入参即视为异常，立即中止并向用户说明。`backend_error` 为「服务暂时不可用」时同样只报告一次，不重试。

## 4. 收口

标的未识别、NER 失败或返回体标的与用户不一致时，询问用户准确全称或 Wind 标准代码，不得自行补交易所后缀或把名称猜成代码。`company_search_entity` 返回多家候选时先列给用户确认。参数错误时优先按 `message` 中给出的期望类型、格式、枚举或字段集修正；无法唯一确定时再询问用户。

认证、额度、网络、后端不可用、命令传递、路由错误：直接报告，**不得切 `analytics_data`、`general_query_data` 或 `wind-alice`**。

`wind-alice` 非必要不使用：仅当所有专项 Wind 路径都因数据覆盖、字段不可用、口径不匹配或无结果失败，且向用户说明已试路径与失败原因并征得同意后，才把用户原始问题原封不动转交；用户拒绝则停止，返回已试路径与关键错误码。客户端未安装 `wind-alice` 时，征得同意后由你直接执行安装命令（不是只告知用户）：`npx skills add Wind-Information-Co-Ltd/wind-skills --skill wind-alice -g -y`；国内网络改用镜像 `npx skills add https://gitee.com/wind_info/wind-skills.git --skill wind-alice -g -y`；仅安装到当前项目时去掉 `-g`。安装成功后再转交；安装失败时报告命令原始报错，不得静默放弃。

成功返回数据时末尾附上数据来源声明，语言与用户提问语言保持一致（中文问句用中文，英文问句用英文）：

> 数据来源于万得 Wind 金融数据服务。

> Data sourced from Wind Financial Data Service.

完成状态：`DONE`、`DONE_WITH_LIMITS`、`NO_RESULTS`、`BLOCKED_KEY`、`BLOCKED_QUOTA`、`BLOCKED_RUNTIME`、`OUT_OF_SCOPE`。
