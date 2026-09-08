#!/usr/bin/env node
// wind-mcp-skill CLI: thin JSON-envelope wrapper around Wind MCP servers
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

// #region 静态：版本、11 个 MCP 地址、路径、HTTP 状态码映射。只含常量，不发网络。
const SKILL_VERSION = '3.3.0';
const MCP_TRANSPORT = { accept: 'application/json, text/event-stream', contentType: 'application/json' };
const SERVER_ENDPOINTS = {
  stock_research: 'https://mcp.wind.com.cn/vserver_stock_research/mcp/',
  fund_research: 'https://mcp.wind.com.cn/vserver_fund_research/mcp/',
  options_data: 'https://mcp.wind.com.cn/vserver_options_data/mcp/',
  futures_data: 'https://mcp.wind.com.cn/vserver_futures_data/mcp/',
  company_data: 'https://mcp.wind.com.cn/vserver_company_data/mcp/',
  finance_data: 'https://mcp.wind.com.cn/vserver_finance_data/mcp/',
  edb_data: 'https://mcp.wind.com.cn/vserver_edb_data/mcp/',
  index_data: 'https://mcp.wind.com.cn/vserver_index_data/mcp/',
  bond_data: 'https://mcp.wind.com.cn/vserver_bond_data/mcp/',
  financial_docs: 'https://mcp.wind.com.cn/vserver_financial_docs/mcp/',
  analytics_data: 'https://mcp.wind.com.cn/vserver_analytics_data/mcp/',
};
const SERVER_REGISTRY = Object.fromEntries(Object.entries(SERVER_ENDPOINTS).map(([name, endpoint]) => [name, {
  endpoint,
  credentialEnv: 'WIND_API_KEY',
  source: 'skill_contract',
  ...MCP_TRANSPORT,
}]));

// 本地 registry: 工具选择可在任何网络调用前失败
const SERVERS = {
  stock_research: {
    endpoint: SERVER_REGISTRY.stock_research.endpoint,
    label: 'Wind 股票研究（市场/行业/公司/财务/估值/事件/资金/技术/实时分析/选股）',
    keyName: SERVER_REGISTRY.stock_research.credentialEnv,
    accept: SERVER_REGISTRY.stock_research.accept,
    contentType: SERVER_REGISTRY.stock_research.contentType,
    addressSource: SERVER_REGISTRY.stock_research.source,
  },
  fund_research: {
    endpoint: SERVER_REGISTRY.fund_research.endpoint,
    label: 'Wind 基金研究（筛选/档案/净值/业绩/持仓/归因/风格/仓位）',
    accept: SERVER_REGISTRY.fund_research.accept,
    contentType: SERVER_REGISTRY.fund_research.contentType,
    addressSource: SERVER_REGISTRY.fund_research.source,
  },
  options_data: {
    endpoint: SERVER_REGISTRY.options_data.endpoint,
    label: 'Wind 期权（合约/期限/波动率/情绪/香草及奇异期权定价）',
    accept: SERVER_REGISTRY.options_data.accept,
    contentType: SERVER_REGISTRY.options_data.contentType,
    addressSource: SERVER_REGISTRY.options_data.source,
  },
  futures_data: {
    endpoint: SERVER_REGISTRY.futures_data.endpoint,
    label: 'Wind 期货（仓单/合约/基差/资金/持仓/研报观点/供需）',
    accept: SERVER_REGISTRY.futures_data.accept,
    contentType: SERVER_REGISTRY.futures_data.contentType,
    addressSource: SERVER_REGISTRY.futures_data.source,
  },
  company_data: {
    endpoint: SERVER_REGISTRY.company_data.endpoint,
    label: 'Wind 企业库（工商/股权/人员/知识产权/司法/税务/经营风险）',
    accept: SERVER_REGISTRY.company_data.accept,
    contentType: SERVER_REGISTRY.company_data.contentType,
    addressSource: SERVER_REGISTRY.company_data.source,
  },
  finance_data: {
    endpoint: SERVER_REGISTRY.finance_data.endpoint,
    label: 'Wind 通用金融（跨资产行情/历史序列/指标/报表/文档/投研语料/自然语言取数）',
    accept: SERVER_REGISTRY.finance_data.accept,
    contentType: SERVER_REGISTRY.finance_data.contentType,
    addressSource: SERVER_REGISTRY.finance_data.source,
  },
  edb_data: {
    endpoint: SERVER_REGISTRY.edb_data.endpoint,
    label: 'Wind EDB（宏观/行业/区域/汇率指标搜索与时间序列）',
    accept: SERVER_REGISTRY.edb_data.accept,
    contentType: SERVER_REGISTRY.edb_data.contentType,
    addressSource: SERVER_REGISTRY.edb_data.source,
  },
  index_data: {
    endpoint: SERVER_REGISTRY.index_data.endpoint,
    label: 'Wind 指数/板块（档案/基本面/技术 + 行情/K线/分钟）',
    accept: SERVER_REGISTRY.index_data.accept,
    contentType: SERVER_REGISTRY.index_data.contentType,
    addressSource: SERVER_REGISTRY.index_data.source,
  },
  bond_data: {
    endpoint: SERVER_REGISTRY.bond_data.endpoint,
    label: 'Wind 债券（基本档案/发债主体/行情估值/主体财务）',
    accept: SERVER_REGISTRY.bond_data.accept,
    contentType: SERVER_REGISTRY.bond_data.contentType,
    addressSource: SERVER_REGISTRY.bond_data.source,
  },
  financial_docs: {
    endpoint: SERVER_REGISTRY.financial_docs.endpoint,
    label: 'Wind 金融文档 RAG（公告 / 新闻）',
    accept: SERVER_REGISTRY.financial_docs.accept,
    contentType: SERVER_REGISTRY.financial_docs.contentType,
    addressSource: SERVER_REGISTRY.financial_docs.source,
  },
  analytics_data: {
    endpoint: SERVER_REGISTRY.analytics_data.endpoint,
    label: 'Wind 通用分析数据（NL → Wind 数据）',
    accept: SERVER_REGISTRY.analytics_data.accept,
    contentType: SERVER_REGISTRY.analytics_data.contentType,
    addressSource: SERVER_REGISTRY.analytics_data.source,
  },
};

