// 集成冒烟（需真实后端 + API Key，手动跑，勿入 CI）：每个 references 文件至少一个真实调用，
// 覆盖 11 个 server_type。只看信封形态（成功 / backend_error / 本地错误），不校验数据内容。
//   node tests/run-smoke-real.mjs                 # 全部
//   node tests/run-smoke-real.mjs --server edb_data
//   node tests/run-smoke-real.mjs --only fund_get_nav
// 已知问题（KNOWN）：后端返回 backend_error 时不计为失败，只提示。
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = join(dirname(dirname(fileURLToPath(import.meta.url))), 'scripts', 'cli.mjs');
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const ONLY = opt('--only'); const SERVER = opt('--server');

// [references 文件, server_type, tool, args, 已知问题说明]
const CASES = [
  ['stock/market.md', 'stock_research', 'stock_get_sector_realtime_analysis', { windCode: '沪深300' }],
  ['stock/company.md', 'stock_research', 'stock_get_company_valuation', { windCode: '600519.SH' }],
  ['stock/company.md', 'stock_research', 'stock_screener', { question: '筛选沪深市场市值超5000亿的白酒股' }],
  ['fund/screen-profile.md', 'fund_research', 'fund_get_basic_info', { windCodes: ['005827.OF'] }],
  ['fund/screen-profile.md', 'fund_research', 'fund_screener', { query: '近一年收益率排名前10的偏股混合型基金' }],
  ['fund/nav-performance.md', 'fund_research', 'fund_get_nav', { windCodes: ['510300.SH'] }],
  ['fund/holdings.md', 'fund_research', 'fund_get_top_equity_holdings', { windCode: '005827.OF', reportDate: '2026-06-30' }],
  ['fund/attribution.md', 'fund_research', 'fund_get_style_analysis', { windCode: '005827.OF' }],
  ['fund/position-peers.md', 'fund_research', 'fund_get_similar_funds', { windCode: '005827.OF' }],
  ['index.md', 'index_data', 'get_index_kline', { windcode: '000300.SH', begin_date: '2026-08-01', end_date: '2026-08-31' }],
  ['bond.md', 'bond_data', 'get_bond_basicinfo', { question: '24附息国债11的基本信息' }],
  ['financial-docs.md', 'financial_docs', 'get_financial_news', { query: '美联储利率政策', top_k: 2 }],
  ['edb.md', 'edb_data', 'economic_query_indicator_series', { question: '中国GDP现价当季值', observation: 4 }],
  ['edb.md', 'edb_data', 'economic_get_indicator_series', { metricCodes: 'M0001227', numOfObservation: 3 }],
  ['analytics.md', 'analytics_data', 'get_financial_data', { question: '查询中国A股市场过去一年的平均成交量' }],
  ['options/chain.md', 'options_data', 'options_get_listed_terms', { windCode: '510300.SH', tradeDate: '2026-09-04' }],
  ['options/variety.md', 'options_data', 'options_get_variety_series', { windCodes: ['510300.SH'], indicator: 'pcr_volume', startDate: '2026-08-25', endDate: '2026-09-05' }],
  ['options/volatility.md', 'options_data', 'options_calc_iv_cone', { windCode: '510300.SH', startDate: '2026-06-01', endDate: '2026-09-04' }],
  ['options/pricing-vanilla.md', 'options_data', 'options_calc_vanilla', { assetClass: 'equity', spotPrice: 4.3, optionType: 'call', strikePrice: 4.5, expirationDate: '2026-12-23', valuationDate: '2026-09-07', volatility: 0.2, riskFreeRate: 0.02, dividendYield: 0.01 }],
  ['futures/market.md', 'futures_data', 'futures_get_basis', { windCodes: ['CU.SHF'] }],
  ['futures/fundamentals.md', 'futures_data', 'futures_get_warehouse_receipt', { type: 'receipt', windCodes: ['CU.SHF'] }],
  ['company/registration.md', 'company_data', 'company_search_entity', { searchKey: '贵州茅台' }],
  ['company/registration.md', 'company_data', 'company_get_registration_info', { companyKey: '9152000071430580XT' }],
  ['company/equity.md', 'company_data', 'company_list_shareholder', { companyKey: '9152000071430580XT' }],
  ['company/business.md', 'company_data', 'company_list_patent', { companyKey: '贵州茅台酒股份有限公司', patentType: '授权发明' }],
  ['company/tax-credit.md', 'company_data', 'company_list_tax_credit_rating', { companyKey: '贵州茅台酒股份有限公司' }],
  ['company/lawsuit.md', 'company_data', 'company_get_judgments', { companyKey: '贵州茅台酒股份有限公司', role: ['被告'] }],
  ['company/enforcement.md', 'company_data', 'company_get_executed_persons', { companyKey: '贵州茅台酒股份有限公司' }],
  ['company/status-risk.md', 'company_data', 'company_get_enterprise_score', { companyKey: '贵州茅台酒股份有限公司' }],
  ['company/penalty-sentiment.md', 'company_data', 'company_get_penalty_info', { companyKey: '贵州茅台酒股份有限公司', startDate: '2024-01-01', endDate: '2026-09-07' }],
  ['finance/quote.md', 'finance_data', 'quote_get_historical_data_series', { windCode: '600519.SH', type: 1, params: { indexes: 'TIME,OPEN,HIGH,LOW,MATCH,VOLUME', period: '10', rangeflag: 2, startDate: '2026-08-25', endDate: '2026-09-05' } }],
  ['finance/quote.md', 'finance_data', 'quote_get_realtime_indicators', { windCodes: '600519.SH', indexes: '最新成交价,涨跌幅' }, '2026-09-07 实测持续返回「服务暂时不可用」'],
  ['options/variety.md', 'options_data', 'options_get_sentiment_data', { windCode: '510300.SH', startDate: '2026-08-25', endDate: '2026-09-04' }, '2026-09-07 实测持续返回「服务暂时不可用」'],
  ['futures/fundamentals.md', 'futures_data', 'futures_get_research_opinion', { windCode: 'CU.SHF' }],
  ['finance/general-data.md', 'finance_data', 'general_query_data', { question: '贵州茅台2025年营业收入' }],
  ['finance/general-docs.md', 'finance_data', 'general_search_documents', { documentType: 'rpp', windCode: '600519.SH', startDate: '2026-08-01', endDate: '2026-09-07' }],
];

