## 结论

- 前 50 题盲评总分：开发仓 3.3.0 **22.36**，主站 2.0.4 **21.44**（满分 25）；开发仓胜 25、主站胜 19、平 6。
- 优势几乎全部来自覆盖面。评审判定「主站缺站点或工具」的 16 题，开发仓 16 胜 0 负（均分 23.5 对 17.9）：期货 9 题、期权 3 题，以及股票里的一致预期（Q5、Q6、Q13）、提价公告与行业研究（Q11）、港股财报指标树（Q2）。
- 双方都能覆盖的 22 题，主站略优：主站胜 10、开发仓胜 6、平 6，均分 23.27 对 22.59。这一段是开发仓需要补课的地方，失分点集中在契约与线上不一致、字段静默丢失、批量调用一损俱损、路由指引缺失。
- 开发仓有 5 题因自身能力缺口输给主站：Q20（基金份额不随 asOfDate 变化、无 ETF 净流入字段）、Q22（fund_get_nav 无累计净值）、Q24（fund_get_basic_info 无经理任职起止）、Q33（无组合久期）、Q47（finance_data 不识别 LME 与汇率代码）。
- 执行层：开发仓平均每题调用 6.68 次、成功率 90.4%；主站 5.38 次、96.3%。开发仓 12 题次 backend_error，主站 1 题次。开发仓 5 题触到 12 次上限（Q2、24、28、36、50），主站 1 题。忠实度两边都接近满分（4.92 / 4.94），50 题未发现编造数据。
- 主站 6 题直接判 OUT_OF_SCOPE（Q13、42、43、44、45、49），其中 Q43 是纯概念题也被拒答。

## 开发仓 3.3.0 需要优先修的问题（按出现频次）

1. **`stock_research.stock_get_company_finance_analysis`**：reportPeriod 契约示例的 CY 前缀线上必报 backend_error，须用 FY（Q2、8、9、15）；多报告期参数只回最新一期或直接报错（Q11、15）；单季 reportPeriod 静默丢弃（Q1）；随响应附带的生成式「财务分析」文本与同一响应的结构化字段互相矛盾（Q5、10、12），契约应声明该文本不得当数据源。
2. **`finance_data.quote_get_realtime_indicators`**：中文指标名部分静默不解析，「最新价」「持仓量」不报错但空返回（Q7、39、44、47）；「总市值」被映射为 TOTALCAPITAL 总股本（Q14）；批量传入只要一个代码未识别整批失败（Q45、47）。finance.md 应直接给常用字段代码表、LME 与汇率代码写法，并建议先 `quote_search_realtime_indicators` 取 enName。
3. **`quote_get_historical_data_series`**：rangeflag=0 加 count 返回 1995/2009 年数据而非最近 N 根（Q40、47），与 reference 描述不符，应改文档为 rangeflag=2 加起止日期。
4. **EDB 权限分级**：中债估值中心口径指标（S0059744–52、M10128xx）对本账号无权限（Q29、32、35、36），Wind 自有口径 M1001654、中国货币网 M0048267 等可用；economic.md 应直接列替代代码，避免每题多轮拼代码。
5. **基金站**：`fund_get_basic_info` 批量一个标的未识别就整体 backend_error（Q28），养老 FOF 名称需别名容错；`fund_get_size` 份额不随 asOfDate 变（Q20）；`fund_get_nav` 无累计净值（Q22）；无经理任职起止（Q24）；无组合久期（Q33）；中文名检索 ETF 返回 .OF 后缀（Q18）。
6. **期货、期权契约缺口**：无「当前主力合约代码」字段（Q43）；无按品种列出存续合约的工具（Q45）；`futures_get_contract_spec` 传具体合约仍回品种级条款（Q43）；`options_get_term_metrics` 价格、隐波、成交持仓全空（Q50）；`options_get_listed_terms` 的 tradeDate 实际必填（Q50）；volatility.md 缺「偏斜分位走 variety_stats 的 skew_normalized」路由（Q49）；基差分位是近 3 年口径需标注（Q46）。
7. **路由指引**：Q31 执行者误判「没有收益率曲线聚合指标」，SKILL.md 缺「曲线类查询走 edb_data」的指引；Q3 中文名传给 earnings_estimate 被解析成错误代码，契约应强制带后缀代码。

## 主站 2.0.4 的问题（供参考）

- 无期货、期权、一致预期、行业研究、Brinson 归因工具；路由表把商品期货一刀切判 OUT_OF_SCOPE，但 EDB 里其实有沪铜基差、库存等指标可用（Q42、46）。
- SKILL.md 示例的行情别名 PE(TTM)、PB 线上无效，只在 message 里警告不报错（Q11）；通用「市净率」字段对多只标的返回 0.000（Q3、5、6、7、15）。
- `get_stock_events` 不按实体过滤（Q30）；`get_fund_holdings` 重仓基金名称列错位（Q28）；利率债与信用债占比标签错配（Q33）；`get_bond_basicinfo` 不带主体评级需二次调用（Q38）。

## 两版本共同的后端问题

observation=1 只回 meta 不回序列（Q34）；`get_bond_issuer_info` 评级滞后且无评级日期（Q30）；退市转债行情返回全 0 而非 NO_RESULTS（Q37）；`get_bond_basicinfo` 混入已到期债券（Q38）；`get_company_announcements` 长 query 零命中、正文顶部混入生成式摘要与未填充占位符（Q1）；同名指标 ROE 两站口径不同（Q4）。

## 过程事故

- Anthropic 会话用量 10:40 UTC 触顶一次，20 个执行者中断；其中 6 个已写完结果文件予以保留，其余重跑。
- Wind 账号 10:43 UTC 起返回「单日请求次数超限」，12 份受污染结果隔离到 `results/quarantine/` 并重跑；充值后 11:00 UTC 恢复。
- 本轮按用户要求只跑前 50 题；Q51–100 的 prompts 已生成在 `prompts/`，可直接续跑。

## 局限

- 执行者为 Claude Sonnet 5，每题单次运行，未做重复采样；同题 1–2 分的分差不应过度解读。
- 单评审员盲评，未做多评审员一致性检验。
- 12 次调用上限对开发仓更不利，它有 11 站且常需先检索字段代码。
