# Malaysia Tax Calculator — Design Spec

## Overview

A web-based Malaysian tax calculation tool targeting individuals and SME owners. Provides comprehensive tax calculation across all major tax types with clear explanations in three languages (EN/ZH/MS).

**Business model:** Freemium — personal income tax calculation is free (for SEO & user acquisition), advanced features (corporate tax, batch PCB, employer obligations, SST) require paid credits.

**Differentiators:**
- Trilingual support (English, Chinese, Malay) — most competitors are English-only
- All-in-one tax coverage — competitors are fragmented across separate tools
- Tax explanations — not just numbers, but what's taxable and why
- AI-ready architecture — future integration for automatic policy updates

## Target Users

1. **Individuals** — salaried employees, freelancers calculating personal income tax (Borang BE/B)
2. **SME owners** — calculating corporate tax, employee PCB, employer obligations (EPF/SOCSO/EIS), SST

## Phased Release Strategy

### Phase 1 — Personal Income Tax (FREE)

Core functionality:
- **Calculate** — input income and reliefs, output tax payable with breakdown by progressive rate bands
- **List** — clear itemized breakdown of each tax component
- **Explain** — what income is taxable, what qualifies for relief, how calculation works

Tax coverage:
- Annual tax calculation (Borang BE/B)
- Income types: employment, commission, rental, interest, dividends, etc.
- Progressive tax rates (0% – 30%, per LHDN schedule)
- All tax reliefs: personal (RM9,000), spouse, children, education, medical, lifestyle, insurance, etc.
- Tax deductions (Zakat) and rebates (RM400 for income < RM35,000, spouse rebate)
- PCB monthly deduction estimation
- Year-end comparison: total PCB vs actual tax payable (top-up or refund)

User flow:
```
Select YA → Input income → Select reliefs → View calculation results + explanations
```

No registration required. Open and use immediately.

### Phase 2 — Corporate Tax + Employee PCB (PAID, requires credits)

- Corporate income tax calculation (SME preferential rates 15%/17% vs standard 24%)
- Batch employee PCB calculation — input multiple employee salaries, calculate all PCB at once
- Tax type explanations: which rate applies under what circumstances

### Phase 3 — Employer Obligations + SST (PAID)

- EPF/SOCSO/EIS employer portion calculation — input headcount and salaries, output monthly employer obligations
- SST (Sales & Service Tax) calculation — registration threshold check (RM500k), 6%/8% tax calculation
- API interface reserved for future AI integration

## Architecture

```
┌─────────────────────────────────────────────┐
│           Next.js App (Frontend + API)       │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Pages   │  │API Routes│  │   i18n    │  │
│  │ (SSR/SSG)│  │(server)  │  │ (en/zh/ms)│  │
│  └────┬─────┘  └────┬─────┘  └───────────┘  │
│       │              │                        │
│  ┌────┴──────────────┴─────┐                 │
│  │    Tax Calculation Engine │                 │
│  │  (standalone, pure logic) │                 │
│  └────────────┬─────────────┘                 │
└───────────────┼──────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │      Supabase         │
    │  ┌─────┐ ┌──────────┐ │
    │  │Auth │ │ Database │ │
    │  └─────┘ └──────────┘ │
    └───────────┬───────────┘
                │
         ┌──────┴──────┐
         │   Stripe    │
         │ Credit Pack │
         └─────────────┘
```

**Key architectural decisions:**

- **Tax Calculation Engine** is a standalone pure TypeScript module with no UI or framework dependencies. Input parameters → output results. Enables future AI integration and API exposure.
- **API Routes** handle authentication, credit deduction, engine invocation, and usage logging.
- **SSR/SSG** for SEO pages (homepage, feature descriptions, tax knowledge articles).
- **Free features** (personal tax) call the engine directly in the frontend — no backend, no login required.
- **Paid features** (corporate tax, batch PCB, etc.) go through API Routes — verify login + check credits before returning results.

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js 14+ (App Router) | SSR/SSG + API Routes in one |
| Language | TypeScript | Type safety critical for tax calculations |
| UI | Tailwind CSS + shadcn/ui | Fast to build, professional look |
| Database | Supabase (PostgreSQL) | Auth + DB + existing team experience |
| Payments | Stripe | Credit pack purchases |
| i18n | next-intl | Most mature i18n for Next.js ecosystem |
| Deployment | Vercel | Native Next.js support, zero-config |

## Project Structure

