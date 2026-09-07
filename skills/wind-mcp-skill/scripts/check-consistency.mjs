#!/usr/bin/env node
// 一致性检查：只做名字层面的四项校验，不解析参数表。
//   node scripts/check-consistency.mjs          # 1-3 离线检查
//   node scripts/check-consistency.mjs --live   # 追加第 4 项：与线上 tools/list 比对（需 API Key）
// 1. cli.mjs 的 SERVERS key == tool-manifest.json 的 servers key
// 2. manifest 每个工具在 references 里恰好出现一次（### `tool` 标题），反向亦然；2b. 入口文件存在且引用的文件都存在
// 3. call-rules.json 与 cli.mjs CALL_EXAMPLES 引用的工具名都在 manifest 内
// 4. --live：每站 tools/list 的工具名、required、顶层类型与 manifest 一致
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(SKILL_DIR, 'scripts', 'cli.mjs');
const REPEATABLE = new Set();
const LIVE = process.argv.includes('--live');

const cliSrc = readFileSync(CLI, 'utf8');
const manifest = JSON.parse(readFileSync(join(SKILL_DIR, 'scripts', 'tool-manifest.json'), 'utf8'));
const rules = JSON.parse(readFileSync(join(SKILL_DIR, 'scripts', 'call-rules.json'), 'utf8'));

const problems = [];
const note = (msg) => problems.push(msg);

