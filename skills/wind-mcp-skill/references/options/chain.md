# `options_data` 工具契约：期限、链截面与合约序列

全站通用守则见 `references/options/README.md`，本文件只放本主题的补充守则。 参数名称、类型、必填项、示例与默认值和枚举以本文件各工具的契约为准。

- 三步链路：`options_get_listed_terms` 用标的代码和交易日拿 `optionVarietyCode` 与 `expiryDate`；`options_get_term_metrics` 用这两个值看截面；`options_get_contract_series` 用截面里的合约代码看序列。后一步的代码只能来自前一步的返回。
- `strikeLevels` 与 `underlyingPrice` 配合缩小行权价范围，不传返回全部合约。

## 工具契约

### `options_get_listed_terms`

- **功能**：按期权标的和交易日查询存续期限结构，返回期权品种、到期日、期限类型、合约乘数类型和行权方式。
- **适用场景**：用于确认当前可用期限，为选择到期日和期权链范围提供依据，并核对欧式期权的期限属性。
- **返回**：逐条返回存续期限及其属性，并标注实际查询日期；没有匹配期限时明确返回无存续记录。
- **边界**：只处理品种和期限层面的存续关系，不展开合约历史行情、链上档位或波动率节点；后续查询应沿用本结果的品种代码和到期日。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCode` | 是 | string | — | 示例：`"510050.SH"` | 期权标的代码或名称，如510050.SH或华夏上证50ETF。 |
| `tradeDate` | 否 | string | — | 默认：`"2026-09-01"` | 交易日（格式为YYYY-MM-DD）。查询上市期权品种期限的日期。 |

### `options_get_term_metrics`

- **功能**：按期权品种、交易日、到期日和标的参考价查询期权链截面，返回合约基础信息、量价、隐含波动率及 Delta、Gamma、Vega、Theta。
- **适用场景**：用于查看某一到期日的上下档位，比较认购与认沽合约的价格、成交量、持仓量和风险指标。
- **返回**：按合约逐条返回代码、名称、类型、行权价、合约乘数、量价和风险指标，并标注截面交易日；无匹配时明确返回空截面。
- **边界**：只反映一个交易日和一个到期日的截面，不替代存续期限或历史序列；品种、到期日、合约代码及指标应与相关结果逐项核对，不能把档位筛选当成完整市场行情。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `optionVarietyCode` | 是 | string | — | 示例：`"510050OP.SH"` | 期权品种代码，如510050OP.SH表示上证50ETF期权。通常由上游工具 `options_get_listed_terms` 的返回结果中获取。 |
| `tradeDate` | 否 | string | — | 默认：`"2026-06-01"`；示例：`"2026-06-01"` | 交易日（格式为YYYY-MM-DD）。查询上市期权品种期限的日期。 |
| `expiryDate` | 否 | string | — | 默认：`"2026-09-01"`；示例：`"2026-09-01"` | 期权到期日（格式为YYYY-MM-DD）。指定要获取哪个期限下的期权链。通常由上游工具 `options_get_listed_terms` 的返回结果中获取。 |
| `underlyingPrice` | 否 | number | — | 示例：`2.5` | 期权标的现价。与strikeLevels配合使用，确定行权价筛选区间的中心点。该数值的单位随资产类型变化（股票为货币单位，指数为点数，商品为对应计价单位等），但传入时直接使用市场报价的原始数值，不做任何单位换算。确保该数值与期权链中的行权价位于同一数值标尺上、可直接比较即可。若不传，则返回该期限下的全部期权合约。 |
| `indicators` | 否 | array<string> | 项：`lastPrice` / `settlePrice` / `volume` / `openInterest` / `oiChange` / `iv` / `ivChange` / `delta` / `gamma` / `vega` / `theta` / `change` / `pctChange` / `open` / `high` / `low` | 默认：`["lastPrice", "settlePrice", "volume", "openInterest", "iv", "delta", "gamma", "vega", "theta"]`；示例：`["lastPrice", "settlePrice", "volume", "openInterest", "iv", "delta", "gamma", "vega", "theta"]` | 期权指标列表，可选指标包括：最新价、结算价、成交量、持仓量、持仓量变化、隐含波动率、波动率涨跌、delta、gamma、vega、theta,涨跌、涨跌幅、开、高、低 |
| `strikeLevels` | 否 | integer | — | — | 期权合约上下档位个数，如5表示上下各5档。控制返回的期权合约范围。若不传，则忽略档位限制，返回该期限下的全部期权合约。 |

### `options_get_contract_series`

- **功能**：按期权合约代码查询指定历史区间内的量价、持仓、隐含波动率和 Delta、Gamma、Vega、Theta 等指标序列。
- **适用场景**：用于查看具体合约的历史价格和结算价，跟踪成交量、持仓量及其变化，复核单合约风险指标。
- **返回**：按合约、交易日和指标逐条返回观测值及单位；未取得的指标保留缺失状态，并标注实际数据区间。
- **边界**：只回答选定合约的历史观测，不替代同日链截面或品种级聚合指标；合约代码和指标应与截面结果一致，标的代码返回的现货字段不得误当作合约历史，未支持指标不得静默丢弃。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `optionContractCodes` | 是 | array<string> | — | 示例：`["10011742.SH", "510050.SH"]` | 需要查询的期权合约代码或标的代码列表，以获取其时间序列。 |
| `indicators` | 是 | array<string> | 项：`lastPrice` / `change` / `pctChange` / `settlePrice` / `volume` / `openInterest` / `oiChange` / `iv` / `ivChange` / `delta` / `gamma` / `vega` / `theta` / `open` / `high` / `low` | 示例：`["lastPrice", "settlePrice", "volume", "openInterest", "oiChange", "iv", "delta"]` | 待提取的指标列表，可选值：最新价，涨跌，涨跌幅，结算价，成交量，持仓量，持仓量变化，隐含波动率，波动率涨跌，delta，gamma，vega，theta，开，高，低。 |
| `startDate` | 否 | string | — | 默认：`"2026-06-01"` | 开始日期（格式为YYYY-MM-DD）。时序数据查询的起始日期。 |
| `endDate` | 否 | string | — | 默认：`"2026-09-01"` | 结束日期（格式为YYYY-MM-DD）。时序数据查询的结束日期。 |

## 示例

```bash
node scripts/cli.mjs call options_data options_get_listed_terms '{"windCode": "510300.SH", "tradeDate": "2026-09-04"}'
```
