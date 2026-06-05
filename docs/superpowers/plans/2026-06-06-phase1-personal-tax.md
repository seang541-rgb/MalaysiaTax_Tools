# Phase 1: Personal Income Tax Calculator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free, trilingual (EN/ZH/MS) personal income tax calculator for Malaysia that lets users input income and reliefs, then see their tax breakdown with explanations — no login required.

**Architecture:** Next.js App Router with locale-based routing (`/en`, `/zh`, `/ms`). A standalone pure-TypeScript tax calculation engine under `src/engine/` handles all math. The UI calls the engine directly in the browser — no backend needed for Phase 1. Tax rates and relief data are hardcoded constants in the engine for now (database-driven in Phase 2+).

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, next-intl, Vitest

---

## File Structure

```
C:\Users\johns\MYTaxCalculator\
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx          # Root layout with locale provider
│   │   │   ├── page.tsx            # Homepage / calculator page
│   │   │   └── results/
│   │   │       └── page.tsx        # Results display page (client component)
│   │   ├── layout.tsx              # Root HTML layout
│   │   └── globals.css             # Tailwind global styles
│   ├── engine/
│   │   ├── types.ts                # All TypeScript interfaces for tax data
│   │   ├── tax-rates.ts            # YA2025 progressive rate bands constant
│   │   ├── tax-reliefs.ts          # YA2025 relief definitions constant
│   │   ├── personal.ts             # calculatePersonalTax() — the core function
│   │   └── pcb.ts                  # estimateMonthlyPCB() — monthly deduction estimate
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (button, input, card, etc.)
│   │   ├── income-form.tsx         # Income input form
│   │   ├── relief-selector.tsx     # Relief checkboxes with limits
│   │   ├── tax-result.tsx          # Tax breakdown display
│   │   ├── tax-explanation.tsx     # "What's taxable" explanation section
│   │   ├── locale-switcher.tsx     # EN/ZH/MS language switcher
│   │   └── header.tsx              # Site header with logo + locale switcher
│   ├── i18n/
│   │   ├── request.ts              # next-intl getRequestConfig
│   │   ├── routing.ts              # Locale routing config
│   │   └── navigation.ts           # Localized navigation helpers
│   ├── messages/
│   │   ├── en.json                 # English translations
│   │   ├── zh.json                 # Chinese translations
│   │   └── ms.json                 # Malay translations
│   └── lib/
│       └── utils.ts                # cn() helper for Tailwind
├── tests/
│   ├── engine/
│   │   ├── personal.test.ts        # Tax calculation tests
│   │   └── pcb.test.ts             # PCB estimation tests
│   └── components/
│       └── income-form.test.ts     # Form validation tests
├── next.config.ts                  # Next.js config with next-intl plugin
├── middleware.ts                   # next-intl locale detection middleware
├── tailwind.config.ts              # Tailwind config
├── tsconfig.json
├── package.json
├── vitest.config.ts
└── .gitignore
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/globals.css`, `src/lib/utils.ts`, `vitest.config.ts`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd C:\Users\johns\MYTaxCalculator
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. This creates the Next.js project with TypeScript, Tailwind, ESLint, App Router, and `src/` directory.

- [ ] **Step 2: Install additional dependencies**

```bash
cd C:\Users\johns\MYTaxCalculator
npm install next-intl
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add test script to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create `src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Install the deps:

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 6: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

Accept defaults (New York style, zinc color, CSS variables).

- [ ] **Step 7: Add shadcn components we'll need**

```bash
npx shadcn@latest add button card input label select checkbox separator tabs
```

- [ ] **Step 8: Verify project runs**

```bash
npm run dev
```

Open `http://localhost:3000` and confirm the default Next.js page loads. Stop the dev server.

- [ ] **Step 9: Initialize git and commit**

```bash
cd C:\Users\johns\MYTaxCalculator
git init
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind, shadcn/ui, next-intl, vitest"
```

---

### Task 2: Tax Engine — Types and Rate Data

**Files:**
- Create: `src/engine/types.ts`, `src/engine/tax-rates.ts`, `src/engine/tax-reliefs.ts`
- Test: `tests/engine/personal.test.ts` (partial — data validation only)

- [ ] **Step 1: Write type definitions**

Create `src/engine/types.ts`:

```typescript
export interface TaxBand {
  min: number;
  max: number;
  rate: number;
}

export interface TaxBandResult {
  band: TaxBand;
  taxableInBand: number;
  taxForBand: number;
}

export interface ReliefDefinition {
  id: string;
  maxAmount: number;
  category: "personal" | "family" | "medical" | "education" | "lifestyle" | "contribution" | "housing";
}

export interface ReliefClaim {
  reliefId: string;
  amount: number;
}

export interface IncomeInput {
  employment: number;
  commission: number;
  rental: number;
  interest: number;
  dividend: number;
  other: number;
}

export interface TaxCalculationInput {
  yearOfAssessment: number;
  income: IncomeInput;
  reliefs: ReliefClaim[];
  maritalStatus: "single" | "married";
  spouseHasIncome: boolean;
  zakatAmount: number;
  monthlyPcbPaid: number;
}

export interface TaxCalculationResult {
  grossIncome: number;
  totalReliefs: number;
  chargeableIncome: number;
  bandBreakdown: TaxBandResult[];
  taxBeforeRebate: number;
  rebateAmount: number;
  zakatDeduction: number;
  taxAfterRebateAndZakat: number;
  totalPcbPaid: number;
  balanceTaxPayable: number;
}

export interface PcbEstimate {
  monthlyPcb: number;
  annualPcb: number;
  annualTax: number;
  difference: number;
}
```

- [ ] **Step 2: Write YA2025 tax rate bands**

Create `src/engine/tax-rates.ts`:

```typescript
import { TaxBand } from "./types";

export const TAX_RATES_YA2025: TaxBand[] = [
  { min: 0, max: 5000, rate: 0 },
  { min: 5001, max: 20000, rate: 0.01 },
  { min: 20001, max: 35000, rate: 0.03 },
  { min: 35001, max: 50000, rate: 0.06 },
  { min: 50001, max: 70000, rate: 0.11 },
  { min: 70001, max: 100000, rate: 0.19 },
  { min: 100001, max: 400000, rate: 0.25 },
  { min: 400001, max: 600000, rate: 0.26 },
  { min: 600001, max: 2000000, rate: 0.28 },
  { min: 2000001, max: Infinity, rate: 0.30 },
];

export function getTaxRates(yearOfAssessment: number): TaxBand[] {
  if (yearOfAssessment === 2025) {
    return TAX_RATES_YA2025;
  }
  return TAX_RATES_YA2025;
}
```

- [ ] **Step 3: Write YA2025 relief definitions**

Create `src/engine/tax-reliefs.ts`:

