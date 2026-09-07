// 生成 REPORT.md：方法 + 自动统计 + 盲评 + 反馈清单。范围由 --max 指定（默认 50）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const S = '/tmp/claude-1000/-home-skills/0ba1cc4d-6c79-417b-8b8f-29be0d8573ed/scratchpad/eval';
const MAX = +(process.argv.find(a => a.startsWith('--max='))?.split('=')[1] || 50);
const OUT = process.argv.find(a => a.startsWith('--out='))?.split('=')[1] || join(S, 'REPORT.md');
const summary = JSON.parse(readFileSync(join(S, 'summary.json'), 'utf8')).filter(r => r.id <= MAX);
const merged = JSON.parse(readFileSync(join(S, 'judge', 'merged.json'), 'utf8')).filter(r => r.id <= MAX);
const dims = ['coverage', 'routing', 'faithfulness', 'answer', 'efficiency'];
const dimCN = { coverage: '取数完成度', routing: '路由与工具选择', faithfulness: '忠实度', answer: '回答质量', efficiency: '效率' };
const cat = id => id <= 16 ? '股票' : id <= 28 ? '基金/ETF' : id <= 38 ? '债券' : id <= 47 ? '期货' : id <= 56 ? '期权' : id <= 63 ? '汇率' : id <= 70 ? '大宗商品' : id <= 80 ? '宏观' : id <= 86 ? '指数/行业' : id <= 95 ? '企业/ESG' : '综合';

function stat(arm) {
  const r = summary.map(x => x[arm]).filter(Boolean);
  const by = {}; for (const x of r) by[x.status] = (by[x.status] || 0) + 1;
  const calls = r.reduce((a, x) => a + x.calls_total, 0), ok = r.reduce((a, x) => a + x.calls_ok, 0);
  const el = r.filter(x => x.elapsed).map(x => x.elapsed);
  const errs = {}; for (const x of r) for (const e of x.err_codes) errs[e] = (errs[e] || 0) + 1;
  const servers = {}; for (const x of r) for (const s of x.servers) if (!/[()\-]/.test(s)) servers[s] = (servers[s] || 0) + 1;
  return { n: r.length, by, calls, ok, rate: calls ? (ok / calls * 100).toFixed(1) + '%' : 'n/a', avgCalls: (calls / r.length).toFixed(2), avgEl: Math.round(el.reduce((a, b) => a + b, 0) / el.length), errs, servers, maxed: r.filter(x => x.calls_total >= 12).length, hit12: r.filter(x => x.calls_total >= 12).length };
}
const sd = stat('dev'), so = stat('official');
const n = merged.length;
const avg = (arm, d) => (merged.reduce((a, r) => a + (+r[arm]?.[d] || 0), 0) / n).toFixed(2);
const tot = arm => (merged.reduce((a, r) => a + r[`${arm}_total`], 0) / n).toFixed(2);
const wins = { dev: 0, official: 0, tie: 0 }; for (const r of merged) wins[r.winner]++;
const gaps = {}, be = {}; for (const r of merged) { gaps[r.capability_gap] = (gaps[r.capability_gap] || 0) + 1; be[r.backend_issue] = (be[r.backend_issue] || 0) + 1; }
// 胜负与能力缺口交叉：主站因缺站点而输的题
const devWinByGap = merged.filter(r => r.winner === 'dev' && (r.capability_gap === 'official')).map(r => r.id);
const offWinByGap = merged.filter(r => r.winner === 'official' && (r.capability_gap === 'dev')).map(r => r.id);
const cats = {}; for (const r of merged) { const c = cat(r.id); cats[c] ??= { n: 0, dev: 0, off: 0, w: { dev: 0, official: 0, tie: 0 } }; cats[c].n++; cats[c].dev += r.dev_total; cats[c].off += r.official_total; cats[c].w[r.winner]++; }
const statusLine = by => Object.entries(by).map(([k, v]) => `${k} ${v}`).join('，');
const errLine = e => Object.entries(e).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('，') || '无';
const srvLine = s => Object.entries(s).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join('、');

