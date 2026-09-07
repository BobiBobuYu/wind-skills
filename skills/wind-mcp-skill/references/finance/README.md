# `finance_data` 入口：通用工具

本站 13 个工具分 3 个主题文件。先按下表选一份主题文件再读，只读那一份；下面的通用守则对本站所有工具生效。

- 本站是全品种兜底：行情快照与历史序列覆盖股票、基金、指数、债券、期货、外汇、衍生品；指标取数、报表、文档、投研语料按主题文件分流。
- 参数用 camelCase（`windCode`、`windCodes`、`startDate`）；`windCodes` 在本站是英文逗号分隔的字符串，单次最多 50 个。
- 与 `analytics_data`、`financial_docs` 的取舍待评审，评审前按 SKILL.md 仲裁顺序执行。

## 主题文件

| 问题涉及 | 读 | 工具 |
| --- | --- | --- |
| 任意品种的最新行情快照、历史 K 线、分时（股票、基金、期货、外汇等；指数优先用 index_data） | `references/finance/quote.md` | `quote_search_realtime_indicators`, `quote_get_realtime_indicators`, `quote_get_historical_data_series` |
| 自然语言标准指标取数、专业指标字典与按代码取数、金融报表发现与读取 | `references/finance/general-data.md` | `general_query_data`, `general_search_indicators`, `general_get_indicator_data`, `general_search_datasets`, `general_get_dataset` |
| 全球新闻 / 公告 / 研报清单与单篇、自然语言文档检索、参考投研语料 | `references/finance/general-docs.md` | `general_search_documents`, `general_get_document`, `general_query_documents`, `general_search_research_insight`, `general_get_research_insight` |
| 行情指标字段清单（仅 `quote_get_realtime_indicators` 的 `indexes` 需要） | `references/finance/quote-indicators.md` | — |