```typescript
import { ReliefDefinition } from "./types";

export const TAX_RELIEFS_YA2025: ReliefDefinition[] = [
  { id: "individual", maxAmount: 9000, category: "personal" },
  { id: "disabled_individual", maxAmount: 6000, category: "personal" },
  { id: "spouse", maxAmount: 4000, category: "family" },
  { id: "disabled_spouse", maxAmount: 5000, category: "family" },
  { id: "child_under_18", maxAmount: 2000, category: "family" },
  { id: "child_18_plus_studying", maxAmount: 8000, category: "family" },
  { id: "disabled_child", maxAmount: 6000, category: "family" },
  { id: "disabled_child_studying", maxAmount: 14000, category: "family" },
  { id: "medical_serious_disease", maxAmount: 10000, category: "medical" },
  { id: "medical_fertility", maxAmount: 10000, category: "medical" },
  { id: "medical_examination", maxAmount: 1000, category: "medical" },
  { id: "medical_vaccination", maxAmount: 1000, category: "medical" },
  { id: "dental_examination", maxAmount: 1000, category: "medical" },
  { id: "mental_health", maxAmount: 1000, category: "medical" },
  { id: "education_self", maxAmount: 7000, category: "education" },
  { id: "upskilling", maxAmount: 2000, category: "education" },
  { id: "lifestyle", maxAmount: 2500, category: "lifestyle" },
  { id: "lifestyle_sports", maxAmount: 1000, category: "lifestyle" },
  { id: "ev_charging", maxAmount: 2500, category: "lifestyle" },
  { id: "epf_employee", maxAmount: 4000, category: "contribution" },
  { id: "life_insurance", maxAmount: 3000, category: "contribution" },
  { id: "education_medical_insurance", maxAmount: 3000, category: "contribution" },
  { id: "socso_eis", maxAmount: 350, category: "contribution" },
  { id: "prs_annuity", maxAmount: 3000, category: "contribution" },
  { id: "sspn", maxAmount: 8000, category: "contribution" },
  { id: "housing_loan_interest", maxAmount: 7000, category: "housing" },
  { id: "childcare_fees", maxAmount: 3000, category: "family" },
  { id: "breastfeeding_equipment", maxAmount: 1000, category: "family" },
  { id: "parents_medical", maxAmount: 8000, category: "medical" },
];

export function getReliefDefinitions(yearOfAssessment: number): ReliefDefinition[] {
  if (yearOfAssessment === 2025) {
    return TAX_RELIEFS_YA2025;
  }
  return TAX_RELIEFS_YA2025;
}
```

- [ ] **Step 4: Write a test to validate rate data integrity**

Create `tests/engine/personal.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TAX_RATES_YA2025 } from "@/engine/tax-rates";
import { TAX_RELIEFS_YA2025 } from "@/engine/tax-reliefs";

describe("Tax rate data integrity", () => {
  it("has 10 progressive bands", () => {
    expect(TAX_RATES_YA2025).toHaveLength(10);
  });

  it("bands are contiguous with no gaps", () => {
    for (let i = 1; i < TAX_RATES_YA2025.length; i++) {
      expect(TAX_RATES_YA2025[i].min).toBe(TAX_RATES_YA2025[i - 1].max + 1);
    }
  });

  it("starts at 0 and ends at Infinity", () => {
    expect(TAX_RATES_YA2025[0].min).toBe(0);
    expect(TAX_RATES_YA2025[TAX_RATES_YA2025.length - 1].max).toBe(Infinity);
  });

  it("rates are non-decreasing", () => {
    for (let i = 1; i < TAX_RATES_YA2025.length; i++) {
      expect(TAX_RATES_YA2025[i].rate).toBeGreaterThanOrEqual(
        TAX_RATES_YA2025[i - 1].rate
      );
    }
  });
});

describe("Relief data integrity", () => {
  it("all reliefs have unique ids", () => {
    const ids = TAX_RELIEFS_YA2025.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all reliefs have positive maxAmount", () => {
    for (const relief of TAX_RELIEFS_YA2025) {
      expect(relief.maxAmount).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/engine/personal.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/tax-rates.ts src/engine/tax-reliefs.ts tests/engine/personal.test.ts
git commit -m "feat: add tax engine types, YA2025 rate bands, and relief definitions"
```

---

### Task 3: Tax Engine — Personal Tax Calculation

**Files:**
- Create: `src/engine/personal.ts`
- Modify: `tests/engine/personal.test.ts`

- [ ] **Step 1: Write failing tests for calculatePersonalTax**

Append to `tests/engine/personal.test.ts`:

```typescript
import { calculatePersonalTax } from "@/engine/personal";
import { TaxCalculationInput } from "@/engine/types";

function makeInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
  return {
    yearOfAssessment: 2025,
    income: {
      employment: 0,
      commission: 0,
      rental: 0,
      interest: 0,
      dividend: 0,
      other: 0,
    },
    reliefs: [],
    maritalStatus: "single",
    spouseHasIncome: false,
    zakatAmount: 0,
    monthlyPcbPaid: 0,
    ...overrides,
  };
}

describe("calculatePersonalTax", () => {
  it("returns zero tax for zero income", () => {
    const result = calculatePersonalTax(makeInput());
    expect(result.grossIncome).toBe(0);
    expect(result.taxAfterRebateAndZakat).toBe(0);
  });

  it("calculates correct tax for RM48,000 employment income (single, individual relief only)", () => {
    const input = makeInput({
      income: { employment: 48000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.grossIncome).toBe(48000);
    expect(result.totalReliefs).toBe(9000);
    expect(result.chargeableIncome).toBe(39000);
    // First 5000 = 0, next 15000 = 150, next 15000 = 450, next 4000 = 240
    expect(result.taxBeforeRebate).toBe(840);
  });

  it("calculates correct tax for RM100,000 employment income", () => {
    const input = makeInput({
      income: { employment: 100000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.chargeableIncome).toBe(91000);
    // First 5000=0, 15000=150, 15000=450, 15000=900, 20000=2200, 21000=3990
    expect(result.taxBeforeRebate).toBe(7690);
  });

  it("applies RM400 rebate when chargeable income <= RM35,000", () => {
    const input = makeInput({
      income: { employment: 40000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.chargeableIncome).toBe(31000);
    // First 5000=0, 15000=150, 11000=330 => total 480
    expect(result.taxBeforeRebate).toBe(480);
    expect(result.rebateAmount).toBe(400);
    expect(result.taxAfterRebateAndZakat).toBe(80);
  });

  it("does not apply rebate when chargeable income > RM35,000", () => {
    const input = makeInput({
      income: { employment: 60000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.chargeableIncome).toBe(51000);
    expect(result.rebateAmount).toBe(0);
  });

  it("deducts zakat from tax", () => {
    const input = makeInput({
      income: { employment: 100000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
      zakatAmount: 1000,
    });
    const result = calculatePersonalTax(input);
    expect(result.zakatDeduction).toBe(1000);
    expect(result.taxAfterRebateAndZakat).toBe(result.taxBeforeRebate - 1000);
  });

  it("zakat deduction cannot exceed tax payable", () => {
    const input = makeInput({
      income: { employment: 40000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
      zakatAmount: 9999,
    });
    const result = calculatePersonalTax(input);
    expect(result.taxAfterRebateAndZakat).toBe(0);
  });

  it("caps relief claims at maxAmount", () => {
    const input = makeInput({
      income: { employment: 100000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [
        { reliefId: "individual", amount: 99999 },
      ],
    });
    const result = calculatePersonalTax(input);
    expect(result.totalReliefs).toBe(9000);
  });

  it("calculates balance with PCB paid", () => {
    const input = makeInput({
      income: { employment: 100000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
      monthlyPcbPaid: 500,
    });
    const result = calculatePersonalTax(input);
    expect(result.totalPcbPaid).toBe(6000);
    expect(result.balanceTaxPayable).toBe(result.taxAfterRebateAndZakat - 6000);
  });

  it("sums multiple income sources", () => {
    const input = makeInput({
      income: { employment: 50000, commission: 10000, rental: 5000, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.grossIncome).toBe(65000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/engine/personal.test.ts
```

