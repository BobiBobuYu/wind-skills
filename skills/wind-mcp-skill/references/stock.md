# `stock_research` 入口：股票研究

本站 15 个工具分 2 个主题文件。先按下表选一份主题文件再读，只读那一份；下面的通用守则对本站所有工具生效。

- `windCode` 只传一只股票的名称或代码，如 `贵州茅台`、`600519.SH`、`AAPL.O`；多标的拆成多次调用。
- 后端按名称做实体识别，名称不存在或有歧义时会匹配到另一家公司（实测传入不存在的名称返回了其它公司的画像）。作答前必须核对返回体中的证券代码或公司名称与用户标的一致，不一致按标的未识别处理并向用户确认。
- 历史 K 线、分钟走势、多标的最新价快照不在本站，走 `finance_data`（`references/finance/quote.md`）；公告新闻走 `financial_docs`，研报走 `finance_data`（`references/finance/general-docs.md`）。
- 返回 JSON，字段名为中文；单位随字段自带说明，不自行换算。

## 主题文件

| 问题涉及 | 读 | 工具 |
| --- | --- | --- |
| 全市场 / 板块 / 行业 / 主题盘中表现、市场叙事、大类资产阶段表现、行业投研语料 | `references/stock/market.md` | `stock_get_market_realtime_analysis`, `stock_get_sector_realtime_analysis`, `stock_get_market_narratives`, `stock_get_narrative_details`, `stock_get_asset_market_performance`, `stock_get_industry_research` |
| 单只股票画像、财务、盈利预测、估值、近期动态、资金流、技术指标、盘中表现；自然语言选股 | `references/stock/company.md` | `stock_screener`, `stock_get_company_profile`, `stock_get_company_finance_analysis`, `stock_get_company_earnings_estimate`, `stock_get_company_valuation`, `stock_get_company_updates`, `stock_get_money_flow_analysis`, `stock_get_technical_analysis`, `stock_get_realtime_analysis` |
