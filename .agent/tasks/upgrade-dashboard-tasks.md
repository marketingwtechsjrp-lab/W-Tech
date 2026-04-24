# Dashboard & Tasks Upgrade Task

## Objective
Upgrade the `TaskManagerView.tsx` and `DashboardView.tsx` components to meet `ui-ux-pro-max` standards. This involves "better interactive charts with movements", a "better sales funnel model", and improved Task management UI.

## Requirements from User
1.  **Tasks**: Improve the Tasks UI using `ui-ux-pro-max`.
2.  **Dashboard Charts**: Replace existing charts with "better and more interactive ones with movements".
3.  **Sales Funnel**: Use a "better model" for the sales funnel.

## Plan
1.  **Generate Design System**: Run the `ui-ux-pro-max` search script for "Task Management" and "Interactive Dashboard".
2.  **Refactor `TaskManagerView.tsx`**:
    *   Implement Glassmorphism cards.
    *   Add Framer Motion for draggable/interactive feel (even if not full DnD, animations on status change).
    *   Better filtering UI (chips instead of native selects).
3.  **Refactor `DashboardView.tsx`**:
    *   **Financial Chart**: Upgrade to a more dynamic look (possibly Recharts area with gradient or sticking to Apex with advanced config). *Decision*: I will switch to `Recharts` for "Financial" and "Funnel" if adaptable, or heavily customize ApexCharts if Recharts is too much override. Actually, `framer-motion` + custom SVG for funnel might be the "better model" (e.g., a real 3D funnel shape or smooth path).
    *   **Funnel**: Implement a "Smooth Funnel" using Recharts Area or a custom SVG path that looks like a real liquid funnel.
    *   **Volumetry**: animated bar chart.
4.  **Verify**: Ensure light/dark mode compatibility.

## Tech Stack
- React, Tailwind CSS, Framer Motion, Recharts (potentially), Lucide Icons.