// ---- 1. SERVERS vs manifest
const serversBlock = cliSrc.slice(cliSrc.indexOf('const SERVERS = {'), cliSrc.indexOf('\n};', cliSrc.indexOf('const SERVERS = {')));
const cliServers = [...serversBlock.matchAll(/^\s{2}([a-z_]+):\s*\{/gm)].map(m => m[1]);
const manifestServers = Object.keys(manifest.servers || {});
for (const s of cliServers) if (!manifestServers.includes(s)) note(`[1] cli.mjs SERVERS 有 ${s}，manifest 没有`);
for (const s of manifestServers) if (!cliServers.includes(s)) note(`[1] manifest 有 ${s}，cli.mjs SERVERS 没有`);

// ---- 2. manifest tools vs references headings
const manifestTools = new Map(); // tool -> server
for (const [srv, tools] of Object.entries(manifest.servers || {})) for (const t of Object.keys(tools)) {
  if (manifestTools.has(t)) note(`[2] 工具名 ${t} 同时出现在 ${manifestTools.get(t)} 与 ${srv}`);
  manifestTools.set(t, srv);
}
const refDir = join(SKILL_DIR, 'references');
const headingCount = new Map(); // tool -> [files]
function walkMd(dir, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkMd(full, prefix + name + '/'));
    else if (name.endsWith('.md')) out.push(prefix + name);
  }
  return out;
}
for (const f of walkMd(refDir)) {
  const text = readFileSync(join(refDir, f), 'utf8');
  for (const m of text.matchAll(/^### `([A-Za-z0-9_]+)`/gm)) {
    headingCount.set(m[1], [...(headingCount.get(m[1]) || []), f]);
  }
}
for (const [tool] of manifestTools) {
  const files = headingCount.get(tool) || [];
  if (files.length === 0) note(`[2] manifest 工具 ${tool} 在 references 里没有契约`);
  else if (files.length > 1 && !REPEATABLE.has(tool)) note(`[2] 工具 ${tool} 在多个契约文件出现：${files.join(', ')}`);
}
for (const [tool, files] of headingCount) {
  if (!manifestTools.has(tool)) note(`[2] references 里的 ${tool}（${files.join(', ')}）不在 manifest 内`);
}

// ---- 2b. SKILL.md 与入口文件引用的 references/*.md 必须存在；每个 server_type 必须有入口文件
const ENTRY = { stock_research: 'stock', fund_research: 'fund', index_data: 'index', bond_data: 'bond', financial_docs: 'financial-docs', edb_data: 'edb', analytics_data: 'analytics', options_data: 'options', futures_data: 'futures', company_data: 'company', finance_data: 'finance' };
const skillMd = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8');
for (const [srv, prefix] of Object.entries(ENTRY)) {
  if (!manifestServers.includes(srv)) continue;
  const entry = `references/${prefix}.md`;
  if (!existsSync(join(SKILL_DIR, entry))) note(`[2b] ${srv} 缺少入口文件 ${entry}`);
  if (!skillMd.includes(`\`${entry}\``)) note(`[2b] SKILL.md 路由表没有指向 ${entry}`);
}
const linkSources = [['SKILL.md', skillMd], ...Object.values(ENTRY).map(p => [`references/${p}.md`, existsSync(join(refDir, `${p}.md`)) ? readFileSync(join(refDir, `${p}.md`), 'utf8') : ''])];
for (const [src, text] of linkSources) {
  for (const m of text.matchAll(/`references\/([A-Za-z0-9/-]+\.md)`/g)) {
    if (!existsSync(join(refDir, m[1]))) note(`[2b] ${src} 引用了不存在的 references/${m[1]}`);
  }
}

// ---- 3. call-rules / CALL_EXAMPLES tool names
for (const rule of rules.tool_rules || []) for (const t of rule.tools || []) {
  if (!manifestTools.has(t)) note(`[3] call-rules 规则 ${rule.name} 引用了不存在的工具 ${t}`);
}
for (const t of rules.kline_tools || []) if (!manifestTools.has(t)) note(`[3] call-rules kline_tools 引用了不存在的工具 ${t}`);
for (const m of cliSrc.matchAll(/cli\.mjs call ([a-z_]+) ([A-Za-z0-9_]+)/g)) {
  const [, srv, tool] = m;
  if (!manifest.servers?.[srv]) note(`[3] CALL_EXAMPLES 引用了不存在的 server_type ${srv}`);
  else if (!manifest.servers[srv][tool]) note(`[3] CALL_EXAMPLES 引用了不存在的工具 ${srv}.${tool}`);
}

// ---- 4. --live
if (LIVE) {
  for (const srv of manifestServers) {
    const r = spawnSync(process.execPath, [CLI, 'list-tools', srv], { encoding: 'utf8' });
    let body = null;
    try { body = JSON.parse(r.stdout); } catch { }
    if (!body || body.ok === false || !Array.isArray(body.tools)) {
      note(`[4] ${srv} tools/list 失败：${(r.stdout || r.stderr || '').slice(0, 200)}`);
      continue;
    }
    const live = new Map(body.tools.map(t => [t.name, t]));
    const local = manifest.servers[srv];
    for (const t of live.keys()) if (!local[t] && !manifest.excluded?.[srv]?.[t]) note(`[4] ${srv} 线上新增工具 ${t}，manifest 未收录`);
    for (const t of Object.keys(local)) if (!live.has(t)) note(`[4] ${srv} manifest 工具 ${t} 线上已不存在`);
    for (const [t, spec] of Object.entries(local)) {
      const schema = live.get(t)?.inputSchema;
      if (!schema) continue;
      const liveReq = [...(schema.required || [])].sort().join(',');
      const localReq = [...spec.required].sort().join(',');
      if (liveReq !== localReq) note(`[4] ${srv}.${t} required 不一致：线上 [${liveReq}] 本地 [${localReq}]`);
      for (const [p, d] of Object.entries(schema.properties || {})) {
        if (!spec.params[p]) note(`[4] ${srv}.${t} 线上参数 ${p} 本地缺失`);
        else if ((d.type || 'any') !== spec.params[p].type) note(`[4] ${srv}.${t}.${p} 类型不一致：线上 ${d.type} 本地 ${spec.params[p].type}`);
      }
      for (const p of Object.keys(spec.params)) if (!schema.properties?.[p]) note(`[4] ${srv}.${t} 本地参数 ${p} 线上已不存在`);
    }
  }
}

const summary = `servers=${manifestServers.length} tools=${manifestTools.size} reference_headings=${headingCount.size}${LIVE ? ' (含线上比对)' : ''}`;
if (problems.length === 0) {
  console.log(`PASS  ${summary}`);
  process.exit(0);
}
console.log(`FAIL  ${summary}\n` + problems.map(p => '  - ' + p).join('\n'));
process.exit(1);
