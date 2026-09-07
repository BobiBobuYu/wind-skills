# `fund_research` 工具契约：净值、业绩、场内行情与 ETF 申赎清单

覆盖基金时点净值、区间业绩与评级、场内基金单日行情摘要、ETF 申赎清单（PCF）。 参数名称、类型、必填项、示例与默认值和枚举以本文件各工具的契约为准。

- `windCodes` 必须是数组（最多 50）；`includeFields` 只在 `fund_get_performance`、`fund_get_listed_historical_price` 上可用，留空取默认包，指定时逐字用助记符。
- 本文件的净值和行情都是时点或单日摘要，不返回序列。净值或价格的历史序列读 `references/quote.md`，用 `quote_get_historical_data_series`。
- `asOfDate` / `tradeDate` 不传取最新可用日期，非交易日自动回溯；实际日期以返回体的日期字段为准。
- `fund_get_etf_pcf` 的 `asOfDate` 必填，只适用于 ETF。
- 返回正文是 Markdown 表格。

## 工具契约

### `fund_get_nav`

- **功能**：获取单只或多只基金截至指定查询日期可取得的时点单位净值。
- **适用场景**：用于查看单位净值、复权或累计单位净值、净值日期和币种；货币基金可查看万份收益和 7 日年化收益率，并按需展开公布类型。
- **返回**：返回基金代码、名称、实际净值日期、单位净值及按需字段；查询截止日与实际净值所属日期分开标注。
- **边界**：仅返回时点值，不提供历史或区间净值序列、分红拆分折算、区间收益、排名评级、风险指标、规模份额、场内行情或申赎状态；与规模勾稽时必须使用同一实际净值日，区间计算需另取历史数据。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 是 | array<string> | — | — | 基金代码或基金名称列表，例如 ["000001.OF", "广发稳健增长A"] |
| `asOfDate` | 否 | string | — | — | 截止日期 YYYY-MM-DD；不传用调用当天；实际净值日期以 f_nav_date2 为准，不一定等于截止日。 |

### `fund_get_performance`

- **功能**：根据基金代码和分析区间查询基金业绩表现及风险评价数据。
- **适用场景**：用于查看不同区间收益、同类排名和 Wind 评级，比较波动率、回撤、下行风险及 Sharpe、信息比率、Alpha、Beta 等风险调整收益指标。
- **返回**：返回收益、同类排名、Wind 评级、风险指标和风险调整收益指标，并标注统计区间、截止日、年化口径和基准；缺失与不适用分开表达。
- **边界**：各收益和风险指标必须按同一截止日、频率、年化方式和基准解释；可与单位净值、主动管理和因子分析组合核对，但本结果只描述历史统计，不延伸为交易判断。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 是 | array<string> | — | — | 基金代码或基金名称列表，例如 ["000001.OF", "广发稳健增长A"] |
| `includeFields` | 否 | array<string> | 项：`f_info_windcode` / `f_info_name` / `f_return_1w` / `f_return_1m` / `f_return_3m` / `f_return_6m` / `f_return_1y` / `f_return_2y` / `f_return_3y` / `f_return_5y` / `f_return_ytd` / `f_return_std` / `f_nav_periodreturnranking_1w` / `f_nav_periodreturnranking_1m` / `f_nav_periodreturnranking_3m` / `f_nav_periodreturnranking_6m` / `f_nav_periodreturnranking_1y` / `f_nav_periodreturnranking_3y` / `f_nav_periodreturnranking_5y` / `f_nav_periodreturnranking_ytd` / `f_rating_wind3y` / `f_rating_wind5y` / `f_risk_stdevyearly` / `f_risk_maxdownside` / `f_risk_maxdownside_recoverdays` / `f_risk_downsiderisk` / `f_risk_annutrackerror_index` / `f_risk_sharpe` / `f_risk_inforatio` / `f_risk_treynor` / `f_risk_sortino` / `f_risk_calmar` / `f_risk_alpha` / `f_risk_beta` | — | 字段助记符列表，留空返回默认包（10 收益+8 排名+2 评级+12 风险三窗口）；可选 f_return_1w=近1周回报 / f_return_1m=近1月回报 / f_return_3m=近3月回报 / f_return_6m=近6月回报 / f_return_1y=近1年回报 / f_return_2y=近2年回报 / f_return_3y=近3年回报 / f_return_5y=近5年回报 / f_return_ytd=今年以来回报 / f_return_std=成立以来回报 / f_nav_periodreturnranking_1w=近1周回报排名 / f_nav_periodreturnranking_1m=近1月回报排名 / f_nav_periodreturnranking_3m=近3月回报排名 / f_nav_periodreturnranking_6m=近6月回报排名 / f_nav_periodreturnranking_1y=近1年回报排名 / f_nav_periodreturnranking_3y=近3年回报排名 / f_nav_periodreturnranking_5y=近5年回报排名 / f_nav_periodreturnranking_ytd=今年以来回报排名 / f_rating_wind3y=Wind3年评级 / f_rating_wind5y=Wind5年评级 / f_risk_stdevyearly=年化波动率 / f_risk_maxdownside=最大回撤 / f_risk_maxdownside_recoverdays=最大回撤恢复天数 / f_risk_downsiderisk=下行风险 / f_risk_annutrackerror_index=跟踪误差(跟踪指数,年化) / f_risk_sharpe=Sharpe / f_risk_inforatio=信息比率 / f_risk_treynor=Treynor / f_risk_sortino=Sortino / f_risk_calmar=Calmar / f_risk_alpha=Alpha_FUND / f_risk_beta=Beta_FUND；f_risk_*（除评级）自动展开近1/3/5年窗口；f_info_windcode、f_info_name 必返、即使未传也会置顶返回。 |
| `asOfDate` | 否 | string | — | — | 截止日期 YYYY-MM-DD；非交易日回溯至前一交易日；不传用最近交易日。 |
| `benchmarkWindCode` | 否 | string | — | 默认：`"000300.SH"` | 风险调整字段基准指数，默认 000300.SH。 |

