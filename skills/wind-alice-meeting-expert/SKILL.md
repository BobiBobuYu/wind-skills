---
name: wind-alice-meeting-expert
description: 调用万得 Alice「会议专家」的 CLI：覆盖路演、业绩会、调研拜访的会前准备、会中 AI 参会记录与会后纪要复盘。当用户要求"查未来一周有哪些业绩会""让 AI 助手参加腾讯会议并做记录""某公司最近一次业绩会讲了什么""整理会议问答与跟进事项"时使用。
---

# wind-alice-meeting-expert

> 调用万得 Alice「会议专家」：把用户**原话**送到 Alice Agent，按 SSE 流式拉取并打印分析结果。

## 何时使用

用户的问题落在下面任一场景，就用本技能：

- 查未来某段时间有哪些业绩会、路演、调研拜访
- 会前准备：检索会议对象与背景材料，梳理关注点、风险点与问题清单
- 让 AI 助手按时参加腾讯会议，完成记录与实时转写
- 会后查会议纪要、字幕、原文原话与关键问答
- 围绕某个指标或观点，在会议记录里深入追问
- 整理会议后续跟进事项

典型问法：

- 未来一周有哪些上市公司业绩会召开？
- 这场腾讯会议帮我参加下并做记录，参会名称使用“研究助手”，会议邀请链接：
- 特斯拉最近一次业绩会讲了什么？

**不要用本技能的场景**：

- 用户点名 Alice 的某个子 Skill（「公司一页纸」「事实核验」「按主题选股」等）-> 用 `wind-alice`。
- 普通金融问答，不在意走哪条链路 -> 用 `wind-alice` 走 auto。

## 怎么用

1. **先 `cd` 到本 skill 目录**：下面的 `scripts/` 路径相对 `SKILL.md` 所在目录。
2. **调用前提醒用户一句**：Alice 专家链路耗时常为**数分钟到十几分钟**，且可能消耗较多积分；属正常现象，请勿中途取消或重复发起同一请求。
3. 执行：

```bash
node scripts/wind-alice-meeting-expert.mjs --prompt "<用户原话>"
```

例如：

```bash
node scripts/wind-alice-meeting-expert.mjs --prompt "未来一周有哪些上市公司业绩会召开？"
```

4. 等进程退出再交付。等待期间终端长时间无新输出属正常，**不要误判为卡死**。

**`--prompt` 必须是用户原话**：不要"帮用户组织语言"、不要只提取股票代码、不要翻译或重写。本技能不拼任何技能名前缀，用户问句原样送达服务端。只用 `--prompt` 一个参数即可；`--skill` 是继承自 `wind-alice` 的可选项，本技能不要传。

## 配置

需要 `WIND_API_KEY`，按优先级读取：

1. `%USERPROFILE%\.wind-aifinmarket\config`（dotenv：`WIND_API_KEY=...`）
2. 本 skill 目录 `config.json`（`{"wind_api_key":"..."}`）
3. 环境变量 `WIND_API_KEY`

**不要**手动逐个检查来源后就判定缺 Key——直接执行 CLI，只有 CLI 返回 `KEY_MISSING` 才说明确实没配。Key 获取入口：<https://aifinmarket.wind.com.cn/#/user/overview>。

## 交付给用户

- 正文取 stdout 里 `agentResult.value:` 之后的内容，**原样呈现**；禁止概括、摘要、改写。
- 不要加开场白（如「以下为 XX 报告」），不要标注 `agentResult.value` 这类内部字段名。
- 附件已由 CLI 下载到 `.agents/download/`，本地路径**已内联在正文中**；末尾不要再追加「已保存到…」。
- **禁止**读取 `.agents/download/` 下的附件全文贴给用户——正文已是面向用户的核心内容，附件供用户本地打开。

## 硬性要求

1. 绝不输出真实 `WIND_API_KEY`、Bearer token 或 `config.json` 内容；举例一律用 `Authorization: Bearer <WIND_API_KEY>` 占位。
2. `--prompt` 不能为空，否则 CLI 直接退出码 2。
3. 流式必须等到进程退出，不得改成"发完即返"。
4. 不得因等待过久而中断 CLI、改走其它工具，或并行重复发起同一任务。
5. PowerShell 下读本文档须显式 UTF-8：`Get-Content -Encoding UTF8 skills\wind-alice-meeting-expert\SKILL.md`；见到乱码先按 UTF-8 重读。