Expected: FAIL — `calculatePersonalTax` is not defined.

- [ ] **Step 3: Implement calculatePersonalTax**

Create `src/engine/personal.ts`:

```typescript
import {
  TaxCalculationInput,
  TaxCalculationResult,
  TaxBandResult,
  ReliefClaim,
} from "./types";
import { getTaxRates } from "./tax-rates";
import { getReliefDefinitions } from "./tax-reliefs";

function sumIncome(input: TaxCalculationInput): number {
  const i = input.income;
  return i.employment + i.commission + i.rental + i.interest + i.dividend + i.other;
}

function calculateReliefs(
  claims: ReliefClaim[],
  yearOfAssessment: number
): number {
  const definitions = getReliefDefinitions(yearOfAssessment);
  let total = 0;
  for (const claim of claims) {
    const def = definitions.find((d) => d.id === claim.reliefId);
    if (def) {
      total += Math.min(claim.amount, def.maxAmount);
    }
  }
  return total;
}

function calculateTaxByBands(
  chargeableIncome: number,
  yearOfAssessment: number
): TaxBandResult[] {
  const bands = getTaxRates(yearOfAssessment);
  const results: TaxBandResult[] = [];
  let remaining = chargeableIncome;

  for (const band of bands) {
    if (remaining <= 0) break;
    const bandWidth = band.max === Infinity ? remaining : band.max - band.min + 1;
    const taxableInBand = Math.min(remaining, bandWidth);
    const taxForBand = Math.round(taxableInBand * band.rate * 100) / 100;
    results.push({ band, taxableInBand, taxForBand });
    remaining -= taxableInBand;
  }

  return results;
}

export function calculatePersonalTax(
  input: TaxCalculationInput
): TaxCalculationResult {
  const grossIncome = sumIncome(input);
  const totalReliefs = calculateReliefs(input.reliefs, input.yearOfAssessment);
  const chargeableIncome = Math.max(0, grossIncome - totalReliefs);

  const bandBreakdown = calculateTaxByBands(
    chargeableIncome,
    input.yearOfAssessment
  );
  const taxBeforeRebate = bandBreakdown.reduce(
    (sum, b) => sum + b.taxForBand,
    0
  );

  let rebateAmount = 0;
  if (chargeableIncome <= 35000) {
    rebateAmount = 400;
    if (
      input.maritalStatus === "married" &&
      !input.spouseHasIncome
    ) {
      rebateAmount += 400;
    }
  }

  const afterRebate = Math.max(0, taxBeforeRebate - rebateAmount);
  const zakatDeduction = Math.min(input.zakatAmount, afterRebate);
  const taxAfterRebateAndZakat = Math.max(0, afterRebate - zakatDeduction);

  const totalPcbPaid = input.monthlyPcbPaid * 12;
  const balanceTaxPayable = taxAfterRebateAndZakat - totalPcbPaid;

  return {
    grossIncome,
    totalReliefs,
    chargeableIncome,
    bandBreakdown,
    taxBeforeRebate,
    rebateAmount,
    zakatDeduction,
    taxAfterRebateAndZakat,
    totalPcbPaid,
    balanceTaxPayable,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/engine/personal.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/personal.ts tests/engine/personal.test.ts
git commit -m "feat: implement personal income tax calculation engine with tests"
```

---

### Task 4: Tax Engine — PCB Monthly Estimation

**Files:**
- Create: `src/engine/pcb.ts`
- Create: `tests/engine/pcb.test.ts`

- [ ] **Step 1: Write failing tests for PCB estimation**

Create `tests/engine/pcb.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { estimateMonthlyPcb } from "@/engine/pcb";

describe("estimateMonthlyPcb", () => {
  it("returns zero PCB for income below tax threshold", () => {
    const result = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 2000,
      maritalStatus: "single",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    expect(result.monthlyPcb).toBe(0);
    expect(result.annualTax).toBe(0);
  });

  it("estimates non-zero PCB for RM5,000/month salary", () => {
    const result = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 5000,
      maritalStatus: "single",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    expect(result.monthlyPcb).toBeGreaterThan(0);
    expect(result.annualPcb).toBe(result.monthlyPcb * 12);
  });

  it("married with non-working spouse pays less than single", () => {
    const single = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 8000,
      maritalStatus: "single",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    const married = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 8000,
      maritalStatus: "married",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    expect(married.monthlyPcb).toBeLessThan(single.monthlyPcb);
  });

  it("more children reduces PCB", () => {
    const noKids = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 8000,
      maritalStatus: "married",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    const twoKids = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 8000,
      maritalStatus: "married",
      spouseHasIncome: false,
      numberOfChildren: 2,
    });
    expect(twoKids.monthlyPcb).toBeLessThan(noKids.monthlyPcb);
  });

  it("difference shows annual tax minus annual PCB", () => {
    const result = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 5000,
      maritalStatus: "single",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    expect(result.difference).toBe(result.annualTax - result.annualPcb);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/engine/pcb.test.ts
```

Expected: FAIL — `estimateMonthlyPcb` is not defined.

- [ ] **Step 3: Implement estimateMonthlyPcb**

Create `src/engine/pcb.ts`:

