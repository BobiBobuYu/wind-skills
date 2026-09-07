# `fund_research` 工具契约：基金筛选、档案、申赎、规模与财务

覆盖自然语言筛选基金，以及按代码批量取基金档案、申赎状态、规模和财务数据。 参数名称、类型、必填项、示例与默认值和枚举以本文件各工具的契约为准。

- `windCodes` 必须是数组，每次最多 50 个，元素可以是代码或名称，如 `["005827.OF","广发稳健增长A"]`；CLI 会把英文逗号分隔的字符串自动收敛成数组。
- `includeFields` 只在契约里列出该字段的工具上可用（如 `fund_get_basic_info`），留空返回默认字段包；指定时逐字使用表中的助记符，不得自造。
- `fund_screener` 的参数名是 `query`（不是 `question`），只返回代码列表；条件含糊时后端返回澄清问题，原样转告用户。
- 本站返回正文是 Markdown 表格，不是 JSON；数值单位写在单元格内。
- 净值、业绩、场内行情读 `references/fund-nav-performance.md`；持仓读 `references/fund-holdings.md`。

## 工具契约

### `fund_screener`

- **功能**：根据自然语言问句，从公募基金及 ETF 等基金市场识别基金实体、预定义指标及筛选条件，支持按基金规模、净值表现、收益风险等指标，以及基金类型、基金管理人、基金经理、跟踪指数、投资主题、行业方向等分类条件组合反查基金，返回标准化基金数据或符合条件的基金代码列表。
- **适用场景**：基金名称、简称或代码存在歧义时定位基金；将自然语言转换为标准基金、指标或筛选条件；按多个指标或基金分类条件筛选基金；按基金管理人、基金类型、跟踪指数、投资主题等查找基金；为后续净值、持仓、业绩风险等查询准备唯一 Wind 代码。
- **返回**：返回基金名称、Wind 代码、基金类型、基金管理人、指标、日期、数值、单位等标准化数据；筛选场景返回符合条件的基金代码列表，可传入其他基金属性工具继续查询。
- **边界**：已明确具体基金及查询目标时，直接调用对应净值、规模、持仓、业绩风险等属性查询工具；基金市场整体、指数整体及跨资产问题使用对应专业能力。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `query` | 是 | string | — | — | 一句自然语言基金筛选条件，可组合基金类型、区间收益/排名、规模、成立年限、基金经理等。例如 "近一年收益率排名前20的偏股混合型基金"、"规模大于100亿的货币型基金"。 |

### `fund_get_basic_info`

