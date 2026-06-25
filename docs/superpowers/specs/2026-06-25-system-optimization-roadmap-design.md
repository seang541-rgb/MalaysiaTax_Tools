# MYTax System Optimization Roadmap - Design Spec

Date: 2026-06-25

## Goal

Upgrade MYTax from a collection of tax calculators into a trustworthy Malaysia tax decision platform. The roadmap prioritizes trust and production safety first, then adds decision-oriented product flows, then improves growth and monetization.

## Success Criteria

- Production has no known high-severity dependency audit findings.
- Admin-only surfaces fail closed and use one shared authorization helper.
- AI credit charging is safe across provider failures, including stream failures after a response begins.
- `/api/chat` rate limiting works across serverless instances.
- Core tax calculations expose year of assessment, source notes, and last reviewed dates.
- Tax rule data is structured by year of assessment so YA2026 can be added without rewriting engines.
- Users can enter through decision flows, not only isolated calculators.
- SEO and monetization improvements reinforce trust instead of hiding core calculations behind a paywall.

## Non-Goals

- Do not rebuild the entire app shell or visual identity.
- Do not replace Supabase, Stripe, or the current Next.js architecture.
- Do not make all tools paid. Core single-user calculations remain free for trust and acquisition.
- Do not rely on AI output as the sole source of tax answers; deterministic engines and cited sources remain the authority.

## Current Context

The system already has:

- Next.js app routes with localized pages for English, Chinese, and Malay.
- Deterministic engines for personal tax, corporate tax, PCB, SST, RPGT, stamp duty, withholding tax, CP204, e-Invoice, capital allowance, sole proprietor tax, and joint assessment.
- Supabase Auth, Stripe Checkout, credit balances, usage logs, and server-side credit consumption.
- AI chat with RAG retrieval, deterministic prompt injection, and chat logging.
- Admin pages for AI logs and knowledge-base reindexing.
- Independent URLs for many tools and a sitemap implementation.

The roadmap should improve this system in place, preserving existing patterns and tests.

## Approach

Use a three-stage roadmap:

1. Trust and production safety baseline.
2. High-ROI tax decision entry points.
3. Growth and monetization improvements.

This balances immediate launch safety with visible product improvement. It avoids a long invisible refactor while still putting tax correctness and operational trust first.

## Stage 1: Trust And Production Safety Baseline

### Security And Dependency Hygiene

Keep CLI-only packages out of production dependencies. Development tools such as `shadcn` belong in `devDependencies`. Avoid `npm audit fix --force` when it proposes framework downgrades or unrelated major changes.

Acceptance:

- `npm audit --audit-level=high` exits successfully.
- Remaining moderate findings are documented with owner and mitigation path.
- `npm run lint`, `npm run test`, and `npm run build` pass after dependency changes.

### Admin Authorization

Admin routes and pages should use `src/lib/admin.ts` as the only authorization helper. The default admin email should not silently grant access in production. If `ADMIN_EMAIL` is missing in production, admin checks should fail closed and log a clear configuration error.

Affected areas:

- `src/lib/admin.ts`
- `src/app/[locale]/admin/ai-logs/page.tsx`
- `src/app/[locale]/admin/reindex/page.tsx`
- `src/app/api/admin/reindex/route.ts`

Acceptance:

- Non-admin users get 404 on admin pages and 403 on admin APIs.
- Missing production `ADMIN_EMAIL` denies admin access.
- Tests cover matching, non-matching, missing, and comma-separated admin emails.

### AI Credit Safety

Credit consumption should be reliable around every failure boundary:

- User unauthenticated: no credit consumed.
- Insufficient balance: no provider call.
- Provider non-200 response: credit refunded.
- Stream starts but fails before completion: credit refunded or marked for support-safe reconciliation.
- Chat log failure: no user-facing failure and no duplicate charge.

The preferred first implementation is automatic refund for provider and stream failures. If stream failure happens after partial tokens were delivered, log the partial answer and refund with a distinct error code such as `STREAM_FAILED_REFUNDED`.

Affected areas:

- `src/app/api/chat/route.ts`
- `src/lib/billing/credits.ts`
- `supabase/billing-credits.sql`
- `tests/billing/chat-billing-route.test.ts`

Acceptance:

