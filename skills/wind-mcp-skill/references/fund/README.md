# `fund_research` 入口：基金研究

本站 21 个工具分 5 个主题文件。先按下表选一份主题文件再读，只读那一份；下面的通用守则对本站所有工具生效。

- `windCodes` 必须是数组，每次最多 50 个，元素可以是代码或名称，如 `["005827.OF","广发稳健增长A"]`；`windCode` 类工具只传一只。CLI 会把英文逗号分隔的字符串收敛成数组，但不要依赖。
- `includeFields` 只在契约里列出该字段的工具上可用，留空返回默认字段包；指定时逐字使用表中的助记符，不得自造。
- 本站返回正文是 Markdown 表格，不是 JSON；数值单位写在单元格内。
- 净值和行情都是时点或单日摘要；净值或价格的历史序列走 `finance_data`（`references/finance/quote.md`）。
- 日期一律 `YYYY-MM-DD`；不传日期的工具取最新可用日期，实际日期以返回体为准。

## 主题文件

| 问题涉及 | 读 | 工具 |
| --- | --- | --- |
| 自然语言筛选基金；批量取档案、申赎状态、规模、财务 | `references/fund/screen-profile.md` | `fund_screener`, `fund_get_basic_info`, `fund_get_purchase_redemption_status`, `fund_get_size`, `fund_get_financials` |
| 时点净值、区间业绩与评级、场内基金单日行情、ETF 申赎清单（PCF） | `references/fund/nav-performance.md` | `fund_get_nav`, `fund_get_performance`, `fund_get_listed_historical_price`, `fund_get_etf_pcf` |
| 资产 / 行业 / 债券品种配置、股票与债券持仓、重仓股、FOF 基金持仓 | `references/fund/holdings.md` | `fund_get_asset_allocation`, `fund_get_industry_allocation`, `fund_get_bond_type_allocation`, `fund_get_equity_holdings`, `fund_get_top_equity_holdings`, `fund_get_bond_holdings`, `fund_get_top_fund_holdings` |
| Brinson 归因、多因子收益归因、风格暴露 | `references/fund/attribution.md` | `fund_get_brinson_attribution`, `fund_get_return_attribution`, `fund_get_style_analysis` |
| 选股择时能力、相似基金候选 | `references/fund/position-peers.md` | `fund_get_selection_timing_analysis`, `fund_get_similar_funds` |