const PORTAL_URL = 'https://aifinmarket.wind.com.cn/#/user/overview';

const SKILL_DIR = dirname(dirname(fileURLToPath(
  import.meta.url)));

const UPDATE_CHECK_PATH = join(SKILL_DIR, 'scripts', 'update-check.mjs');

const SKILL_NAME = basename(SKILL_DIR);

const CALL_EXAMPLES = [
  `cli.mjs call stock_research stock_screener '{"question":"筛选沪深市场市值超500亿且连续5日上涨的股票"}'`,
  `cli.mjs call stock_research stock_get_company_profile '{"windCode":"600519.SH"}'`,
  `cli.mjs call fund_research fund_get_basic_info '{"windCodes":["005827.OF"]}'`,
  `cli.mjs call general_data quote_get_realtime_indicators '{"windCodes":"600519.SH","indexes":"最新成交价,涨跌幅"}'`,
  `cli.mjs call company_data company_search_entity '{"searchKey":"贵州茅台"}'`,
  `cli.mjs call edb_data economic_search_indicator '{"question":"中国GDP相关指标"}'`,
  `cli.mjs call index_data get_index_kline '{"windcode":"000300.SH","begin_date":"2026-04-01","end_date":"2026-04-30"}'`,
  `cli.mjs call financial_docs get_financial_news '{"query":"美联储利率政策","top_k":3}'`,
  `cli.mjs call analytics_data get_financial_data '{"question":"查询中国A股市场过去一年的平均成交量"}'`,
];

const KLINE_PERIOD_MAP = new Map([
  ['1min', '1'], ['5min', '3'], ['10min', '4'], ['15min', '5'],
  ['30min', '6'], ['60min', '7'], ['120min', '8'], ['240min', '9'],
  ['1d', '10'], ['1w', '11'], ['1mo', '12'], ['1y', '13'],
  ['1q', '14'], ['6mo', '15'],
]);
const KLINE_TOOLS = new Set(['get_index_kline']);
const COMPANY_DATE_COMPAT_TOOLS = new Set([
  'company_get_court_announcements',
  'company_get_court_sessions',
  'company_get_filing_info',
  'company_get_judgments',
  'company_get_news_sentiment',
]);
const TEXT_ERROR_PREFIXES = [
  'Invalid ',
  '未识别到有效的金融标的',
  '缺少必填参数',
  '服务暂时不可用',
  '余额不足',
];

const HTTP_ERROR_MAP = {
  401: 'AUTH_ERROR',
  429: 'RATE_LIMIT_ERROR',
  500: 'NETWORK_ERROR',
  502: 'NETWORK_ERROR',
  503: 'NETWORK_ERROR',
  504: 'NETWORK_ERROR',
};
// #endregion 静态

