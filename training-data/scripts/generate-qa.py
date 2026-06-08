"""
Auto-generate training Q&A pairs from tax calculation logic.
Covers: personal tax, corporate tax, EPF/SOCSO/EIS, SST.
Output: JSONL files in qa-pairs/ directory.
"""
import json
import os
import math
import random

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "qa-pairs")
os.makedirs(OUT_DIR, exist_ok=True)

# ============================================================
# Tax calculation functions (mirror TypeScript engine logic)
# ============================================================

TAX_BANDS = [
    (0, 5000, 0.00),
    (5000, 20000, 0.01),
    (20000, 35000, 0.03),
    (35000, 50000, 0.06),
    (50000, 70000, 0.11),
    (70000, 100000, 0.19),
    (100000, 400000, 0.25),
    (400000, 600000, 0.26),
    (600000, 2000000, 0.28),
    (2000000, float('inf'), 0.30),
]

CORP_SME_BANDS = [
    (0, 150000, 0.15),
    (150000, 600000, 0.17),
    (600000, float('inf'), 0.24),
]

def calc_personal_tax(annual_income, reliefs):
    chargeable = max(0, annual_income - reliefs)
    tax = 0
    remaining = chargeable
    bands_detail = []
    for (lo, hi, rate) in TAX_BANDS:
        if remaining <= 0:
            break
        width = hi - lo if hi != float('inf') else remaining
        taxable = min(remaining, width)
        t = round(taxable * rate, 2)
        bands_detail.append((lo, hi, rate, taxable, t))
        tax += t
        remaining -= taxable
    return chargeable, tax, bands_detail

def calc_corporate_tax(income, is_sme=True):
    if not is_sme:
        return income * 0.24, [(0, float('inf'), 0.24, income, income * 0.24)]
    tax = 0
    remaining = income
    detail = []
    for (lo, hi, rate) in CORP_SME_BANDS:
        if remaining <= 0:
            break
        width = hi - lo if hi != float('inf') else remaining
        taxable = min(remaining, width)
        t = round(taxable * rate, 2)
        detail.append((lo, hi, rate, taxable, t))
        tax += t
        remaining -= taxable
    return tax, detail

def calc_epf(salary, age="below60"):
    if age == "above65":
        return 0, 0
    ceiling = min(salary, 20000)
    if age == "60to65":
        return round(ceiling * 0.04, 2), 0  # employee voluntary
    employer_rate = 0.13 if salary <= 5000 else 0.12
    return round(ceiling * employer_rate, 2), round(ceiling * 0.11, 2)

def calc_socso(salary, age="below60", is_malaysian=True):
    if not is_malaysian or age == "above65":
        return 0, 0
    ceiling = min(salary, 6000)
    if age == "60to65":
        return round(ceiling * 0.0125, 2), 0
    return round(ceiling * 0.0175, 2), round(ceiling * 0.005, 2)

def calc_eis(salary, age="below60", is_malaysian=True):
    if not is_malaysian or age != "below60":
        return 0, 0
    ceiling = min(salary, 6000)
    return round(ceiling * 0.002, 2), round(ceiling * 0.002, 2)

def fmt(n):
    return f"RM {n:,.2f}"

# ============================================================
# Q&A generators
# ============================================================