```typescript
import { PcbEstimate } from "./types";
import { calculatePersonalTax } from "./personal";

export interface PcbInput {
  yearOfAssessment: number;
  monthlyGrossSalary: number;
  maritalStatus: "single" | "married";
  spouseHasIncome: boolean;
  numberOfChildren: number;
}

export function estimateMonthlyPcb(input: PcbInput): PcbEstimate {
  const annualIncome = input.monthlyGrossSalary * 12;

  const reliefs = [{ reliefId: "individual", amount: 9000 }];

  if (input.maritalStatus === "married" && !input.spouseHasIncome) {
    reliefs.push({ reliefId: "spouse", amount: 4000 });
  }

  for (let i = 0; i < input.numberOfChildren; i++) {
    reliefs.push({ reliefId: "child_under_18", amount: 2000 });
  }

  // Estimate EPF at 11% of salary
  const epfAnnual = Math.min(annualIncome * 0.11, 4000);
  reliefs.push({ reliefId: "epf_employee", amount: epfAnnual });

  // SOCSO + EIS
  reliefs.push({ reliefId: "socso_eis", amount: 350 });

  const taxResult = calculatePersonalTax({
    yearOfAssessment: input.yearOfAssessment,
    income: {
      employment: annualIncome,
      commission: 0,
      rental: 0,
      interest: 0,
      dividend: 0,
      other: 0,
    },
    reliefs,
    maritalStatus: input.maritalStatus,
    spouseHasIncome: input.spouseHasIncome,
    zakatAmount: 0,
    monthlyPcbPaid: 0,
  });

  const annualTax = taxResult.taxAfterRebateAndZakat;
  const monthlyPcb = Math.round((annualTax / 12) * 100) / 100;
  const annualPcb = Math.round(monthlyPcb * 12 * 100) / 100;

  return {
    monthlyPcb,
    annualPcb,
    annualTax,
    difference: Math.round((annualTax - annualPcb) * 100) / 100,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/engine/pcb.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/pcb.ts tests/engine/pcb.test.ts
git commit -m "feat: implement PCB monthly estimation with tests"
```

---

### Task 5: Internationalization (i18n) Setup

**Files:**
- Create: `src/i18n/request.ts`, `src/i18n/routing.ts`, `src/i18n/navigation.ts`
- Create: `src/messages/en.json`, `src/messages/zh.json`, `src/messages/ms.json`
- Create: `middleware.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Create i18n routing config**

Create `src/i18n/routing.ts`:

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh", "ms"],
  defaultLocale: "en",
});
```

- [ ] **Step 2: Create i18n request config**

Create `src/i18n/request.ts`:

```typescript
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "zh" | "ms")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create navigation helpers**

Create `src/i18n/navigation.ts`:

```typescript
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 4: Create locale detection middleware**

Create `middleware.ts` in the project root (`C:\Users\johns\MYTaxCalculator\middleware.ts`):

```typescript
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 5: Update next.config.ts**

Replace `next.config.ts` with:

```typescript
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 6: Create English translations**

Create `src/messages/en.json`:

```json
{
  "meta": {
    "title": "Malaysia Tax Calculator 2026",
    "description": "Free Malaysia personal income tax calculator. Calculate your YA2025 tax with all LHDN reliefs and deductions."
  },
  "nav": {
    "home": "Home",
    "calculator": "Tax Calculator",
    "about": "About"
  },
  "calculator": {
    "title": "Personal Income Tax Calculator",
    "subtitle": "Calculate your Malaysia income tax for Year of Assessment 2025",
    "yearOfAssessment": "Year of Assessment",
    "incomeSection": "Income Details",
    "employment": "Employment Income",
    "commission": "Commission / Bonus",
    "rental": "Rental Income",
    "interest": "Interest Income",
    "dividend": "Dividend Income",
    "other": "Other Income",
    "reliefSection": "Tax Reliefs",
    "maritalStatus": "Marital Status",
    "single": "Single",
    "married": "Married",
    "spouseHasIncome": "Spouse has own income",
    "yes": "Yes",
    "no": "No",
    "zakat": "Zakat Paid",
    "monthlyPcb": "Monthly PCB Paid",
    "calculate": "Calculate Tax",
    "reset": "Reset"
  },
  "reliefs": {
    "individual": "Individual Relief",
    "disabled_individual": "Disabled Individual (Additional)",
    "spouse": "Spouse Relief",
    "disabled_spouse": "Disabled Spouse (Additional)",
    "child_under_18": "Child (Under 18)",
    "child_18_plus_studying": "Child (18+ in full-time education)",
    "disabled_child": "Disabled Child",
    "disabled_child_studying": "Disabled Child (Studying)",
    "medical_serious_disease": "Medical - Serious Disease",
    "medical_fertility": "Medical - Fertility Treatment",
    "medical_examination": "Medical Examination",
    "medical_vaccination": "Vaccination",
    "dental_examination": "Dental Examination",
    "mental_health": "Mental Health",
    "education_self": "Education (Self)",
    "upskilling": "Upskilling / Self-enhancement",
    "lifestyle": "Lifestyle",
    "lifestyle_sports": "Sports Equipment & Activities",
    "ev_charging": "EV Charging Facilities",
    "epf_employee": "EPF (Employee)",
    "life_insurance": "Life Insurance / Takaful",
    "education_medical_insurance": "Education / Medical Insurance",
    "socso_eis": "SOCSO & EIS",
    "prs_annuity": "PRS / Deferred Annuity",
    "sspn": "SSPN (Education Savings)",
    "housing_loan_interest": "Housing Loan Interest",
    "childcare_fees": "Childcare Fees",
    "breastfeeding_equipment": "Breastfeeding Equipment",
    "parents_medical": "Parents Medical Expenses"
  },
  "results": {
    "title": "Tax Calculation Results",
    "grossIncome": "Gross Income",
    "totalReliefs": "Total Reliefs",
    "chargeableIncome": "Chargeable Income",
    "bandBreakdown": "Tax by Rate Band",
    "band": "Band",
    "rate": "Rate",
    "taxable": "Taxable Amount",
    "tax": "Tax",
    "taxBeforeRebate": "Tax Before Rebate",
    "rebate": "Tax Rebate",
    "zakat": "Zakat Deduction",
    "taxPayable": "Net Tax Payable",
    "pcbPaid": "Total PCB Paid (12 months)",
    "balance": "Balance",
    "overpaid": "Refund Due",
    "underpaid": "Additional Tax Payable",
    "disclaimer": "This calculation is for reference only and does not constitute tax advice. Please consult LHDN or a licensed tax professional for official assessment."
  },
  "explanation": {
    "title": "Understanding Your Tax",
    "whatIsTaxable": "What Income Is Taxable?",
    "taxableDesc": "In Malaysia, tax residents are taxed on income derived from Malaysia. This includes employment income (salary, wages, bonus), business income, rental income, interest, dividends, and other sources.",
    "howItWorks": "How Is Tax Calculated?",
    "howItWorksDesc": "Malaysia uses a progressive tax system. Your chargeable income (gross income minus reliefs) is taxed at increasing rates across different bands. Only the portion within each band is taxed at that rate.",
    "whatAreReliefs": "What Are Tax Reliefs?",
    "reliefsDesc": "Tax reliefs reduce your chargeable income. Every resident gets RM9,000 personal relief automatically. Additional reliefs are available for education, medical expenses, lifestyle purchases, insurance, and family dependents.",
    "whatIsPcb": "What Is PCB?",
    "pcbDesc": "PCB (Potongan Cukai Bulanan / Monthly Tax Deduction) is the amount your employer deducts from your salary each month as advance tax payment. At year end, your actual tax is compared against total PCB paid — you either get a refund or pay the difference."
  },
  "common": {
    "rm": "RM",
    "perYear": "per year",
    "perMonth": "per month",
    "max": "Max"
  }
}
```

