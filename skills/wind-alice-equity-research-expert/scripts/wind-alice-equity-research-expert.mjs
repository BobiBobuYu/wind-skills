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
      "wind-alice-equity-research-expert — 调用万得 Alice「个股研究专家」（activeSubAgent: equity-deep-research-agent），流式输出分析结果",
      "",
      "面向二级市场的个股研究搭档，围绕公司基本面、财报与事件、估值位置及可证伪投资逻辑，形成有证据、有反方观点、可持续跟踪的研究判断，并交付带真实数据图表与来源的报告。",
      "",
      "Usage:",
      "  wind-alice-equity-research-expert --prompt <QUESTION>",
      "  wind-alice-equity-research-expert --help",
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
      "  个股深研",
      "  基本面分析",
      "  商业模式",
      "  竞争壁垒",
      "  财报解读",
      "  事件分析",
      "  估值位置",
      "  同业比较",
      "  Thesis 跟踪",
      "  Word 研报",
      "",
      "示例:",
      "  wind-alice-equity-research-expert --prompt \"做一份英伟达（NVDA.O）的中报前瞻\"",
      "  wind-alice-equity-research-expert --prompt \"解读腾讯控股（0700.HK）最新财报与预期差\"",
      "  wind-alice-equity-research-expert --prompt \"深度研究中际旭创（300308.SZ）的投资逻辑与失效条件\"",
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