def gen_personal_tax_qa():
    """Generate personal tax Q&A for various salary/status combos."""
    examples = []

    salaries = [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500,
                7000, 7500, 8000, 9000, 10000, 12000, 15000, 20000, 25000, 30000]
    statuses = [
        ("single", False, 0),
        ("married", False, 0),
        ("married", False, 1),
        ("married", False, 2),
        ("married", False, 3),
        ("married", True, 0),
    ]

    for salary in salaries:
        for (marital, spouse_income, children) in statuses:
            annual = salary * 12

            # Calculate reliefs
            individual_relief = 9000
            epf_relief = min(annual * 0.11, 4000)
            socso_relief = 350
            spouse_relief = 4000 if marital == "married" and not spouse_income else 0
            child_relief = children * 2000
            total_reliefs = individual_relief + epf_relief + socso_relief + spouse_relief + child_relief

            chargeable, tax_before, bands = calc_personal_tax(annual, total_reliefs)

            # Rebate
            rebate = 0
            if chargeable <= 35000:
                rebate = 400
                if marital == "married" and not spouse_income:
                    rebate += 400

            final_tax = max(0, tax_before - rebate)
            monthly_tax = round(final_tax / 12, 2)
            eff_rate = round(final_tax / annual * 100, 2) if annual > 0 else 0

            # Status description
            if marital == "single":
                status_en = "single, no children"
                status_zh = "单身"
                status_ms = "bujang"
            elif spouse_income:
                status_en = "married (spouse has income)"
                status_zh = "已婚（配偶有收入）"
                status_ms = "berkahwin (pasangan ada pendapatan)"
            elif children == 0:
                status_en = "married, no children"
                status_zh = "已婚无子女"
                status_ms = "berkahwin, tiada anak"
            else:
                status_en = f"married, {children} child{'ren' if children > 1 else ''}"
                status_zh = f"已婚，{children}个孩子"
                status_ms = f"berkahwin, {children} anak"

            # Band breakdown string
            def band_str(bands_list):
                lines = []
                for (lo, hi, rate, taxable, t) in bands_list:
                    if taxable <= 0:
                        continue
                    hi_str = fmt(hi) if hi != float('inf') else "above"
                    lines.append(f"- {fmt(lo)} - {hi_str}: {rate*100:.0f}% on {fmt(taxable)} = {fmt(t)}")
                return "\n".join(lines)

            # === English ===
            q_en = f"How much tax for RM{salary:,}/month salary? ({status_en})"
            a_en = (
                f"Tax estimate for {fmt(salary)}/month ({status_en}, YA2025):\n\n"
                f"Annual income: {fmt(annual)}\n"
                f"Total reliefs: {fmt(total_reliefs)}\n"
                f"Chargeable income: {fmt(chargeable)}\n\n"
                f"Tax breakdown:\n{band_str(bands)}\n\n"
                f"Tax before rebate: {fmt(tax_before)}\n"
            )
            if rebate > 0:
                a_en += f"Rebate: -{fmt(rebate)} (chargeable income <= RM35,000)\n"
            a_en += (
                f"\n**Annual tax payable: {fmt(final_tax)}**\n"
                f"Monthly: ~{fmt(monthly_tax)}\n"
                f"Effective rate: {eff_rate}%\n\n"
                f"This is a basic estimate with individual + EPF + SOCSO reliefs"
            )
            if spouse_relief > 0:
                a_en += " + spouse relief"
            if child_relief > 0:
                a_en += f" + child relief ({children})"
            a_en += ". Actual tax may be lower with additional reliefs.\n\nDisclaimer: For reference only. Consult LHDN for official assessment."

            examples.append({"messages": [
                {"role": "user", "content": q_en},
                {"role": "assistant", "content": a_en}
            ]})

            # === Chinese === (every 2nd salary)
            if salary % 2000 == 0 or salary in [3000, 5000, 7000, 9000, 15000, 25000]:
                q_zh = f"月薪 RM{salary:,}，{status_zh}，要交多少税？"
                a_zh = (
                    f"月薪 {fmt(salary)} 的税务估算（{status_zh}，YA2025）：\n\n"
                    f"年收入: {fmt(annual)}\n"
                    f"总减免: {fmt(total_reliefs)}\n"
                    f"应税收入: {fmt(chargeable)}\n\n"
                )
                if rebate > 0:
                    a_zh += f"回扣: -{fmt(rebate)}（应税收入 <= RM35,000）\n"
                a_zh += (
                    f"\n**年度应缴税额: {fmt(final_tax)}**\n"
                    f"约每月: {fmt(monthly_tax)}\n"
                    f"有效税率: {eff_rate}%\n\n"
                    f"这是基本估算。实际税额可能因其他减免项而更低。\n\n"
                    f"免责声明：仅供参考，请咨询 LHDN 获取正式评估。"
                )
                examples.append({"messages": [
                    {"role": "user", "content": q_zh},
                    {"role": "assistant", "content": a_zh}
                ]})

            # === Malay === (every 3rd salary)
            if salary % 3000 == 0 or salary in [4000, 5000, 7000, 10000, 20000]:
                q_ms = f"Berapa cukai untuk gaji RM{salary:,} sebulan? ({status_ms})"
                a_ms = (
                    f"Anggaran cukai untuk gaji {fmt(salary)}/bulan ({status_ms}, YA2025):\n\n"
                    f"Pendapatan tahunan: {fmt(annual)}\n"
                    f"Jumlah pelepasan: {fmt(total_reliefs)}\n"
                    f"Pendapatan bercukai: {fmt(chargeable)}\n\n"
                )
                if rebate > 0:
                    a_ms += f"Rebat: -{fmt(rebate)} (pendapatan bercukai <= RM35,000)\n"
                a_ms += (
                    f"\n**Cukai tahunan: {fmt(final_tax)}**\n"
                    f"~{fmt(monthly_tax)}/bulan\n"
                    f"Kadar berkesan: {eff_rate}%\n\n"
                    f"Ini anggaran asas. Cukai sebenar mungkin lebih rendah dengan pelepasan tambahan.\n\n"
                    f"Penafian: Untuk rujukan sahaja. Sila rujuk LHDN."
                )
                examples.append({"messages": [
                    {"role": "user", "content": q_ms},
                    {"role": "assistant", "content": a_ms}
                ]})

    return examples