const PAUSE_MS = Number(process.env.WIND_SMOKE_PAUSE_MS || 1000); // 连续快速调用时网关易返回 5xx，用例之间留间隔
let pass = 0, fail = 0, known = 0, first = true;
for (const [file, srv, tool, args, note] of CASES) {
  if (SERVER && srv !== SERVER) continue;
  if (ONLY && !tool.includes(ONLY)) continue;
  if (!first && PAUSE_MS > 0) await new Promise(r => setTimeout(r, PAUSE_MS));
  first = false;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [CLI, 'call', srv, tool, JSON.stringify(args)], { encoding: 'utf8' });
  const ms = Date.now() - t0;
  let body = null; try { body = JSON.parse(r.stdout); } catch { }
  const text = body?.content?.[0]?.text;
  let status, detail = '';
  if (body && body.ok === false) {
    if (body.code === 'backend_error') { status = note ? 'KNOWN' : 'FAIL'; detail = body.message.slice(0, 120); note ? known++ : fail++; }
    else { status = 'FAIL'; detail = `${body.code}: ${body.message.slice(0, 120)}`; fail++; }
  } else if (typeof text === 'string') {
    status = 'PASS'; pass++;
    detail = (text.trim().startsWith('{') || text.trim().startsWith('[')) ? `json ${text.length}B` : `text ${text.length}B: ${text.replace(/\s+/g, ' ').slice(0, 60)}`;
  } else { status = 'FAIL'; detail = (r.stdout || r.stderr).slice(0, 120); fail++; }
  console.log(`${status.padEnd(5)} ${String(ms).padStart(6)}ms  ${srv}.${tool}  [${file}]  ${detail}${note ? `  (已知: ${note})` : ''}`);
}
console.log(`\n${pass} passed, ${known} known, ${fail} failed`);
process.exit(fail ? 1 : 0);
