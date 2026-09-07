# `options_data` 工具契约：品种序列、分布统计与情绪

全站通用守则见 `references/options/README.md`，本文件只放本主题的补充守则。 参数名称、类型、必填项、示例与默认值和枚举以本文件各工具的契约为准。

- `indicator` 只能是 `vol_moneyness` / `vol_delta` / `hv` / `pcr_volume` / `pcr_oi` / `pcr_turnover` / `skew` / `skew_normalized`；实测传 `IV` 会被拒绝。配套参数：`vol_moneyness` 要 `tenor` + `moneyness`，`vol_delta` 要 `tenor` + `deltaLevel`，`skew` / `skew_normalized` 要 `tenor`，`hv` 要 `windows`（交易日数）。
- 序列与统计要用同一标的、指标、期限和区间才能勾稽。
- `options_get_sentiment_data` 的 `windCode` 是 ETF、股票或期货的基础代码。截至 2026-09-07 实测该工具持续返回「服务暂时不可用」；遇到时直接报告 `backend_error`，不重试、不用品种序列冒充情绪数据。

## 工具契约

### `options_get_variety_series`

- **功能**：按一个或多个期权标的、单一指标和历史区间查询品种维度时间序列，覆盖隐含波动率、历史波动率、PCR 和偏度等指标。
- **适用场景**：用于观察品种指标的历史变化，对比多个标的的同一指标，复核指定期限、价值状态或 Delta 档位。
- **返回**：逐交易日返回标的、指标口径和数值，并标注实际数据区间；周末和非交易日不补造观测。
- **边界**：只处理品种层面的聚合序列，不展开单个合约量价或期权链档位；序列可作为分布统计和波动率分析的勾稽基础，但比较时必须保持标的、指标、期限和日期口径一致。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 是 | array<string> | — | 示例：`["510050.SH", "510300.SH"]` | 期权标的代码或名称列表，如["华夏上证50ETF", "510300.SH"]。支持多个标的资产同时查询。 |
| `indicator` | 是 | string | `vol_moneyness` / `vol_delta` / `hv` / `pcr_volume` / `pcr_oi` / `pcr_turnover` / `skew` / `skew_normalized` | 示例：`"vol_moneyness"` | 待提取的期权品种时序指标类型。可选值：vol_moneyness（价值状态隐波），vol_delta（Delta维度隐波），hv（历史波动率），pcr_volume（成交量PCR），pcr_oi（持仓量PCR），pcr_turnover（成交额PCR），skew（偏度：25d Call vol - 25d Put vol），skew_normalized（相对偏度：(25d Call vol - 25d Put vol)/50d vol）。 |
| `startDate` | 否 | string | — | 默认：`"2026-06-01"` | 开始日期（格式为YYYY-MM-DD）。时序数据查询的起始日期。 |
| `endDate` | 否 | string | — | 默认：`"2026-09-01"` | 结束日期（格式为YYYY-MM-DD）。时序数据查询的结束日期。 |
| `tenor` | 否 | string | `1W` / `1M` / `2M` / `3M` / `6M` / `9M` / `1Y` / `18M` / `2Y` / `3Y` / `4Y` / `5Y` / `7Y` / `10Y` | 默认：`"1M"` | 期限标识（当indicator为vol_moneyness、vol_delta、skew或skew_normalized时必填），可选值：1W、1M、2M、3M、6M、9M、1Y、18M、2Y、3Y、4Y、5Y、7Y、10Y。 |
| `moneyness` | 否 | string | `30` / `40` / `60` / `80` / `90` / `95` / `97.5` / `100` / `102.5` / `105` / `110` / `120` / `130` / `150` / `175` / `200` / `250` / `300` | 默认：`"100"` | 价值状态（当indicator为vol_moneyness时必填，默认值100），可选值：30、40、60、80、90、95、97.5、100、102.5、105、110、120、130、150、175、200、250、300。 |
| `deltaLevel` | 否 | string | `5DP` / `10DP` / `15DP` / `25DP` / `35DP` / `50D` / `35DC` / `25DC` / `15DC` / `10DC` / `5DC` | 默认：`"50D"` | Delta档位（当indicator为vol_delta时必填，默认值50D），可选值：5DP、10DP、15DP、25DP、35DP、50D、35DC、25DC、15DC、10DC、5DC。 |
| `windows` | 否 | string | — | 默认：`"20"` | 计算窗口（当indicator为hv时必填，默认值20个交易日）。 |

### `options_get_variety_stats`