def gen_corporate_tax_qa():
    """Generate corporate tax Q&A."""
    examples = []
    incomes = [100000, 200000, 300000, 500000, 750000, 1000000, 1500000, 2000000, 5000000]

    for income in incomes:
        sme_tax, sme_detail = calc_corporate_tax(income, True)
        std_tax, _ = calc_corporate_tax(income, False)
        sme_eff = round(sme_tax / income * 100, 2)
        std_eff = round(std_tax / income * 100, 2)
        savings = std_tax - sme_tax

        # English
        q = f"How much corporate tax on RM{income:,} profit? (SME vs standard)"
        a = f"Corporate tax on {fmt(income)} chargeable income (YA2025):\n\n"
        a += "**SME Rate:**\n"
        for (lo, hi, rate, taxable, t) in sme_detail:
            if taxable <= 0: continue
            hi_s = fmt(hi) if hi != float('inf') else "above"
            a += f"- {fmt(lo)}-{hi_s}: {rate*100:.0f}% on {fmt(taxable)} = {fmt(t)}\n"
        a += f"**SME Total: {fmt(sme_tax)}** (effective {sme_eff}%)\n\n"
        a += f"**Standard Rate:** {fmt(income)} x 24% = **{fmt(std_tax)}** ({std_eff}%)\n\n"
        a += f"**SME saves: {fmt(savings)}**\n\n"
        a += "Disclaimer: For reference only."
        examples.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})

        # Chinese (every other)
        if income in [100000, 300000, 750000, 1500000, 5000000]:
            q_zh = f"公司应税收入 RM{income:,}，SME 和标准税率各交多少税？"
            a_zh = f"应税收入 {fmt(income)} 的企业税比较（YA2025）：\n\n"
            a_zh += f"**SME 优惠税率：{fmt(sme_tax)}**（有效税率 {sme_eff}%）\n"
            a_zh += f"**标准税率 24%：{fmt(std_tax)}**（有效税率 {std_eff}%）\n\n"
            a_zh += f"SME 省下：{fmt(savings)}\n\n"
            a_zh += "免责声明：仅供参考。"
            examples.append({"messages": [{"role": "user", "content": q_zh}, {"role": "assistant", "content": a_zh}]})

    return examples

