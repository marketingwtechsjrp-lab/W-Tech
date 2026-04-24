---
name: cursos-dino
description: Automation system for managing courses, dates, dynamic landing pages, student enrollment, and Stripe payments in Neon/Postgres environments. Use when creating course platforms, managing student lists, automating Stripe checkouts, or generating dynamic course pages. Keywords: curso, LP, matricula, inscricao, stripe, neon db, portal do aluno, lista de alunos.
---

# Cursos-Dino (Course Engine)

## Purpose
This skill provides the core logic and automation for a high-performance course management system. It handles everything from database schema design for Neon (Postgres) to automatic landing page logic and Stripe payment flows.

## Core Capabilities
1. **Database Mastery**: Robust Postgres schema for multi-date courses and financial reconciliation.
2. **Dynamic LPs**: Logic for creating SEO-friendly, data-driven landing pages without static file bloat.
3. **Automated Payments**: Integration patterns for Stripe (Products, Checkouts, and Webhooks).
4. **Student Management**: Automated enrollment, list generation, and management reports.

## When to Use
- **Creation**: "Build a system to sell courses with dates in Different Cities."
- **Automation**: "Generate a dynamic LP for the course [Name]."
- **Operations**: "Enroll student [Name] into course [ID]" or "Show me the student list for the Lisboa date."
- **Payments**: "Setup Stripe for the new course pricing."

## Reference Materials
- [Database Schema (Postgres/Neon)](references/schema.sql): Complete SQL for tables and indexes.
- [Stripe Automation](references/stripe-automation.md): Webhook and API logic for payments.
- [System Logic Patterns](references/logic-patterns.md): Implementation details for LPs and enrollment.

## Implementation Guidelines
- **Schema First**: Always verify the `references/schema.sql` is applied to the Neon DB.
- **Dynamic Routes**: Use `/curso/:slug` patterns for all LPs.
- **Webhook Safety**: Always verify Stripe signatures and use idempotency keys.
- **Portuguese Support**: The system is optimized for PT-BR and PT-PT markets.