```
my-tax-app/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── [locale]/     # i18n routing (en/zh/ms)
│   │   └── api/          # API Routes (paid features)
│   ├── engine/           # Tax calculation engine (pure logic)
│   │   ├── personal.ts   # Personal income tax
│   │   ├── corporate.ts  # Corporate tax
│   │   ├── pcb.ts        # PCB calculation
│   │   ├── employer.ts   # EPF/SOCSO/EIS employer portion
│   │   └── sst.ts        # SST
│   ├── lib/              # Supabase client, Stripe, utilities
│   ├── components/       # UI components
│   └── i18n/             # Translation files (en.json/zh.json/ms.json)
├── supabase/             # Database migrations and seed data
└── docs/                 # Design documents
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `tax_rates` | Progressive tax rate schedule, stored by assessment year (YA) |
| `tax_reliefs` | Relief items and limits, stored by YA |
| `corporate_tax_rates` | Corporate tax rates (SME/standard), stored by YA |
| `epf_rates` | EPF employer/employee contribution rates |
| `socso_eis_rates` | SOCSO/EIS rate tables |
| `sst_rates` | SST rates and thresholds |
| `users` | User profiles (managed by Supabase Auth) |
| `credits` | User credit balance and transaction history |
| `usage_logs` | Usage records (who, what, when) |

**Key design points:**
- All rate tables include `year_assessment` field — switch years without code changes
- Admin can update rates via Supabase Dashboard (admin panel later)
- `credits` table tracks purchases and consumption; every paid calculation checks balance first

## Pricing Model

- **Free:** Phase 1 personal income tax calculation (unlimited)
- **Paid:** Phase 2/3 features, per-use credit deduction
- **Pricing TBD** — most users only need it once a year, but the value is high (saves accountant fees and hassle). Price should reflect value delivered, not frequency of use. To be finalized based on market research and user feedback.

## SEO & Growth Strategy

- Homepage targets high-volume keywords: "Malaysia income tax calculator 2026"
- Trilingual landing pages with independent URLs (`/en`, `/zh`, `/ms`) — separately indexed by Google
- Tax knowledge explanation pages double as content marketing
- Conversion path: Google search → free personal tax calc → register → need corporate/batch → buy credits

## Compliance

- **Phase 1:** Tool positioning with disclaimer — "For reference only, does not constitute tax advice"
- **Future:** Partner with licensed tax consultants for calculation logic review and endorsement

## Competitive Landscape

Existing tools (SQL.com.my, MalaysiaSalaryCalculator.com, PCBCalculator.my, Payroll.my, Talenox, PayrollPanda, LHDN official) are:
- Mostly English-only
- Fragmented (separate tools for PCB, annual tax, EPF)
- Results without explanation
- No AI integration

Our positioning fills the gap: trilingual + all-in-one + explanations + AI-ready.

---

# 马来西亚税务计算器 — 设计规格书

## 概述

面向个人和中小企业老板的马来西亚税务计算网页工具。提供全面的税种计算，附带三语（英/中/马来）清晰说明。

**商业模式：** Freemium — 个人所得税计算免费（用于 SEO 获客），高级功能（企业税、批量 PCB、雇主义务、SST）需购买 credit 按次使用。

**差异化优势：**
- 三语支持（英文、中文、马来文）— 大部分竞品只有英文
- 全税种一站式覆盖 — 竞品功能分散在不同工具
- 税务说明 — 不只是数字，还解释什么要交税、为什么这样算
- AI 预留架构 — 未来接入 AI 自动跟进政策更新

## 目标用户

1. **个人用户** — 打工族、自由职业者，计算个人所得税（Borang BE/B）
2. **中小企业老板** — 计算企业税、员工 PCB、雇主义务（EPF/SOCSO/EIS）、SST

## 分阶段发布策略

### Phase 1 — 个人所得税（免费）

核心功能：
- **计算** — 输入收入和减免项目，输出应缴税额及累进税率各档明细
- **列表** — 清晰列出每项税务组成部分
- **说明** — 解释什么收入需要交税、什么可以减免、计算方式

税务覆盖：
- 年度税务计算（Borang BE/B）
- 收入类型：就业收入、佣金、租金、利息、股息等
- 累进税率（0% – 30%，按 LHDN 税率表）
- 所有税务减免：个人（RM9,000）、配偶、子女、教育、医疗、生活方式、保险等
- 税务扣除（Zakat）和回扣（收入低于 RM35,000 的 RM400 回扣、配偶回扣）
- PCB 月扣税估算
- 年终对比：PCB 总额 vs 实际应缴税，显示需补税或可退税金额

用户流程：
```
选择年度(YA) → 输入收入 → 选择减免项目 → 查看计算结果 + 说明
```

无需注册登录，打开即用。

### Phase 2 — 企业税 + 员工 PCB（付费，需 credit）

- 企业所得税计算（SME 优惠税率 15%/17% vs 标准 24%）
- 员工 PCB 批量计算 — 输入多名员工薪资，一次算出所有人的 PCB
- 税种说明：什么情况适用哪个税率

### Phase 3 — 雇主义务 + SST（付费）

- EPF/SOCSO/EIS 雇主部分计算 — 输入员工人数和薪资，算出每月雇主应缴总额
- SST（销售与服务税）计算 — 判断是否达到注册门槛（RM500k），计算 6%/8% 税额
- 预留 API 接口，为未来 AI 接入做准备

## 架构

```
┌─────────────────────────────────────────────┐
│         Next.js 应用（前端 + API）            │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │   页面    │  │ API 路由  │  │   i18n    │  │
│  │ (SSR/SSG)│  │ (服务端)  │  │ (en/zh/ms)│  │
│  └────┬─────┘  └────┬─────┘  └───────────┘  │
│       │              │                        │
│  ┌────┴──────────────┴─────┐                 │
│  │      税务计算引擎         │                 │
│  │  （独立模块，纯逻辑无UI）  │                 │
│  └────────────┬─────────────┘                 │
└───────────────┼──────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │      Supabase         │
    │  ┌─────┐ ┌──────────┐ │
    │  │认证  │ │  数据库   │ │
    │  └─────┘ └──────────┘ │
    └───────────┬───────────┘
                │
         ┌──────┴──────┐
         │   Stripe    │
         │ Credit 购买  │
         └─────────────┘