def gen_employer_qa():
    """Generate EPF/SOCSO/EIS Q&A for various salaries."""
    examples = []
    salaries = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000,
                7000, 8000, 10000, 12000, 15000, 20000, 25000]

    for salary in salaries:
        epf_er, epf_ee = calc_epf(salary)
        socso_er, socso_ee = calc_socso(salary)
        eis_er, eis_ee = calc_eis(salary)
        total_er = epf_er + socso_er + eis_er
        total_ee = epf_ee + socso_ee + eis_ee
        total_cost = salary + total_er
        take_home = salary - total_ee

        epf_rate = "13%" if salary <= 5000 else "12%"

        # English
        q = f"What are the employer statutory contributions for RM{salary:,} salary?"
        a = (
            f"Employer statutory contributions for {fmt(salary)}/month (YA2025, below 60, Malaysian):\n\n"
            f"| Item | Employer | Employee |\n|---|---|---|\n"
            f"| EPF ({epf_rate}) | {fmt(epf_er)} | {fmt(epf_ee)} |\n"
            f"| SOCSO (1.75%) | {fmt(socso_er)} | {fmt(socso_ee)} |\n"
            f"| EIS (0.2%) | {fmt(eis_er)} | {fmt(eis_ee)} |\n"
            f"| **Total** | **{fmt(total_er)}** | **{fmt(total_ee)}** |\n\n"
            f"Total employer cost: {fmt(salary)} + {fmt(total_er)} = **{fmt(total_cost)}**/month\n"
            f"Employee take-home: {fmt(salary)} - {fmt(total_ee)} = **{fmt(take_home)}**/month\n\n"
            f"Disclaimer: Approximate figures. Consult KWSP/PERKESO for exact amounts."
        )
        examples.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})

        # Chinese
        if salary in [2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000]:
            q_zh = f"月薪 RM{salary:,} 的雇主 EPF/SOCSO/EIS 要交多少？"
            a_zh = (
                f"月薪 {fmt(salary)} 的雇主法定缴纳（YA2025，60岁以下，马来西亚公民）：\n\n"
                f"| 项目 | 雇主 | 员工 |\n|---|---|---|\n"
                f"| EPF ({epf_rate}) | {fmt(epf_er)} | {fmt(epf_ee)} |\n"
                f"| SOCSO (1.75%) | {fmt(socso_er)} | {fmt(socso_ee)} |\n"
                f"| EIS (0.2%) | {fmt(eis_er)} | {fmt(eis_ee)} |\n"
                f"| **合计** | **{fmt(total_er)}** | **{fmt(total_ee)}** |\n\n"
                f"雇主总成本: {fmt(total_cost)}/月\n"
                f"员工到手: {fmt(take_home)}/月\n\n"
                f"免责声明：仅供参考。"
            )
            examples.append({"messages": [{"role": "user", "content": q_zh}, {"role": "assistant", "content": a_zh}]})

        # Malay
        if salary in [2500, 3500, 5000, 7000, 10000, 12000, 25000]:
            q_ms = f"Berapakah caruman majikan untuk gaji RM{salary:,}?"
            a_ms = (
                f"Caruman berkanun majikan untuk gaji {fmt(salary)}/bulan (YA2025, bawah 60, warganegara):\n\n"
                f"| Item | Majikan | Pekerja |\n|---|---|---|\n"
                f"| KWSP ({epf_rate}) | {fmt(epf_er)} | {fmt(epf_ee)} |\n"
                f"| PERKESO (1.75%) | {fmt(socso_er)} | {fmt(socso_ee)} |\n"
                f"| SIP (0.2%) | {fmt(eis_er)} | {fmt(eis_ee)} |\n"
                f"| **Jumlah** | **{fmt(total_er)}** | **{fmt(total_ee)}** |\n\n"
                f"Jumlah kos majikan: {fmt(total_cost)}/bulan\n"
                f"Bawa pulang pekerja: {fmt(take_home)}/bulan\n\n"
                f"Penafian: Anggaran sahaja."
            )
            examples.append({"messages": [{"role": "user", "content": q_ms}, {"role": "assistant", "content": a_ms}]})

    return examples

