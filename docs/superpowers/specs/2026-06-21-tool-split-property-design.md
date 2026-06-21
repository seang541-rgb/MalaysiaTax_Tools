# 工具拆独立 URL —— property 样板 设计文档

> 日期:2026-06-21 · 范围:property 两个工具(RPGT、印花税)拆为独立扁平 URL,确立后续 6 个工具复制的模式 · 类别:SEO 结构重构

## 背景与约束

- 现状:8 个工具藏在 `/corporate-tools`、`/property` 两个 tab 页(同一 URL),整页包在 `PaidFeatureGate` 登录墙 + 每工具扣积分。
- 用户决策:**除个人所得税外,所有工具保持收费,不开放免费。**
- 因此 SEO 价值来自「**墙外公开的营销/说明文案被收录**」,而非计算器本身。标准 SaaS 做法:页面上半部分(说明 + FAQ + schema)公开可爬,下半部分(交互计算器)保持登录+积分墙。
- 推进方式:先做 property 两个工具作样板,跑通后复制到其余 6 个。
- URL 风格:扁平顶级。

## 新路由(扁平顶级)

- `/[locale]/rpgt-calculator` → RPGT(卖房)
- `/[locale]/stamp-duty` → 印花税(买房)

(next-intl `routing` 未定义 localized pathnames,新增 `src/app/[locale]/<slug>/page.tsx` 文件夹即生效,无需改路由配置。)

## 每个工具页结构

1. **`generateMetadata`** —— 独立 title/description(新增三语 i18n 键)。
2. **墙外(可被 Google 收录)**:
   - `<h1>` + 一段说明文案(这个工具算什么 / 何时用)。
   - `<FaqSection>`(复用,已自带 `FAQPage` JSON-LD)。
   - `<SourceNote topic="rpgt|stampduty">`(复用,topic 已存在)。
   - 内联 `WebApplication` JSON-LD(仿首页 `page.tsx` 范式,`applicationCategory: "FinanceApplication"`,每工具独立 name/description/url)。
3. **墙内(计费完全不变)**:
   - 新增可复用客户端组件 `gated-tool.tsx`:封装「解锁 state + `CreditChargeButton` + 解锁后渲染 children」,把现在散在 `PropertyToolsTabs` 里的解锁逻辑抽出来,供后续 6 个工具复用。
   - `<GatedTool feature="property_calculation" summary={{ tool: "rpgt" }}><RpgtCalculator/></GatedTool>`。
   - 积分扣费沿用现有 `property_calculation` feature,逻辑零改动。

## `/property` 入口聚合页

- 由「内嵌 tab 计算器」改为**聚合落地页**:卡片链接到两个独立工具页(`Link` 用 `@/i18n/navigation`)。
- 目的:① 避免同一计算器同时出现在 `/property` 和 `/rpgt-calculator` 造成重复内容;② 提供内部链接。
- 保留 `/property` 现有的 `propertyFaq` 区块与 metadata。
- `PropertyToolsTabs` 组件在 property 不再使用后保留与否,视 corporate 阶段而定(corporate 仍在用同模式),本阶段不删。

## 导航 / sitemap

- header 现有 `/property` 链接保持(指向聚合页),本阶段不加直达工具链接。
- `sitemap.ts` 的 `pages[]` 增加 `/rpgt-calculator`、`/stamp-duty` 两条;其 `lastModified` 由第一件事的 git 机制自动取各自 page.tsx 提交日。

## i18n

- 新增三语键(en/zh/ms),每工具一组:`title` / `subtitle` / `intro`(说明段)/ `faqTitle` / `faq items`。
- 文案由 AI 起草、覆盖三语,**标注待用户/税务复核**(YMYL 内容)。

## 不做(明确排除)

- 不动 corporate 的 6 个工具(下一阶段)。
- 不改任何计费逻辑 / 积分 feature key。
- 不开放任何工具免费。
- 不删 `PropertyToolsTabs`(corporate 阶段仍复用同模式)。

## 验证

1. `npm run build` 成功;`/en/rpgt-calculator`、`/en/stamp-duty` 等 6 个新 URL(2 工具 × 3 语)产出。
2. 抓页面 HTML 确认墙外含 `WebApplication` + `FAQPage` JSON-LD、H1、说明文案。
3. sitemap.xml 含两新路由且 lastmod 为真实 git 日期。
4. `npm run lint` + `npx tsc --noEmit` + `npm test` 全过。
