# MYTax Gemma 4 12B 微调训练方案

## 当前进度

### ✅ Phase 0: 快速增强（已完成）
- [x] 抓取 LHDN 官方税率数据
- [x] 抓取 PERKESO SOCSO 费率数据
- [x] 编写 6 份原始税务知识文档（raw/）
- [x] 生成 25 条三语 Q&A 合成数据（qa-pairs/）
- [x] 合并为 merged.jsonl 训练格式
- [x] 创建 Ollama Modelfile + 自定义模型 `mytax-gemma4`
- [x] API route 对接 mytax-gemma4 模型

### 📋 Phase 1: 数据增强（下一步）
- [ ] 扩展 Q&A 到 200+ 条（目标覆盖率见下方）
- [ ] 用 Python 脚本从规则引擎自动生成计算类 Q&A
- [ ] 解析已下载的 LHDN PDF（explanatory notes, public rulings）
- [ ] 添加边缘案例 Q&A（多份收入、外派、退休等）
- [ ] 添加常见错误纠正类 Q&A（"GST 还在吗？"→ 已被 SST 取代）

### 📋 Phase 2: QLoRA 微调
- [ ] 安装 Unsloth + PyTorch
- [ ] 转换数据格式为 ChatML / Alpaca
- [ ] 配置 QLoRA 参数（r=16, alpha=32, target_modules）
- [ ] 训练 3-5 epochs，验证 loss 收敛
- [ ] 导出 GGUF 量化模型
- [ ] 导入 Ollama 测试

### 📋 Phase 3: RAG 增强（Supabase pgvector）
- [ ] Supabase 项目初始化
- [ ] 启用 pgvector 扩展
- [ ] 创建 embeddings 表
- [ ] 将 6 份知识文档分块 → 生成 embedding → 存入 Supabase
- [ ] API route 增加 RAG 逻辑：query → vector search → inject context → LLM
- [ ] 支持动态更新知识库（新税务公告自动入库）

---

## 数据覆盖目标

| 主题 | 当前 Q&A | 目标 | 语言分布 |
|---|---|---|---|
| 个人所得税 | 10 | 50 | EN/ZH/MS 各 ~17 |
| 企业税 | 4 | 25 | EN/ZH/MS |
| EPF/SOCSO/EIS | 6 | 40 | EN/ZH/MS |
| SST | 2 | 20 | EN/ZH/MS |
| PCB | 3 | 25 | EN/ZH/MS |
| 减免项目 | 0 | 30 | EN/ZH/MS |
| 常见误区 | 0 | 15 | EN/ZH/MS |
| 合计 | 25 | 205+ | |

## 原始数据来源

| 来源 | 状态 | 文件 |
|---|---|---|
| LHDN 税率表 (HTML) | ✅ 已抓取 | raw/01-tax-rates-ya2025.md |
| LHDN 减免列表 (Web) | ✅ 已抓取 | raw/02-tax-reliefs-ya2025.md |
| EPF KWSP 费率 | ✅ 已整理 | raw/03-epf-kwsp.md |
| SOCSO PERKESO 费率 | ✅ 已抓取 | raw/04-socso-perkeso.md |
| SST 税制概览 | ✅ 已整理 | raw/05-sst.md |
| PCB 制度说明 | ✅ 已整理 | raw/06-pcb-mtd.md |
| LHDN BE2025 说明 PDF | 📥 已下载 | 需要 OCR 解析 |
| LHDN Public Ruling PDF | 📥 已下载 | 需要 OCR 解析 |
| LHDN e-Book 2025 PDF | 📥 已下载 | 需要 OCR 解析 |
| SOCSO Act 4 费率 PDF | 📥 已下载 | 需要 OCR 解析 |
| KWSP Third Schedule | ❌ 403 Forbidden | 需手动下载 |

## 技术栈

### 微调训练
- **基座模型:** Gemma 4 12B (已在 Ollama)
- **训练框架:** Unsloth (4bit QLoRA)
- **硬件要求:** RTX 3060+ (12GB VRAM) 或 RTX 4070+
- **训练数据格式:** JSONL (ChatML messages format)
- **量化导出:** GGUF Q4_K_M (适合 Ollama 部署)

### RAG 向量数据库
- **数据库:** Supabase (PostgreSQL + pgvector)
- **Embedding 模型:** nomic-embed-text (Ollama 内置)
- **分块策略:** 按段落分块，每块 500-1000 tokens
- **检索:** cosine similarity, top-3 chunks

### 部署
- **推理:** Ollama (本地) → 未来可迁移至 vLLM
- **API:** Next.js API Route → SSE streaming
- **降级:** Ollama 离线时自动切换到规则引擎

---

## 快速开始命令

```bash
# 1. 合并训练数据
python training-data/scripts/merge-qa.py

# 2. 创建/更新 Ollama 自定义模型
ollama create mytax-gemma4 -f training-data/processed/Modelfile

# 3. 测试模型
ollama run mytax-gemma4 "月薪 RM5000 要交多少税？"

# 4. 启动 dev server 测试 AI 助手
npm run dev
```

## 目录结构

```
training-data/
├── raw/                    # 原始税务知识文档
│   ├── 01-tax-rates-ya2025.md
│   ├── 02-tax-reliefs-ya2025.md
│   ├── 03-epf-kwsp.md
│   ├── 04-socso-perkeso.md
│   ├── 05-sst.md
│   └── 06-pcb-mtd.md
├── qa-pairs/               # 合成 Q&A 训练数据 (JSONL)
│   ├── 01-personal-tax-qa.jsonl
│   ├── 02-corporate-tax-qa.jsonl
│   ├── 03-employer-contributions-qa.jsonl
│   └── 04-sst-pcb-qa.jsonl
├── processed/              # 处理后的数据
│   ├── merged.jsonl        # 合并后的训练集
│   └── Modelfile           # Ollama Modelfile
├── scripts/
│   └── merge-qa.py         # 合并 + 生成脚本
└── TRAINING-PLAN.md        # 本文档
```