def gen_sst_qa():
    """Generate SST Q&A."""
    examples = []
    turnovers = [300000, 500000, 600000, 800000, 1000000, 2000000, 5000000]

    for turnover in turnovers:
        needs_reg = turnover >= 500000
        service_tax = turnover * 0.08 if needs_reg else 0
        sales_tax_5 = turnover * 0.05 if needs_reg else 0
        sales_tax_10 = turnover * 0.10 if needs_reg else 0

        # English - service tax
        q = f"How much SST (service tax) for RM{turnover:,} annual turnover?"
        if needs_reg:
            a = (
                f"SST Service Tax for {fmt(turnover)} annual turnover (YA2025):\n\n"
                f"Registration threshold: RM500,000 — **registration required**\n\n"
                f"Service tax rate: 8%\n"
                f"Estimated annual SST: {fmt(turnover)} x 8% = **{fmt(service_tax)}**\n"
                f"Estimated monthly: ~{fmt(service_tax / 12)}\n\n"
                f"Disclaimer: Simplified estimate. Actual SST depends on specific services. Consult RMCD."
            )
        else:
            a = (
                f"SST for {fmt(turnover)} annual turnover:\n\n"
                f"Registration threshold: RM500,000\n"
                f"Your turnover: {fmt(turnover)} — **below threshold**\n\n"
                f"**No SST registration or payment required.**\n\n"
                f"Note: You must register within 28 days if your turnover exceeds RM500,000.\n\n"
                f"Disclaimer: Consult RMCD for official guidance."
            )
        examples.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})

        # Chinese
        if turnover in [300000, 500000, 1000000, 5000000]:
            q_zh = f"年营业额 RM{turnover:,}，需要注册 SST 吗？要交多少？"
            if needs_reg:
                a_zh = (
                    f"年营业额 {fmt(turnover)} 的 SST 义务：\n\n"
                    f"注册门槛: RM500,000 — **需要注册**\n\n"
                    f"服务税 8%: {fmt(service_tax)}/年\n"
                    f"销售税 5%: {fmt(sales_tax_5)}/年\n"
                    f"销售税 10%: {fmt(sales_tax_10)}/年\n\n"
                    f"具体税率取决于你的业务类型。\n\n免责声明：仅供参考。"
                )
            else:
                a_zh = (
                    f"年营业额 {fmt(turnover)}：\n\n"
                    f"注册门槛: RM500,000\n"
                    f"你的营业额低于门槛 — **不需要注册 SST**\n\n"
                    f"注意：营业额超过 RM500,000 后必须在 28 天内注册。\n\n免责声明：仅供参考。"
                )
            examples.append({"messages": [{"role": "user", "content": q_zh}, {"role": "assistant", "content": a_zh}]})

    return examples

