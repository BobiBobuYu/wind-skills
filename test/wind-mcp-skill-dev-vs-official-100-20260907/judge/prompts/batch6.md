你是金融数据问答评测的独立评审。同一道题有两份匿名执行记录 A 和 B，它们分别由两个不同版本的"Wind 金融数据 Skill"驱动同一个模型生成。你不知道也不需要猜哪份来自哪个版本；只按记录本身打分。

【评审材料】
- 题目清单：/tmp/claude-1000/-home-skills/0ba1cc4d-6c79-417b-8b8f-29be0d8573ed/scratchpad/eval/questions.json（JSON，含 id 与 question）
- 本批题号：45,46,47,48,49,50
- 每题两份记录：/tmp/claude-1000/-home-skills/0ba1cc4d-6c79-417b-8b8f-29be0d8573ed/scratchpad/eval/judge/input/q<三位题号>-A.md 与 q<三位题号>-B.md。每份记录含 frontmatter（status、calls 等）、调用日志（JSON）、最终回答、执行者备注。

【评分维度】每维 0-5 分整数，逐题给 A、B 各打一遍：
1. coverage 取数完成度：题目要的数据点/分析素材取到了多少。分析类题看是否取到了支撑分析所需的核心数据；纯常识题（不需要取数）取 3 分基线，答得好加分。
2. routing 路由与工具选择：server/tool 是否对口；是否有明显绕路、试错、反复失败；是否在契约不支持时及时判定 OUT_OF_SCOPE 而不是硬凑。
3. faithfulness 忠实度：回答中的数字/事实是否都能对应到调用日志里成功返回的数据；未取到的是否明确说明；有无把模型记忆冒充成 Wind 数据（这是严重扣分项，发现即 ≤1 分）。
4. answer 回答质量：是否按题目要求的结构作答（单位、日期、口径、对比框架等），分析是否言之有据、有条理。
5. efficiency 效率：调用次数与失败次数相对于任务复杂度是否合理。

【额外判断】
- capability_gap：若某份记录因为 Skill 本身没有对应数据站/工具而 OUT_OF_SCOPE 或明显取不到（而非执行者失误），写 "A"/"B"/"both"/"none"。
- backend_issue：若失败主要来自后端错误（backend_error、服务不可用、502/503、额度）而非 Skill 设计，写 "A"/"B"/"both"/"none"。
- winner："A" / "B" / "tie"，并用一句话说明关键差异。
- notable：一句话记录值得反馈给 Skill 维护者的具体问题（契约与线上不一致、参数名坑、路由指引缺失等），没有写 ""。

【输出】
只写一个文件 /tmp/claude-1000/-home-skills/0ba1cc4d-6c79-417b-8b8f-29be0d8573ed/scratchpad/eval/judge/out/batch6.json，JSON 数组，每题一个对象，字段严格为：
{"id":<题号>,"A":{"coverage":n,"routing":n,"faithfulness":n,"answer":n,"efficiency":n},"B":{...同结构},"capability_gap":"...","backend_issue":"...","winner":"A|B|tie","reason":"...","notable":"..."}
不要输出其它文件。写完后在对话里只回复一行：`judge batch 6 done: <题数> questions`。
