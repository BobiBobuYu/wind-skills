// 用 mock-fetch.mjs 的每种后端形态跑真实 cli.mjs，断言：接口层错误全部塌缩为 backend_error，
// HTTP 状态映射到本地错误码，成功形态（JSON / Markdown / 旧式信封 / 无匹配记录）不误报。
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const CLI = join(dirname(TESTS_DIR), 'scripts', 'cli.mjs');
const MOCK = join(TESTS_DIR, 'mock-fetch.mjs');
const HOME = mkdtempSync(join(tmpdir(), 'wind-err-home-'));
const CALL = ['call', 'edb_data', 'economic_query_indicator_series', '{"question":"中国GDP","observation":4}'];

// [scenario, expectedExit, expectedCode(null=成功)]
const CASES = [
  ['success_json', 0, null],
  ['success_markdown', 0, null],
  ['success_old_envelope', 0, null],
  ['success_no_match', 0, null],
  ['success_plain_json_body', 0, null],
  ['iserror_text', 1, 'backend_error'],
  ['unavailable', 1, 'backend_error'],
  ['plain_text_error', 1, 'backend_error'],
  ['plain_text_ner_error', 1, 'backend_error'],
  ['jsonrpc_error', 1, 'backend_error'],
  ['inner_error', 1, 'backend_error'],
  ['mcp_tool_error', 1, 'backend_error'],
  ['inner_code_fail', 1, 'backend_error'],
  ['garbage', 1, 'TOOL_RUNTIME_ERROR'],
  ['http_401', 1, 'AUTH_ERROR'],
  ['http_429', 1, 'RATE_LIMIT_ERROR'],
  ['http_503', 1, 'NETWORK_ERROR'],
];

let pass = 0, fail = 0;
for (const [scenario, wantExit, wantCode] of CASES) {
  const r = spawnSync(process.execPath, ['--import', MOCK, CLI, ...CALL], {
    encoding: 'utf8', env: { ...process.env, HOME, USERPROFILE: HOME, WIND_API_KEY: 'test-key', WIND_MOCK_SCENARIO: scenario },
  });
  let body = null; try { body = JSON.parse(r.stdout); } catch { }
  const checks = [[`exit==${wantExit}`, r.status === wantExit]];
  if (wantCode === null) checks.push(['no error envelope', !(body && body.ok === false)]);
  else {
    checks.push([`code==${wantCode}`, body?.code === wantCode]);
    checks.push(['has message', typeof body?.message === 'string' && body.message.length > 0]);
  }
  const good = checks.every(([, v]) => v);
  good ? pass++ : fail++;
  console.log(`${good ? 'PASS' : 'FAIL'}  ${scenario.padEnd(26)} exit=${r.status} code=${body?.code ?? '-'}`);
  for (const [label, v] of checks) if (!v) console.log(`        ✗ ${label}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
rmSync(HOME, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
