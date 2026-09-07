# `options_data` 工具契约：定价计算：香草与二元期权

覆盖：欧式 / 美式香草期权、二元期权的定价与希腊字母。参数名称、类型、必填项、示例与默认值和枚举以本文件各工具的契约为准。

## 本站通用守则

- `windCode` / `windCodes` 是期权标的（如 `510300.SH`、`000300.SH`），`optionVarietyCode` 是期权品种（如 `510300OP.SH`），合约代码来自链截面返回；三者不要混用。
- 日期类参数（`tradeDate`、`expiryDate`、`startDate`、`endDate`、`time`）在 schema 里多数不是必填，但后端默认值是固定常量，不是当天；一律显式传入，格式 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`。
- 契约标为数组的参数（`windCodes`、`optionContractCodes`、`indicators`）必须传 JSON 数组；指标用表中的英文枚举。
- 波动率、利率、股息率一律小数形式（25% 填 `0.25`）。定价工具不查行情，市场参数由调用方先取。
- 本站当前只有香草和二元两个定价工具；障碍、亚式、累计、鲨鱼鳍、雪球定价与历史波动率锥已下架，遇到这类需求回 `OUT_OF_SCOPE`。

## 本主题守则

- 现价、波动率、利率、股息率先用 `references/finance/quote.md` 或 `references/options/volatility.md` 取，再调本文件工具。
- `assetClass` 为 `fx` 时 `dividendYield` 填外币无风险利率，为 `futures` 时通常填 0。美式期权 `pricingMethod` 优先 `baw`，欧式用 `bs`。
- 返回 NPV 与 Delta / Gamma / Vega / Theta / Rho，数值与单位分开表达。

## 工具契约

### `options_calc_vanilla`

- **功能**：计算普通香草期权价格，支持欧式或美式看涨、看跌期权，并按指定或匹配模型返回定价结果。
- **适用场景**：用于计算普通期权价格，比较波动率、利率、股息率、行权方式和模型选择对结果的影响。
- **返回**：返回 NPV、Delta、Rho、Theta、Gamma、Vega，以及行权方式、实际估值日期、到期日和定价模型，数值与单位分开表达。
- **边界**：依赖调用方提供已确认的市场参数，不查询现价、波动率或利率；可作为二元、障碍、亚式及结构化产品的共同基准，但不同现金流条款不能直接混合，结果不构成交易判断。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `assetClass` | 是 | string | `equity` / `fx` / `futures` | 默认：`"equity"`；示例：`"equity"` | 标的资产类别, equity: 股票/指数/ETF/基金，fx: 外汇，futures:期货。 |
| `spotPrice` | 是 | number | — | 示例：`100` | 标的资产现价 |
| `optionType` | 是 | string | `call` / `put` | 默认：`"call"`；示例：`"call"` | 期权类型：看涨(call) 或 看跌(put)。 |
| `strikePrice` | 是 | number | — | 示例：`105` | 执行价格。 |
| `expirationDate` | 否 | string | — | 默认：`"2026-09-01"` | 到期日期 (YYYY-MM-DD)。 |
| `valuationDate` | 否 | string | — | 默认：`"2026-08-01"` | 估值日期 (YYYY-MM-DD)。 |
| `volatility` | 是 | number | — | 示例：`0.2` | 年化隐含波动率 (小数形式)。格式转换：如果用户输入 '25' 或 '25%'，请填入 0.25；如果输入 0.25，则保持不变。 |
| `riskFreeRate` | 是 | number | — | 示例：`0.03` | 年化无风险利率 (小数形式)。对于 FX 期权，填入本币(计价货币)无风险利率。 |
| `dividendYield` | 是 | number | — | 示例：`0.02` | 第二利率(小数形式)：Equity:输入年化股息率；FX:输入外币(基础货币)无风险利率；Futures:通常填0。 |
| `exerciseStyle` | 否 | string | `european` / `american` | 默认：`"european"`；示例：`"european"` | 行权方式：european:欧式，american: 美式。 |
| `pricingMethod` | 否 | string | `bs` / `baw` / `binomial` | 默认：`"bs"`；示例：`"bs"` | 定价模型：美式优先用baw其次binomial，欧式用bs。 |
| `dayCount` | 否 | string | `actual` / `business` | 默认：`"actual"`；示例：`"actual"` | 计日惯例（时间T的计算方式）：actual:基于日历日，business:基于交易日。 |
| `timeSteps` | 否 | integer | — | 默认：`100`；示例：`100` | 时间步数。仅当 pricingMethod 为 'binomial' 时有效。 |

### `options_calc_binary`

- **功能**：计算现金或资产兑付型二元期权价格，到期时按标的价格是否满足条件支付固定金额或标的资产。
- **适用场景**：用于比较看涨与看跌二元期权，以及现金兑付和资产兑付条款下的 NPV 与定价敏感度。
- **返回**：返回 NPV、Delta、Rho、Theta、Gamma、Vega 及实际估值日期、定价模型、期权类型和标的类别，数值与单位分开表达。
- **边界**：依赖调用方明确提供现价、行权价、到期日、波动率和利率等参数，不负责补查市场数据；可在相同市场参数下与其他期权模型作基准比较，但不同赔付条款不能混用，结果不构成交易判断。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `assetClass` | 是 | string | `equity` / `fx` / `futures` | 示例：`"equity"` | 标的资产类别, equity: 股票/指数/ETF/基金，fx: 外汇，futures:期货。 |
| `spotPrice` | 是 | number | — | 示例：`100` | 标的资产现价 |
| `optionType` | 是 | string | `call` / `put` | 示例：`"call"` | 期权类型：看涨(call) 或 看跌(put)。 |
| `strikePrice` | 是 | number | — | 示例：`105` | 执行价格。 |
| `expirationDate` | 否 | string | — | 默认：`"2026-09-01"` | 到期日期 (YYYY-MM-DD)。 |
| `valuationDate` | 否 | string | — | 默认：`"2026-08-01"` | 估值日期 (YYYY-MM-DD)。 |
| `volatility` | 是 | number | — | 示例：`0.2` | 年化隐含波动率 (小数形式)。格式转换：如果用户输入 '25' 或 '25%'，请填入 0.25；如果输入 0.25，则保持不变。 |
| `riskFreeRate` | 是 | number | — | 示例：`0.03` | 年化无风险利率 (小数形式)。对于 FX 期权，填入本币(计价货币)无风险利率。 |
| `dividendYield` | 是 | number | — | 示例：`0.02` | 第二利率(小数形式)：Equity:输入年化股息率；FX:输入外币(基础货币)无风险利率；Futures:通常填0。 |
| `payoffType` | 否 | string | `cash` / `asset` | 默认：`"cash"`；示例：`"cash"` | 二元期权类型：cash:现金或无（Cash-or-Nothing），到期支付固定金额；asset:资产或无（Asset-or-Nothing），到期支付标的价格。 |
| `cashAmount` | 否 | number | — | 默认：`100` | 固定的获赔金额。仅当 payoffType = cash 时有效。 |
| `dayCount` | 否 | string | `actual` / `business` | 默认：`"actual"`；示例：`"actual"` | 计日惯例（时间T的计算方式）：actual:基于日历日，business:基于交易日 |

## 示例

```bash
node scripts/cli.mjs call options_data options_calc_vanilla '{"assetClass": "equity", "spotPrice": 4.3, "optionType": "call", "strikePrice": 4.5, "expirationDate": "2026-12-23", "valuationDate": "2026-09-07", "volatility": 0.2, "riskFreeRate": 0.02, "dividendYield": 0.01}'
```
