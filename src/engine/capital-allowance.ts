/**
 * Capital Allowance calculator (Schedule 3, Income Tax Act 1967)
 *
 * Rates:
 *   | Asset type                      | Initial (IA) | Annual (AA) |
 *   |---------------------------------|--------------|-------------|
 *   | Heavy machinery, motor vehicles | 20%          | 20%         |
 *   | Plant & machinery (general)     | 20%          | 14%         |
 *   | Computers & ICT equipment       | 20%          | 20%         |
 *   | Office equipment, furniture     | 20%          | 10%         |
 *   | Industrial buildings            | 10%          | 3%          |
 *   | Small value assets (≤ RM2,000)  | 100% write-off (capped RM20k/YA for non-SME) |
 *
 * Motor vehicle (non-commercial) qualifying expenditure cap:
 *   - New vehicle costing ≤ RM150,000 → QE capped at RM100,000
 *   - Otherwise → QE capped at RM50,000
 */

export type CapitalAssetType =
  | "heavy_machinery"
  | "general_pm"
  | "ict"
  | "office"
  | "industrial_building"
  | "motor_vehicle"
  | "small_value";

export interface CapitalAllowanceInput {
  assetType: CapitalAssetType;
  cost: number; // RM
  // motor vehicle only: new vehicle with total cost ≤ RM150k qualifies for RM100k cap
  isNewVehicleUnder150k?: boolean;
}

export interface CapitalAllowanceYearRow {
  year: number;
  initialAllowance: number;
  annualAllowance: number;
  totalAllowance: number;
  residualExpenditure: number; // remaining QE after this year
}

export interface CapitalAllowanceResult {
  assetType: CapitalAssetType;
  cost: number;
  qualifyingExpenditure: number; // after motor vehicle cap
  iaRate: number;
  aaRate: number;
  yearsToFullClaim: number;
  schedule: CapitalAllowanceYearRow[];
}

const RATES: Record<Exclude<CapitalAssetType, "small_value" | "motor_vehicle">, { ia: number; aa: number }> = {
  heavy_machinery: { ia: 0.2, aa: 0.2 },
  general_pm: { ia: 0.2, aa: 0.14 },
  ict: { ia: 0.2, aa: 0.2 },
  office: { ia: 0.2, aa: 0.1 },
  industrial_building: { ia: 0.1, aa: 0.03 },
};

const MOTOR_VEHICLE_RATES = { ia: 0.2, aa: 0.2 };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateCapitalAllowance(
  input: CapitalAllowanceInput
): CapitalAllowanceResult {
  const cost = Math.max(0, input.cost);

  // Small value assets: 100% write-off in year 1
  if (input.assetType === "small_value") {
    const qe = cost;
    return {
      assetType: input.assetType,
      cost,
      qualifyingExpenditure: qe,
      iaRate: 0,
      aaRate: 1,
      yearsToFullClaim: qe > 0 ? 1 : 0,
      schedule:
        qe > 0
          ? [
              {
                year: 1,
                initialAllowance: 0,
                annualAllowance: qe,
                totalAllowance: qe,
                residualExpenditure: 0,
              },
            ]
          : [],
    };
  }

  // Motor vehicle QE cap
  let qe = cost;
  let rates: { ia: number; aa: number };
  if (input.assetType === "motor_vehicle") {
    const cap = input.isNewVehicleUnder150k ? 100000 : 50000;
    qe = Math.min(cost, cap);
    rates = MOTOR_VEHICLE_RATES;
  } else {
    rates = RATES[input.assetType];
  }

  const schedule: CapitalAllowanceYearRow[] = [];
  let residual = qe;
  let year = 0;

  while (residual > 0.004 && year < 100) {
    year++;
    const ia = year === 1 ? round2(qe * rates.ia) : 0;
    let aa = round2(qe * rates.aa);
    // Don't over-claim in the final year
    if (ia + aa > residual) {
      aa = round2(residual - ia);
    }
    const total = round2(ia + aa);
    residual = round2(residual - total);
    schedule.push({
      year,
      initialAllowance: ia,
      annualAllowance: aa,
      totalAllowance: total,
      residualExpenditure: residual,
    });
  }

  return {
    assetType: input.assetType,
    cost,
    qualifyingExpenditure: qe,
    iaRate: rates.ia,
    aaRate: rates.aa,
    yearsToFullClaim: schedule.length,
    schedule,
  };
}
