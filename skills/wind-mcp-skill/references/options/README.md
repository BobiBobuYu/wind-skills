# `options_data` 入口：期权

本站 11 个工具分 4 个主题文件。先按下表选一份主题文件再读，只读那一份；下面的通用守则对本站所有工具生效。

- `windCode` / `windCodes` 是期权标的（如 `510300.SH`、`000300.SH`），`optionVarietyCode` 是期权品种（如 `510300OP.SH`），合约代码来自链截面返回；三者不要混用。
- 日期类参数（`tradeDate`、`expiryDate`、`startDate`、`endDate`、`time`）在 schema 里多数不是必填，但后端默认值是固定常量，不是当天；一律显式传入，格式 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`。
- 契约标为数组的参数（`windCodes`、`optionContractCodes`、`indicators`）必须传 JSON 数组；指标用表中的英文枚举。
- 波动率、利率、股息率一律小数形式（25% 填 `0.25`）。定价工具不查行情，市场参数由调用方先取。
- 本站当前只有香草和二元两个定价工具；障碍、亚式、累计、鲨鱼鳍、雪球定价与历史波动率锥已下架，遇到这类需求回 `OUT_OF_SCOPE`。

## 主题文件

| 问题涉及 | 读 | 工具 |
| --- | --- | --- |
| 存续期限、某到期日的期权链截面、具体合约的历史序列 | `references/options/chain.md` | `options_get_listed_terms`, `options_get_term_metrics`, `options_get_contract_series` |
| 品种隐波 / 历史波动率 / PCR / 偏度序列与分布统计、多空情绪 | `references/options/variety.md` | `options_get_variety_series`, `options_get_variety_stats`, `options_get_sentiment_data` |
| 隐含波动率曲面、隐波锥、隐波期限结构 | `references/options/volatility.md` | `options_get_volatility_surface`, `options_get_iv_term_structure`, `options_calc_iv_cone` |
| 欧式 / 美式香草期权、二元期权的定价与希腊字母 | `references/options/pricing-vanilla.md` | `options_calc_vanilla`, `options_calc_binary` |