- **功能**：获取单只或多只基金的基础档案，包含产品识别、分类、成立日期、管理人、基金经理和业绩比较基准等字段。
- **适用场景**：用于确认基金代码与简称，查看基金分类、成立日期、管理人、现任基金经理、业绩比较基准及按需档案字段。
- **返回**：返回每只基金的识别信息和基础档案；自然名称无法唯一匹配时返回候选或歧义状态，不静默选取其他基金。
- **边界**：基础档案适合作为后续净值、规模、持仓和业绩查询的实体入口，不包含这些专题数据；名称或代码无法唯一匹配时先确认基金主体，再进行后续查询。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 是 | array<string> | — | — | 基金代码或基金名称列表，例如 ["000001.OF", "广发稳健增长A"] |
| `includeFields` | 否 | array<string> | 项：`f_info_windcode` / `f_info_name` / `f_info_setupdate` / `f_info_investtype` / `f_info_mgrcomp` / `f_info_fundmanager` / `f_info_benchmark` / `f_info_fullname` / `f_info_code` / `f_info_frontendcode` / `f_info_backendcode` / `s_info_isincode` / `f_info_firstinvesttype` / `f_info_type` / `f_style_marketvaluestyleattribute` / `f_info_investmentregion` / `f_info_maturitydate_2` / `f_info_loflisteddate` / `f_info_exchmarket` / `f_info_minholdingperiod` / `f_info_t0ornot` / `f_info_custodianbank` / `f_info_foreigninvestmentadvisor` / `f_info_foreigncustodian` / `f_info_investobject` / `f_info_investscope` / `f_info_investstrategy2` / `f_info_investingregiondescription` / `f_info_managementfeeratio` / `f_info_custodianfeeratio` / `f_info_salefeeratio` / `f_info_purchasefeeratio` / `f_info_redemptionfeeratio` / `f_info_relatedcode` | — | 指定需要返回的字段助记符列表，留空返回默认字段包（成立日/投资类型/管理人/基金经理/业绩基准）；可选 f_info_setupdate=基金成立日 / f_info_investtype=投资类型(二级分类) / f_info_mgrcomp=基金管理人 / f_info_fundmanager=基金经理(现任) / f_info_benchmark=业绩比较基准 / f_info_fullname=基金全称 / f_info_code=基金代码 / f_info_frontendcode=基金前端代码 / f_info_backendcode=基金后端代码 / s_info_isincode=ISIN代码 / f_info_firstinvesttype=投资类型(一级分类) / f_info_type=基金类型 / f_style_marketvaluestyleattribute=市值-风格属性 / f_info_investmentregion=投资区域 / f_info_maturitydate_2=基金到期日 / f_info_loflisteddate=上市日期 / f_info_exchmarket=基金上市地点 / f_info_minholdingperiod=基金最短持有期 / f_info_t0ornot=是否T+0交易 / f_info_custodianbank=基金托管人 / f_info_foreigninvestmentadvisor=境外投资顾问 / f_info_foreigncustodian=境外托管人 / f_info_investobject=投资目标 / f_info_investscope=投资范围 / f_info_investstrategy2=基金投资策略 / f_info_investingregiondescription=主要投资区域说明 / f_info_managementfeeratio=管理费率 / f_info_custodianfeeratio=托管费率 / f_info_salefeeratio=销售服务费率 / f_info_purchasefeeratio=最高申购费率 / f_info_redemptionfeeratio=最高赎回费率 / f_info_relatedcode=关联基金代码；f_info_windcode、f_info_name 必返、即使未传也会置顶返回。 |

### `fund_get_purchase_redemption_status`

- **功能**：获取单只或多只基金最新的交易和申赎状态。
- **适用场景**：用于查看合并申赎状态，必要时展开申购状态、赎回状态、大额申购限额、场内交易状态、暂停或恢复运作日，以及定开基金封闭与开放日。
- **返回**：返回每只基金的申赎及交易状态和相关日期；只返回可用状态，不支持按日期查询历史状态，并标注当前状态更新时间。
- **边界**：只反映最新可取得状态，不提供历史状态、申赎费率、申赎清单、场内行情或基金基础档案；判断某一日期的交易资格时需结合状态生效日期和产品类型，不能用当前状态回填历史。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 是 | array<string> | — | — | 基金代码或基金名称列表，例如 ["000001.OF", "广发稳健增长A"] |
| `includeFields` | 否 | array<string> | 项：`f_info_windcode` / `f_info_name` / `f_dq_status` / `f_info_pchmstatus` / `f_info_redmstatus` / `f_pchredm_largepchmaxamt` / `s_dq_tradestatus` / `f_info_date_suspension` / `f_info_date_resumption` / `f_info_startdateofclosure` / `f_info_lastopenday` / `f_info_expectedendingday` / `f_info_expectedopenday` | — | 指定字段助记符列表，留空返回默认申赎状态字段包（申购赎回状态 + 申购/赎回状态 + 交易状态 + 大额申购限额等）；可选 f_dq_status=申购赎回状态 / f_info_pchmstatus=申购状态 / f_info_redmstatus=赎回状态 / f_pchredm_largepchmaxamt=单日大额申购限额 / s_dq_tradestatus=交易状态 / f_info_date_suspension=基金暂停运作日 / f_info_date_resumption=基金恢复运作日 / f_info_startdateofclosure=定开基金封闭起始日 / f_info_lastopenday=定开基金上一开放日 / f_info_expectedendingday=预计封闭期结束日 / f_info_expectedopenday=预计下期开放日；f_info_windcode、f_info_name 必返、即使未传也会置顶返回。 |

