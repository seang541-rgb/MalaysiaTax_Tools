import { calculatePersonalTax } from "./personal";
import { calculateCorporateTax } from "./corporate";
import { calculateSst } from "./sst";
import { calculateEmployerContributions } from "./employer-contributions";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Rule-based tax assistant that uses the existing engines.
 * Future: Replace with self-trained local LLM for Malaysia tax domain.
 *
 * Local LLM integration plan:
 * 1. Fine-tune base model (e.g. Qwen2.5 / Llama 3) on Malaysia tax corpus
 * 2. Serve via Ollama / vLLM / llama.cpp HTTP endpoint (localhost)
 * 3. Create Next.js API route at /api/chat → stream from local endpoint
 * 4. System prompt + conversation history + existing engine results as context
 * 5. Optional RAG: embed LHDN docs → vector search → inject into prompt
 */

// Pattern matchers for common tax questions
const patterns = {
  personalTax: /(?:personal|income|gaji|pendapatan|个人|所得税|salary)\s*(?:tax|cukai|税)/i,
  personalCalc: /(?:how much|berapa|多少).*(?:tax|cukai|税).*(?:rm|salary|gaji|月薪|收入)\s*(\d[\d,]*)/i,
  salaryCalc: /(?:rm|salary|gaji|月薪)\s*(\d[\d,]*).*(?:tax|cukai|税)/i,
  corporateTax: /(?:corporate|company|syarikat|企业|公司)\s*(?:tax|cukai|税)/i,
  smeRate: /(?:sme|smb|中小企业|pkb)/i,
  epf: /(?:epf|kwsp|公积金)/i,
  socso: /(?:socso|perkeso|社险)/i,
  eis: /(?:eis|sip|就业保险)/i,
  sst: /(?:sst|sales.*service.*tax|销售.*服务税)/i,
  pcb: /(?:pcb|potongan.*cukai|预扣税|monthly.*tax.*deduct)/i,
  relief: /(?:relief|pelepasan|减免|tax.*deduct)/i,
  threshold: /(?:threshold|ambang|门槛|registration)/i,
  greeting: /^(?:hi|hello|hey|你好|嗨|hai|apa khabar)/i,
  thanks: /(?:thanks|thank|terima kasih|谢谢|谢)/i,
};

function extractNumber(text: string): number | null {
  const match = text.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ""));
  }
  return null;
}

