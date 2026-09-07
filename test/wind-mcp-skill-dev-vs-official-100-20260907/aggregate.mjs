// 汇总 results/{dev,official}/qNNN.md 的 frontmatter 与调用日志 → summary.json + summary.md
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const S = '/tmp/claude-1000/-home-skills/0ba1cc4d-6c79-417b-8b8f-29be0d8573ed/scratchpad/eval';
const questions = JSON.parse(readFileSync(join(S, 'questions.json'), 'utf8'));
const toolsOfficial = JSON.parse(readFileSync(join(S, 'tools-official.json'), 'utf8'));
const officialSet = new Set(Object.values(toolsOfficial).flat());
const officialServers = new Set(Object.keys(toolsOfficial));
const devServers = new Set(['stock_research','fund_research','options_data','futures_data','company_data','finance_data','edb_data','index_data','bond_data','financial_docs','analytics_data']);

function parse(file) {
  const txt = readFileSync(file, 'utf8');
  const fm = {};
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  if (m) for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  let calls = [];
  const cm = txt.match(/## 调用日志\s*```json\s*([\s\S]*?)```/);
  if (cm) { try { calls = JSON.parse(cm[1]); } catch (e) { fm._calls_parse_error = String(e.message).slice(0, 80); } }
  const ans = (txt.match(/## 最终回答\s*([\s\S]*?)(?:\n## 执行者备注|$)/) || [])[1] || '';
  const notes = (txt.match(/## 执行者备注\s*([\s\S]*)$/) || [])[1] || '';
  return { fm, calls, answer_len: ans.trim().length, notes: notes.trim().slice(0, 300) };
}

const rows = [];
for (const q of questions) {
  const row = { id: q.id, question: q.question };
  for (const arm of ['dev', 'official']) {
    const f = join(S, 'results', arm, `q${String(q.id).padStart(3, '0')}.md`);
    if (!existsSync(f)) { row[arm] = null; continue; }
    const p = parse(f);
    const servers = [...new Set(p.calls.map(c => c.server_type))];
    const tools = [...new Set(p.calls.map(c => `${c.server_type}.${c.tool_name}`))];
    // 隔离校验：调用的 server_type 是否属于该分支的站集合
    const foreign = servers.filter(s => arm === 'dev' ? !devServers.has(s) : !officialServers.has(s));
    const okCalls = p.calls.filter(c => String(c.result).toLowerCase() === 'ok').length;
    const errCodes = [...new Set(p.calls.filter(c => String(c.result).toLowerCase() !== 'ok').map(c => c.result))];
    row[arm] = {
      status: p.fm.status, calls_total: +p.fm.calls_total || p.calls.length, calls_ok: +p.fm.calls_ok || okCalls,
      calls_failed: +p.fm.calls_failed || (p.calls.length - okCalls), elapsed: +p.fm.elapsed_seconds || null,
      refs: p.fm.references_read, servers, tools, err_codes: errCodes, foreign_servers: foreign,
      answer_len: p.answer_len, notes: p.notes, parse_error: p.fm._calls_parse_error || null,
    };
  }
  rows.push(row);
}
writeFileSync(join(S, 'summary.json'), JSON.stringify(rows, null, 1));

// 统计
function stat(arm) {
  const r = rows.map(x => x[arm]).filter(Boolean);
  const by = {}; for (const x of r) by[x.status] = (by[x.status] || 0) + 1;
  const calls = r.reduce((a, x) => a + x.calls_total, 0), ok = r.reduce((a, x) => a + x.calls_ok, 0);
  const el = r.filter(x => x.elapsed).map(x => x.elapsed);
  const errs = {}; for (const x of r) for (const e of x.err_codes) errs[e] = (errs[e] || 0) + 1;
  return { n: r.length, status: by, calls, ok, callOkRate: calls ? (ok / calls * 100).toFixed(1) + '%' : 'n/a', avgCalls: r.length ? (calls / r.length).toFixed(2) : 'n/a', avgElapsed: el.length ? Math.round(el.reduce((a, b) => a + b, 0) / el.length) : 'n/a', errs, foreign: r.filter(x => x.foreign_servers.length).length };
}
const sd = stat('dev'), so = stat('official');
let md = `# 汇总（自动统计）\n\n| 指标 | 开发仓 3.3.0 | 主站 2.0.4 |\n|---|---|---|\n`;
md += `| 已完成题数 | ${sd.n} | ${so.n} |\n| 状态分布 | ${JSON.stringify(sd.status)} | ${JSON.stringify(so.status)} |\n| CLI 调用总数 | ${sd.calls} | ${so.calls} |\n| 调用成功率 | ${sd.callOkRate} | ${so.callOkRate} |\n| 平均每题调用 | ${sd.avgCalls} | ${so.avgCalls} |\n| 平均耗时(s) | ${sd.avgElapsed} | ${so.avgElapsed} |\n| 错误码分布(题次) | ${JSON.stringify(sd.errs)} | ${JSON.stringify(so.errs)} |\n| 隔离异常(用了对方站) | ${sd.foreign} | ${so.foreign} |\n\n`;
md += `| # | 题目(截断) | dev状态 | dev调用(ok/总) | dev耗时 | official状态 | official调用(ok/总) | official耗时 |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  const c = a => r[a] ? `${r[a].status} | ${r[a].calls_ok}/${r[a].calls_total} | ${r[a].elapsed ?? '-'}` : '— | — | —';
  md += `| ${r.id} | ${r.question.slice(0, 28)}… | ${c('dev')} | ${c('official')} |\n`;
}
writeFileSync(join(S, 'summary.md'), md);
console.log(md.split('\n').slice(0, 14).join('\n'));