### `fund_get_listed_historical_price`

- **功能**：根据基金代码和指定交易日查询基金交易行情及市场交易数据。
- **适用场景**：用于查看收盘价、成交量、IOPV、折溢价率、净流入额和融资融券余额等交易指标。
- **返回**：返回基金代码、名称、实际交易日及可取得的行情指标，单位和币种分开标注；场外基金的场内指标返回不适用。
- **边界**：这是指定交易日的单日行情，不替代技术分析或申赎清单；技术指标应沿用同一价格序列和交易日，跨日期比较时需明确实际交易日。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 是 | array<string> | — | — | 基金代码或基金名称列表，例如 ["510300.OF", "中证500ETF南方"] |
| `includeFields` | 否 | array<string> | 项：`f_info_windcode` / `f_info_name` / `f_dq_close` / `f_dq_volume` / `f_nav_iopv` / `f_nav_iopv_discountratio` / `f_mf_netinflow` / `s_margin_tradingandseclendingbalance` | — | 指定字段助记符列表，留空返回默认行情字段包（收盘价/成交量/IOPV/IOPV溢折率/净流入额/融资融券余额）；可选 f_dq_close=收盘价 / f_dq_volume=成交量 / f_nav_iopv=IOPV / f_nav_iopv_discountratio=IOPV溢折率 / f_mf_netinflow=净流入额 / s_margin_tradingandseclendingbalance=融资融券余额；f_info_windcode、f_info_name 必返、即使未传也会置顶返回。 |
| `tradeDate` | 否 | string | — | — | 行情交易日 YYYY-MM-DD；非交易日自动回溯；不传用最近交易日；同一请求所有基金共享同一实际交易日。 |

### `fund_get_etf_pcf`

- **功能**：查询某只 ETF 在指定日期的申购赎回成分证券及现金替代参数。
- **适用场景**：用于核对成分证券 Wind 代码、名称和申赎数量，查看现金替代类型、现金替代比例及固定替代金额。
- **返回**：返回成分证券及申赎参数，并区分请求日期和实际公告日期；未取得指定日期清单时标识实际日期、回退情况或不适用状态。
- **边界**：这是 ETF 申赎清单，不替代单日行情或技术指标；清单估值或申赎核对时应与同日行情及基金身份信息结合，实际公告日与请求日不一致时按实际公告日解释。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCode` | 是 | string | — | — | 单只基金代码或基金名称，例如 "510300.OF" 或 "中证500ETF南方"。 |
| `asOfDate` | 是 | string | — | — | PCF 公告日期 YYYY-MM-DD；返回该日期前最近一期已披露的 PCF。 |

## 示例

```bash
node scripts/cli.mjs call fund_research fund_get_nav '{"windCodes": ["510300.SH"]}'
```
