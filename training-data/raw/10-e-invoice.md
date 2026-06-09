# Malaysia e-Invoice (LHDN MyInvois) - Implementation Guide
# 马来西亚电子发票 (LHDN MyInvois) - 实施指南
# e-Invois Malaysia (LHDN MyInvois) - Panduan Pelaksanaan
Source: LHDN (hasil.gov.my), updated December 2025
Keywords: 电子发票 e-invoice einvoice MyInvois 强制 阶段 豁免 phase mandatory exemption consolidated invoice e-invois wajib fasa pengecualian

## What is e-Invoice?
An e-Invoice is a digital invoice validated in near real-time by LHDN through the
MyInvois system. It replaces paper/PDF invoices for proof of income and expenses.
Each validated e-invoice receives a Unique Identifier Number (UIN) and QR code.

## Implementation Timeline (by annual turnover)
| Phase | Annual Turnover | Mandatory From | Relaxation Period Ends |
|---|---|---|---|
| 1 | More than RM100 million | 1 August 2024 | 31 January 2025 |
| 2 | RM25M – RM100M | 1 January 2025 | 30 June 2025 |
| 3 | RM5M – RM25M | 1 July 2025 | 31 December 2025 |
| 4 | RM1M – RM5M | 1 January 2026 | 31 December 2027 (extended) |
| — | RM1 million or below | EXEMPT (permanent) | — |

Turnover is based on the FY2022 audited financial statements (or LHDN's definition
for businesses established later).

## Key Updates (December 2025)
- The permanent exemption threshold was RAISED from RM500,000 to RM1,000,000,
  effective 1 January 2026.
- The formerly planned phase for businesses below RM1M (originally Phase 5,
  July 2026) was CANCELLED. Businesses with turnover ≤ RM1M are permanently
  exempt but may adopt e-invoicing voluntarily.
- Phase 4 (RM1M–5M) relaxation period was extended to 31 December 2027.

## The RM10,000 Rule (critical from 1 January 2026)
- From 1 Jan 2026, any single transaction of RM10,000 or above REQUIRES an
  individual e-invoice issued at the time of transaction.
- Consolidated e-invoices are NO LONGER accepted for transactions ≥ RM10,000.
- Below RM10,000, businesses may still issue a monthly consolidated e-invoice
  for buyers who do not request individual e-invoices.

## During the Relaxation Period
- No prosecution or penalties for non-compliance, provided the business shows
  reasonable effort to comply (e.g. issuing consolidated e-invoices).
- Businesses can use this period to set up systems and processes.

## How to Issue e-Invoices
1. **MyInvois Portal** (free) — manual entry or batch upload, suitable for SMEs
2. **API integration** — connect accounting/ERP software directly to LHDN
   (requires technical setup, suitable for higher volumes)
3. **MyInvois e-Pos** (free) — point-of-sale app for micro businesses

## Penalties (after relaxation period)
- Failure to issue e-invoice: fine RM200 – RM20,000 per offence, or imprisonment
  up to 6 months, or both (Section 120 Income Tax Act 1967)

## Practical Notes for SMEs
- Buyers increasingly request e-invoices because expenses without a valid
  e-invoice may not qualify for tax deductions.
- Even exempt businesses (≤ RM1M) may benefit from voluntary adoption when
  dealing with corporate customers.
- Self-billed e-invoices are required for certain transactions (imports,
  payments to agents, e-commerce, etc.).
