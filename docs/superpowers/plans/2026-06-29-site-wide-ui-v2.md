# MYTax Site-Wide UI V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current website UI with the approved Figma `MYTax Site-wide Redesign v2` direction.

**Architecture:** Move the product shell from a flat top navigation to a grouped desktop sidebar plus mobile top and bottom navigation. Reuse page-level wrappers so calculator pages share the same form/result/context layout instead of each page inventing its own hero and container.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Keep existing routes and payment/auth behavior unchanged.
- Use the approved Figma v2 structure: grouped IA, workspace home, calculator template, AI as site layer, credits-before-paid-action language, and mobile workflow navigation.
- Do not re-enable stale service worker behavior.
- Use TDD for behavioral UI structure changes.

---

### Task 1: Product Shell

**Files:**
- Modify: `src/components/header.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Test: `tests/components/header.test.tsx`

**Interfaces:**
- Consumes: existing `Header`, `CreditBalance`, `AuthButton`, `ThemeToggle`, `LocaleSwitcher`.
- Produces: grouped desktop sidebar and mobile bottom navigation while preserving route links.

- [ ] Write tests for grouped `START`, `CALCULATE`, `MANAGE` navigation and mobile bottom actions.
- [ ] Run the header test and verify it fails against the old top-nav shell.
- [ ] Implement the grouped shell.
- [ ] Run the header test and verify it passes.

### Task 2: Workspace Home

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/components/home-tool-grid.tsx`
- Test: `tests/components/home-tool-grid.test.tsx`

**Interfaces:**
- Consumes: existing tool links and locale prop.
- Produces: v2 task-first home with AI triage band, common workflows, and workspace rail.

- [ ] Update tests for `Start with the task`, `Common workflows`, grouped tool cards, and workspace rail.
- [ ] Run tests and verify failure.
- [ ] Implement v2 home layout and spacing.
- [ ] Run tests and verify pass.

### Task 3: Calculator Page Template

**Files:**
- Create: `src/components/tool-page-shell.tsx`
- Modify: representative paid/free tool pages to use the shell.
- Test: `tests/components/tool-page-shell.test.tsx`

**Interfaces:**
- Consumes: page title, subtitle, category, credit cost label, children.
- Produces: reusable two-column calculator shell with AI helper and result/context panel.

- [ ] Write a failing shell component test.
- [ ] Implement the shell.
- [ ] Apply it to `corporate`, `sst`, `employer`, and `property` pages.
- [ ] Run tests.

### Task 4: Verification and Release

**Files:**
- No new feature files.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Verify local screenshots for desktop home and mobile.
- [ ] Commit, push, deploy with `npm exec -- vercel --prod --yes`.
- [ ] Run `npm run smoke:prod`.
