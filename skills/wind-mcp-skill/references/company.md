# `company_data` 入口：企业库

本站 54 个工具分 8 个主题文件。先按下表选一份主题文件再读，只读那一份；下面的通用守则对本站所有工具生效。

- 本站除 `company_search_entity` 与 `company_get_biz_enum` 外，所有工具都要 `companyKey`，取值只能是企业名称全称或统一社会信用代码，两者都来自 `company_search_entity` 返回表的「企业名称」「统一社会信用代码」两列；不得用简称、证券简称或股票代码。
- `company_search_entity` 返回多家候选时，除非用户表述能唯一对应，先把候选列给用户确认再继续。用户已给出唯一全称或信用代码时可直接查询。
- 返回正文是 Markdown 表格；「无匹配记录」「没有公开记录」是正常结果，不是错误，如实转告。
- 日期区间 `startDate` / `endDate`（司法类为 `timeFrom` / `timeTo`）格式 `YYYY-MM-DD`，不传按各工具默认（多数为近 5 年）。
- 数组过滤参数（案由、当事人角色、舆情标签）契约里的枚举只是常见值，完整列表用 `company_get_biz_enum` 取。

## 入口工具

### `company_search_entity`

- **功能**：根据企业名称、简称、曾用名、品牌或证券信息匹配企业实体。
- **适用场景**：从自然语言关键词定位企业主体；为工商、股权或风险查询准备明确的企业实体。
- **返回**：返回匹配企业的名称、统一社会信用代码、法定代表人、经营状态、成立日期和所属国家等识别信息；没有相符主体时明确提示无匹配结果。
- **边界**：若用户只提供简称、品牌、曾用名或其他可能匹配多个主体的关键词，先完成主体匹配；确认唯一企业名称或统一社会信用代码后，再将其作为企业标识传入后续查询。已给出唯一全称或统一社会信用代码时可直接查询，无需重复搜索。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `searchKey` | 是 | string | — | — | 用于检索的关键词 |

### `company_get_biz_enum`

- **功能**：查询风控业务筛选所需的业务分类。
- **适用场景**：确认案件、当事人角色或舆情筛选分类；为后续风险记录查询准备可用的业务选项。
- **返回**：返回可用于风控筛选的业务中所有可用的枚举分类及枚举值。
- **边界**：若需要完整案由、当事人角色或舆情标签，按“先取分类名、再取分类选项、最后带入相应筛选查询”的顺序使用；不做这些筛选时无需先取枚举。

| 参数 | 必填 | 类型 | 枚举 | 示例 / 默认 | 官方说明 |
| --- | --- | --- | --- | --- | --- |
| `listType` | 是 | integer | `1` / `2` | — | 选择查询模式，必传。1 = 返回所有可查询的分类名列表（无需其他参数）；2 = 返回指定分类下的字典值列表（必须同时传入 categoryName）。通常先调 listType=1 拿到分类名，再用 listType=2 + categoryName 获取具体的可选值。 |
| `categoryName` | 否 | string | — | — | 分类名称，当 listType=2 时传入，指定要查询的分类。返回结果为该分类下的所有可选枚举值，供其他查询工具的数组过滤参数使用。 |

## 主题文件

| 问题涉及 | 读 | 工具 |
| --- | --- | --- |
| 工商登记、变更记录、企业年报、联系方式 | `references/company-registration.md` | `company_get_registration_info`, `company_list_change_record`, `company_list_annual_report`, `company_list_contact` |
| 股东、受益所有人、实控人、UBO 关联、股权穿透、控股企业、股权变更、对外投资、主要人员、股权出质、股权冻结 | `references/company-equity.md` | `company_list_shareholder`, `company_list_beneficial_owner`, `company_list_actual_controller`, `company_list_ubo_related`, `company_traverse_equity`, `company_list_controlled_entity`, `company_list_equity_change`, `company_list_investment`, `company_list_key_personnel`, `company_get_equity_pledged`, `company_get_share_lockup` |
| 客户、供应商、招投标、商标、专利、企业标准、科技型企业名录、土地受让、融资租赁 | `references/company-business.md` | `company_list_customer_info`, `company_list_supplier`, `company_list_bidding`, `company_list_trademark`, `company_list_patent`, `company_list_standard`, `company_list_tech_roster`, `company_get_land_acquisition`, `company_get_financial_leasing` |
| 纳税人资质、纳税信用等级、进出口信用、欠税、税收违法、税务非正常户 | `references/company-tax-credit.md` | `company_list_tax_qual`, `company_list_tax_credit_rating`, `company_list_trade_credit`, `company_get_owing_tax`, `company_get_illegal_tax`, `company_get_tax_abnormal` |
| 诉讼立案、开庭公告、法院公告、裁判文书、法律送达公告 | `references/company-lawsuit.md` | `company_get_filing_info`, `company_get_court_sessions`, `company_get_court_announcements`, `company_get_judgments`, `company_get_legal_notice` |
| 被执行案件、终本案件、失信被执行人、限制高消费、司法拍卖、司法资产询价 | `references/company-enforcement.md` | `company_get_executed_persons`, `company_get_final_case`, `company_get_discredit`, `company_get_high_consumers`, `company_get_judicial_sales`, `company_get_valuation_inquiry` |
| 经营异常名录、破产重整、破产清算、简易注销、企业综合评分、非标资产风险 | `references/company-status-risk.md` | `company_get_abnormal_operation`, `company_get_bankruptcy_reorg`, `company_get_liquidation`, `company_get_simple_cancellation`, `company_get_enterprise_score`, `company_get_default_info` |
| 惩戒名单、严重违法失信、行政处罚、环保处罚、企业新闻舆情 | `references/company-penalty-sentiment.md` | `company_get_disciplinary_list`, `company_get_illegal_dishonesty`, `company_get_penalty_info`, `company_get_environment_penalty`, `company_get_news_sentiment` |
