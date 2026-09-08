#!/usr/bin/env node
import { once } from "node:events";
import { fileURLToPath } from "node:url";

// 稳定 CLI 入口：把参数转给 request.js（真正的请求 + SSE 解析在那边）。
// 必须 await 子进程退出，否则在某些 Windows / IDE 终端下父进程会先结束，
// 看到的只有 status/headers，后续流式正文被截断。
// 升级探针在 request.js 里接线（每次有效 --prompt 调用，对齐 wind-mcp-skill 的 call）。

const requestEntrypoint = new URL("./request.js", import.meta.url);

const args = process.argv.slice(2);

const isHelp = args.length === 0 || args.includes("--help") || args.includes("-h");
if (isHelp) {
  console.log(
    [
      "wind-alice-meeting-expert — 调用万得 Alice「会议专家」（activeSubAgent: meeting），流式输出分析结果",
      "",
      "作为你的会议专家，全程协助处理一场会议从会前到会后的关键工作，适合路演、业绩会、调研拜访等多个会议场景。",
      "",
      "Usage:",
      "  wind-alice-meeting-expert --prompt <QUESTION>",
      "  wind-alice-meeting-expert --help",
      "",
      "Options:",
      "  --prompt, -p <QUESTION>     用户提问（必填）。**原话透传**：不要改写、翻译、",
      "                              组织语言或只提取股票代码，服务端要拿到完整原句。",
      "  --skill,  -s <SKILL_NAME>   可选，专家场景**默认不要传**。仅当用户点名 Alice 的",
      "                              某个子 Skill 时才用；会额外拼技能名前缀，与专家路由叠加。",
      "  --list-skills               列出 wind-alice 已知子 Skill（本包一般用不到）",
      "  --help,   -h                查看帮助",
      "",
      "擅长领域:",
      "  会议顾问",
      "  研究分析",
      "  业绩会",
      "  路演会议",
      "  调研拜访",
      "",
      "示例:",
      "  wind-alice-meeting-expert --prompt \"未来一周有哪些上市公司业绩会召开？\"",
      "  wind-alice-meeting-expert --prompt \"这场腾讯会议帮我参加下并做记录，参会名称使用“研究助手”，会议邀请链接：\"",
      "  wind-alice-meeting-expert --prompt \"特斯拉最近一次业绩会讲了什么？\"",
      "",
      "",
      "Config:",
      "  优先读取 %USERPROFILE%\\.wind-aifinmarket\\config (dotenv: WIND_API_KEY=...),",
      "  再读取 skill 目录 config.json (wind_api_key),",
      "  最后读取 WIND_API_KEY 环境变量",
    ].join("\n"),
  );
  process.exitCode = args.length === 0 ? 2 : 0;
} else {
  const nodePath = process.execPath;
  const { spawn } = await import("node:child_process");
  const child = spawn(
    nodePath,
    [fileURLToPath(requestEntrypoint), ...args],
    { stdio: "inherit" },
  );
  child.once("error", (err) => {
    console.error("spawn failed:", err.message);
    process.exitCode = 1;
  });
  const [code, signal] = await once(child, "exit");
  process.exitCode = signal ? 1 : (code ?? 1);
}