// #region 自动更新：call 成功后每日最多后台检查一次；WIND_SKILL_AUTO_UPDATE=0 可关闭。

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePath(value) {
  const normalized = resolve(value).replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function updateScope() {
  const globalRoot = normalizePath(join(homedir(), '.agents', 'skills'));
  const skillDir = normalizePath(SKILL_DIR);
  return skillDir.startsWith(globalRoot + '/') ? 'global' : 'project';
}

function updateStateFile() {
  return join(SKILL_DIR, 'scripts', 'update-state.json');
}

function readUpdateState() {
  try {
    const stateFile = updateStateFile();
    if (!existsSync(stateFile)) return null;
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return null;
  }
}

function writeUpdateStatePatch(patch) {
  const stateFile = updateStateFile();
  mkdirSync(dirname(stateFile), { recursive: true });
  const state = { ...(readUpdateState() || {}), ...patch };
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
}

function alreadyUpdatedToday() {
  try {
    const state = readUpdateState();
    return state && state.date === todayKey() && state.status === 'success';
  } catch {
    return false;
  }
}

function markSkillUsed() {
  writeUpdateStatePatch({
    lastUsedAt: new Date().toISOString(),
    lastUsedPid: process.pid,
  });
}

function triggerUpdateCheck() {
  try {
    if (process.env.WIND_SKILL_AUTO_UPDATE === '0') return;
    if (!existsSync(UPDATE_CHECK_PATH)) return;
    if (alreadyUpdatedToday()) return;
    markSkillUsed();
    const tmpDir = join(homedir(), '.cache', 'wind-aifinmarket');
    mkdirSync(tmpDir, { recursive: true });
    const runnerPath = join(tmpDir, `update-check-${SKILL_NAME}-${process.pid}.mjs`);
    copyFileSync(UPDATE_CHECK_PATH, runnerPath);
    const child = spawn('node', [runnerPath, SKILL_DIR], { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => { /* ignore spawn failures; update must not block CLI */ });
    child.unref();
  } catch { }
}
// #endregion 自动更新

// #region 信封：成功写 MCP result + cli_meta；失败统一写 {ok:false,code,message}。Agent 只读 stdout。
function normalizeSuccessPayload(value, path = '$', state = { warnings: [], tables: [], invalidPaths: [] }, dataCell = false) {
  if (dataCell && value === 'INVALID') {
    state.invalidPaths.push(path);
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeSuccessPayload(item, `${path}[${index}]`, state, dataCell));
  }
  if (!value || typeof value !== 'object') return value;

  const normalized = {};
  for (const [key, item] of Object.entries(value)) {
    const isStructuredDataArray = Array.isArray(item) && (key === 'rows' || key === 'value');
    normalized[key] = normalizeSuccessPayload(item, `${path}.${key}`, state, dataCell || isStructuredDataArray);
  }
  if (Array.isArray(value.rows)) {
    state.tables.push({ path, actual_row_count: value.rows.length });
  }
  if (Object.hasOwn(value, 'excelTotalCount')) {
    state.warnings.push({
      code: 'UNRELIABLE_DECLARED_COUNT',
      path: `${path}.excelTotalCount`,
      message: 'excelTotalCount 仅保留为后端原始字段，不得据此判断结果总数或完整性。',
    });
  }
  return normalized;
}

// 保留 MCP result 外层兼容性；只清洗可解析的 JSON 文本并附加机器可读安全元数据。
function normalizeCallSuccess(result, context = {}) {
  const output = result && typeof result === 'object' ? structuredClone(result) : result;
  const state = { warnings: [], tables: [], invalidPaths: [] };
  if (output && Array.isArray(output.content)) {
    for (const item of output.content) {
      if (item?.type !== 'text' || typeof item.text !== 'string') continue;
      try {
        const parsed = JSON.parse(item.text);
        item.text = JSON.stringify(normalizeSuccessPayload(parsed, '$', state));
      } catch {
        // 非 JSON 文本按后端原文透传。
      }
    }
  }
  if (state.invalidPaths.length) {
    state.warnings.push({
      code: 'BACKEND_INVALID_AS_NULL',
      count: state.invalidPaths.length,
      paths: state.invalidPaths.slice(0, 100),
      truncated: state.invalidPaths.length > 100,
      message: '结构化数据区中的后端字符串 INVALID 已转换为 null；表示缺失或不适用，禁止按 0 参与计算。',
    });
  }
  if (output && typeof output === 'object') {
    output.cli_meta = {
      schema_version: '1.0',
      server_type: context.server_type || null,
      tool_name: context.tool_name || null,
      completeness: state.warnings.some(warning => warning.code === 'UNRELIABLE_DECLARED_COUNT') ? 'unknown' : 'not_asserted',
      tables: state.tables,
      warnings: state.warnings,
    };
  }
  return output;
}

function writeRawCallSuccess(result, context = {}) {
  process.stdout.write(JSON.stringify(normalizeCallSuccess(result, context), null, 2) + '\n');
}

function writePlainSuccess(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

const DEFAULT_ERROR_MESSAGES = Object.freeze({
  AUTH_ERROR: '认证失败，请检查 API Key',
  PARAM_TYPE_ERROR: '参数类型错误，请检查字段类型',
  USAGE_ERROR: '命令用法错误，请检查输入参数',
  PARAMS_FILE_ERROR: '参数文件读取失败，请检查文件路径和内容',
  INVALID_PARAMS_JSON: '参数格式错误，params 必须是 JSON 对象',
  ROUTE_ERROR: '工具路由失败，请检查 server_type 和 tool_name',
  PARAM_VALIDATION_ERROR: '参数校验失败，请检查字段名和取值',
  PARAM_CONFLICT_ERROR: '参数存在冲突，请检查输入组合',
  RATE_LIMIT_ERROR: '请求过于频繁，请稍后重试',
  NETWORK_ERROR: '服务暂时不可用，请稍后重试',
  TOOL_RUNTIME_ERROR: '响应解析失败，请稍后重试',
  SETUP_ERROR: '本地配置缺失或无效，请检查技能配置',
  UNKNOWN: '调用失败，请稍后重试',
});

const MAPPED_ERROR_MESSAGE_CODES = new Set(
  Object.keys(DEFAULT_ERROR_MESSAGES).filter((code) => code !== 'UNKNOWN'),
);

function normalizeErrorMessage(code, detail, metadata = {}) {
  if (!MAPPED_ERROR_MESSAGE_CODES.has(code)) {
    if (typeof metadata.error_message === 'string' && metadata.error_message.trim()) {
      return metadata.error_message.trim();
    }
    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim().slice(0, 2000);
    }
    return DEFAULT_ERROR_MESSAGES.UNKNOWN;
  }
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim().slice(0, 500);
  }
  return DEFAULT_ERROR_MESSAGES[code] || DEFAULT_ERROR_MESSAGES.UNKNOWN;
}

