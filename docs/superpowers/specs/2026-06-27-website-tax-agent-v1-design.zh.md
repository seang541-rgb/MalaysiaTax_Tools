# 网站内 Tax Agent v1 - 设计规格

## 概览

MYTax 将把现有的 AI Tax 聊天功能升级成嵌入网站内的税务 Agent。v1 版本仍然运行在当前 Next.js 应用里，并复用现有的确定性 TypeScript 税务计算引擎。语言模型不负责自己计算税额；它负责理解用户问题、收集缺失资料、选择正确工具，并用用户的语言解释工具计算结果。

这不是独立 API 平台、WhatsApp 机器人、会计师后台或微调模型项目。那些可以在网站内 Agent 被验证有价值之后再做。

## 目标

- 把 `/ai-tax` 从一般 RAG 问答升级成有引导能力的税务助理。
- 把现有 `src/engine/*` 计算模块复用为 Agent tools。
- 支持英文、中文和 Bahasa Malaysia 对话。
- 当必要资料缺失时，提出简短追问。
- 所有涉及金额和税额的计算都保持确定性、可测试。
- RAG 只用于法规背景、解释和来源辅助，不用于替代计算引擎。
- 保留现有认证、credit 计费、流式输出和聊天日志机制。

## 非目标

- v1 不做模型微调。
- v1 不开放外部 Tax Agent API。
- v1 不接 WhatsApp、Telegram 或语音接口。
- 不自动报税、不提交表格、不提供最终专业税务意见。
- 不允许 Agent 自动更新税务规则，规则更新必须经过 owner review。
- 不替换现有 calculator 页面。

## 用户体验

用户在现有 MYTax AI 聊天框里用自然语言提问。

示例：

```text
I earn RM8,000 monthly and I am single. How much tax do I pay?
```

Agent 应该：

1. 判断这是个人所得税场景。
2. 抽取月收入和婚姻状态。
3. 识别是否缺少必要假设。
4. 只在安全且明确说明的情况下使用默认值。
5. 调用个人税工具。
6. 返回包含假设、结果和免责声明的简洁计算说明。
7. 链接到完整 calculator 页面，让用户进一步调整细节。

如果用户问：

```text
My company revenue is RM700k. Do I need SST?
```

Agent 应该识别为 SST 注册判断。如果用户没有说明 sales tax 还是 service tax，而这个信息会影响判断，Agent 应先追问；资料足够后再调用 SST checker。

## v1 范围

第一版网站内 Agent 覆盖五个高价值场景：

| 场景 | 现有引擎 | Agent Tool |
| --- | --- | --- |
| 个人所得税估算 | `src/engine/personal.ts` | `personal_tax_calculator` |
| e-Invoice 阶段和豁免判断 | `src/engine/e-invoice.ts` | `e_invoice_phase_checker` |
| SST 注册判断和税额估算 | `src/engine/sst.ts` | `sst_checker` |
| 公司税估算 | `src/engine/corporate.ts` | `corporate_tax_calculator` |
| 房产处置或购买相关税务 | `src/engine/rpgt.ts`, `src/engine/stamp-duty.ts` | `rpgt_calculator`, `stamp_duty_calculator` |

实施时可以先做前三个工具：个人税、e-Invoice、SST。等 Agent loop 稳定后，再加入公司税和 property 工具。

## 架构

```text
Browser TaxChat component
  -> POST /api/chat
    -> auth and credit checks
    -> agent orchestrator
      -> intent detection
      -> slot extraction
      -> missing input policy
      -> tool registry
        -> deterministic tax engines
      -> RAG retrieval
      -> response composer
    -> streamed answer
    -> AI chat log
```

新增代码建议放在 `src/lib/agent/`：

- `types.ts`：通用 tool、slot、agent result 类型。
- `tools.ts`：可用税务工具注册表。
- `intents.ts`：intent 名称、关键词提示和 confidence helper。
- `slots.ts`：轻量参数抽取和缺失字段检查。
- `orchestrator.ts`：供 `/api/chat` 调用的主 Agent 流程。
- `prompts.ts`：用于 LLM 格式化答案的精简指令。

第一版继续保留 `/api/chat` 作为公开 route，避免前端大改。内部则让 `/api/chat` 委托给 agent orchestrator，而不是继续堆更多临时 pre-calculation 逻辑。

## Agent Tool 合约

每个工具暴露一个小型结构化合约：

```ts
interface AgentTool<Input, Output> {
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  detect(message: string): ToolDetection;
  extract(message: string): Partial<Input>;
  missing(input: Partial<Input>): MissingField[];
  run(input: Input): Output;
  summarize(output: Output, context: ToolSummaryContext): ToolSummary;
}
```

v1 的抽取逻辑应保持简单。因为首批场景范围窄，可以先用 regex 和小型 helper。若后续发现抽取不稳定，再升级为模型辅助 JSON extraction，并用 schema validation 校验。

## 缺失资料策略

当必要资料缺失时，Agent 应一次只问一个简短追问，不要抛出长问卷。

v1 的必要资料示例：

