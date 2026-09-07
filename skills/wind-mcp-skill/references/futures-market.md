# `futures_data` 工具契约：合约规格、基差、资金与席位

覆盖期货品种的合约规格与交割规则、基差快照与历史、资金变动、交易所席位排名。 参数名称、类型、必填项、示例与默认值和枚举以本文件各工具的契约为准。

- 品种代码用品种级 Wind 代码，如 `CU.SHF`、`AL.SHF`、`M.DCE`，多数工具也接受名称如 `沪铜`；`futures_get_position_ranking` 不支持中文名称，用户给中文时要求提供代码。
- `windCodes` 必须是数组；`date` 格式 `YYYY-MM-DD`。
- `futures_get_basis`：`windCodes` 与 `sector` 至少给一个；`startDate` / `endDate` 必须成对，都不传取最新交易日快照。`sector` 用表中的英文枚举或等价中文键。
- `futures_get_fund_flow` 只支持单日；`futures_get_position_ranking` 一次返回九类席位排名，`limit` 控制条数。
- 返回 JSON，`fields` + `rows` 结构；单位随品种记录。

## 工具契约

### `futures_get_contract_spec`

- **功能**：查询单个期货品种或标准合约的全球公开交易规格与交割规则。
- **适用场景**：查看合约规模和计量单位；核对报价单位与最小变动；查看交易时间和交割方式；查看上市日期及保证金基准说明。
- **返回**：返回合约名称、标准代码、交易所、规模、单位、报价、交易时间、交割规则和上市日期等已开放字段；字段值按来源原文保留。
- **边界**：不提供实时行情、持仓排名或基差；当前回包未稳定提供交易手续费，保证金和涨跌幅为合约文本基准值，使用时须核对交易所最新公告。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCode` | 是 | string | — | — | 单个期货品种代码或名称。填写示例：CU.SHF / 沪铜 |

### `futures_get_basis`

- **功能**：按期货品种、板块或全市场查询基差快照及历史统计。
- **适用场景**：查看单品种基差；比较多个品种；扫描板块或全市场；核对基差分位和基准现货价格。
- **返回**：返回品种代码、名称、数据日期、基差值、历史分位及现货价格，基差定义与窗口按实际回包标注。
- **边界**：当前不承诺带日期的历史时序查询；不用于策略回测、收益归因或交易决策；原始分类字段规则未充分自洽，不纳入发布契约。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 否 | array<string> | — | — | 单个或多个期货品种代码或名称，格式为数组。填写示例：["CU.SHF"] / ["CU.SHF","AL.SHF"] / ["沪铜"] |
| `sector` | 否 | string | `Precious metals` / `Non-ferrous metals` / `Black Series` / `Shipping` / `Crude oil` / `Olefins` / `Polyester textile` / `Grease and oilseed` / `Animal Husbandry & Breeding` / `Light industry` / `New energy materials` / `Rubber` / `Others` / `all` | — | 板块筛选（windCodes 与 sector 至少提供一个）。可填英文系统值（如 Precious metals / Non-ferrous metals / all）或 enum_map 中文键（如 贵金属 / 有色金属 / 全市场），两种写法等价。  映射关系： • 全市场 = all • 贵金属 = Precious metals • 有色金属 = Non-ferrous metals • 黑色系 = Black Series • 航运 = Shipping • 原油 = Crude oil • 烯烃 = Olefins • 聚酯纺织 = Polyester textile • 油脂油料 = Grease and oilseed • 畜牧养殖 = Animal Husbandry & Breeding • 轻工 = Light industry • 新能源材料 = New energy materials • 橡胶 = Rubber • 其他 = Others  与 windCodes 可同时提供，系统按并集处理。易混淆：能源/原油 = Crude oil（非 New energy materials） |
| `startDate` | 否 | string | — | — | 开始日期，格式 YYYY-MM-DD。与 endDate 必须成对提供：都不传取最新交易日快照 |
| `endDate` | 否 | string | — | — | 结束日期，格式 YYYY-MM-DD。与 startDate 必须成对提供。 |

### `futures_get_fund_flow`

- **功能**：按单品种或全市场查询指定交易日的期货资金变动统计，资金变动按持仓额变化估算。
- **适用场景**：查看单品种资金变动；扫描全市场方向。
- **返回**：返回交易日、品种、价格和持仓额、变动额及幅度；价格和金额单位随品种记录。
- **边界**：资金流向不等同真实资金划转或保证金流动；仅支持单日，不支持区间。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `date` | 是 | string | — | — | 查询日期。格式 YYYY-MM-DD，示例 2026-07-15。 |
| `windCode` | 否 | string | — | — | 单个期货品种代码或名称，或者传入all（全市场）。填写示例：CU.SHF / all / 沪铜 |

### `futures_get_position_ranking`

- **功能**：按品种和交易日查询交易所公开席位的九类排名，涵盖持仓、增减仓和成交量排名。
- **适用场景**：查看多头或空头席位；查看净多或净空排名；查看增仓或减仓排名；查看成交量席位排名。
- **返回**：返回排名类型、交易日、会员简称、名次、指标值、增减值和计量单位；返回条数由 limit 控制。
- **边界**：仅反映交易所公开席位排名，不等同客户持仓归因或交易策略；不提供图表。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCode` | 是 | string | — | — | 单个期货品种代码。支持品种级标准代码（如 CU.SHF）与合约级代码（如 CU2612.SHF），月合约自动转换为主力合约代码。填写示例：CU.SHF / RB2510.SHF。注意：本工具接口不支持中文品种名称，用户给中文名时应要求提供 Wind 代码；多品种请分次查询。 |
| `date` | 否 | string | — | — | 日期。格式 YYYY-MM-DD。填写示例：2026-08-25。 |
| `limit` | 否 | integer | — | 默认：`20` | 返回条数，可选，1-100 的整数，默认 20。用户说「前 N 名 / 前几名」→ 传对应数字（前五名→5，前十名→10）；未提及→不传（默认 20）。 |

## 示例

```bash
node scripts/cli.mjs call futures_data futures_get_basis '{"windCodes": ["CU.SHF"]}'
```