function writeErrorEnvelope(code, detail, metadata = {}) {
  const envelope = {
    ok: false,
    code,
    message: normalizeErrorMessage(code, detail, metadata),
  };
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n');
}

function die(code, detail = null, exitCode = 1, metadata = {}) {
  writeErrorEnvelope(code, detail, metadata);
  process.exit(exitCode);
}

function exitWithUsage(usage, exitCode = 0) {
  die('USAGE_ERROR', `USAGE:\n${usage}`, exitCode);
}
// #endregion 信封

// #region 认证：所有站使用共享 WIND_API_KEY；任何 Key 都不得写入 Skill 源码或 references。
function maskKey(key) {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 4) + '***' + key.slice(-4);
}

// dotenv 解析: 兼容注释 / 引号 / export 前缀
function parseDotenv(content) {
  const env = {};
  for (const rawLine of content.split('\n')) {
    let line = rawLine.replace(/^\uFEFF/, '').trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else {
      const hashIdx = val.indexOf(' #');
      if (hashIdx >= 0) val = val.slice(0, hashIdx).trim();
    }
    env[key] = val;
  }
  return env;
}

function keyNamesForServer(server_type) {
  return [SERVERS[server_type]?.keyName || 'WIND_API_KEY'];
}

function getApiKey(server_type) {
  const keyNames = keyNamesForServer(server_type);
  for (const keyName of keyNames) {
    const envKey = process.env[keyName]?.trim();
    if (envKey) return envKey;
  }

  const globalConfig = join(homedir(), '.wind-aifinmarket', 'config');
  if (existsSync(globalConfig)) {
    try {
      const env = parseDotenv(readFileSync(globalConfig, 'utf8'));
      for (const keyName of keyNames) {
        const key = env[keyName]?.trim();
        if (key) return key;
      }
    } catch { }
  }

  const localConfig = join(SKILL_DIR, 'config.json');
  if (existsSync(localConfig)) {
    try {
      const cfg = JSON.parse(readFileSync(localConfig, 'utf8'));
      const specific = typeof cfg.wind_api_keys?.[server_type] === 'string'
        ? cfg.wind_api_keys[server_type].trim()
        : '';
      if (specific) return specific;
      const shared = typeof cfg.wind_api_key === 'string' ? cfg.wind_api_key.trim() : '';
      if (shared) return shared;
    } catch { }
  }

  die('AUTH_ERROR', `${keyNames.join(' 或 ')} 未配置（已检查：环境变量 > 用户全局配置 > Skill 本地配置）`);
}
// #endregion 认证

// #region 路由：server_type 由本地配置校验，tool_name 由 MCP Server 实时校验。
function getServer(server_type) {
  const server = SERVERS[server_type];
  if (!server) {
    die('ROUTE_ERROR', `未知 server_type: ${server_type}. 可用: ${Object.keys(SERVERS).join(' / ')}`);
  }
  return server;
}
// #endregion 路由

// #region 规范化：整理 windcode/indexes/period。不给中文名称猜交易所后缀。
function normalizeIndexes(indexes) {
  if (typeof indexes !== 'string') return indexes;
  return indexes.split(',').map((item) => item.trim()).filter(Boolean).join(',');
}

function normalizeWindcode(windcode) {
  if (typeof windcode !== 'string') return windcode;
  const raw = windcode.trim();
  const upper = raw.toUpperCase();
  // Keep natural-language names untouched. Wind's backend NER is responsible
  // for resolving names/aliases; the CLI must not guess exchange suffixes.
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;
  if (/^0\d{4}\.HK$/.test(upper)) return upper.slice(1);
  if (/^\d{4}\.HK$/.test(upper)) return upper;
  if (/^\d{6}\.(SH|SZ|BJ|OF)$/.test(upper)) return upper;
  if (/^[A-Z]{1,5}\.(O|N|A|HK|SH|SZ|BJ)$/.test(upper)) return upper;
  return raw;
}

function normalizeWindcodes(windcodes, server_type) {
  const values = Array.isArray(windcodes)
    ? windcodes.map(item => normalizeWindcode(item))
    : typeof windcodes === 'string'
      ? windcodes.split(',').map(item => normalizeWindcode(item))
      : null;
  if (!values) return windcodes;
  return server_type === 'finance_data' ? values.join(',') : values;
}