- Tests cover provider non-200, stream read error, malformed SSE, and log failure.
- Refund usage logs include enough metadata for support review.

### Cross-Instance Rate Limiting

The current in-memory rate limit is not sufficient for serverless deployment. Replace it with a shared strategy.

Recommended first version:

- Supabase table `rate_limit_events` or RPC `check_rate_limit`.
- Key by `user_id` when signed in and by IP fallback for anonymous health checks.
- Windowed limit for `/api/chat`, initially 10 requests per minute per user/IP.
- Service-role write path from the API route.

Later, this can move to Upstash or Vercel Firewall without changing route behavior.

Acceptance:

- Rate limiting works across parallel route invocations.
- Tests cover allowed request, blocked request, and expired window.
- API response remains localized or uses existing billing error conventions where possible.

### Tax Rule Data Governance

Move tax rule constants toward explicit year-of-assessment data structures.

Recommended structure:

- `Record<number, TaxBand[]>` for individual rates.
- `Record<number, ReliefDefinition[]>` for reliefs.
- Helper behavior should be explicit:
  - return exact year when known;
  - fall back only when intentionally configured;
  - expose the effective year used to callers.

Stage 1 should preserve existing YA2025 behavior and prepare the API for YA2026. YA2026 data can be added after source verification.

Affected areas:

- `src/engine/tax-rates.ts`
- `src/engine/tax-reliefs.ts`
- engines that accept `yearOfAssessment`
- tests under `tests/engine`

Acceptance:

- Existing YA2025 tests remain stable.
- Unknown years are handled deliberately, not silently ignored.
- Source comments identify reviewed documents and review date.

### Source Notes And Trust Signals

Every high-risk calculator should show:

- Year of assessment or rule period.
- Last reviewed date.
- Source type and authority, preferably LHDN/RMCD/KWSP/PERKESO where relevant.
- Short disclaimer that results are estimates and not tax advice.

Affected calculators:

- Personal tax.
- Corporate tax.
- SST.
- e-Invoice.
- RPGT.
- Stamp duty.
- Withholding tax.
- CP204.
- Capital allowance.
- Employer contributions.
- Sole proprietor tax.
- Joint assessment.

Acceptance:

- Each page displays a source/trust block.
- The source block is reusable and localized.
- Tests or snapshots cover at least the reusable component and one representative page.

## Stage 2: High-ROI Tax Decision Entry Points

### Decision Flow 1: Do I Need To File / Which Form

Purpose:

Help first-time and casual taxpayers determine whether they likely need to file and whether Form BE, B, or M may apply.

Inputs:

- Employment income.
- Business or freelance income.
- Rental income.
- Foreign income.
- Residency status.
- Tax already deducted via PCB.

Output:

- Likely filing obligation.
- Likely form.
- Filing deadline.
- Suggested next tool.
- Clear caveat that final filing obligation should be verified with LHDN or a tax agent.

### Decision Flow 2: Joint Vs Separate Assessment

Purpose:

Turn the existing joint-assessment calculator into a decision report.

Output:

- Recommended option.
- Estimated tax difference.
- Explanation of why one option wins.
- Relief assumptions and limitations.
- Link to personal tax calculator and relief checklist.

### Decision Flow 3: Refund Estimate And Relief Scanner

Purpose:

Help employed users estimate refund or balance payable and identify commonly missed reliefs.

Inputs:

- Annual income.
- PCB already deducted.
- EPF/SOCSO/EIS.
- Life events such as spouse, children, parents medical, education, insurance, sports/lifestyle, childcare, EV charging, housing loan interest where applicable.

Output:

- Estimated refund or balance payable.
- Reliefs already included.
- Reliefs to check.
- Suggested evidence to keep.
- Option to export or ask AI for explanation in later paid flow.

## Stage 3: Growth And Monetization

### Documentation

Rewrite README to match the real project:

- What MYTax does.
- Tech stack.
- Local setup.
- Required environment variables.
- Supabase SQL setup.
- Stripe setup.
- RAG reindexing.
- Test and build commands.
- Deployment checklist.

Clean `DEPLOYMENT.md`:

- Fix duplicated step numbers.
- Clarify DeepSeek chat and NVIDIA embedding split.
- Mark which steps are local-only, Vercel-only, or Supabase-only.

