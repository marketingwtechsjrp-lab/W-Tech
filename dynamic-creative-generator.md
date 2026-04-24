# Dynamic Creative Generator Implementation Plan

## Objective
Create a dynamic social media creative generator (Instagram/Facebook Stories) integrated into the Courses module. This tool will allow admins to quickly generate professional promotional images based on course data, with 3 customizable high-fidelity templates.

## 🛠️ Tech Stack & Approach
- **Frontend**: React (implemented within the Admin panel).
- **Styling**: Tailwind CSS (W-Tech design system).
- **Rendering/Export**: HTML Canvas (using `html2canvas`) or SVG-to-Image approach for high-resolution downloads.
- **Templates**: 3 CSS-driven layouts focused on the references provided (Story 9:16).

## 📋 Tasks

### PHASE 1: Infrastructure & Component Setup
- [ ] Install `html2canvas` for client-side image rendering.
- [ ] Create `components/admin/Courses/CreativeHub.tsx`.
- [ ] Define the `CreativeHub` UI (Modal with sidebar for settings and preview area).
- [ ] Add state management for course data injection (Title, Date, Instructor, Location, Pricing).

### PHASE 2: Template Design (The "Creative 3")
- [ ] **Template 1: "The Core"** (Based on Alex Crepaldi suspension course image). Dark/Red/Premium look.
- [ ] **Template 2: "The Experience"** (Based on "Experience" image). Gold/Black/Circular elements.
- [ ] **Template 3: "Technical Talk"** (Based on "A Manutenção Invisível" image). Focused on logos and technical authority.
- [ ] Add "Visual Philosophy" from `canvas-design` skill to ensure premium look.

### PHASE 3: Admin Integration
- [ ] Add "Generate Creative" (Wand icon) button to the `CoursesManagerView` table in `Admin.tsx`.
- [ ] Integrate the `CreativeHub` modal into the main Admin flow.
- [ ] Implement asset mapping (automatically pulling course images and logos).

### PHASE 4: Export & Polish
- [ ] Implement the download function (PNG/JPG).
- [ ] Add basic text editing (fine-tuning titles/dates before download).
- [ ] Ensure responsiveness of the editor.

## 🔍 Verification Points
- [ ] Verify that the generated image resolution is 1080x1920 (Story standard).
- [ ] Check if all course data (dates, instructor names) are correctly localized and formatted.
- [ ] Test the download on mobile and desktop browsers.