def gen_knowledge_qa():
    """Generate knowledge-based Q&A (not calculation)."""
    examples = []

    qa_pairs = [
        # Common misconceptions
        ("Is GST still applicable in Malaysia?",
         "No, GST (Goods & Services Tax) was **abolished on 1 September 2018** and replaced by SST (Sales & Service Tax).\n\n**Key differences:**\n- GST: 6% broad-based, multi-stage tax with input credit\n- SST: Sales tax (5%/10%) + Service tax (8%), single-stage, NO input credit\n\nSST has a RM500,000 registration threshold. Businesses below this don't need to register.\n\nDisclaimer: For reference only."),

        ("GST 还在吗？",
         "**不在了。** GST（消费税）已于 2018 年 9 月 1 日废除，取而代之的是 SST（销售与服务税）。\n\n**主要区别：**\n- GST: 6%，多阶段征收，有进项税抵扣\n- SST: 销售税 5%/10% + 服务税 8%，单阶段征收，没有进项税抵扣\n\n免责声明：仅供参考。"),

        ("Adakah GST masih terpakai di Malaysia?",
         "**Tidak.** GST telah dimansuhkan pada 1 September 2018 dan digantikan dengan SST.\n\n**Perbezaan utama:**\n- GST: 6%, cukai pelbagai peringkat, ada kredit cukai input\n- SST: Cukai Jualan (5%/10%) + Cukai Perkhidmatan (8%), peringkat tunggal, TIADA kredit input\n\nPenafian: Untuk rujukan sahaja."),

        # TP1 form
        ("What is the TP1 form?",
         "**TP1 (Tax Claim Form)** is a form employees submit to their employer to declare additional tax reliefs and deductions.\n\n**Purpose:** Reduce monthly PCB deduction so you don't overpay tax\n\n**What to declare:**\n- Spouse relief (RM4,000)\n- Child relief (RM2,000-RM8,000 per child)\n- Insurance premiums\n- Medical expenses\n- Education fees\n- Lifestyle purchases\n- SSPN savings\n\n**When to submit:** Beginning of the year or when circumstances change\n\n**Result:** Your employer will calculate a lower PCB, meaning higher take-home pay each month.\n\nDisclaimer: For reference only. Consult LHDN."),

        ("什么是 TP1 表格？",
         "**TP1 表格**是员工提交给雇主的税务减免申报表。\n\n**目的：** 减少每月 PCB 扣税额，避免多缴税\n\n**可以申报的减免：**\n- 配偶减免: RM4,000\n- 子女减免: RM2,000-RM8,000/位\n- 保险费用\n- 医疗费用\n- 教育费用\n- 生活方式消费\n- SSPN 储蓄\n\n**提交时间：** 年初或情况变更时\n\n**效果：** 雇主会减少每月 PCB 扣除 → 到手薪资更高\n\n免责声明：仅供参考。"),

        # Tax filing
        ("When is the deadline to file income tax in Malaysia?",
         "Malaysia income tax filing deadlines (YA2025, filed in 2026):\n\n**Individuals (Form BE):**\n- e-Filing: **30 April 2026**\n- Manual filing: 30 April 2026\n\n**Business income (Form B):**\n- e-Filing: **30 June 2026**\n- Manual filing: 30 June 2026\n\n**Companies (Form C):**\n- Within 7 months from financial year end\n\n**Penalties for late filing:**\n- 20% increase on tax payable for first offence\n- 25% for second offence\n- Fine of RM200-RM20,000 or imprisonment up to 6 months\n\n**Tip:** File via e-Filing (ez.hasil.gov.my) for faster processing and potential refunds.\n\nDisclaimer: For reference only. Check LHDN for exact dates."),

        ("报税截止日期是什么时候？",
         "马来西亚报税截止日期（YA2025，在 2026 年提交）：\n\n**个人 (Form BE):**\n- 电子报税: **2026年4月30日**\n\n**有生意收入 (Form B):**\n- 电子报税: **2026年6月30日**\n\n**公司 (Form C):**\n- 财年结束后 7 个月内\n\n**逾期处罚：**\n- 首次: 应缴税额加 20%\n- 第二次: 加 25%\n- 罚款 RM200-RM20,000 或监禁不超过 6 个月\n\n**建议：** 通过 e-Filing (ez.hasil.gov.my) 提交，处理速度更快。\n\n免责声明：仅供参考。"),

        # RPGT
        ("What is RPGT in Malaysia?",
         "**RPGT (Real Property Gains Tax)** is a tax on profit from selling property in Malaysia.\n\n**RPGT Rates (2025, Malaysian citizen):**\n| Disposal Period | Rate |\n|---|---|\n| Within 3 years | 30% |\n| 4th year | 20% |\n| 5th year | 15% |\n| 6th year onwards | 0% |\n\n**Non-citizen rates are higher** (30% for first 5 years, 10% from 6th year).\n\n**Exemptions:**\n- Once-in-a-lifetime exemption for one residential property\n- First RM10,000 of gain or 10% of gain (whichever is higher)\n- Transfer between spouses\n- Transfer to family company\n\n**Calculation:** RPGT = (Selling price - Purchase price - Allowable expenses) × Rate\n\nDisclaimer: For reference only. Consult a tax professional."),

        # Zakat
        ("Zakat 可以用来抵税吗？",
         "**可以！** Zakat（天课）可以直接从应缴税额中扣除。\n\n**重要规则：**\n- Zakat 从**税额**中扣除，不是从收入中扣除\n- 扣除上限 = 你的应缴税额（不能产生退税）\n- 必须通过认可的宗教机构缴纳\n- 保留正式收据作为证明\n\n**举例：**\n- 应缴税额: RM5,000\n- 已缴 Zakat: RM3,000\n- 实际需缴税: RM5,000 - RM3,000 = **RM2,000**\n\n**与 PCB 的关系：**\n- 如果你每月缴纳 Zakat，可以告知雇主在 PCB 中扣除\n- 这样每月 PCB 就会减少\n\nFitrah（开斋捐）也同样可以扣除。\n\n免责声明：仅供参考。"),

        # Tax residency
        ("How do I know if I'm a tax resident in Malaysia?",
         "You are a **tax resident** in Malaysia if you meet any of these conditions:\n\n**Primary test:**\n- Present in Malaysia for **182 days or more** in a calendar year\n\n**Extended tests:**\n- Present for less than 182 days but linked to a period of 182+ consecutive days spanning two years\n- Present for 90+ days AND was resident in 3 of the preceding 4 years\n- Resident in the following year AND was resident in 3 of the preceding 4 years\n\n**Why it matters:**\n| | Resident | Non-Resident |\n|---|---|---|\n| Tax rates | Progressive 0-30% | Flat 30% |\n| Tax reliefs | Yes (all 23 categories) | No |\n| Tax rebates | Yes (RM400/RM800) | No |\n\n**Impact:** A non-resident earning RM100,000 pays RM30,000 tax. A resident with same income might pay only ~RM5,600 after reliefs.\n\nDisclaimer: For reference only. Consult LHDN."),

        # BIK
        ("What is Benefits-in-Kind (BIK) and is it taxable?",
         "**Benefits-in-Kind (BIK)** are non-cash benefits provided by your employer. They are **taxable** in Malaysia.\n\n**Common BIK and prescribed values:**\n| Benefit | Annual Value |\n|---|---|\n| Company car (up to 2000cc) | RM3,600 |\n| Company car (2001-2500cc) | RM6,000 |\n| Driver provided | RM7,200 |\n| Furnished accommodation | 3% of gross salary |\n| Unfurnished accommodation | Lower of 30% of salary or actual value |\n| Gardener/servant | RM3,600 each |\n| Free petrol (no limit) | RM6,000 |\n| Free petrol (limit) | Actual value |\n\n**Exempt BIK (not taxable):**\n- Dental/medical benefits\n- Childcare at workplace\n- Food/drinks provided\n- Parking\n- Employer's own goods (up to RM1,000/year)\n- Staff discounts\n- Mobile phone (1 unit)\n- Broadband subscription\n\nDisclaimer: For reference only. Consult LHDN."),
    ]

    for q, a in qa_pairs:
        examples.append({"messages": [{"role": "user", "content": q}, {"role": "assistant", "content": a}]})

    return examples

# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    all_examples = []

    print("Generating personal tax Q&A...")
    personal = gen_personal_tax_qa()
    print(f"  -> {len(personal)} examples")
    all_examples.extend(personal)

    print("Generating corporate tax Q&A...")
    corporate = gen_corporate_tax_qa()
    print(f"  -> {len(corporate)} examples")
    all_examples.extend(corporate)

    print("Generating employer contributions Q&A...")
    employer = gen_employer_qa()
    print(f"  -> {len(employer)} examples")
    all_examples.extend(employer)

    print("Generating SST Q&A...")
    sst = gen_sst_qa()
    print(f"  -> {len(sst)} examples")
    all_examples.extend(sst)

    print("Generating knowledge Q&A...")
    knowledge = gen_knowledge_qa()
    print(f"  -> {len(knowledge)} examples")
    all_examples.extend(knowledge)

    # Write to separate file (auto-generated)
    out_path = os.path.join(OUT_DIR, "05-auto-generated.jsonl")
    with open(out_path, "w", encoding="utf-8") as fh:
        for ex in all_examples:
            fh.write(json.dumps(ex, ensure_ascii=False) + "\n")

    # Stats
    langs = {"en": 0, "zh": 0, "ms": 0}
    for ex in all_examples:
        msg = ex["messages"][0]["content"]
        if any(ord(c) > 0x4E00 for c in msg):
            langs["zh"] += 1
        elif any(w in msg.lower() for w in ["apakah", "berapa", "bagaimana", "cukai", "gaji", "berapakah", "adakah"]):
            langs["ms"] += 1
        else:
            langs["en"] += 1

    print(f"\nTotal auto-generated: {len(all_examples)}")
    print(f"  EN: {langs['en']}, ZH: {langs['zh']}, MS: {langs['ms']}")
    print(f"Written to: {out_path}")