function normalizeCall(server_type, toolName, args) {
  const normalizedArgs = { ...args };
  const normalizationErrors = [];
  if (typeof normalizedArgs.indexes === 'string') normalizedArgs.indexes = normalizeIndexes(normalizedArgs.indexes);
  if (typeof normalizedArgs.windcode === 'string') normalizedArgs.windcode = normalizeWindcode(normalizedArgs.windcode);
  if (typeof normalizedArgs.windCode === 'string') normalizedArgs.windCode = normalizeWindcode(normalizedArgs.windCode);
  if (Object.hasOwn(normalizedArgs, 'windCodes')) normalizedArgs.windCodes = normalizeWindcodes(normalizedArgs.windCodes, server_type);
  if (server_type === 'company_data' && COMPANY_DATE_COMPAT_TOOLS.has(toolName)) {
    for (const [legacyKey, publishedKey] of [['startDate', 'timeFrom'], ['endDate', 'timeTo']]) {
      if (hasParamValue(normalizedArgs, legacyKey) && hasParamValue(normalizedArgs, publishedKey) && normalizedArgs[legacyKey] !== normalizedArgs[publishedKey]) {
        normalizationErrors.push({ message: `字段 '${legacyKey}' 与 '${publishedKey}' 不能同时传入不同值`, fields: [legacyKey, publishedKey], issue: 'conflicting_aliases' });
      } else if (hasParamValue(normalizedArgs, legacyKey) && !hasParamValue(normalizedArgs, publishedKey)) {
        normalizedArgs[publishedKey] = normalizedArgs[legacyKey];
      }
      delete normalizedArgs[legacyKey];
    }
  }
  // count 是整型字段：把整数字符串收敛成 number，非整数原样留给 patterns 校验拦截。
  if (typeof normalizedArgs.count === 'string' && /^-?\d+$/.test(normalizedArgs.count.trim())) {
    normalizedArgs.count = Number(normalizedArgs.count.trim());
  }
  // finance_data 的历史行情网关实际按整数 0/1 解释 type；tools/list 曾同时
  // 发布 integer 类型和字符串枚举。接受两种用户输入，但在发往网关前统一为整数，
  // 避免字符串 1 被后端误当成分时模式。
  if (server_type === 'finance_data'
    && toolName === 'quote_get_historical_data_series'
    && typeof normalizedArgs.type === 'string'
    && /^(0|1)$/.test(normalizedArgs.type.trim())) {
    normalizedArgs.type = Number(normalizedArgs.type.trim());
  }
  if (KLINE_TOOLS.has(toolName) && normalizedArgs.period === undefined) normalizedArgs.period = '1d';
  if (typeof normalizedArgs.period === 'string') {
    const key = normalizedArgs.period.trim();
    normalizedArgs.period = KLINE_PERIOD_MAP.get(key) || key;
  }
  return { server_type, toolName, args: normalizedArgs, normalizationErrors };
}

function backendArguments(server_type, toolName, args) {
  if (server_type !== 'company_data' || !COMPANY_DATE_COMPAT_TOOLS.has(toolName)) return args;
  const output = { ...args };
  // 2026-09-05 实测：tools/list 发布 timeFrom/timeTo，但执行端仍只识别 startDate/endDate。
  if (hasParamValue(output, 'timeFrom')) output.startDate = output.timeFrom;
  if (hasParamValue(output, 'timeTo')) output.endDate = output.timeTo;
  delete output.timeFrom;
  delete output.timeTo;
  return output;
}
// #endregion 规范化

function hasParamValue(params, key) {
  return params[key] !== undefined && params[key] !== null && params[key] !== '';
}