- [ ] **Step 7: Create Chinese translations**

Create `src/messages/zh.json`:

```json
{
  "meta": {
    "title": "马来西亚税务计算器 2026",
    "description": "免费马来西亚个人所得税计算器。计算 YA2025 税务，包含所有 LHDN 减免项目。"
  },
  "nav": {
    "home": "首页",
    "calculator": "税务计算器",
    "about": "关于"
  },
  "calculator": {
    "title": "个人所得税计算器",
    "subtitle": "计算您的马来西亚 2025 评估年度所得税",
    "yearOfAssessment": "评估年度",
    "incomeSection": "收入详情",
    "employment": "就业收入",
    "commission": "佣金 / 奖金",
    "rental": "租金收入",
    "interest": "利息收入",
    "dividend": "股息收入",
    "other": "其他收入",
    "reliefSection": "税务减免",
    "maritalStatus": "婚姻状况",
    "single": "单身",
    "married": "已婚",
    "spouseHasIncome": "配偶有自己的收入",
    "yes": "是",
    "no": "否",
    "zakat": "已缴纳天课 (Zakat)",
    "monthlyPcb": "每月 PCB 扣税金额",
    "calculate": "计算税务",
    "reset": "重置"
  },
  "reliefs": {
    "individual": "个人减免",
    "disabled_individual": "残疾人士（额外）",
    "spouse": "配偶减免",
    "disabled_spouse": "残疾配偶（额外）",
    "child_under_18": "子女（18岁以下）",
    "child_18_plus_studying": "子女（18岁以上在学）",
    "disabled_child": "残疾子女",
    "disabled_child_studying": "残疾子女（在学）",
    "medical_serious_disease": "医疗 - 严重疾病",
    "medical_fertility": "医疗 - 生育治疗",
    "medical_examination": "体检",
    "medical_vaccination": "疫苗接种",
    "dental_examination": "牙科检查",
    "mental_health": "心理健康",
    "education_self": "教育（本人）",
    "upskilling": "技能提升 / 自我增值",
    "lifestyle": "生活方式",
    "lifestyle_sports": "运动器材与活动",
    "ev_charging": "电动车充电设施",
    "epf_employee": "公积金 EPF（员工）",
    "life_insurance": "人寿保险 / 回教保险",
    "education_medical_insurance": "教育 / 医疗保险",
    "socso_eis": "社险 SOCSO 与 EIS",
    "prs_annuity": "私人退休计划 PRS",
    "sspn": "国家教育储蓄 SSPN",
    "housing_loan_interest": "房贷利息",
    "childcare_fees": "托儿费",
    "breastfeeding_equipment": "哺乳设备",
    "parents_medical": "父母医疗费用"
  },
  "results": {
    "title": "税务计算结果",
    "grossIncome": "总收入",
    "totalReliefs": "总减免",
    "chargeableIncome": "应税收入",
    "bandBreakdown": "各税率档明细",
    "band": "税率档",
    "rate": "税率",
    "taxable": "应税金额",
    "tax": "税额",
    "taxBeforeRebate": "回扣前税额",
    "rebate": "税务回扣",
    "zakat": "天课扣除",
    "taxPayable": "应缴净税额",
    "pcbPaid": "已缴 PCB 总额（12个月）",
    "balance": "结余",
    "overpaid": "可退税金额",
    "underpaid": "需补缴税额",
    "disclaimer": "此计算仅供参考，不构成税务建议。请咨询 LHDN 或持牌税务顾问以获取正式评估。"
  },
  "explanation": {
    "title": "了解您的税务",
    "whatIsTaxable": "什么收入需要交税？",
    "taxableDesc": "在马来西亚，税务居民需就源自马来西亚的收入纳税。包括就业收入（薪资、工资、奖金）、商业收入、租金收入、利息、股息及其他来源。",
    "howItWorks": "税务如何计算？",
    "howItWorksDesc": "马来西亚采用累进税制。您的应税收入（总收入减去减免）按不同档次的递增税率征税。每个档次只对该范围内的金额征税。",
    "whatAreReliefs": "什么是税务减免？",
    "reliefsDesc": "税务减免可以降低您的应税收入。每位居民自动享有 RM9,000 个人减免。额外的减免项目涵盖教育、医疗费用、生活方式消费、保险及家庭抚养等。",
    "whatIsPcb": "什么是 PCB？",
    "pcbDesc": "PCB（Potongan Cukai Bulanan / 每月预扣税）是雇主每月从您的薪资中扣除的预缴税款。年终时，将您的实际税额与已缴 PCB 总额对比——多退少补。"
  },
  "common": {
    "rm": "RM",
    "perYear": "每年",
    "perMonth": "每月",
    "max": "上限"
  }
}
```

- [ ] **Step 8: Create Malay translations**

Create `src/messages/ms.json`:

