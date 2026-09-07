// 合并 judge/out/batch*.json，用 key.json 还原 A/B → dev/official，输出 judge/merged.json 与汇总表
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const S = '/tmp/claude-1000/-home-skills/0ba1cc4d-6c79-417b-8b8f-29be0d8573ed/scratchpad/eval';
const key = JSON.parse(readFileSync(join(S, 'judge', 'key.json'), 'utf8'));
const questions = JSON.parse(readFileSync(join(S, 'questions.json'), 'utf8'));
const dims = ['coverage', 'routing', 'faithfulness', 'answer', 'efficiency'];
const rows = [];
for (const f of readdirSync(join(S, 'judge', 'out')).filter(f => f.endsWith('.json')).sort()) {
  let arr; try { arr = JSON.parse(readFileSync(join(S, 'judge', 'out', f), 'utf8')); } catch (e) { console.error('bad json', f, e.message); continue; }
  for (const j of arr) {
    const n = String(j.id).padStart(3, '0'); const k = key[n]; if (!k) { console.error('no key for', n); continue; }
    const arm = { [k.A]: j.A, [k.B]: j.B };
    const map = v => v === 'A' ? k.A : v === 'B' ? k.B : v;
    const label = { dev: '开发仓', official: '主站' };
    const deblind = t => String(t || '').replace(/(?<![A-Za-z0-9])([AB])(?![A-Za-z0-9股类份]|\s[股类])/g, (m, x) => label[k[x]] || m);
    const dev = arm.dev, off = arm.official;
    const total = o => dims.reduce((a, d) => a + (+o?.[d] || 0), 0);
    rows.push({ id: j.id, question: questions.find(q => q.id === j.id)?.question || '', dev, official: off, dev_total: total(dev), official_total: total(off),
      winner: map(j.winner), capability_gap: map(j.capability_gap), backend_issue: map(j.backend_issue), reason: deblind(j.reason), notable: deblind(j.notable), batch: f });
  }
}
rows.sort((a, b) => a.id - b.id);
writeFileSync(join(S, 'judge', 'merged.json'), JSON.stringify(rows, null, 1));
const n = rows.length;
const avg = (arm, d) => (rows.reduce((a, r) => a + (+r[arm]?.[d] || 0), 0) / n).toFixed(2);
const wins = { dev: 0, official: 0, tie: 0 }; for (const r of rows) wins[r.winner] = (wins[r.winner] || 0) + 1;
const gaps = {}; for (const r of rows) gaps[r.capability_gap] = (gaps[r.capability_gap] || 0) + 1;
const backend = {}; for (const r of rows) backend[r.backend_issue] = (backend[r.backend_issue] || 0) + 1;
const cat = id => id<=16?'股票':id<=28?'基金/ETF':id<=38?'债券':id<=47?'期货':id<=56?'期权':id<=63?'汇率':id<=70?'大宗商品':id<=80?'宏观':id<=86?'指数/行业':id<=95?'企业/ESG':'综合';
const cats = {}; for (const r of rows) { const c = cat(r.id); cats[c] ??= { n:0, dev:0, off:0, w:{dev:0,official:0,tie:0} }; cats[c].n++; cats[c].dev += r.dev_total; cats[c].off += r.official_total; cats[c].w[r.winner] = (cats[c].w[r.winner]||0)+1; }
let md = `## 盲评汇总（${n} 题）\n\n| 维度(0-5) | 开发仓 3.3.0 | 主站 2.0.4 |\n|---|---|---|\n`;
for (const d of dims) md += `| ${d} | ${avg('dev', d)} | ${avg('official', d)} |\n`;
md += `| **总分(25)** | **${(rows.reduce((a, r) => a + r.dev_total, 0) / n).toFixed(2)}** | **${(rows.reduce((a, r) => a + r.official_total, 0) / n).toFixed(2)}** |\n\n`;
md += `胜负：开发仓胜 ${wins.dev || 0} / 主站胜 ${wins.official || 0} / 平 ${wins.tie || 0}\n\n能力缺口归因：${JSON.stringify(gaps)}；后端问题归因：${JSON.stringify(backend)}\n\n`;
md += `### 按业务域\n\n| 业务域 | 题数 | 开发仓均分 | 主站均分 | 开发仓胜/主站胜/平 |\n|---|---|---|---|---|\n`;
for (const [c, v] of Object.entries(cats)) md += `| ${c} | ${v.n} | ${(v.dev/v.n).toFixed(1)} | ${(v.off/v.n).toFixed(1)} | ${v.w.dev||0}/${v.w.official||0}/${v.w.tie||0} |\n`;
md += '\n### 逐题\n\n';
md += `| # | 题目 | dev总分 | official总分 | 胜者 | 关键差异 |\n|---|---|---|---|---|---|\n`;
for (const r of rows) md += `| ${r.id} | ${r.question.slice(0, 24)}… | ${r.dev_total} | ${r.official_total} | ${r.winner} | ${r.reason.replace(/\|/g, '/').slice(0, 90)} |\n`;
writeFileSync(join(S, 'judge', 'merged.md'), md);
console.log(md.split('\n').slice(0, 12).join('\n'));