### `fund_get_size`

- **功能**：根据基金代码和指定日期或报告期查询基金规模信息。
- **适用场景**：用于查看资产净值、份额总数、最新规模、报告期规模和规模变化，并按时点或报告期进行勾稽。
- **返回**：返回每只基金的资产净值、规模、份额及变化字段，分开标注实际日期、报告期和计量单位；缺失或跨时点不可比时明确说明。
- **边界**：最新时点规模与报告期规模不能混用；可与实际净值、份额和持有人结构按同一日期或报告期核对，跨期计算需确认单位和子份额口径一致。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 是 | array<string> | — | — | 基金代码或基金名称列表，例如 ["000001.OF", "广发稳健增长A"] |
| `asOfDate` | 否 | string | — | — | 截止日期 YYYY-MM-DD，作用于 f_info_fundscale_cc、f_netasset_total2；非交易日回溯；不传用最近交易日。 |

### `fund_get_financials`

- **功能**：根据基金代码和报告期查询基金财务报表相关的产品级数据。
- **适用场景**：用于查看利润、资产价值、收入、费用和报告期净值增长率等财务指标，核对管理费、托管费等费用项目。
- **返回**：返回实际报告期、利润、资产、收入、费用、期末净资产和报告期净值增长率等字段，金额与单位分开标注；缺失、不适用和未计算分别表达。
- **边界**：财务报表数据按报告期解释，不等同于最新规模快照；应在同一报告期内核对资产、负债与期末净资产，并将净值增长率与业绩统计区分。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `windCodes` | 是 | array<string> | — | — | 基金代码或基金名称列表，例如 ["000001.OF", "广发稳健增长A"] |
| `includeFields` | 否 | array<string> | 项：`f_info_windcode` / `f_info_name` / `f_stm_is` / `f_stm_is_reits_netprofit` / `f_stm_is_79_total` / `f_stm_is_75` / `s_stm07_is_105` / `f_stm_is_76` / `fair_value_change_income` / `fund_management_fee` / `fund_custody_fee` / `fund_sales_service_fee` / `trading_expenses` / `audit_fee` / `other_expenses` / `interest_expense` / `ending_net_assets` / `total_assets` / `total_liabilities` / `f_nav_return` | — | 指定返回的字段助记符列表，留空返回默认字段包（收入/净利润/投资收益/管理费/托管费等）；可选 f_stm_is=收入合计 / f_stm_is_reits_netprofit=净利润 / f_stm_is_79_total=净利润(合计) / f_stm_is_75=基金投资收益 / s_stm07_is_105=财务费用:利息收入 / f_stm_is_76=其他利息收入 / fair_value_change_income=公允价值变动收益 / fund_management_fee=基金管理费 / fund_custody_fee=基金托管费 / fund_sales_service_fee=基金销售服务费 / trading_expenses=交易费用 / audit_fee=审计费用 / other_expenses=其他费用 / interest_expense=利息支出 / ending_net_assets=期末所有者权益(基金净值) / total_assets=资产合计 / total_liabilities=负债合计 / f_nav_return=报告期净值增长率；f_info_windcode、f_info_name 必返、即使未传也会置顶返回。 |
| `reportPeriod` | 否 | string | — | — | 查询报告期 YYYY-MM-DD（季末/半年末/年末）；不传用最近披露期；无数据返回 missing 不回退。 |

## 示例

```bash
node scripts/cli.mjs call fund_research fund_get_basic_info '{"windCodes": ["005827.OF"]}'
```