// #region MCP：裸 HTTP JSON-RPC + SSE。先 initialize 再 tools/call。本地/网络错误由 CLI 收口，接口错误统一 backend_error。
function looksLikeTextError(text) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 300 || /^[\[{#|*]/.test(trimmed)) return false;
  return TEXT_ERROR_PREFIXES.some(prefix => trimmed.startsWith(prefix));
}

function parseSSE(text) {
  const trimmed = text.trim();
  // 后端正常 SSE, 部分错误场景纯 JSON
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch { }
  }
  const lines = text.split(/\r?\n/);
  let last = null;
  for (const line of lines) {
    if (line.startsWith('data: ')) last = line.slice(6);
  }
  if (last) {
    try {
      return JSON.parse(last);
    } catch (e) {
      throw new Error(`SSE data 行 JSON 解析失败：${e.message}。原文前 200 字符：${text.slice(0, 200)}`);
    }
  }
  throw new Error(`响应格式无法识别（既非 SSE 也非纯 JSON）。原文前 200 字符：${text.slice(0, 200)}`);
}

async function fetchWithRetry(fetchFn, url, optionsOrFactory, {
  attempts = 3,
  delaysMs = [300, 1000],
  onAttemptError = null,
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const options = typeof optionsOrFactory === 'function'
        ? optionsOrFactory(attempt)
        : optionsOrFactory;
      return await fetchFn(url, options);
    } catch (err) {
      lastError = err;
      onAttemptError?.(err, attempt, attempts);
      const delayMs = delaysMs[Math.min(attempt - 1, delaysMs.length - 1)] || 0;
      if (attempt < attempts && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

async function mcpRequest(server_type, method, params, {
  timeoutMs = 60_000,
  extraHeaders = {},
  includeResponseMeta = false,
} = {}) {
  const server = getServer(server_type);
  const apiKey = getApiKey(server_type);
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: server.accept || MCP_TRANSPORT.accept,
    'Content-Type': server.contentType || MCP_TRANSPORT.contentType,
    ...extraHeaders,
  };

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  });
  const dieInterfaceError = (message) => {
    die('backend_error', null, 1, {
      error_message: String(message ?? '').slice(0, 2000),
    });
  };
  let resp;
  try {
    resp = await fetchWithRetry(
      fetch,
      server.endpoint,
      () => ({
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      }),
      {
        attempts: 3,
        delaysMs: [300, 1000],
        onAttemptError: process.env.WIND_DEBUG === '1'
          ? (err, attempt, total) => {
            const causeCode = err?.cause?.code || err?.code || 'UNKNOWN_CAUSE';
            process.stderr.write(`[wind-mcp fetch retry ${attempt}/${total}] ${causeCode}: ${err?.message || err}\n`);
          }
          : null,
      },
    );
  } catch {
    die('NETWORK_ERROR');
  }

  if (!resp.ok) {
    await resp.text().catch(() => '');
    die(HTTP_ERROR_MAP[resp.status] || 'NETWORK_ERROR');
  }

  const text = await resp.text();
  let payload;
  try {
    payload = parseSSE(text);
  } catch (err) {
    die('TOOL_RUNTIME_ERROR', `${err.message} (server=${server_type})`);
  }

  if (payload.error) {
    const msg = typeof payload.error === 'string'
      ? payload.error
      : (payload.error.message || JSON.stringify(payload.error));
    dieInterfaceError(msg);
  }

  if (payload.result?.isError) {
    const msg = payload.result.content?.[0]?.text || JSON.stringify(payload.result);
    dieInterfaceError(msg);
  }

  const firstText = payload.result?.content?.[0]?.text;
  if (typeof firstText === 'string' && looksLikeTextError(firstText)) {
    dieInterfaceError(firstText.trim());
  }

  // 部分工具把业务错误包在 content[0].text 的 JSON 字符串里, 必须二次解析
  const innerText = payload.result?.content?.[0]?.text;
  if (typeof innerText === 'string') {
    let inner;
    try {
      inner = JSON.parse(innerText);
    } catch {
      inner = null;
    }
    if (inner) {
      if (typeof inner.mcp_tool_error_code === 'number' && inner.mcp_tool_error_code !== 0) {
        const msg = inner.mcp_tool_error_msg || JSON.stringify(inner);
        dieInterfaceError(msg);
      }
      if (inner.error && (inner.error.code || inner.error.message)) {
        const errorMessage = inner.error.message || JSON.stringify(inner.error);
        dieInterfaceError(errorMessage);
      }
      if (inner?.data && typeof inner.data === 'object') {
        const numericCode = typeof inner.data.code === 'number'
          ? inner.data.code
          : (typeof inner.data.code === 'string' && /^\d+$/.test(inner.data.code.trim()) ? Number(inner.data.code) : null);
        const isSuccessCode = numericCode === 0
          || (numericCode !== null && numericCode >= 200 && numericCode < 300);
        if (numericCode !== null && !isSuccessCode) {
          dieInterfaceError(typeof inner.data.message === 'string' ? inner.data.message : JSON.stringify(inner.data));
        }
      }
    }
  }
  if (includeResponseMeta) {
    return {
      result: payload.result,
      sessionId: resp.headers.get('mcp-session-id'),
      protocolVersion: payload.result?.protocolVersion || null,
    };
  }
  return payload.result;
}

async function mcpInitializeAndCall(server_type, method, params) {
  const initialized = await mcpRequest(server_type, 'initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: {
      name: SKILL_NAME,
      version: SKILL_VERSION
    },
  }, {
    timeoutMs: 30_000,
    includeResponseMeta: true,
  });

  const sessionHeaders = {};
  if (initialized.sessionId) sessionHeaders['Mcp-Session-Id'] = initialized.sessionId;
  if (initialized.protocolVersion) sessionHeaders['MCP-Protocol-Version'] = initialized.protocolVersion;

  return mcpRequest(server_type, method, params, {
    timeoutMs: 600_000,
    extraHeaders: sessionHeaders,
  });
}
// #endregion MCP

// #region 命令：call 取数；list-tools 拉 schema；setup-key / open-portal 配 Key；diagnose 看更新状态。
function loadParamsInput(paramsInput) {
  if (paramsInput === '-') {
    try {
      return { jsonText: readFileSync(0, 'utf8').replace(/^\uFEFF/, ''), source: 'stdin' };
    } catch (cause) {
      const error = new Error(`无法从 stdin 读取 params (${cause.code || cause.message})`);
      error.code = 'PARAMS_FILE_ERROR';
      error.cause = cause;
      throw error;
    }
  }

  if (!paramsInput.startsWith('@')) {
    return { jsonText: paramsInput, source: 'inline' };
  }

  const fileArg = paramsInput.slice(1);
  if (!fileArg) {
    const error = new Error('@file 缺少文件路径');
    error.code = 'PARAMS_FILE_ERROR';
    error.file = fileArg;
    throw error;
  }

  const filePath = resolve(process.cwd(), fileArg);
  try {
    const jsonText = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return { jsonText, source: 'file', filePath };
  } catch (cause) {
    const error = new Error(`无法读取 params 文件：${filePath} (${cause.code || cause.message})`);
    error.code = 'PARAMS_FILE_ERROR';
    error.file = filePath;
    error.cause = cause;
    throw error;
  }
}