export function getTaxAssistantResponse(
  message: string,
  locale: string = "en"
): string {
  const msg = message.toLowerCase().trim();

  // Greeting
  if (patterns.greeting.test(msg)) {
    return locale === "zh"
      ? "你好！我是 MYTax 税务助手。你可以问我关于马来西亚税务的任何问题，比如：\n\n- \"月薪 RM5000 要交多少税？\"\n- \"企业税率是多少？\"\n- \"EPF 雇主要交多少？\"\n- \"SST 注册门槛是多少？\"\n\n请问有什么可以帮你的？"
      : locale === "ms"
        ? "Hai! Saya pembantu cukai MYTax. Anda boleh tanya saya tentang cukai Malaysia, contohnya:\n\n- \"Berapa cukai untuk gaji RM5000?\"\n- \"Apakah kadar cukai korporat?\"\n- \"Berapa caruman EPF majikan?\"\n- \"Berapakah ambang pendaftaran SST?\"\n\nApa yang boleh saya bantu?"
        : "Hi! I'm the MYTax tax assistant. You can ask me about Malaysia taxes, for example:\n\n- \"How much tax for RM5000 salary?\"\n- \"What is the corporate tax rate?\"\n- \"How much EPF does employer pay?\"\n- \"What is the SST registration threshold?\"\n\nHow can I help you?";
  }

  // Thanks
  if (patterns.thanks.test(msg)) {
    return locale === "zh"
      ? "不客气！如有其他税务问题随时问我。"
      : locale === "ms"
        ? "Sama-sama! Tanya saya jika ada soalan cukai lain."
        : "You're welcome! Feel free to ask if you have more tax questions.";
  }

  // Salary-based tax calculation
  const salaryMatch = msg.match(/(?:rm|salary|gaji|月薪|收入)\s*(\d[\d,]*)/i) ||
    msg.match(/(\d[\d,]*)\s*(?:rm|salary|gaji|月薪)/i);
  if (salaryMatch && (patterns.personalTax.test(msg) || patterns.personalCalc.test(msg) || patterns.salaryCalc.test(msg) || /tax|cukai|税/.test(msg))) {
    const salary = parseFloat(salaryMatch[1].replace(/,/g, ""));
    const annual = salary <= 20000 ? salary * 12 : salary; // assume monthly if under 20k
    const monthly = salary <= 20000 ? salary : salary / 12;

    const result = calculatePersonalTax({
      yearOfAssessment: 2025,
      income: { employment: annual, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [
        { reliefId: "individual", amount: 9000 },
        { reliefId: "epf_employee", amount: Math.min(annual * 0.11, 4000) },
        { reliefId: "socso_eis", amount: 350 },
      ],
      maritalStatus: "single",
      spouseHasIncome: false,
      zakatAmount: 0,
      monthlyPcbPaid: 0,
    });

    const fmt = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (locale === "zh") {
      return `月薪 ${fmt(monthly)} 的税务估算（YA2025，单身）：\n\n` +
        `- 年收入: ${fmt(annual)}\n` +
        `- 总减免: ${fmt(result.totalReliefs)}\n` +
        `- 应税收入: ${fmt(result.chargeableIncome)}\n` +
        `- **年度应缴税额: ${fmt(result.taxAfterRebateAndZakat)}**\n` +
        `- 约每月: ${fmt(result.taxAfterRebateAndZakat / 12)}\n\n` +
        `💡 这是基本估算（个人减免 + EPF + SOCSO）。实际税额可能因其他减免项而更低。\n\n` +
        `前往 [个人税计算器](/) 进行完整计算。`;
    }
    return `Tax estimate for ${fmt(monthly)}/month salary (YA2025, single):\n\n` +
      `- Annual income: ${fmt(annual)}\n` +
      `- Total reliefs: ${fmt(result.totalReliefs)}\n` +
      `- Chargeable income: ${fmt(result.chargeableIncome)}\n` +
      `- **Annual tax payable: ${fmt(result.taxAfterRebateAndZakat)}**\n` +
      `- Approx. monthly: ${fmt(result.taxAfterRebateAndZakat / 12)}\n\n` +
      `This is a basic estimate (individual + EPF + SOCSO reliefs). Actual tax may be lower with additional reliefs.\n\n` +
      `Use the [Personal Tax Calculator](/) for a full calculation.`;
  }

  // Corporate tax
  if (patterns.corporateTax.test(msg) || patterns.smeRate.test(msg)) {
    if (locale === "zh") {
      return "马来西亚企业所得税率（YA2025）：\n\n" +
        "**中小企业（SME）优惠税率：**\n" +
        "- 首 RM150,000: **15%**\n" +
        "- RM150,001 – RM600,000: **17%**\n" +
        "- 超过 RM600,000: **24%**\n\n" +
        "**SME 资格条件：**\n" +
        "- 实缴资本 ≤ RM250万\n" +
        "- 年营收 < RM5000万\n\n" +
        "**标准税率：** 全部收入 24%\n\n" +
        "前往 [企业税计算器](/corporate) 进行详细计算。";
    }
    return "Malaysia Corporate Tax Rates (YA2025):\n\n" +
      "**SME Preferential Rates:**\n" +
      "- First RM150,000: **15%**\n" +
      "- RM150,001 – RM600,000: **17%**\n" +
      "- Above RM600,000: **24%**\n\n" +
      "**SME Eligibility:**\n" +
      "- Paid-up capital ≤ RM2.5M\n" +
      "- Annual revenue < RM50M\n\n" +
      "**Standard Rate:** 24% on all income\n\n" +
      "Use the [Corporate Tax Calculator](/corporate) for detailed calculation.";
  }

  // EPF
  if (patterns.epf.test(msg)) {
    const num = extractNumber(msg);
    if (num && num > 0) {
      const contrib = calculateEmployerContributions({
        monthlyGrossSalary: num,
        employeeAge: "below60",
        isMalaysianOrPR: true,
      });
      const fmt = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
      if (locale === "zh") {
        return `月薪 ${fmt(num)} 的 EPF 缴纳：\n\n` +
          `- 雇主: ${fmt(contrib.epfEmployer)} (${num <= 5000 ? "13%" : "12%"})\n` +
          `- 员工: ${fmt(contrib.epfEmployee)} (11%)\n\n` +
          `前往 [雇主缴纳计算器](/employer) 查看完整 EPF/SOCSO/EIS 明细。`;
      }
      return `EPF for ${fmt(num)}/month salary:\n\n` +
        `- Employer: ${fmt(contrib.epfEmployer)} (${num <= 5000 ? "13%" : "12%"})\n` +
        `- Employee: ${fmt(contrib.epfEmployee)} (11%)\n\n` +
        `Use the [Employer Calculator](/employer) for full EPF/SOCSO/EIS breakdown.`;
    }
    if (locale === "zh") {
      return "EPF (公积金 KWSP) 费率：\n\n" +
        "**雇主缴纳：**\n- 月薪 ≤ RM5,000: 13%\n- 月薪 > RM5,000: 12%\n- 上限: RM20,000/月\n\n" +
        "**员工缴纳：** 11%\n\n" +
        "60-65岁: 雇主 4%, 员工自愿\n65岁以上: 豁免\n\n" +
        "前往 [雇主缴纳计算器](/employer) 进行计算。";
    }
    return "EPF (KWSP) Rates:\n\n" +
      "**Employer:**\n- Salary ≤ RM5,000: 13%\n- Salary > RM5,000: 12%\n- Ceiling: RM20,000/month\n\n" +
      "**Employee:** 11%\n\n" +
      "Age 60-65: Employer 4%, Employee voluntary\nAbove 65: Exempt\n\n" +
      "Use the [Employer Calculator](/employer) to calculate.";
  }

  // SOCSO
  if (patterns.socso.test(msg)) {
    if (locale === "zh") {
      return "SOCSO (社险 PERKESO) 费率：\n\n" +
        "- 雇主: **1.75%**\n- 员工: **0.5%**\n- 上限: RM6,000/月\n\n" +
        "仅适用于60岁以下的马来西亚公民/PR。\n\n" +
        "前往 [雇主缴纳计算器](/employer) 进行计算。";
    }
    return "SOCSO (PERKESO) Rates:\n\n" +
      "- Employer: **1.75%**\n- Employee: **0.5%**\n- Wage ceiling: RM6,000/month\n\n" +
      "Applicable to employees below 60, Malaysian/PR only.\n\n" +
      "Use the [Employer Calculator](/employer) to calculate.";
  }

  // EIS
  if (patterns.eis.test(msg)) {
    if (locale === "zh") {
      return "EIS (就业保险 SIP) 费率：\n\n" +
        "- 雇主: **0.2%**\n- 员工: **0.2%**\n- 上限: RM6,000/月\n\n" +
        "仅适用于60岁以下的马来西亚公民/PR。";
    }
    return "EIS (SIP) Rates:\n\n" +
      "- Employer: **0.2%**\n- Employee: **0.2%**\n- Wage ceiling: RM6,000/month\n\n" +
      "Applicable to employees below 60, Malaysian/PR only.";
  }

  // SST
  if (patterns.sst.test(msg) || patterns.threshold.test(msg)) {
    if (locale === "zh") {
      return "SST (销售与服务税)：\n\n" +
        "**服务税:** 8%（餐饮、电信、保险、酒店等）\n" +
        "**销售税:** 5% 或 10%（制造品/进口商品）\n\n" +
        "**注册门槛:** 年营业额 ≥ RM500,000\n\n" +
        "低于门槛不需要注册和缴纳 SST。\n\n" +
        "前往 [SST 计算器](/sst) 进行计算。";
    }
    return "SST (Sales & Service Tax):\n\n" +
      "**Service Tax:** 8% (F&B, telecoms, insurance, hotels, etc.)\n" +
      "**Sales Tax:** 5% or 10% (manufactured/imported goods)\n\n" +
      "**Registration Threshold:** Annual turnover ≥ RM500,000\n\n" +
      "Below threshold — no registration or SST obligation.\n\n" +
      "Use the [SST Calculator](/sst) to calculate.";
  }

  // PCB
  if (patterns.pcb.test(msg)) {
    if (locale === "zh") {
      return "PCB（Potongan Cukai Bulanan / 每月预扣税）：\n\n" +
        "- 雇主每月从薪资中扣除的预缴税款\n" +
        "- 年终与实际税额对比 → 多退少补\n" +
        "- PCB 金额取决于薪资、婚姻状况和子女数量\n\n" +
        "前往 [批量 PCB 计算器](/batch-pcb) 进行批量计算。";
    }
    return "PCB (Monthly Tax Deduction):\n\n" +
      "- Monthly amount deducted by employer from salary as advance tax\n" +
      "- At year-end, compared with actual tax — refund or top-up\n" +
      "- Amount depends on salary, marital status, and number of children\n\n" +
      "Use the [Batch PCB Calculator](/batch-pcb) for multiple employees.";
  }

  // Tax reliefs
  if (patterns.relief.test(msg)) {
    if (locale === "zh") {
      return "马来西亚个人税务减免（YA2025 重点项目）：\n\n" +
        "- 个人减免: RM9,000（自动）\n" +
        "- 配偶减免: RM4,000\n" +
        "- 子女（18岁以下）: RM2,000/位\n" +
        "- 子女（18+ 在学）: RM8,000/位\n" +
        "- EPF 员工: 最高 RM4,000\n" +
        "- 人寿保险: 最高 RM3,000\n" +
        "- 教育（本人）: 最高 RM7,000\n" +
        "- 生活方式: 最高 RM2,500\n" +
        "- 父母医疗: 最高 RM8,000\n\n" +
        "共 29 项减免。前往 [个人税计算器](/) 查看完整列表。";
    }
    return "Malaysia Personal Tax Reliefs (YA2025 highlights):\n\n" +
      "- Individual: RM9,000 (automatic)\n" +
      "- Spouse: RM4,000\n" +
      "- Child (under 18): RM2,000 each\n" +
      "- Child (18+ studying): RM8,000 each\n" +
      "- EPF employee: up to RM4,000\n" +
      "- Life insurance: up to RM3,000\n" +
      "- Education (self): up to RM7,000\n" +
      "- Lifestyle: up to RM2,500\n" +
      "- Parents medical: up to RM8,000\n\n" +
      "29 reliefs in total. Use the [Personal Tax Calculator](/) for the full list.";
  }

  // Default fallback
  if (locale === "zh") {
    return "抱歉，我还不太理解你的问题。你可以试试问我：\n\n" +
      "- 💰 \"月薪 RM5000 要交多少税？\"\n" +
      "- 🏢 \"企业税率是多少？\"\n" +
      "- 📋 \"EPF 雇主要交多少？\"\n" +
      "- 🧾 \"SST 注册门槛是多少？\"\n" +
      "- 📑 \"有哪些税务减免？\"\n" +
      "- 💵 \"PCB 是什么？\"";
  }
  return "I'm not sure I understand. Try asking me about:\n\n" +
    "- \"How much tax for RM5000 salary?\"\n" +
    "- \"What is the corporate tax rate?\"\n" +
    "- \"How much EPF does employer pay?\"\n" +
    "- \"What is the SST threshold?\"\n" +
    "- \"What tax reliefs are available?\"\n" +
    "- \"What is PCB?\"";
}
