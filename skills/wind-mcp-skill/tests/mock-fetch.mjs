// Preload：替换 globalThis.fetch，让真实 cli.mjs 端到端跑在模拟的 Wind MCP 后端上，不发网络。
//   WIND_MOCK_SCENARIO=<name>   选择 tools/call 的响应形态（默认 success_json）
//   WIND_MOCK_CAPTURE=<path>    把每次 tools/call 的 JSON-RPC 请求追加写入该文件（用于断言实际发出的 arguments）
// 场景覆盖 2026-09-07 实测到的全部后端形态：SSE / 纯 JSON、isError 文本、isError=false 的纯文本错误、
// Markdown 正文、旧式内层信封 {data,error}、内层业务码、HTTP 401/429/503。
import { writeFileSync } from 'node:fs';

const SCENARIO = process.env.WIND_MOCK_SCENARIO || 'success_json';
const CAPTURE = process.env.WIND_MOCK_CAPTURE || '';
const captured = [];

const sse = (obj) => `event: message\ndata: ${JSON.stringify(obj)}\n\n`;
const res = (bodyText, { ok = true, status = 200 } = {}) => ({ ok, status, statusText: ok ? 'OK' : 'ERR', text: async () => bodyText });
const textResult = (id, text, isError = false) => ({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }], isError } });

export const SCENARIOS = {
  // ── 成功形态 ──
  success_json: (id) => sse(textResult(id, JSON.stringify({ metrics: [{ meta: { code: 'M5567876', unit: '亿元', magnitude: '亿' }, date: ['20260630'], value: [361511.1] }] }))),
  success_markdown: (id) => sse(textResult(id, '## 查询结果\n| Wind代码 | 单位净值 |\n|---|---|\n| 510300.SH | 4.6147 元 |')),
  success_old_envelope: (id) => sse(textResult(id, JSON.stringify({ data: { data: [{ columns: [{ name: 'Wind代码' }], rows: [['600519.SH']] }] }, error: null }))),
  success_no_match: (id) => sse(textResult(id, '## 摘要\n无匹配记录')),
  success_invalid_cells: (id) => sse(textResult(id, JSON.stringify({ data: { rows: [['x', 'INVALID']], excelTotalCount: 99 } }))),
  success_plain_json_body: (id) => JSON.stringify(textResult(id, JSON.stringify({ ok: 1 }))),
  // ── 接口错误形态（全部应塌缩为 backend_error）──
  iserror_text: (id) => sse(textResult(id, '缺少必填参数: metricCodes', true)),
  unavailable: (id) => sse(textResult(id, '服务暂时不可用，请稍后重试', true)),
  plain_text_error: (id) => sse(textResult(id, 'Invalid indicator: IV. Valid options: vol_moneyness, vol_delta, hv')),
  plain_text_ner_error: (id) => sse(textResult(id, '未识别到有效的金融标的:C')),
  jsonrpc_error: (id) => sse({ jsonrpc: '2.0', id, error: { code: -32000, message: 'INVALID_PARAM_VALUE: startDate 不合法' } }),
  inner_error: (id) => sse(textResult(id, JSON.stringify({ error: { code: 'INVALID_PARAM_NAME', message: "字段 'windcod' 不存在" } }))),
  mcp_tool_error: (id) => sse(textResult(id, JSON.stringify({ mcp_tool_error_code: 503, mcp_tool_error_msg: '后端抖动' }))),
  inner_code_fail: (id) => sse(textResult(id, JSON.stringify({ data: { code: 1003, message: '业务失败' }, error: null }))),
  // ── 本地/网络层 ──
  garbage: () => 'not json, not sse',
  http_401: () => res('unauthorized', { ok: false, status: 401 }),
  http_429: () => res('too many requests', { ok: false, status: 429 }),
  http_503: () => res('bad gateway', { ok: false, status: 503 }),
};

globalThis.fetch = async (_url, opts = {}) => {
  let payload = {};
  try { payload = JSON.parse(opts.body || '{}'); } catch { }
  const id = payload.id || 1;
  if (payload.method === 'initialize') {
    return res(sse({ jsonrpc: '2.0', id, result: { protocolVersion: '2025-03-26', capabilities: {}, serverInfo: { name: 'mock-wind', version: '0' } } }));
  }
  if (payload.method === 'tools/list') {
    return res(sse({ jsonrpc: '2.0', id, result: { tools: [{ name: 'mock_tool', inputSchema: { type: 'object', properties: {} } }] } }));
  }
  captured.push(payload);
  if (CAPTURE) writeFileSync(CAPTURE, JSON.stringify(captured, null, 2) + '\n');
  const scenario = SCENARIOS[SCENARIO];
  if (!scenario) throw new Error(`WIND_MOCK_SCENARIO 未知: '${SCENARIO}'`);
  const out = scenario(id);
  return typeof out === 'string' ? res(out) : out;
};