### SEO And E-E-A-T

Blog and tool pages should reinforce each other:

- Blog articles link to relevant calculators.
- Calculator pages link to relevant guides.
- Article schema includes author, reviewer, published date, and modified date.
- Tax-related content should include reviewed-by metadata when a qualified reviewer exists.

### Monetization

Keep core single calculations free. Charge for value-added outcomes:

- PDF report export.
- Batch tools.
- AI deep explanation.
- Saved history or multi-company workflows.
- Professional-facing reports.

Pricing should sell outcomes, not only credits. The pricing page can still use credits internally, but copy should describe what users can do with them.

## Data Flow

### Deterministic Calculator Flow

User input -> client component validation -> deterministic engine -> localized result -> source/trust block -> optional paid enhancement.

No calculator should need to store user financial input unless a future saved-history feature explicitly asks permission.

### AI Chat Flow

User message -> auth check -> shared rate limit -> input validation -> consume credit -> deterministic context/RAG retrieval -> provider stream -> stream transform -> chat quality log -> completed response.

Failure paths:

- Pre-charge failure: return error without consumption.
- Post-charge provider failure: refund.
- Stream failure: refund or reconciliation-safe failed usage log.
- Log failure: swallow and preserve user response.

### Decision Flow

User answers guided questions -> local deterministic classifier/engine -> result report -> relevant calculator/blog links -> optional PDF/AI paid enhancement.

## Error Handling

- User errors should be recoverable and specific.
- Configuration errors should fail closed for admin and billing paths.
- Provider errors should avoid leaking raw secrets or large provider payloads to users.
- Support logs should include route, feature, user id, request size, provider status, and refund status, but not full financial input unless explicitly needed and scrubbed.

## Testing Strategy

Required checks for each implementation phase:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm audit --audit-level=high`

Focused tests:

- Admin authorization helper.
- AI billing/refund boundaries.
- Rate limit RPC or service wrapper.
- Tax year data selection.
- Source note rendering.
- Decision-flow engines.

Manual verification:

- Open each major tool page in all three locales.
- Confirm source notes are visible and text does not overflow.
- Confirm gated paid paths still route to sign-in/pricing correctly.
- Confirm admin pages stay hidden from non-admins.

## Rollout Plan

### Week 1

- Finish dependency/security cleanup.
- Fix admin authorization default behavior.
- Add AI stream-failure refund handling.
- Add shared rate limiting design and first implementation.
- Rewrite README and clean deployment guide.

### Weeks 2-3

- Restructure tax rules by year of assessment.
- Add verified source metadata to rule files.
- Extend source notes across core calculators.
- Prepare YA2026 structure without adding unverified numbers.

### Weeks 3-4

- Build "Do I need to file / Which form" decision flow.
- Link it from home, footer, and relevant blog pages.
- Add tests for decision outcomes.

### Weeks 4-5

- Improve joint-vs-separate report.
- Build refund estimate and relief scanner.
- Add paid-enhancement hooks without forcing payment for base results.

### Weeks 5-6

- Add PDF report export as first strong paid outcome.
- Improve pricing copy and package framing.
- Add blog E-E-A-T metadata and internal links.

## Open Decisions

- Whether shared rate limiting should start with Supabase RPC or an external service such as Upstash.
- Whether stream failure after partial answer should always refund or only refund when no final `[DONE]` event is sent. Recommendation: refund when no final `[DONE]` arrives.
- Whether PDF reports should consume credits or require a separate checkout product. Recommendation: use credits first.
- Whether qualified reviewer metadata is available now or should be represented as "review pending". Recommendation: do not invent reviewer credentials.

## Risks

- Tax rules may change faster than implementation. Mitigation: source metadata and review dates.
- Adding decision flows may duplicate logic if engines are not reused. Mitigation: decision flows should call engine helpers, not copy formulas.
- Over-gating may reduce trust. Mitigation: keep base calculations free and charge only for export, batch, history, or deep explanation.
- AI answers may still be wrong despite RAG. Mitigation: deterministic context, citations, disclaimers, and visible source-backed calculators.

## Approval Gate

This spec is a roadmap design, not an implementation plan. After approval, the next step is to create an implementation plan with milestones, exact file changes, test cases, and commit boundaries.