async function cmdCall(server_type, toolName, paramsInput) {
  if (!server_type || !toolName || !paramsInput) {
    exitWithUsage(
      `用法：call <server_type> <tool_name> '<params_json>|@params_file|-'\n` +
      `可用 server_type: ${Object.keys(SERVERS).join(' / ')}\n` +
      `典型：\n  ${CALL_EXAMPLES.join('\n  ')}`,
      1,
    );
  }

  let paramsSource;
  try {
    paramsSource = loadParamsInput(paramsInput);
  } catch (e) {
    die('PARAMS_FILE_ERROR', e.message);
  }

  let args;
  try {
    args = JSON.parse(paramsSource.jsonText);
  } catch (e) {
    const sourceDetail = paramsSource.source === 'file'
      ? `文件：${paramsSource.filePath}`
      : `原文：${paramsSource.jsonText.slice(0, 200)}`;
    die('INVALID_PARAMS_JSON', `params JSON 解析失败：${e.message} | ${sourceDetail}`);
  }

  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    die('PARAM_TYPE_ERROR', 'params 必须是 JSON object');
  }

  let normalizationErrors;
  ({ server_type, toolName, args, normalizationErrors } = normalizeCall(server_type, toolName, args));
  getServer(server_type);

  if (normalizationErrors.length > 0) {
    die('PARAM_VALIDATION_ERROR', normalizationErrors.map(error => error.message).join('；'));
  }

  const result = await mcpInitializeAndCall(server_type, 'tools/call', {
    name: toolName,
    arguments: backendArguments(server_type, toolName, args),
    _meta: { clientVersion: SKILL_VERSION },
  });
  return {
    server_type,
    tool: toolName,
    result,
  };
}

async function cmdListTools(server_type) {
  if (!server_type) {
    exitWithUsage(
      `用法：list-tools <server_type>\n` +
      `可用 server_type: ${Object.keys(SERVERS).join(' / ')}`,
      1,
    );
  }
  getServer(server_type);
  const result = await mcpInitializeAndCall(server_type, 'tools/list', {});
  return { server_type, ...result };
}

async function cmdListServers(server_type) {
  const entries = Object.entries(SERVERS)
    .filter(([name]) => !server_type || name === server_type)
    .map(([name, server]) => ({
      server_type: name,
      endpoint: server.endpoint,
      endpoint_source: server.addressSource || 'skill_contract',
      auth_env: keyNamesForServer(name),
      headers: {
        Accept: server.accept || MCP_TRANSPORT.accept,
        'Content-Type': server.contentType || MCP_TRANSPORT.contentType,
      },
    }));
  if (server_type && entries.length === 0) {
    die('ROUTE_ERROR', `未知 server_type: ${server_type} (可选: ${Object.keys(SERVERS).join(' / ')})`);
  }
  return { servers: entries };
}

async function cmdSetupKey(...rawArgs) {
  const key = rawArgs[0];

  if (!key || key.startsWith('--')) {
    exitWithUsage(
      `用法：cli.mjs setup-key <KEY> [--server <default|stock_research>] [--scope <global|skill>]\n\n` +
      `默认 scope=global（全局共享）；仅用户明确要求时传 scope=skill（仅当前 Skill）。所有 server 都写入共享 WIND_API_KEY；--server 仅为兼容参数。`,
      1,
    );
  }

  let scope = 'global';
  let serverType = 'default';
  for (let i = 1; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a === '--scope' && rawArgs[i + 1]) {
      scope = rawArgs[i + 1];
      i += 1;
      continue;
    }
    if (a.startsWith('--scope=')) {
      scope = a.slice(8);
      continue;
    }
    if (a === '--server' && rawArgs[i + 1]) {
      serverType = rawArgs[i + 1];
      i += 1;
      continue;
    }
    if (a.startsWith('--server=')) serverType = a.slice(9);
  }

  if (!['global', 'skill'].includes(scope)) {
    die('SETUP_ERROR', `setup-key 未知 scope: ${scope} (可选: global / skill)`);
  }
  if (!['default', 'stock_research'].includes(serverType)) {
    die('SETUP_ERROR', `setup-key 未知 server: ${serverType} (可选: default / stock_research)`);
  }

  const keyName = 'WIND_API_KEY';

  let file;
  try {
    if (scope === 'global') {
      const dir = join(homedir(), '.wind-aifinmarket');
      if (!existsSync(dir)) mkdirSync(dir, {
        recursive: true
      });
      file = join(dir, 'config');
      let lines = [];
      if (existsSync(file)) {
        lines = readFileSync(file, 'utf8').split('\n')
          .filter(l => l.length > 0 && !(new RegExp(`^\\s*(export\\s+)?${keyName}\\s*=`)).test(l));
      }
      lines.push(`${keyName}=${key}`);
      writeFileSync(file, lines.join('\n') + '\n', {
        mode: 0o600
      });
    } else {
      file = join(SKILL_DIR, 'config.json');
      let cfg = {};
      if (existsSync(file)) {
        try { cfg = JSON.parse(readFileSync(file, 'utf8')); } catch { cfg = {}; }
      }
      cfg.wind_api_key = key;
      writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
    }
  } catch (err) {
    die('SETUP_ERROR', `配置写入失败 (scope=${scope}, path=${file || 'n/a'}): ${err.message}`);
  }

  return {
    scope,
    server: serverType,
    path: file,
    key_masked: maskKey(key),
    next: '现在可以重试原 Wind 调用',
  };
}

