# Daymark — Read This First

This folder contains the product and engineering specifications for Daymark, a personal productivity tracker. Read these documents before writing application code.

## Required reading order
1. `01-PRD.md`
2. `02-USER-FLOWS.md`
3. `03-DESIGN-SYSTEM.md`
4. `04-TRD-ARCHITECTURE.md`
5. `05-DATABASE-SCHEMA.md`
6. `06-SECURITY-PRIVACY.md`
7. `07-TEST-PLAN-ACCEPTANCE.md`
8. `08-IMPLEMENTATION-PLAN.md`

## Non-negotiable instructions for Antigravity
- Do not start coding until you have read all documents and produced a concise implementation plan identifying dependencies, assumptions, and any conflicts.
- Do not replace the chosen stack or introduce extra services without explaining why and asking for approval.
- Do not create a generic AI-generated SaaS dashboard. Follow the Graphite & Mint design system exactly.
- Build a functional product, not a static mockup. All visible controls must work or be clearly marked as intentionally unavailable in the current phase.
- Use TypeScript, strict types, reusable components, clear naming, and maintainable code.
- Do not store secrets in client-side code or commit `.env` files.
- Do not modify Git settings, branches, remotes, history, or perform destructive Git operations unless explicitly instructed.
- Do not silently discard existing project code. Inspect the repository first and preserve existing work unless the user authorizes changes.
- Build in phases and run checks after each phase. Report what works, what is incomplete, and how it was verified.
- Never fake analytics, task records, reminders, email delivery, or backend success. Demo/sample data must be clearly identified and must not be mixed with real user data.
- Ensure the app works on desktop and mobile.

## Product summary
Daymark is a private, single-user-first personal productivity tracker for daily tasks, work/projects, recurring habits, pending-task carry-forward, configurable email reminders, and historical progress analytics.

## Fixed visual direction
Graphite & Mint:
- Background: `#141719`
- Surface: `#1C2023`
- Elevated surface: `#262C30`
- Accent mint: `#94CDB5`
- Primary text: `#E7ECE9`
- Secondary text: `#9AA5A3`
- Borders/dividers: `#343C40`
- Warning: `#E5B978`
- Danger: `#E28C8C`
- Information: `#8DBDE0`

No gradients, neon glow, glassmorphism, decorative 3D art, excessive cards, or random icons.
