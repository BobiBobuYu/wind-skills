# wind-mcp-skill 测试集

`cli.mjs` 的测试与诊断脚本。分两类：**确定性单测**（无网络、无凭据，可直接跑）和**集成冒烟**（需真实后端与凭据，手动跑）。

## 确定性单测（直接 `node tests/xxx.mjs`）

| 脚本 | 作用 |
| --- | --- |
| `run-cli-contract-tests.mjs` | argv / exit / 错误码、路由、manifest 校验（必填 / strict / 类型 / 标量枚举）、call-rules 跨字段、类型收敛后实际发出的参数、信封 |
| `run-error-tests.mjs` | 2026-09-07 实测到的全部后端形态：SSE / 纯 JSON、isError 文本、isError=false 的纯文本错误、Markdown 正文、旧式内层信封、内层业务码、HTTP 401/429/503 |
| `run-code-matrix-tests.mjs` | 业务码成功边界：`data.code` 为 `0` 或任意 `2xx` 判成功，其余判 `backend_error` |

配套 preload：`mock-fetch.mjs`（场景由 `WIND_MOCK_SCENARIO` 选择，`WIND_MOCK_CAPTURE` 记录实际发出的请求）、`mock-code.mjs`。

一致性检查在 `scripts/check-consistency.mjs`（名字层面四项；`--live` 与线上 tools/list 比对）。

```bash
node tests/run-cli-contract-tests.mjs && node tests/run-error-tests.mjs && node tests/run-code-matrix-tests.mjs && node scripts/check-consistency.mjs
```

## 集成冒烟（需真实后端 + 凭据，手动跑，勿入 CI）

`run-smoke-real.mjs`：每个 references 文件至少一个真实调用，覆盖 11 个 server_type，只看信封形态不校验数据。

```bash
node tests/run-smoke-real.mjs                    # 全部
node tests/run-smoke-real.mjs --server edb_data  # 只跑一个站
node tests/run-smoke-real.mjs --only fund_get_nav
```

后端返回 `backend_error` 且用例标注了已知问题时计为 KNOWN，不算失败。
