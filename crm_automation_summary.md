# Automation of CRM to Enrollment Flow

## Overview
This implementation automates the process of enrolling a student into a course when a lead is converted in the CRM. It also enhances the enrollment management with new fields for address, credentialing, and recycling course pricing.

## Key Components Modified

### 1. Database Schema
- **`SITE_Courses`**: Added `recycling_price` (numeric).
- **`SITE_Enrollments`**: Added `address`, `address_number`, `address_neighborhood`, `city`, `state`, `zip_code`, `is_credentialed` (boolean).

### 2. CRM Module (`CRMView.tsx`)
- **Callback Integration**: Added `onConvertLead` prop to the component.
- **Trigger Logic**: Inside `onDropLead`, when a lead status changes to 'Converted', 'Matriculated', 'Fechamento', or 'Ganho', the `onConvertLead` callback is fired with the lead data.

### 3. Admin Dashboard (`Admin.tsx`)
- **State Management**: Introduced `pendingEnrollmentLead` state to store the lead being converted.
- **View Orchestration**:
    - When `CRMView` fires `onConvertLead`, the lead is stored in state, and the view is switched to `courses_manager`.
    - `CoursesManagerView` is rendered with `initialLead` prop.

### 4. Courses Manager (`CoursesManagerView` in `Admin.tsx`)
- **Auto-Enrollment Logic**:
    - A `useEffect` listens for `initialLead`.
    - It attempts to find a matching course based on `lead.contextId` (fuzzy match against course title).
    - If a match is found (or fallback to first course), it opens the Enrollment Modal.
    - Enrollment form is pre-filled with Lead Name, Email, and Phone.
- **Enhanced Enrollment Form**:
    - **Address Fields**: Added inputs for CEP, City, State, Address, and Credentialing Checkbox.
    - **Price Selection**: Added logic to toggle `amountPaid` between the Course's "Standard Price" and "Recycling Price" (if available).
    - **Credentialing**: Added a checkbox `isCredentialed` which tags the student as an authorized mechanic/workshop (for future map features).

## Workflow
1.  **User Actions**: User drags a Lead to "Ganho" or "Matriculado" in CRM.
2.  **System Action**:
    *   CRM detects change -> notifies Admin.
    *   Admin switches screen to "Cursos".
    *   "Cursos" module loads, finds the relevant course (e.g., "Curso Híbrido" from lead context).
    *   Enrollment Modal pops up with user info pre-filled.
3.  **Completion**: User verifies info, selects "Padrão" or "Reciclagem" price, adds address details if needed, and clicks "Salvar".
4.  **Result**: Student is enrolled, transaction is logged (via existing logic), and credentials are set.
