# 拆分 6 个公司税务工具为独立可索引 URL 设计文档

> 日期:2026-06-21 · 类别:SEO 增量 · 复用 property 拆分样板(item 2)

## 目标

`/corporate-tools` 原本是单页 6 个 tab(taxcomp/soleprop/cp204/capalw/wht/incentives),
对搜索引擎只是 1 个 URL,tab 内容不可独立索引。按 property 拆分样板,把每个工具拆成独立 URL,
各带专属 metadata + H1 + 说明 + WebApplication/FAQPage 结构化数据,`/corporate-tools` 变成导航 hub。

## 决策

- **沿用样板,不重新设计**(用户:其余 6 个按同模式复制即可)。
- hub 页公开无墙(纯导航卡片);**收费门仍在每个工具页**(`PaidFeatureGate` + `GatedTool`,feature `corporate_tools_run`),
  与拆分前一致——拆分只动 URL 结构与 SEO,不动计费。

## 路由(SEO 关键词扁平 slug)

| 工具 | slug | 组件 | SourceNote topic |
|---|---|---|---|
| 税务计算 | `/tax-computation-calculator` | `TaxComputationCalculator` | corporate |
| 独资 | `/sole-proprietor-tax-calculator` | `SoleProprietorCalculator` | soleprop |
| CP204 | `/cp204-calculator` | `Cp204Calculator` | cp204 |
| 资本免税额 | `/capital-allowance-calculator` | `CapitalAllowanceCalculator` | capalw |
| 预扣税 | `/withholding-tax-calculator` | `WithholdingTaxCalculator` | wht |
| 税务奖掖 | `/tax-incentives` | `IncentivesWizard` | corporate |

## 每页结构(= rpgt-calculator 样板)

`generateMetadata`(`<ns>.page` 三语)+ `WebApplication` JSON-LD + H1/intro +
`PaidFeatureGate > GatedTool` 包裹工具 + `FaqSection`(自带 FAQPage JSON-LD,每工具 2 条)+ `SourceNote`。

## i18n

新增 6 个顶层命名空间(`taxComputation` / `soleProprietor` / `cp204Tool` / `capitalAllowance` /
`withholdingTax` / `taxIncentives`),各含 `page` + `faq`;`corptools` 增 `hubIntro` + 6 条卡片说明。
三语,定点注入(纯新增,无格式噪音)。

## 其他

- 删除孤立的 `corporate-tools-tabs.tsx`(hub 改卡片后不再引用)。
- 6 条路由加入 sitemap(priority 0.9)。

## 已知简化

- FAQ 与说明文案为初稿,数字基于通行法规(SME 15/17/24%、WHT 10/15%、CA 初期 20% 等),属 YMYL,**上线前需人工/税务复核**。

## 验证

`tsc` + `lint` + `255 测试` + `build` 全过;6 slug × 3 语 = 18 路由 200,含 H1 + 双 JSON-LD;
hub 链接到 6 页;sitemap 含全部 6 条。
