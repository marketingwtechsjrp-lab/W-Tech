# Plan: Creating the `Cursos-Dino` Skill

This plan outlines the creation of a specialized skill for automating a course management system (Cursos-Dino) for a Neon DB/Postgres environment.

## Phase 1: Preparation & Schema Design
1.  Analyze requirements for course dates, dynamic LPs, and student management.
2.  Design a robust PostgreSQL schema (Neon-compatible) for courses, dates, enrollments, and transactions.
3.  Define the Stripe integration flow (Product -> Checkout -> Webhook).

## Phase 2: Skill Initialization
1.  Create the directory `.agent/skills/cursos-dino/`.
2.  Initialize `SKILL.md` with appropriate metadata and triggers.
3.  Create the `references/` subdirectory.

## Phase 3: Reference Documentation
1.  Create `references/schema.sql` with the complete database setup.
2.  Create `references/stripe-automation.md` with procedural steps for Stripe integration.
3.  Create `references/logic-patterns.md` for dynamic LP generation and student ingestion.

## Phase 4: Verification
1.  Review the skill for compliance with the 500-line rule.
2.  Validate triggers and keywords.
3.  Package or finalize the skill for use.

## Details of Schema Refinement
- Use `citext` or standard `TEXT` with indexes for slugs.
- Ensure multi-currency support (BRL, EUR, etc.) as seen in W-Tech.
- Implement capacity management logic.