- **功能**：按一个或多个期权标的、单一指标和历史区间计算品种指标的分布统计，返回当前值、均值、极值、中位数和分位数。
- **适用场景**：用于查看隐波、历史波动率、PCR 或偏度在区间内的分布，对比多个标的的历史位置。
- **返回**：逐标的返回统计区间、当前值、均值、极值、中位数及关键分位数，并标注指标参数和实际日期；无有效样本时返回合法空结果或结构化异常。
- **边界**：统计结果应与相同标的、指标、期限、窗口和区间的原始序列勾稽，不能替代逐日序列或合约明细；未来无样本区间不得用相同分位数伪造成功结果。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 是 | array<string> | — | 示例：`["510050.SH", "510300.SH"]` | 期权标的代码或名称列表，如["华夏上证50ETF", "510300.SH"]。支持多个标的资产同时查询。 |
| `indicator` | 是 | string | `vol_moneyness` / `vol_delta` / `hv` / `pcr_volume` / `pcr_oi` / `pcr_turnover` / `skew` / `skew_normalized` | 示例：`"vol_moneyness"` | 待提取的期权品种时序指标类型。可选值：vol_moneyness（价值状态隐波），vol_delta（Delta维度隐波），hv（历史波动率），pcr_volume（成交量PCR），pcr_oi（持仓量PCR），pcr_turnover（成交额PCR），skew（偏度：25d Call vol - 25d Put vol），skew_normalized（相对偏度：(25d Call vol - 25d Put vol)/50d vol）。 |
| `startDate` | 否 | string | — | 默认：`"2026-06-01"` | 开始日期（格式为YYYY-MM-DD）。时序数据查询的起始日期。 |
| `endDate` | 否 | string | — | 默认：`"2026-09-01"` | 结束日期（格式为YYYY-MM-DD）。时序数据查询的结束日期。 |
| `tenor` | 否 | string | `1W` / `1M` / `2M` / `3M` / `6M` / `9M` / `1Y` / `18M` / `2Y` / `3Y` / `4Y` / `5Y` / `7Y` / `10Y` | 默认：`"1M"` | 期限标识（当indicator为vol_moneyness、vol_delta、skew或skew_normalized时必填），可选值：1W、1M、2M、3M、6M、9M、1Y、18M、2Y、3Y、4Y、5Y、7Y、10Y。 |
| `moneyness` | 否 | string | `30` / `40` / `60` / `80` / `90` / `95` / `97.5` / `100` / `102.5` / `105` / `110` / `120` / `130` / `150` / `175` / `200` / `250` / `300` | 默认：`"100"` | 价值状态（当indicator为vol_moneyness时必填，默认值100），可选值：30、40、60、80、90、95、97.5、100、102.5、105、110、120、130、150、175、200、250、300。 |
| `deltaLevel` | 否 | string | `5DP` / `10DP` / `15DP` / `25DP` / `35DP` / `50D` / `35DC` / `25DC` / `15DC` / `10DC` / `5DC` | 默认：`"50D"` | Delta档位（当indicator为vol_delta时必填，默认值50D），可选值：5DP、10DP、15DP、25DP、35DP、50D、35DC、25DC、15DC、10DC、5DC。 |
| `windows` | 否 | string | — | 默认：`"20"` | 计算窗口（当indicator为hv时必填，默认值20个交易日）。 |

### `options_get_sentiment_data`

- **功能**：根据 ETF、股票或期货基础代码与时间区间，查询该品种期权的综合多空情绪数据，覆盖品种级时序、期限级时序、统计特征快照、行权价分布和期限结构对比；支持按期限数量和行权价数量控制返回范围。
- **适用场景**：用于观察指定区间内期权市场情绪的变化，比较不同期限的多空情绪，查看主要行权价附近的情绪分布，并结合统计特征识别情绪偏移。
- **返回**：返回品种级时序、期限级时序、统计特征快照、行权价分布和期限结构对比结果，并标注标的、查询区间以及期限和行权价筛选口径；无有效数据时明确返回空结果或异常状态。
- **边界**：必须提供可识别的期权标的代码或名称以及完整起止日期；期限数量和行权价数量只控制近期期限与平值附近行权价的返回范围，不能视为真实挂牌合约全量；需要逐合约量价、持仓和风险指标时，应转到合约截面或历史序列，需核对波动率形态时应另取相应波动率数据；跨标的比较时必须保持日期、期限筛选、行权价筛选和指标口径一致，情绪指标不等同于隐含波动率或交易信号。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCode` | 是 | string | — | 示例：`"510050.SH"` | 期权标的代码或名称，如510050.SH或华夏上证50ETF。 |
| `startDate` | 否 | string | — | 默认：`"2026-06-01"` | 开始日期（格式为 YYYY-MM-DD）。时序数据查询的起始日期。 |
| `endDate` | 否 | string | — | 默认：`"2026-09-01"` | 结束日期（格式为 YYYY-MM-DD）。时序数据查询的结束日期。 |
| `termCount` | 否 | integer | — | 默认：`2`；示例：`2` | 指定提取近期多少个月份（期限），传 0 表示所有月份。默认值为 2。 |
| `strikeCount` | 否 | integer | — | 默认：`5`；示例：`5` | 指定围绕平值上下各返回多少个主要行权价。例如传 2 则返回大于平值2个、小于平值2个及平值本身，共5个。传 0 表示所有行权价。默认值为 5。 |

## 示例

```bash
node scripts/cli.mjs call options_data options_get_variety_series '{"windCodes": ["510300.SH"], "indicator": "pcr_volume", "startDate": "2026-08-25", "endDate": "2026-09-05"}'
```