let md = `# wind-mcp-skill 开发仓 3.3.0 vs 主站线上 2.0.4：前 ${MAX} 题真实问句对比测试报告

**测试日期**：2026-09-07（UTC 08:20–12:00）
**题集**：\`金融任务集_100个仅问句.md\` 第 1–${MAX} 题（股票 16、基金/ETF 12、债券 10、期货 9、期权 3）
**对比对象**：

| 版本 | 路径 | 版本号 | 站点 |
|---|---|---|---|
| 开发仓 | \`/home/skills/wind-skills/skills/wind-mcp-skill\`（main） | 3.3.0 | 11 站（stock_research、fund_research、options_data、futures_data、company_data、finance_data、edb_data、index_data、bond_data、financial_docs、analytics_data） |
| 主站线上 | \`/home/skills/.agents/skills/wind-mcp-skill\`（Wind-Information-Co-Ltd/wind-skills，与本地 \`wind-main\` 分支一致） | 2.0.4 | 7 站（stock_data、fund_data、index_data、bond_data、financial_docs、economic_data、analytics_data） |

${existsSync(join(S,'narrative.md')) ? readFileSync(join(S,'narrative.md'),'utf8') : ''}
## 一、方法

- **执行者**：每题每版本一个全新的子代理（Claude Sonnet 5），上下文互不共享。执行者只被允许读取指定 Skill 目录内的 SKILL.md 与 references，并通过该目录的 \`scripts/cli.mjs\` 取数；禁止使用 Skill 工具、MCP 工具、联网搜索，禁止读取另一版本目录与仓库 test 目录。
- **公平性**：两版本同一题同时段启动，共用同一个 Wind Key；每题 CLI 调用上限 12 次；\`WIND_SKILL_AUTO_UPDATE=0\` 关闭自动更新。
- **隔离核验**：汇总脚本按调用日志中的 \`server_type\` 校验是否落在各自版本的站点集合内，两版本均无跨版本调用（主站版 5 处标记全部为 \`--help\` 用法探测伪条目）。
- **评审**：Claude Opus 5 子代理盲评。每题两份记录随机映射为 A/B（去除版本标识与路径），按 5 个维度各 0–5 分打分并判定胜者；评审后用 \`judge/key.json\` 还原。
- **产物**：\`results/{dev,official}/qNNN.md\`（含 frontmatter、调用日志、最终回答、执行者备注）、\`judge/out/*.json\`、\`judge/merged.json\`、\`summary.json\`。

## 二、执行层自动统计（Q1–${MAX}）

| 指标 | 开发仓 3.3.0 | 主站 2.0.4 |
|---|---|---|
| 完成题数 | ${sd.n} | ${so.n} |
| 完成状态 | ${statusLine(sd.by)} | ${statusLine(so.by)} |
| CLI 调用总数 | ${sd.calls} | ${so.calls} |
| 调用成功率 | ${sd.rate} | ${so.rate} |
| 平均每题调用次数 | ${sd.avgCalls} | ${so.avgCalls} |
| 触到 12 次上限的题数 | ${sd.hit12} | ${so.hit12} |
| 平均每题耗时（秒） | ${sd.avgEl} | ${so.avgEl} |
| 失败调用错误码（题次） | ${errLine(sd.errs)} | ${errLine(so.errs)} |
| 使用过的站点（题数） | ${srvLine(sd.servers)} | ${srvLine(so.servers)} |

## 三、盲评结果（${n} 题）

| 维度（0–5） | 开发仓 3.3.0 | 主站 2.0.4 |
|---|---|---|
${dims.map(d => `| ${dimCN[d]} | ${avg('dev', d)} | ${avg('official', d)} |`).join('\n')}
| **总分（25）** | **${tot('dev')}** | **${tot('official')}** |

**胜负**：开发仓胜 ${wins.dev}，主站胜 ${wins.official}，平 ${wins.tie}。
**能力缺口归因**（评审判定某方因 Skill 本身无对应站点/工具而失分）：${Object.entries(gaps).map(([k, v]) => `${k} ${v}`).join('，')}。其中开发仓因主站缺站点而胜的题：${devWinByGap.join('、') || '无'}；主站因开发仓缺能力而胜的题：${offWinByGap.join('、') || '无'}。
**后端问题归因**：${Object.entries(be).map(([k, v]) => `${k} ${v}`).join('，')}。

### 按业务域

| 业务域 | 题数 | 开发仓均分 | 主站均分 | 开发仓胜/主站胜/平 |
|---|---|---|---|---|
${Object.entries(cats).map(([c, v]) => `| ${c} | ${v.n} | ${(v.dev / v.n).toFixed(1)} | ${(v.off / v.n).toFixed(1)} | ${v.w.dev}/${v.w.official}/${v.w.tie} |`).join('\n')}

### 逐题

| # | 题目 | 开发仓 | 主站 | 胜者 | 评审关键差异 |
|---|---|---|---|---|---|
${merged.map(r => `| ${r.id} | ${r.question.slice(0, 22)}… | ${r.dev_total} | ${r.official_total} | ${r.winner === 'dev' ? '开发仓' : r.winner === 'official' ? '主站' : '平'} | ${r.reason.replace(/\|/g, '/').replace(/\n/g, ' ')} |`).join('\n')}

## 四、评审提出的具体问题（原文，供维护者核对）

${merged.filter(r => r.notable && r.notable.trim()).map(r => `- **Q${r.id}**：${r.notable.replace(/\n/g, ' ')}`).join('\n')}

`;
writeFileSync(OUT, md);
console.log('written', OUT, md.length, 'chars');
