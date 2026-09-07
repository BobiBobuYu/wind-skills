// CLI 契约测试（确定性，无网络、无凭据）：argv / exit / 错误码 / 路由 / manifest 校验 / 类型收敛 / 信封。
// Usage: node tests/run-cli-contract-tests.mjs   (任意 cwd 均可)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = dirname(TESTS_DIR);
const CLI = join(SKILL_DIR, 'scripts', 'cli.mjs');
const MOCK = join(TESTS_DIR, 'mock-fetch.mjs');
const HOME = mkdtempSync(join(tmpdir(), 'wind-cli-home-'));
const WORK = mkdtempSync(join(tmpdir(), 'wind-cli-work-'));
const CAPTURE = join(WORK, 'capture.json');

function run(args, { mock = true, scenario = 'success_json', key = 'test-key', env = {} } = {}) {
  if (existsSync(CAPTURE)) rmSync(CAPTURE);
  const nodeArgs = mock ? ['--import', MOCK, CLI, ...args] : [CLI, ...args];
  const r = spawnSync(process.execPath, nodeArgs, {
    encoding: 'utf8', cwd: WORK,
    env: { ...process.env, HOME, USERPROFILE: HOME, WIND_API_KEY: key, WIND_MOCK_SCENARIO: scenario, WIND_MOCK_CAPTURE: CAPTURE, ...env },
  });
  let body = null;
  try { body = JSON.parse(r.stdout); } catch { }
  return { exit: r.status, stdout: r.stdout || '', body };
}
function sent() {
  if (!existsSync(CAPTURE)) return null;
  const list = JSON.parse(readFileSync(CAPTURE, 'utf8'));
  return list[list.length - 1]?.params?.arguments ?? null;
}

