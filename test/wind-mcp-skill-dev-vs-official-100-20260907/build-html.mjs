import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const S = '/tmp/claude-1000/-home-skills/0ba1cc4d-6c79-417b-8b8f-29be0d8573ed/scratchpad/eval';
const merged = JSON.parse(readFileSync(join(S, 'judge/merged.json'), 'utf8')).filter(r => r.id <= 50);
const summary = JSON.parse(readFileSync(join(S, 'summary.json'), 'utf8')).filter(r => r.id <= 50);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dims = [['coverage', '取数完成度'], ['routing', '路由与工具选择'], ['faithfulness', '忠实度'], ['answer', '回答质量'], ['efficiency', '效率']];
const n = merged.length;
const avg = (arm, d) => merged.reduce((a, r) => a + (+r[arm][d] || 0), 0) / n;
const tot = arm => merged.reduce((a, r) => a + r[`${arm}_total`], 0) / n;
const wins = { dev: 0, official: 0, tie: 0 }; merged.forEach(r => wins[r.winner]++);
const cat = id => id <= 16 ? '股票' : id <= 28 ? '基金 / ETF' : id <= 38 ? '债券' : id <= 47 ? '期货' : '期权';
const cats = {}; merged.forEach(r => { const c = cat(r.id); cats[c] ??= { n: 0, dev: 0, off: 0, w: { dev: 0, official: 0, tie: 0 } }; cats[c].n++; cats[c].dev += r.dev_total; cats[c].off += r.official_total; cats[c].w[r.winner]++; });
const gap = {}; merged.forEach(r => { gap[r.capability_gap] ??= { n: 0, w: { dev: 0, official: 0, tie: 0 }, dev: 0, off: 0 }; const g = gap[r.capability_gap]; g.n++; g.w[r.winner]++; g.dev += r.dev_total; g.off += r.official_total; });
const st = arm => { const r = summary.map(x => x[arm]); const calls = r.reduce((a, x) => a + x.calls_total, 0), ok = r.reduce((a, x) => a + x.calls_ok, 0); return { calls, ok, rate: (ok / calls * 100).toFixed(1), avg: (calls / r.length).toFixed(2), el: Math.round(r.reduce((a, x) => a + (x.elapsed || 0), 0) / r.length), hit12: r.filter(x => x.calls_total >= 12).length, oos: r.filter(x => x.status === 'OUT_OF_SCOPE').length, be: r.filter(x => x.err_codes.some(e => /backend_error/i.test(e))).length }; };
const sd = st('dev'), so = st('official');
const bar = (label, dv, ov, max) => `<div class="dim"><div class="dim-label">${label}</div><div class="bars"><div class="bar dev" style="width:${dv / max * 100}%"><span>${dv.toFixed(2)}</span></div><div class="bar off" style="width:${ov / max * 100}%"><span>${ov.toFixed(2)}</span></div></div></div>`;
const winCell = w => w === 'dev' ? '<span class="pill dev">开发仓</span>' : w === 'official' ? '<span class="pill off">主站</span>' : '<span class="pill tie">平</span>';
const gapLabel = { none: '双方都能覆盖', official: '主站缺站点或工具', dev: '开发仓缺能力', both: '双方都有缺口' };
const gapOrder = ['none', 'official', 'dev', 'both'];
const html = `<title>Wind Skill 3.3.0 对 2.0.4 前 50 题对比</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700&family=Noto+Sans+SC:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{--bg:#F6F7F5;--surface:#FFFFFF;--ink:#1C221F;--muted:#66706B;--rule:#D8DDD9;--dev:#1E6A85;--dev-soft:#DCEBF1;--off:#B4661C;--off-soft:#F4E6D6;--tie:#8A9490;--tie-soft:#E6EAE7;--good:#2E7D4F;--bad:#A63D2F}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#141816;--surface:#1C211E;--ink:#E7ECE8;--muted:#98A29C;--rule:#2C332F;--dev:#62B4D4;--dev-soft:#1A3340;--off:#E39A55;--off-soft:#3D2A17;--tie:#8A9490;--tie-soft:#2A312D;--good:#6DC48F;--bad:#E08072}}
:root[data-theme="dark"]{--bg:#141816;--surface:#1C211E;--ink:#E7ECE8;--muted:#98A29C;--rule:#2C332F;--dev:#62B4D4;--dev-soft:#1A3340;--off:#E39A55;--off-soft:#3D2A17;--tie:#8A9490;--tie-soft:#2A312D;--good:#6DC48F;--bad:#E08072}
body{background:var(--bg);color:var(--ink);font-family:"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif;font-size:15px;line-height:1.7;margin:0}
main{max-width:920px;margin:0 auto;padding:40px 24px 80px}
h1,h2,h3{font-family:"Noto Serif SC","Songti SC","SimSun",serif;text-wrap:balance;line-height:1.3;margin:0}
h1{font-size:30px;font-weight:700}
h2{font-size:21px;font-weight:700;margin-top:48px;padding-bottom:8px;border-bottom:1px solid var(--rule)}
h3{font-size:16px;font-weight:500;margin-top:28px;color:var(--muted)}
p{max-width:68ch;margin:12px 0}
.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.sub{color:var(--muted);margin-top:8px;max-width:68ch}
.num,td.n,.mono{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
.versions{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}
.ver{background:var(--surface);border:1px solid var(--rule);padding:16px 18px;border-top:4px solid var(--dev)}
.ver.off{border-top-color:var(--off)}
.ver .name{font-weight:700;font-size:16px}
.ver .meta{color:var(--muted);font-size:13px;margin-top:4px}
.ver .path{font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--muted);word-break:break-all;margin-top:6px}
.score{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
.score .box{padding:18px 20px;background:var(--surface);border:1px solid var(--rule)}
.score .big{font-family:"IBM Plex Mono",monospace;font-size:40px;font-weight:500;line-height:1;font-variant-numeric:tabular-nums}
.score .box.dev .big{color:var(--dev)}.score .box.off .big{color:var(--off)}
.score .lab{color:var(--muted);font-size:13px;margin-top:6px}
.wins{margin-top:14px;display:flex;height:14px;overflow:hidden;border:1px solid var(--rule)}
.wins div{height:100%}.wins .d{background:var(--dev)}.wins .o{background:var(--off)}.wins .t{background:var(--tie)}
.wins-lab{display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-top:6px}
.dims{margin-top:16px;display:grid;gap:10px}
.dim{display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center}
.dim-label{font-size:14px}
.bars{display:grid;gap:3px}
.bar{height:16px;position:relative;min-width:2px}
.bar.dev{background:var(--dev)}.bar.off{background:var(--off)}
.bar span{position:absolute;left:calc(100% + 8px);top:-2px;font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--muted)}
.legend{display:flex;gap:18px;font-size:13px;color:var(--muted);margin-top:8px}
.legend i{display:inline-block;width:12px;height:12px;vertical-align:-1px;margin-right:6px}
.tbl{overflow-x:auto;margin-top:14px;border:1px solid var(--rule);background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:14px}
th{text-align:left;font-weight:500;color:var(--muted);font-size:12px;letter-spacing:.04em;padding:10px 12px;border-bottom:1px solid var(--rule);white-space:nowrap}
td{padding:9px 12px;border-bottom:1px solid var(--rule);vertical-align:top}
tr:last-child td{border-bottom:0}
td.n{text-align:right;white-space:nowrap}
td.q{color:var(--muted);max-width:26ch}
td.r{min-width:34ch;max-width:60ch;font-size:13px;line-height:1.6}
.pill{display:inline-block;padding:1px 8px;font-size:12px;border-radius:2px;white-space:nowrap}
.pill.dev{background:var(--dev-soft);color:var(--dev)}.pill.off{background:var(--off-soft);color:var(--off)}.pill.tie{background:var(--tie-soft);color:var(--muted)}
ol,ul{max-width:72ch;padding-left:22px}li{margin:8px 0}
code{font-family:"IBM Plex Mono",monospace;font-size:13px;background:var(--tie-soft);padding:0 4px}
.note{border-left:3px solid var(--off);padding:6px 14px;color:var(--muted);font-size:14px;margin-top:16px}
details{margin-top:14px}summary{cursor:pointer;color:var(--muted)}
summary:focus-visible,a:focus-visible{outline:2px solid var(--dev);outline-offset:2px}
@media (max-width:640px){.versions,.score{grid-template-columns:1fr}.dim{grid-template-columns:1fr}h1{font-size:24px}}
</style>
<main>
<div class="eyebrow">wind-mcp-skill · 真实问句对比 · 2026-09-07</div>
<h1>Wind Skill 3.3.0 对 2.0.4 前 50 题对比</h1>
<p class="sub">用《金融任务集》前 50 道真实问句，让同一个模型（Claude Sonnet 5）分别只带开发仓版和主站线上版 Skill 作答，每题每版本一个独立上下文；再由 Claude Opus 5 盲评。</p>
<div class="versions">
<div class="ver"><div class="name">开发仓 3.3.0</div><div class="meta">11 站：stock_research、fund_research、options_data、futures_data、company_data、finance_data、edb_data、index_data、bond_data、financial_docs、analytics_data</div><div class="path">/home/skills/wind-skills/skills/wind-mcp-skill（main）</div></div>
<div class="ver off"><div class="name">主站线上 2.0.4</div><div class="meta">7 站：stock_data、fund_data、index_data、bond_data、financial_docs、economic_data、analytics_data</div><div class="path">Wind-Information-Co-Ltd/wind-skills（本地 wind-main 分支同源）</div></div>
</div>

<h2>总览</h2>
<div class="score">
<div class="box dev"><div class="big">${tot('dev').toFixed(2)}</div><div class="lab">开发仓 3.3.0 · 盲评均分（满分 25）</div></div>
<div class="box off"><div class="big">${tot('official').toFixed(2)}</div><div class="lab">主站 2.0.4 · 盲评均分（满分 25）</div></div>
</div>
<div class="wins"><div class="d" style="width:${wins.dev / n * 100}%"></div><div class="t" style="width:${wins.tie / n * 100}%"></div><div class="o" style="width:${wins.official / n * 100}%"></div></div>
<div class="wins-lab"><span>开发仓胜 ${wins.dev}</span><span>平 ${wins.tie}</span><span>主站胜 ${wins.official}</span></div>
<p>优势几乎全部来自覆盖面：评审判定「主站缺站点或工具」的 ${gap.official.n} 题，开发仓 ${gap.official.w.dev} 胜 ${gap.official.w.official} 负。双方都能覆盖的 ${gap.none.n} 题，主站反而略优（主站胜 ${gap.none.w.official}、开发仓胜 ${gap.none.w.dev}、平 ${gap.none.w.tie}）。忠实度两边都接近满分，50 题未发现编造数据。</p>

<h3>五个维度（0–5）</h3>
<div class="dims">${dims.map(([k, l]) => bar(l, avg('dev', k), avg('official', k), 5)).join('')}</div>
<div class="legend"><span><i style="background:var(--dev)"></i>开发仓 3.3.0</span><span><i style="background:var(--off)"></i>主站 2.0.4</span></div>

<h3>按能力缺口拆分</h3>
<div class="tbl"><table><thead><tr><th>子集</th><th>题数</th><th>开发仓均分</th><th>主站均分</th><th>开发仓胜 / 主站胜 / 平</th></tr></thead><tbody>
${gapOrder.filter(g => gap[g]).map(g => `<tr><td>${gapLabel[g]}</td><td class="n">${gap[g].n}</td><td class="n">${(gap[g].dev / gap[g].n).toFixed(2)}</td><td class="n">${(gap[g].off / gap[g].n).toFixed(2)}</td><td class="n">${gap[g].w.dev} / ${gap[g].w.official} / ${gap[g].w.tie}</td></tr>`).join('')}
</tbody></table></div>

<h3>按业务域</h3>
<div class="tbl"><table><thead><tr><th>业务域</th><th>题数</th><th>开发仓均分</th><th>主站均分</th><th>开发仓胜 / 主站胜 / 平</th></tr></thead><tbody>
${Object.entries(cats).map(([c, v]) => `<tr><td>${c}</td><td class="n">${v.n}</td><td class="n">${(v.dev / v.n).toFixed(1)}</td><td class="n">${(v.off / v.n).toFixed(1)}</td><td class="n">${v.w.dev} / ${v.w.official} / ${v.w.tie}</td></tr>`).join('')}
</tbody></table></div>

<h3>执行层</h3>
<div class="tbl"><table><thead><tr><th>指标</th><th>开发仓 3.3.0</th><th>主站 2.0.4</th></tr></thead><tbody>
<tr><td>CLI 调用总数</td><td class="n">${sd.calls}</td><td class="n">${so.calls}</td></tr>
<tr><td>调用成功率</td><td class="n">${sd.rate}%</td><td class="n">${so.rate}%</td></tr>
<tr><td>平均每题调用次数</td><td class="n">${sd.avg}</td><td class="n">${so.avg}</td></tr>
<tr><td>触到 12 次上限的题数</td><td class="n">${sd.hit12}</td><td class="n">${so.hit12}</td></tr>
<tr><td>出现 backend_error 的题数</td><td class="n">${sd.be}</td><td class="n">${so.be}</td></tr>
<tr><td>判 OUT_OF_SCOPE 的题数</td><td class="n">${sd.oos}</td><td class="n">${so.oos}</td></tr>
<tr><td>平均每题耗时（秒）</td><td class="n">${sd.el}</td><td class="n">${so.el}</td></tr>
</tbody></table></div>

<h2>开发仓 3.3.0 优先要修的问题</h2>
<ol>
<li><strong>stock_get_company_finance_analysis</strong>：reportPeriod 契约示例的 CY 前缀线上必报 backend_error，须用 FY（Q2、8、9、15）；多报告期只回最新一期或直接报错（Q11、15）；单季参数静默丢弃（Q1）；附带的生成式「财务分析」文本与结构化字段互相矛盾（Q5、10、12），契约应声明不得当数据源。</li>
<li><strong>finance_data.quote_get_realtime_indicators</strong>：中文指标名部分静默不解析，「最新价」「持仓量」不报错但空返回（Q7、39、44、47）；「总市值」映射成总股本 TOTALCAPITAL（Q14）；批量传入一个代码未识别就整批失败（Q45、47）。finance.md 应直接给常用字段代码表和 LME、汇率代码写法。</li>
<li><strong>quote_get_historical_data_series</strong>：rangeflag=0 加 count 返回 1995 或 2009 年数据而非最近 N 根（Q40、47），与 reference 不符。</li>
<li><strong>EDB 权限分级</strong>：中债估值中心口径（S0059744–52、M10128xx）对本账号无权限（Q29、32、35、36），Wind 自有口径 M1001654、中国货币网 M0048267 等可用；economic.md 应直接列替代代码。</li>
<li><strong>基金站</strong>：fund_get_basic_info 批量一损俱损、养老 FOF 名称不容错（Q28）；fund_get_size 份额不随 asOfDate 变（Q20）；fund_get_nav 无累计净值（Q22）；无经理任职起止（Q24）；无组合久期（Q33）；中文名检索 ETF 返回 .OF 后缀（Q18）。</li>
<li><strong>期货、期权契约缺口</strong>：无「当前主力合约代码」字段、contract_spec 传具体合约仍回品种级条款（Q43）；无按品种列存续合约的工具（Q45）；options_get_term_metrics 价格、隐波、成交持仓全空，options_get_listed_terms 的 tradeDate 实际必填（Q50）；volatility.md 缺偏斜分位路由（Q49）；基差分位近 3 年口径需标注（Q46）。</li>
<li><strong>路由指引</strong>：缺「收益率曲线类查询走 edb_data」（Q31）；中文名传给 earnings_estimate 被解析成错误代码，应强制带后缀代码（Q3）。</li>
</ol>
<div class="note">主站 2.0.4 侧：无期货、期权、一致预期、行业研究、Brinson 归因；SKILL.md 示例的 PE(TTM)、PB 别名线上无效且只在 message 里警告（Q11）；通用「市净率」字段多只标的返回 0.000（Q3、5、6、7、15）；get_stock_events 不按实体过滤（Q30）。两版本共同的后端问题：observation=1 只回 meta（Q34）、发行人评级滞后无日期（Q30）、退市转债行情返回全 0（Q37）、basicinfo 混入已到期债券（Q38）。</div>

<h2>逐题结果</h2>
<div class="tbl"><table><thead><tr><th>#</th><th>题目</th><th>开发仓</th><th>主站</th><th>胜者</th><th>评审关键差异</th></tr></thead><tbody>
${merged.map(r => `<tr><td class="n">${r.id}</td><td class="q">${esc(r.question.slice(0, 40))}…</td><td class="n">${r.dev_total}</td><td class="n">${r.official_total}</td><td>${winCell(r.winner)}</td><td class="r">${esc(r.reason)}</td></tr>`).join('\n')}
</tbody></table></div>

<h2>评审提出的具体问题</h2>
<details><summary>展开 ${merged.filter(r => r.notable?.trim()).length} 条逐题备注（原文）</summary><ul>
${merged.filter(r => r.notable?.trim()).map(r => `<li><strong>Q${r.id}</strong>：${esc(r.notable)}</li>`).join('\n')}
</ul></details>

<h2>方法与局限</h2>
<ul>
<li>执行者：每题每版本一个全新子代理，只允许读指定 Skill 目录并用其 <code>scripts/cli.mjs</code> 取数；禁止 Skill 工具、MCP、联网和读取另一版本目录。两版本同题同时段启动，共用同一个 Wind Key，每题调用上限 12 次。</li>
<li>隔离核验：按调用日志里的 server_type 校验，两版本均无跨版本调用。</li>
<li>评审：每题两份记录随机映射为 A、B 并去除版本标识，5 个维度各 0–5 分；评审后用 key 还原。</li>
<li>过程事故：Anthropic 会话用量 10:40 UTC 触顶一次；Wind 账号 10:43 UTC 起「单日请求次数超限」，12 份受污染结果隔离并重跑，充值后 11:00 UTC 恢复。</li>
<li>局限：单次运行、单评审员；1–2 分的同题分差不应过度解读；12 次上限对 11 站的开发仓更不利。Q51–100 未跑。</li>
<li>产物：<code>wind-skills/test/wind-mcp-skill-dev-vs-official-100-20260907/</code>（REPORT.md、results/、judge/、脚本）。</li>
</ul>
</main>`;
writeFileSync(join(S, 'wind-skill-50q-compare.html'), html);
console.log('html', html.length);