- 个人税：收入金额、收入周期是否明确、必要时确认 tax residency、无法推断时确认婚姻状态。
- SST：annual taxable revenue、tax type 或 service category，尤其是用户问题依赖这些信息时。
- e-Invoice：annual turnover 或 revenue。
- 公司税：chargeable income；若用户要明确 SME 结论，则需要 SME 资格资料。
- RPGT：购买日期、出售日期、出售价格、购买价格、disposer type。
- 印花税：房产价格、buyer type；若询问贷款印花税，则需要 loan amount。

可以使用安全默认值，但必须清楚说明。例如用户只是要快速估算个人税，可以默认 YA2025 和 single，但答案必须标明这些是假设。

## 回答要求

任何使用 tool 的 Agent 回答都应包含：

- 识别到的场景。
- 使用的假设。
- 计算结果。
- 简短说明结果如何得出。
- 相关完整 calculator 页面的链接。
- 仅供参考的免责声明。

回答语言应跟随用户语言。用户写中文就回复中文；用户写 Bahasa Malaysia 就回复 Bahasa Malaysia；其他情况默认英文。

模型可以负责格式化和解释，但不能覆盖 tool output 里的数字。

## RAG 使用方式

RAG 仍然有价值，但它应该辅助工具结果，而不是替代工具结果。

适合用 RAG 的情况：

- 解释税务概念。
- 查找有来源支撑的背景资料。
- 回答非计算型问题。
- 对频繁变化的政策补充 caveat。

不应使用 RAG 的情况：

- 重新计算确定性工具已经输出的结果。
- 在 engine 已经返回结果后，改用另一套税率。
- 未经 owner review，就覆盖源码中维护的 MYTax 规则。

## 计费

v1 保持现有 AI Tax credit 模型：

- `GET /api/chat` 继续作为免费 health check。
- `POST /api/chat` 需要登录，并消耗现有 AI question credit。
- 如果扣除 credit 后 provider 失败，保留当前退款行为。

第一版不新增按工具分别计费。等 tool loop 稳定后，再为 batch PCB、报告生成、深度方案比较等高成本流程设计单独 credit cost。

## 日志和分析

扩展 AI chat logging，记录：

- detected intent
- selected tool name
- 是否提出 follow-up question
- missing fields
- 是否使用 RAG
- 是否使用 deterministic tool output
- 可用时记录 provider/model metadata

这些数据可以帮助判断用户最常问哪些税务场景，以及 Agent 在哪里收集资料失败。

## 错误处理

Agent 应该温和失败：

- 如果没有足够信心识别 intent，就作为一般税务聊天处理，使用 RAG 并推荐相关 calculator。
- 如果 tool 因缺少 input 不能运行，就提出追问。
- 如果确定性工具抛错，就道歉并建议用户使用完整 calculator 页面。
- 如果 RAG 失败，继续返回确定性工具结果。
- 如果 LLM provider 在已经取得工具结果后失败，就返回简单的确定性摘要，避免丢失计算结果。

## 测试策略

单元测试：

- 每个 v1 场景的 intent detection。
- 常见 EN/ZH/MS 表达的 slot extraction。
- incomplete question 的 missing-field 行为。
- tool wrapper 输出与现有 engine tests 一致。

集成测试：

- `/api/chat` 在 auth 和 credit checks 后调用 agent orchestrator。
- credits 不足时，在 agent/provider work 之前阻止请求。
- provider failure 会退款。
- tool answers 不会与 deterministic output 冲突。

评测集：

- 至少 50 条多语言 v1 示例问题。
- 包含应该触发追问的模糊 prompt。
- 包含 SST threshold、e-Invoice exemption、RPGT 日期边界、个人税收入周期歧义等边界案例。

## 上线计划

1. 新增 `src/lib/agent` types 和 registry，先接入 `personal_tax_calculator`、`e_invoice_phase_checker`、`sst_checker`。
2. 把 `/api/chat` 里现有的临时 deterministic context 逻辑迁移到 agent layer。
3. 为前三个场景增加 orchestrator tests。
4. 更新 `/api/chat`，让它调用 orchestrator，同时保留 streaming、billing 和 logging。
5. 增加 intent、tool、missing inputs 的结构化日志字段。
6. 前三个场景通过评测后，再加入 corporate 和 property tools。
7. 改进聊天 UI，显示 assumptions、calculator links 和更清楚的追问状态。

## 待定决策

- v1 是否在 UI 明确显示 “used tool” 标签，还是只在文本中显示假设。建议：先只在文本中显示假设，等行为稳定后再加额外 UI。
- 抽取逻辑保持 regex-based，还是使用模型生成 JSON。建议：前三个工具先用 regex/schema-first，只有必要时再加 model extraction。
- 中文输出是否默认使用简体中文。建议：默认简体中文；如果用户写繁体，则跟随繁体。

## 已确认方向

已确认：第一版做网站内 MYTax AI Agent，从现有 Next.js 应用内开始，优先接入个人税、e-Invoice 和 SST 三个工具调用场景。
