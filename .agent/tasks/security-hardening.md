# Task: W-TECH Security Hardening

## Overview
Address critical security vulnerabilities found in the Supabase RLS policies and frontend implementation. These vulnerabilities currently allow anonymous users to modify system settings, lead data, and potentially execute XSS attacks.

## Critical Vulnerabilities
- [x] **Fix Row Level Security (RLS) for `SITE_SystemSettings`**:
    - [x] Problem: Current policy allows `ALL` actions for everyone (`USING(true)`).
    - [x] Fix: Change to `SELECT` for everyone, but restrict `INSERT/UPDATE/DELETE` to `service_role` or a specific admin role check.
- [x] **Fix RLS for `SITE_Leads`**:
    - [x] Problem: Anon can `UPDATE` any lead.
    - [x] Fix: Limit `UPDATE` to only the lead's own ID (using a temporary signature or session-based check) or better, use a `SECURITY DEFINER` RPC function for specific updates (like Quiz results).
- [x] **Enable RLS for `SITE_Transactions`**:
    - [x] Problem: RLS is disabled.
    - [x] Fix: Enable RLS and add basic `authenticated` policies.
- [x] **Sanitize XSS entry points**:
    - [x] Problem: `dangerouslySetInnerHTML` used on database fields that can be modified.
    - [x] Fix: Implement a sanitizer or replace with safe rendering methods where possible.
- [ ] **Secure Webhooks**:
    - [ ] Problem: No authentication for triggers.
    - [ ] Fix: Add a secret token check (using a dedicated setting).

## Phase 1: RLS Hardening (SQL)
- [x] Apply secure policies to `SITE_SystemSettings`.
- [x] Apply secure policies to `SITE_Leads`.
- [x] Apply secure policies to `SITE_Tasks`.

## Phase 2: Frontend Sanitization
- [x] Audit all uses of `dangerouslySetInnerHTML`.
- [x] Implement or use an existing sanitizer.

## Phase 3: Verification
- [ ] Verify that an anonymous user *cannot* change settings via API.
- [ ] Verify that an anonymous user *cannot* update random leads.
- [ ] Verify that `dangerouslySetInnerHTML` is protected against script injection.

## Metadata
- **Agent:** `security-auditor`
- **Status:** Planning
- **Priority:** Critical
