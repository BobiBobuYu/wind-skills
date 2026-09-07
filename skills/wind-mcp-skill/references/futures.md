# `futures_data` 入口：期货

本站 7 个工具分 2 个主题文件。先按下表选一份主题文件再读，只读那一份；下面的通用守则对本站所有工具生效。

- 品种代码用品种级 Wind 代码，如 `CU.SHF`、`AL.SHF`、`M.DCE`；多数工具也接受名称如 `沪铜`。`futures_get_position_ranking` 不支持中文名称，用户给中文时要求提供代码。
- `windCodes` 必须是数组；`date` / `startDate` / `endDate` 格式 `YYYY-MM-DD`。
- 返回 JSON，`fields` + `rows` 结构；单位随品种记录。

## 主题文件

| 问题涉及 | 读 | 工具 |
| --- | --- | --- |
| 合约规格与交割规则、基差快照与历史、资金变动、交易所席位排名 | `references/futures/market.md` | `futures_get_contract_spec`, `futures_get_basis`, `futures_get_fund_flow`, `futures_get_position_ranking` |
| 仓单与交割汇总、商品供需指标、公开研报方向统计 | `references/futures/fundamentals.md` | `futures_get_warehouse_receipt`, `futures_get_supply_demand`, `futures_get_research_opinion` |
