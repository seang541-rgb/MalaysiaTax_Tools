# 「合并 vs 分开评税」判定器 设计文档

> 日期:2026-06-21 · 类别:新功能(个人所得税规划)· 复用现成纯函数引擎

## 目标

夫妻输入各自收入与减免,工具计算 **分开评税** 与 **合并评税(分别记夫名/妻名)** 的总税额,
指出哪种更省、省多少。市场上几乎没有三语交互版,差异化强。

## 决策(已与用户确认)

- **免费公开**:归为个人所得税规划,无 `PaidFeatureGate`、无积分。整页可爬可用 → SEO 拉满。
- **每位配偶用完整 `ReliefSelector`**:准确优先。

## 马来西亚规则

- **分开评税**:夫妻各自按自身收入和减免独立评税(两份税单)。
- **合并评税**:两人收入合并、记于一方名下,该方加 **配偶减免 RM4,000**;且若合并应税收入 ≤ RM35,000,
  享额外 RM400 配偶回扣(引擎已按 `spouseHasIncome=false` 处理)。通常一方收入很低时合并才划算。

## 计算模型(纯函数,TDD)

新增 `src/engine/joint-assessment.ts`,**所有税务逻辑在引擎层**,UI 仅调用。

跑三种,比较「税务负担 = `taxAfterRebateAndZakat + dividendTax`」(不含 PCB,PCB 只是预缴,与选哪种无关):

1. **分开** = `calculatePersonalTax(夫)` + `calculatePersonalTax(妻)`,各自减免,`married` + `spouseHasIncome=true`。
2. **合并记夫名** =
   - 收入:夫妻各项逐字段相加。
   - 减免:**两人同类减免汇总后封顶到法定上限**(`amount = min(夫+妻, maxAmount)`),再强制加配偶减免 RM4,000。
     - 此规则天然处理「个人减免不能各算一份」(9000+9000→封顶 9000)、「EPF/生活方式等共享单一上限」。
   - zakat:合并;`married` + `spouseHasIncome=false`(启用配偶回扣)。
3. **合并记妻名** = 对称。

输出:三种税额、推荐(separate / joint)、最优记名方、省额。

### 已知简化(结果页标注「估算,以 LHDN 官方为准」)

- 真实合并评税的减免转移有逐项细则;本模型用「汇总后封顶」近似,绝大多数常见情形结果一致。
- 股息税 2% 按合并 dividend 超 RM100k 计(合并评税单一评估,合理)。

## 路由与 UI

- 新路由(扁平顶级):`/[locale]/joint-vs-separate-assessment`,**无墙**。
- 页面结构(全部公开可爬):
  - `generateMetadata` 独立 title/description(三语)。
  - H1 + 说明文案 + `WebApplication` + `FAQPage`(新增三语 FAQ)JSON-LD + `SourceNote topic="personal"`。
  - 客户端组件 `joint-vs-separate-form.tsx`:
    - 两栏(配偶一 / 配偶二):各含年收入输入 + 完整 `<ReliefSelector>`。
    - 结果对比面板:分开 vs 合并(最优记名方),高亮推荐 + 省额。
- 加入 `sitemap.ts`;header 暂不加直达(首页/相关页内链即可,后续再说)。

## 复用

- `calculatePersonalTax`(纯函数)、`ReliefSelector`、类型 `IncomeInput/ReliefClaim/TaxCalculationResult`、`SourceNote`、`FaqSection`、首页 `WebApplication` 范式。

## 不做

- 不引入任何收费/登录。
- 不改 `calculatePersonalTax` 引擎(只新增 joint-assessment 模块调用它)。
- 不做子女/残障配偶等全部边角减免转移细则(用通用「汇总封顶」近似)。

## 验证

1. 新增引擎单测(TDD,先写后实现):
   - 双方高收入 → 推荐分开。
   - 一方零收入 → 推荐合并,且配偶减免 + 减免池生效。
   - 减免「汇总封顶」:个人减免不翻倍。
   - 最优记名方选择正确 / 对称性。
2. `/en|zh|ms/joint-vs-separate-assessment` 返回 200,墙外含 H1 + 两种 JSON-LD。
3. sitemap 含新路由。
4. `npm run lint` + `npx tsc --noEmit` + `npm test`(含新测试)全过 + `npm run build`。