const results = [];
function test(name, fn) {
  try { fn(); results.push([name, true]); } catch (e) { results.push([name, false, e.message]); }
}
const eq = (a, b, label) => { if (a !== b) throw new Error(`${label}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const deepEq = (a, b, label) => eq(JSON.stringify(a), JSON.stringify(b), label);
const ok = (c, m) => { if (!c) throw new Error(m); };
const expectCode = (r, code, exit = 1) => { eq(r.exit, exit, 'exit'); eq(r.body?.ok, false, 'ok'); eq(r.body?.code, code, 'code'); ok(typeof r.body?.message === 'string' && r.body.message.length > 0, 'message'); };

// ── argv / 用法 ──
test('无参数打印纯文本 USAGE，exit 0，列出 11 个 server_type', () => {
  const r = run([], { mock: false });
  eq(r.exit, 0, 'exit'); ok(!r.stdout.trimStart().startsWith('{'), 'plain text');
  for (const s of ['stock_research', 'fund_research', 'index_data', 'bond_data', 'financial_docs', 'edb_data', 'analytics_data', 'options_data', 'futures_data', 'company_data', 'finance_data']) ok(r.stdout.includes(`  ${s}`), `USAGE 缺 ${s}`);
});
test('未知命令 → USAGE_ERROR', () => expectCode(run(['foobar'], { mock: false }), 'USAGE_ERROR'));
test('call 缺参数 → USAGE_ERROR', () => expectCode(run(['call', 'stock_research'], { mock: false }), 'USAGE_ERROR'));

// ── 路由 ──
test('旧 server_type stock_data → ROUTE_ERROR 且列出可用站', () => {
  const r = run(['call', 'stock_data', 'search_stocks', '{"question":"x"}'], { mock: false });
  expectCode(r, 'ROUTE_ERROR'); ok(r.body.message.includes('stock_research'), '应列出新站名');
});
test('工具不属于该站 → ROUTE_ERROR 且列出该站工具', () => {
  const r = run(['call', 'edb_data', 'get_stock_kline', '{"windcode":"x"}'], { mock: false });
  expectCode(r, 'ROUTE_ERROR'); ok(r.body.message.includes('economic_query_indicator_series'), '应列出站内工具');
});
test('list-tools 未知站 → ROUTE_ERROR', () => expectCode(run(['list-tools', 'nope'], { mock: false }), 'ROUTE_ERROR'));

// ── params 形态 ──
test('非 JSON → INVALID_PARAMS_JSON', () => expectCode(run(['call', 'stock_research', 'stock_get_company_profile', 'not-json'], { mock: false }), 'INVALID_PARAMS_JSON'));
test('params 是数组 → PARAM_TYPE_ERROR', () => expectCode(run(['call', 'stock_research', 'stock_get_company_profile', '[]'], { mock: false }), 'PARAM_TYPE_ERROR'));
test('@不存在的文件 → PARAMS_FILE_ERROR', () => expectCode(run(['call', 'stock_research', 'stock_get_company_profile', '@missing.json'], { mock: false }), 'PARAMS_FILE_ERROR'));
test('@文件（含 BOM）正常读取并发出', () => {
  writeFileSync(join(WORK, 'p.json'), '﻿{"windCode":"600519.SH"}');
  const r = run(['call', 'stock_research', 'stock_get_company_profile', '@p.json']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { windCode: '600519.SH' }, 'sent');
});

// ── manifest 校验 ──
test('缺必填 → PARAM_VALIDATION_ERROR', () => expectCode(run(['call', 'stock_research', 'stock_get_company_profile', '{}'], { mock: false }), 'PARAM_VALIDATION_ERROR'));
test('必填字符串全空白 → PARAM_VALIDATION_ERROR', () => expectCode(run(['call', 'stock_research', 'stock_get_company_profile', '{"windCode":"  "}'], { mock: false }), 'PARAM_VALIDATION_ERROR'));
test('strict 工具多传字段 → PARAM_VALIDATION_ERROR，不发网络', () => {
  const r = run(['call', 'fund_research', 'fund_get_nav', '{"windCodes":["510300.SH"],"foo":1}']);
  expectCode(r, 'PARAM_VALIDATION_ERROR'); eq(sent(), null, '不应发出请求');
});
test('非 strict 工具多传字段本地放行（交给后端）', () => {
  const r = run(['call', 'stock_research', 'stock_screener', '{"question":"x","extra":1}']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { question: 'x', extra: 1 }, 'sent');
});
test('类型不符（string 传数组）→ PARAM_TYPE_ERROR', () => expectCode(run(['call', 'stock_research', 'stock_get_company_profile', '{"windCode":["a"]}'], { mock: false }), 'PARAM_TYPE_ERROR'));
test('标量枚举非法 → PARAM_VALIDATION_ERROR', () => expectCode(run(['call', 'finance_data', 'quote_get_historical_data_series', '{"windCode":"600519.SH","type":5}'], { mock: false }), 'PARAM_VALIDATION_ERROR'));
test('标量枚举传空串视为不筛选，放行', () => {
  const r = run(['call', 'company_data', 'company_list_patent', '{"companyKey":"贵州茅台酒股份有限公司","patentType":""}']);
  eq(r.exit, 0, 'exit');
});
test('数组 items_enum 不做本地校验（后端接受别名）', () => {
  const r = run(['call', 'fund_research', 'fund_get_basic_info', '{"windCodes":["510300.SH"],"includeFields":["基金全称"]}']);
  eq(r.exit, 0, 'exit'); deepEq(sent().includeFields, ['基金全称'], 'sent');
});

// ── call-rules 跨字段 ──
test('EDB observation 与 startDate 互斥 → PARAM_VALIDATION_ERROR', () => expectCode(run(['call', 'edb_data', 'economic_query_indicator_series', '{"question":"x","observation":4,"startDate":"2025-01-01","endDate":"2025-12-31"}'], { mock: false }), 'PARAM_VALIDATION_ERROR'));
test('EDB 只给 startDate → PARAM_VALIDATION_ERROR', () => expectCode(run(['call', 'edb_data', 'economic_get_indicator_series', '{"metricCodes":"M0001227","startDate":"2025-01-01"}'], { mock: false }), 'PARAM_VALIDATION_ERROR'));
test('startDate 晚于 endDate → PARAM_VALIDATION_ERROR', () => expectCode(run(['call', 'futures_data', 'futures_get_basis', '{"windCodes":["CU.SHF"],"startDate":"2026-09-05","endDate":"2026-08-01"}'], { mock: false }), 'PARAM_VALIDATION_ERROR'));
test('timeFrom 晚于 timeTo → PARAM_VALIDATION_ERROR', () => expectCode(run(['call', 'company_data', 'company_get_judgments', '{"companyKey":"贵州茅台酒股份有限公司","timeFrom":"2026-09-05","timeTo":"2026-08-01"}'], { mock: false }), 'PARAM_VALIDATION_ERROR'));
test('指数 K 线 period 非法 → PARAM_VALIDATION_ERROR', () => expectCode(run(['call', 'index_data', 'get_index_kline', '{"windcode":"000300.SH","begin_date":"2026-04-01","end_date":"2026-04-30","period":"99"}'], { mock: false }), 'PARAM_VALIDATION_ERROR'));
test('指数 K 线 begin_date 晚于 end_date → PARAM_VALIDATION_ERROR', () => expectCode(run(['call', 'index_data', 'get_index_kline', '{"windcode":"000300.SH","begin_date":"2026-04-30","end_date":"2026-04-01"}'], { mock: false }), 'PARAM_VALIDATION_ERROR'));

// ── 类型收敛（断言实际发出的 arguments）──
test('数组参数：逗号串收敛为数组，代码大写', () => {
  const r = run(['call', 'fund_research', 'fund_get_nav', '{"windCodes":"510300.sh,000001.OF"}']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { windCodes: ['510300.SH', '000001.OF'] }, 'sent');
});
test('数组参数：单个标量包成数组', () => {
  const r = run(['call', 'futures_data', 'futures_get_basis', '{"windCodes":"CU.SHF"}']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { windCodes: ['CU.SHF'] }, 'sent');
});
test('整数参数：数字字符串收敛为 number', () => {
  const r = run(['call', 'edb_data', 'economic_query_indicator_series', '{"question":"中国GDP","observation":"4"}']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { question: '中国GDP', observation: 4 }, 'sent');
});
test('整数参数：非数字字符串不收敛 → PARAM_TYPE_ERROR', () => expectCode(run(['call', 'edb_data', 'economic_query_indicator_series', '{"question":"x","observation":"ten"}'], { mock: false }), 'PARAM_TYPE_ERROR'));
test('boolean 参数："true" 收敛为 true', () => {
  const r = run(['call', 'company_data', 'company_list_shareholder', '{"companyKey":"贵州茅台酒股份有限公司","history":"true"}']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { companyKey: '贵州茅台酒股份有限公司', history: true }, 'sent');
});
test('object 参数：JSON 字符串收敛为对象；枚举 type "1" 收敛为 1', () => {
  const r = run(['call', 'finance_data', 'quote_get_historical_data_series', '{"windCode":"600519.SH","type":"1","params":"{\\"period\\":\\"10\\"}"}']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { windCode: '600519.SH', type: 1, params: { period: '10' } }, 'sent');
});
test('string 参数：数字收敛为字符串', () => {
  const r = run(['call', 'company_data', 'company_get_biz_enum', '{"listType":2,"categoryName":123}']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { listType: 2, categoryName: '123' }, 'sent');
});
test('指数 K 线：period 默认 1d→10，港股 00700.hk→0700.HK，count 收敛整数', () => {
  const r = run(['call', 'index_data', 'get_index_kline', '{"windcode":"00700.hk","begin_date":"2026-04-01","end_date":"2026-04-30","count":"-5"}']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { windcode: '0700.HK', begin_date: '2026-04-01', end_date: '2026-04-30', count: -5, period: '10' }, 'sent');
});
test('中文名称不猜后缀、不改写', () => {
  const r = run(['call', 'stock_research', 'stock_get_company_profile', '{"windCode":"贵州茅台"}']);
  eq(r.exit, 0, 'exit'); deepEq(sent(), { windCode: '贵州茅台' }, 'sent');
});
test('indexes 去空白', () => {
  const r = run(['call', 'finance_data', 'quote_get_realtime_indicators', '{"windCodes":"600519.SH","indexes":" 最新成交价 , 涨跌幅 "}']);
  eq(r.exit, 0, 'exit'); eq(sent().indexes, '最新成交价,涨跌幅', 'indexes');
});

// ── 信封 ──
test('成功：附 cli_meta.server_type / tool_name', () => {
  const r = run(['call', 'edb_data', 'economic_query_indicator_series', '{"question":"x","observation":4}']);
  eq(r.exit, 0, 'exit'); eq(r.body?.cli_meta?.server_type, 'edb_data', 'server_type'); eq(r.body?.cli_meta?.tool_name, 'economic_query_indicator_series', 'tool_name');
});
test('成功：Markdown 正文原样透传', () => {
  const r = run(['call', 'fund_research', 'fund_get_nav', '{"windCodes":["510300.SH"]}'], { scenario: 'success_markdown' });
  eq(r.exit, 0, 'exit'); ok(r.body.content[0].text.startsWith('## 查询结果'), 'markdown passthrough');
});
test('成功：INVALID 单元格转 null 并给出 warning', () => {
  const r = run(['call', 'finance_data', 'general_query_data', '{"question":"x"}'], { scenario: 'success_invalid_cells' });
  eq(r.exit, 0, 'exit'); ok(r.body.cli_meta.warnings.some(w => w.code === 'BACKEND_INVALID_AS_NULL'), 'warning'); eq(r.body.cli_meta.completeness, 'unknown', 'completeness');
});
test('无任何 Key 来源 → AUTH_ERROR，不发网络', () => {
  const r = run(['call', 'stock_research', 'stock_get_company_profile', '{"windCode":"600519.SH"}'], { key: '' });
  expectCode(r, 'AUTH_ERROR'); eq(sent(), null, '不应发出请求');
});

const failed = results.filter(r => !r[1]);
for (const [name, pass, detail] of results) console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `\n        ✗ ${detail}` : ''}`);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
rmSync(HOME, { recursive: true, force: true }); rmSync(WORK, { recursive: true, force: true });
process.exit(failed.length ? 1 : 0);