```

**关键架构决策：**

- **税务计算引擎** 是独立的纯 TypeScript 模块，不依赖 UI 或框架。输入参数 → 输出结果。未来接 AI 或开放 API 只需调用此模块。
- **API 路由** 负责鉴权、credit 扣减、调用计算引擎、记录使用日志。
- **SSR/SSG** 用于 SEO 页面（首页、功能介绍、税务知识文章）。
- **免费功能**（个人税）在前端直接调用引擎，不走后端，不需要登录。
- **付费功能**（企业税、批量 PCB 等）走 API 路由，验证登录 + 检查 credit 后才返回结果。

## 技术栈

| 组件 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 14+（App Router） | SSR/SSG + API 路由一体化 |
| 语言 | TypeScript | 类型安全，税务计算不能出错 |
| UI | Tailwind CSS + shadcn/ui | 快速搭建，专业外观 |
| 数据库 | Supabase（PostgreSQL） | 认证 + 数据库 + 已有经验 |
| 支付 | Stripe | Credit 包购买 |
| 国际化 | next-intl | Next.js 生态最成熟的 i18n 方案 |
| 部署 | Vercel | 原生支持 Next.js，零配置部署 |

## 项目结构

```
my-tax-app/
├── src/
│   ├── app/              # Next.js App Router 页面
│   │   ├── [locale]/     # i18n 路由 (en/zh/ms)
│   │   └── api/          # API 路由（付费功能）
│   ├── engine/           # 税务计算引擎（纯逻辑）
│   │   ├── personal.ts   # 个人所得税
│   │   ├── corporate.ts  # 企业税
│   │   ├── pcb.ts        # PCB 计算
│   │   ├── employer.ts   # EPF/SOCSO/EIS 雇主部分
│   │   └── sst.ts        # SST
│   ├── lib/              # Supabase 客户端、Stripe、工具函数
│   ├── components/       # UI 组件
│   └── i18n/             # 翻译文件 (en.json/zh.json/ms.json)
├── supabase/             # 数据库迁移和种子数据
└── docs/                 # 设计文档
```

## 数据库设计

| 表名 | 用途 |
|------|------|
| `tax_rates` | 累进税率表，按评估年度（YA）存储 |
| `tax_reliefs` | 减免项目及上限，按 YA 存储 |
| `corporate_tax_rates` | 企业税率（SME/标准），按 YA 存储 |
| `epf_rates` | EPF 雇主/员工缴纳比率表 |
| `socso_eis_rates` | SOCSO/EIS 费率表 |
| `sst_rates` | SST 税率及门槛 |
| `users` | 用户信息（Supabase Auth 管理） |
| `credits` | 用户 credit 余额及交易记录 |
| `usage_logs` | 使用记录（谁、算了什么、什么时候） |

**关键设计点：**
- 所有税率表都有 `year_assessment` 字段 — 切换年度不需要改代码
- 管理员可通过 Supabase Dashboard 直接更新税率数据（后续加 admin panel）
- `credits` 表记录购买和消耗，每次付费计算前先检查余额

## 定价模型

- **免费：** Phase 1 个人所得税计算（不限次数）
- **付费：** Phase 2/3 功能，按次扣减 credit
- **定价待定** — 普通人一年大概只用一次，但价值高（省了找会计师的费用和麻烦）。定价应体现交付的价值而非使用频率。后续根据市场调研和用户反馈确定。

## SEO 与增长策略

- 首页针对高搜索量关键词："Malaysia income tax calculator 2026"
- 三语落地页独立 URL（`/en`、`/zh`、`/ms`）— Google 分别索引
- 税务知识说明页面兼做内容营销
- 转化路径：Google 搜索 → 免费计算个人税 → 觉得好用注册 → 需要企业税/批量功能 → 买 credit

## 合规

- **Phase 1：** 工具定位 + 免责声明 — "仅供参考，不构成税务建议"
- **未来：** 与持牌税务顾问合作，审核计算逻辑并背书

## 竞争格局

现有工具（SQL.com.my、MalaysiaSalaryCalculator.com、PCBCalculator.my、Payroll.my、Talenox、PayrollPanda、LHDN 官方）的共同问题：
- 大部分只有英文
- 功能分散（PCB 一个、年度税一个、EPF 又一个）
- 只给结果不解释
- 没有 AI 集成

我们的定位填补空白：三语 + 一站式 + 清晰说明 + AI 预留。