async function cmdOpenPortal() {
  const platform = process.platform;
  let bin, args;
  if (platform === 'darwin') {
    bin = 'open';
    args = [PORTAL_URL];
  } else if (platform === 'win32') {
    bin = 'cmd';
    args = ['/c', 'start', '', PORTAL_URL];
  } else {
    bin = 'xdg-open';
    args = [PORTAL_URL];
  }

  let spawnError = null;
  try {
    const child = spawn(bin, args, {
      stdio: 'ignore',
      detached: true,
      windowsHide: true
    });
    child.unref();
    spawnError = await new Promise((resolve) => {
      child.once('error', resolve);
      setTimeout(() => resolve(null), 300);
    });
  } catch (err) {
    spawnError = err;
  }

  const data = {
    url: PORTAL_URL,
    platform,
    spawn_command: `${bin} ${args.join(' ')}`,
    flow_note: '未登录时会自动跳转到登录页（/#/login）；登录完成后回到 overview 页面即可获取 API Key。',
    fallback_message: `如果浏览器没有自动弹出，请手动访问：${PORTAL_URL}`,
  };
  if (spawnError) {
    die('SETUP_ERROR', `本地无法启动浏览器: ${spawnError.message} | 用户应手动打开 ${data.url}`);
  }
  return data;
}

// 诊断: 输出自动更新状态
async function cmdDiagnose() {
  let updateState = null;
  try {
    const stateFile = updateStateFile();
    if (existsSync(stateFile)) {
      updateState = JSON.parse(readFileSync(stateFile, 'utf8'));
    }
  } catch {
    updateState = { status: 'unreadable' };
  }
  return {
    platform: process.platform,
    node_pid: process.pid,
    update_scope: updateScope(),
    update_state_file: updateStateFile(),
    update_state: updateState,
    next_update_needed: !alreadyUpdatedToday(),
  };
}
// #endregion 命令

// #region 主入口：IS_MAIN 避免测试 import 时跑副作用。无参打 USAGE；仅 call 成功才触发更新检查。
const IS_MAIN = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (IS_MAIN) runMain();

function runMain() {
  const [cmd, ...args] = process.argv.slice(2);
  // 对外别名在入口归一化，复用真实服务的认证、参数兼容和传输逻辑。
  if (['call', 'list-tools', 'list-servers'].includes(cmd) && args[0] === 'general_data') {
    args[0] = 'finance_data';
  }

  const USAGE =
    `wind-mcp-skill\n` +
    `访问万得 Wind 金融数据（按数据域分类调用）\n\n` +
    `用法:\n` +
    `  cli.mjs call <server_type> <tool_name> '<params_json>|@params_file'\n` +
    `  cli.mjs list-tools <server_type>                    # 获取后端官方工具描述和 inputSchema\n` +
    `  cli.mjs list-servers [server_type]                 # 离线查看主站地址、请求头和认证变量\n` +
    `  cli.mjs open-portal                                # 打开万得开发者中心拿 API Key\n` +
      `  cli.mjs setup-key <KEY> [--server <default|stock_research>] [--scope <global|skill>]\n` +
      `    默认 scope=global；仅用户明确要求时使用 scope=skill\n\n` +
    `general_data 是 finance_data 的别名，两者均可用于 call / list-tools / list-servers。\n\n` +
    `可用 server_type:\n` +
    Object.entries(SERVERS).map(([k, v]) => `  ${k.padEnd(20)}${v.label}`).join('\n') + '\n\n' +
    `典型:\n` +
    `  ${CALL_EXAMPLES.join('\n  ')}`;

  const commands = {
    call: () => cmdCall(args[0], args[1], args[2]),
    'list-tools': () => cmdListTools(args[0]),
    'list-servers': () => cmdListServers(args[0]),
    'open-portal': () => cmdOpenPortal(),
    'setup-key': () => cmdSetupKey(...args),
    diagnose: () => cmdDiagnose(),
  };

  if (!cmd) {
    // help: 直接输出 USAGE 纯文本
    process.stdout.write(USAGE + '\n');
    process.exit(0);
  }

  if (!commands[cmd]) {
    die('USAGE_ERROR', `未知命令: ${cmd}\nUSAGE:\n${USAGE}`);
  }

  commands[cmd]()
    .then((data) => {
      if (cmd === 'call') {
        // call: 透传 result 内容 (parse JSON if applicable, else raw text)
        writeRawCallSuccess(data?.result, { server_type: data?.server_type, tool_name: data?.tool });
        setTimeout(triggerUpdateCheck, 0);
      } else {
        // open-portal / setup-key: 直接输出结构化数据 (无 envelope 包裹)
        writePlainSuccess(data);
      }
    })
    .catch((err) => {
      die('UNKNOWN', `执行失败: ${err.message || err}${err.stack ? ' | stack: ' + err.stack.slice(0, 300) : ''}`);
    });
}
// #endregion 主入口