```json
{
  "meta": {
    "title": "Kalkulator Cukai Malaysia 2026",
    "description": "Kalkulator cukai pendapatan peribadi Malaysia percuma. Kira cukai YA2025 anda dengan semua pelepasan dan potongan LHDN."
  },
  "nav": {
    "home": "Utama",
    "calculator": "Kalkulator Cukai",
    "about": "Tentang"
  },
  "calculator": {
    "title": "Kalkulator Cukai Pendapatan Peribadi",
    "subtitle": "Kira cukai pendapatan Malaysia anda untuk Tahun Taksiran 2025",
    "yearOfAssessment": "Tahun Taksiran",
    "incomeSection": "Butiran Pendapatan",
    "employment": "Pendapatan Penggajian",
    "commission": "Komisen / Bonus",
    "rental": "Pendapatan Sewa",
    "interest": "Pendapatan Faedah",
    "dividend": "Pendapatan Dividen",
    "other": "Pendapatan Lain",
    "reliefSection": "Pelepasan Cukai",
    "maritalStatus": "Status Perkahwinan",
    "single": "Bujang",
    "married": "Berkahwin",
    "spouseHasIncome": "Pasangan mempunyai pendapatan sendiri",
    "yes": "Ya",
    "no": "Tidak",
    "zakat": "Zakat Dibayar",
    "monthlyPcb": "PCB Bulanan Dibayar",
    "calculate": "Kira Cukai",
    "reset": "Set Semula"
  },
  "reliefs": {
    "individual": "Pelepasan Individu",
    "disabled_individual": "Individu Kurang Upaya (Tambahan)",
    "spouse": "Pelepasan Pasangan",
    "disabled_spouse": "Pasangan Kurang Upaya (Tambahan)",
    "child_under_18": "Anak (Bawah 18 tahun)",
    "child_18_plus_studying": "Anak (18+ dalam pendidikan)",
    "disabled_child": "Anak Kurang Upaya",
    "disabled_child_studying": "Anak Kurang Upaya (Belajar)",
    "medical_serious_disease": "Perubatan - Penyakit Serius",
    "medical_fertility": "Perubatan - Rawatan Kesuburan",
    "medical_examination": "Pemeriksaan Perubatan",
    "medical_vaccination": "Vaksinasi",
    "dental_examination": "Pemeriksaan Pergigian",
    "mental_health": "Kesihatan Mental",
    "education_self": "Pendidikan (Sendiri)",
    "upskilling": "Peningkatan Kemahiran",
    "lifestyle": "Gaya Hidup",
    "lifestyle_sports": "Peralatan & Aktiviti Sukan",
    "ev_charging": "Kemudahan Pengecasan EV",
    "epf_employee": "KWSP (Pekerja)",
    "life_insurance": "Insurans Hayat / Takaful",
    "education_medical_insurance": "Insurans Pendidikan / Perubatan",
    "socso_eis": "PERKESO & SIP",
    "prs_annuity": "PRS / Anuiti Tertangguh",
    "sspn": "SSPN (Simpanan Pendidikan)",
    "housing_loan_interest": "Faedah Pinjaman Perumahan",
    "childcare_fees": "Yuran Taska / Tadika",
    "breastfeeding_equipment": "Peralatan Penyusuan",
    "parents_medical": "Perbelanjaan Perubatan Ibu Bapa"
  },
  "results": {
    "title": "Keputusan Pengiraan Cukai",
    "grossIncome": "Pendapatan Kasar",
    "totalReliefs": "Jumlah Pelepasan",
    "chargeableIncome": "Pendapatan Bercukai",
    "bandBreakdown": "Cukai Mengikut Kadar",
    "band": "Kadar",
    "rate": "Peratusan",
    "taxable": "Jumlah Bercukai",
    "tax": "Cukai",
    "taxBeforeRebate": "Cukai Sebelum Rebat",
    "rebate": "Rebat Cukai",
    "zakat": "Potongan Zakat",
    "taxPayable": "Cukai Bersih Kena Dibayar",
    "pcbPaid": "Jumlah PCB Dibayar (12 bulan)",
    "balance": "Baki",
    "overpaid": "Bayaran Balik",
    "underpaid": "Cukai Tambahan Perlu Dibayar",
    "disclaimer": "Pengiraan ini adalah untuk rujukan sahaja dan bukan nasihat cukai. Sila rujuk LHDN atau perunding cukai berlesen untuk taksiran rasmi."
  },
  "explanation": {
    "title": "Memahami Cukai Anda",
    "whatIsTaxable": "Apakah Pendapatan Yang Dikenakan Cukai?",
    "taxableDesc": "Di Malaysia, pemastautin cukai dikenakan cukai ke atas pendapatan yang diperoleh dari Malaysia. Ini termasuk pendapatan penggajian (gaji, upah, bonus), pendapatan perniagaan, pendapatan sewa, faedah, dividen, dan sumber lain.",
    "howItWorks": "Bagaimana Cukai Dikira?",
    "howItWorksDesc": "Malaysia menggunakan sistem cukai progresif. Pendapatan bercukai anda (pendapatan kasar tolak pelepasan) dikenakan cukai pada kadar yang meningkat mengikut jalur berbeza. Hanya bahagian dalam setiap jalur dikenakan cukai pada kadar tersebut.",
    "whatAreReliefs": "Apakah Pelepasan Cukai?",
    "reliefsDesc": "Pelepasan cukai mengurangkan pendapatan bercukai anda. Setiap pemastautin mendapat pelepasan peribadi RM9,000 secara automatik. Pelepasan tambahan tersedia untuk pendidikan, perbelanjaan perubatan, pembelian gaya hidup, insurans, dan tanggungan keluarga.",
    "whatIsPcb": "Apakah PCB?",
    "pcbDesc": "PCB (Potongan Cukai Bulanan) adalah jumlah yang dipotong oleh majikan daripada gaji anda setiap bulan sebagai bayaran cukai pendahuluan. Pada akhir tahun, cukai sebenar anda dibandingkan dengan jumlah PCB yang telah dibayar — anda sama ada mendapat bayaran balik atau membayar perbezaannya."
  },
  "common": {
    "rm": "RM",
    "perYear": "setahun",
    "perMonth": "sebulan",
    "max": "Maks"
  }
}
```

- [ ] **Step 9: Verify dev server starts with i18n**

```bash
npm run dev
```

Visit `http://localhost:3000` — should redirect to `http://localhost:3000/en`. Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add src/i18n/ src/messages/ middleware.ts next.config.ts
git commit -m "feat: set up next-intl i18n with EN/ZH/MS translations"
```

---

### Task 6: Layout and Header Components

**Files:**
- Create: `src/components/header.tsx`, `src/components/locale-switcher.tsx`
- Modify: `src/app/layout.tsx`, create `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Create locale switcher component**

Create `src/components/locale-switcher.tsx`:

```tsx
"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const localeLabels: Record<string, string> = {
  en: "EN",
  zh: "中文",
  ms: "BM",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex gap-1">
      {Object.entries(localeLabels).map(([key, label]) => (
        <Button
          key={key}
          variant={locale === key ? "default" : "outline"}
          size="sm"
          onClick={() => switchLocale(key)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create header component**

Create `src/components/header.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">MYTax</span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-4 text-sm">
            <span className="text-muted-foreground">{t("calculator")}</span>
          </nav>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MYTax - Malaysia Tax Calculator",
  description: "Free Malaysia personal income tax calculator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

- [ ] **Step 4: Create locale layout**

Create `src/app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider, useMessages } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/header";

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  if (!routing.locales.includes(locale as "en" | "zh" | "ms")) {
    notFound();
  }

  const messages = useMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-gray-50">
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create placeholder homepage**

Create `src/app/[locale]/page.tsx`:

```tsx
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("calculator");

  return (
    <div className="text-center py-12">
      <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>
      <p className="text-muted-foreground">{t("subtitle")}</p>
    </div>
  );
}
```

- [ ] **Step 6: Verify layout renders in all 3 locales**

```bash
npm run dev
```

Visit:
- `http://localhost:3000/en` — English header + title
- `http://localhost:3000/zh` — Chinese header + title
- `http://localhost:3000/ms` — Malay header + title

Verify locale switcher buttons switch between languages. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/header.tsx src/components/locale-switcher.tsx src/app/layout.tsx src/app/\[locale\]/layout.tsx src/app/\[locale\]/page.tsx
git commit -m "feat: add trilingual layout with header and locale switcher"
```

---

### Task 7: Income Form Component

**Files:**
- Create: `src/components/income-form.tsx`
- Modify: `src/app/[locale]/page.tsx`

- [ ] **Step 1: Create income form component**

Create `src/components/income-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IncomeInput, TaxCalculationInput, TaxCalculationResult, ReliefClaim } from "@/engine/types";
import { calculatePersonalTax } from "@/engine/personal";
import { getReliefDefinitions } from "@/engine/tax-reliefs";
import { ReliefSelector } from "./relief-selector";
import { TaxResult } from "./tax-result";
import { TaxExplanation } from "./tax-explanation";

const YEAR_OF_ASSESSMENT = 2025;

function emptyIncome(): IncomeInput {
  return { employment: 0, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 };
}

export function IncomeForm() {
  const t = useTranslations("calculator");
  const [income, setIncome] = useState<IncomeInput>(emptyIncome());
  const [maritalStatus, setMaritalStatus] = useState<"single" | "married">("single");
  const [spouseHasIncome, setSpouseHasIncome] = useState(false);
  const [reliefClaims, setReliefClaims] = useState<ReliefClaim[]>([
    { reliefId: "individual", amount: 9000 },
  ]);
  const [zakatAmount, setZakatAmount] = useState(0);
  const [monthlyPcb, setMonthlyPcb] = useState(0);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  function handleIncomeChange(field: keyof IncomeInput, value: string) {
    const num = parseFloat(value) || 0;
    setIncome((prev) => ({ ...prev, [field]: num }));
  }

  function handleCalculate() {
    const input: TaxCalculationInput = {
      yearOfAssessment: YEAR_OF_ASSESSMENT,
      income,
      reliefs: reliefClaims,
      maritalStatus,
      spouseHasIncome,
      zakatAmount,
      monthlyPcbPaid: monthlyPcb,
    };
    setResult(calculatePersonalTax(input));
  }

  function handleReset() {
    setIncome(emptyIncome());
    setMaritalStatus("single");
    setSpouseHasIncome(false);
    setReliefClaims([{ reliefId: "individual", amount: 9000 }]);
    setZakatAmount(0);
    setMonthlyPcb(0);
    setResult(null);
  }

  const incomeFields: (keyof IncomeInput)[] = [
    "employment", "commission", "rental", "interest", "dividend", "other",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("incomeSection")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {incomeFields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{t(field)}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  RM
                </span>
                <Input
                  id={field}
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-12"
                  value={income[field] || ""}
                  onChange={(e) => handleIncomeChange(field, e.target.value)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("maritalStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={maritalStatus === "single" ? "default" : "outline"}
              onClick={() => setMaritalStatus("single")}
            >
              {t("single")}
            </Button>
            <Button
              variant={maritalStatus === "married" ? "default" : "outline"}
              onClick={() => setMaritalStatus("married")}
            >
              {t("married")}
            </Button>
          </div>
          {maritalStatus === "married" && (
            <div className="flex items-center gap-4">
              <Label>{t("spouseHasIncome")}</Label>
              <Button
                size="sm"
                variant={spouseHasIncome ? "default" : "outline"}
                onClick={() => setSpouseHasIncome(true)}
              >
                {t("yes")}
              </Button>
              <Button
                size="sm"
                variant={!spouseHasIncome ? "default" : "outline"}
                onClick={() => setSpouseHasIncome(false)}
              >
                {t("no")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ReliefSelector
        yearOfAssessment={YEAR_OF_ASSESSMENT}
        claims={reliefClaims}
        onClaimsChange={setReliefClaims}
      />

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 pt-6">
          <div className="space-y-2">
            <Label htmlFor="zakat">{t("zakat")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                RM
              </span>
              <Input
                id="zakat"
                type="number"
                min="0"
                step="0.01"
                className="pl-12"
                value={zakatAmount || ""}
                onChange={(e) => setZakatAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pcb">{t("monthlyPcb")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                RM
              </span>
              <Input
                id="pcb"
                type="number"
                min="0"
                step="0.01"
                className="pl-12"
                value={monthlyPcb || ""}
                onChange={(e) => setMonthlyPcb(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button size="lg" onClick={handleCalculate}>
          {t("calculate")}
        </Button>
        <Button size="lg" variant="outline" onClick={handleReset}>
          {t("reset")}
        </Button>
      </div>

      {result && (
        <>
          <Separator />
          <TaxResult result={result} />
        </>
      )}

      <Separator />
      <TaxExplanation />
    </div>
  );
}
```

- [ ] **Step 2: Update homepage to use IncomeForm**

Replace `src/app/[locale]/page.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { IncomeForm } from "@/components/income-form";

export default function HomePage() {
  const t = useTranslations("calculator");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <IncomeForm />
    </div>
  );
}
```

- [ ] **Step 3: Commit** (will commit together with Task 8 after all components are created)

Note: This component depends on `ReliefSelector`, `TaxResult`, and `TaxExplanation` which are created in Tasks 8-9. The app will not compile until those are created.

---

### Task 8: Relief Selector and Tax Result Components

**Files:**
- Create: `src/components/relief-selector.tsx`, `src/components/tax-result.tsx`, `src/components/tax-explanation.tsx`

- [ ] **Step 1: Create relief selector component**

Create `src/components/relief-selector.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReliefClaim } from "@/engine/types";
import { getReliefDefinitions } from "@/engine/tax-reliefs";

interface ReliefSelectorProps {
  yearOfAssessment: number;
  claims: ReliefClaim[];
  onClaimsChange: (claims: ReliefClaim[]) => void;
}

export function ReliefSelector({
  yearOfAssessment,
  claims,
  onClaimsChange,
}: ReliefSelectorProps) {
  const t = useTranslations("reliefs");
  const tCalc = useTranslations("calculator");
  const tCommon = useTranslations("common");
  const definitions = getReliefDefinitions(yearOfAssessment);

  function isChecked(reliefId: string): boolean {
    return claims.some((c) => c.reliefId === reliefId);
  }

  function getAmount(reliefId: string): number {
    return claims.find((c) => c.reliefId === reliefId)?.amount ?? 0;
  }

  function toggleRelief(reliefId: string, maxAmount: number) {
    if (isChecked(reliefId)) {
      onClaimsChange(claims.filter((c) => c.reliefId !== reliefId));
    } else {
      onClaimsChange([...claims, { reliefId, amount: maxAmount }]);
    }
  }

  function updateAmount(reliefId: string, value: string, maxAmount: number) {
    const num = Math.min(parseFloat(value) || 0, maxAmount);
    onClaimsChange(
      claims.map((c) => (c.reliefId === reliefId ? { ...c, amount: num } : c))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tCalc("reliefSection")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {definitions.map((def) => {
          const checked = isChecked(def.id);
          const isIndividual = def.id === "individual";
          return (
            <div
              key={def.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <Checkbox
                id={def.id}
                checked={checked}
                disabled={isIndividual}
                onCheckedChange={() => toggleRelief(def.id, def.maxAmount)}
              />
              <Label htmlFor={def.id} className="flex-1 cursor-pointer text-sm">
                {t(def.id)}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({tCommon("max")} RM{def.maxAmount.toLocaleString()})
                </span>
              </Label>
              {checked && (
                <div className="relative w-32">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    RM
                  </span>
                  <Input
                    type="number"
                    min="0"
                    max={def.maxAmount}
                    step="0.01"
                    className="h-8 pl-8 text-sm"
                    value={getAmount(def.id) || ""}
                    onChange={(e) =>
                      updateAmount(def.id, e.target.value, def.maxAmount)
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create tax result component**

Create `src/components/tax-result.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TaxCalculationResult } from "@/engine/types";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface TaxResultProps {
  result: TaxCalculationResult;
}

export function TaxResult({ result }: TaxResultProps) {
  const t = useTranslations("results");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Row label={t("grossIncome")} value={formatRM(result.grossIncome)} />
          <Row label={t("totalReliefs")} value={`- ${formatRM(result.totalReliefs)}`} />
          <Separator />
          <Row label={t("chargeableIncome")} value={formatRM(result.chargeableIncome)} bold />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium mb-2">{t("bandBreakdown")}</p>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">{t("band")}</th>
                  <th className="px-3 py-2 text-right">{t("rate")}</th>
                  <th className="px-3 py-2 text-right">{t("taxable")}</th>
                  <th className="px-3 py-2 text-right">{t("tax")}</th>
                </tr>
              </thead>
              <tbody>
                {result.bandBreakdown
                  .filter((b) => b.taxableInBand > 0)
                  .map((b, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">
                        {b.band.max === Infinity
                          ? `RM ${b.band.min.toLocaleString()}+`
                          : `RM ${b.band.min.toLocaleString()} – ${b.band.max.toLocaleString()}`}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(b.band.rate * 100).toFixed(0)}%
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(b.taxableInBand)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(b.taxForBand)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <Row label={t("taxBeforeRebate")} value={formatRM(result.taxBeforeRebate)} />
          {result.rebateAmount > 0 && (
            <Row label={t("rebate")} value={`- ${formatRM(result.rebateAmount)}`} />
          )}
          {result.zakatDeduction > 0 && (
            <Row label={t("zakat")} value={`- ${formatRM(result.zakatDeduction)}`} />
          )}
          <Separator />
          <Row label={t("taxPayable")} value={formatRM(result.taxAfterRebateAndZakat)} bold />
        </div>

        {result.totalPcbPaid > 0 && (
          <div className="space-y-2">
            <Row label={t("pcbPaid")} value={`- ${formatRM(result.totalPcbPaid)}`} />
            <Separator />
            <Row
              label={result.balanceTaxPayable >= 0 ? t("underpaid") : t("overpaid")}
              value={formatRM(Math.abs(result.balanceTaxPayable))}
              bold
              highlight={result.balanceTaxPayable < 0 ? "green" : "red"}
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-md">
          {t("disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: "green" | "red";
}) {
  const textClass = highlight === "green"
    ? "text-green-600"
    : highlight === "red"
      ? "text-red-600"
      : "";

  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className={textClass}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create tax explanation component**

Create `src/components/tax-explanation.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TaxExplanation() {
  const t = useTranslations("explanation");

  const sections = [
    { title: t("whatIsTaxable"), body: t("taxableDesc") },
    { title: t("howItWorks"), body: t("howItWorksDesc") },
    { title: t("whatAreReliefs"), body: t("reliefsDesc") },
    { title: t("whatIsPcb"), body: t("pcbDesc") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="font-semibold mb-2">{section.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {section.body}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Verify all components compile and render**

```bash
npm run dev
```

Visit `http://localhost:3000/en`:
- Income form should display with 6 income fields
- Marital status toggle should work
- Relief selector should show all relief items with checkboxes
- "Individual Relief" should be checked and disabled (always on)
- Clicking "Calculate Tax" should show results below
- Tax explanation section should appear at the bottom
- Switch to `/zh` and `/ms` — all text should be translated

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/ src/app/
git commit -m "feat: add income form, relief selector, tax results, and explanation components"
```

---

### Task 9: SEO Metadata and Final Polish

**Files:**
- Modify: `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`

- [ ] **Step 1: Add SEO metadata generation**

Update `src/app/[locale]/page.tsx` to add metadata:

```tsx
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { IncomeForm } from "@/components/income-form";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: {
        en: "/en",
        zh: "/zh",
        ms: "/ms",
      },
    },
  };
}

export default function HomePage() {
  const t = useTranslations("calculator");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <IncomeForm />
    </div>
  );
}
```

- [ ] **Step 2: Add footer with disclaimer**

Update `src/app/[locale]/layout.tsx` to include a footer:

```tsx
import { NextIntlClientProvider, useMessages } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/header";

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  if (!routing.locales.includes(locale as "en" | "zh" | "ms")) {
    notFound();
  }

  const messages = useMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-gray-50 flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="container mx-auto px-4 py-8 flex-1">
            {children}
          </main>
          <footer className="border-t bg-white py-6 text-center text-xs text-muted-foreground">
            <div className="container mx-auto px-4">
              <p>&copy; {new Date().getFullYear()} MYTax. All rights reserved.</p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Build production to verify no build errors**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Final verification in dev mode**

```bash
npm run dev
```

Full test walkthrough:
1. Visit `/en` — enter RM60,000 employment income, check individual relief, click Calculate. Verify tax breakdown shows correct bands.
2. Switch to `/zh` — all labels in Chinese, results still correct.
3. Switch to `/ms` — all labels in Malay.
4. Test married status with non-working spouse — should show spouse relief option.
5. Test low income (RM30,000 with RM9,000 relief = RM21,000 chargeable) — should show RM400 rebate.
6. Enter monthly PCB — should show balance (underpaid/overpaid).
7. Scroll down — tax explanation section in correct language.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add SEO metadata, footer, and final polish for Phase 1"
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Project scaffolding (Next.js + Tailwind + shadcn + vitest) | 5 min |
| 2 | Tax engine types, rate bands, relief definitions + data tests | 5 min |
| 3 | Personal tax calculation engine + comprehensive tests | 10 min |
| 4 | PCB monthly estimation + tests | 5 min |
| 5 | i18n setup with EN/ZH/MS translations | 10 min |
| 6 | Layout, header, locale switcher | 5 min |
| 7 | Income form component | 5 min |
| 8 | Relief selector, tax result, tax explanation components | 10 min |
| 9 | SEO metadata, footer, final polish | 5 min |
| **Total** | | **~60 min** |
