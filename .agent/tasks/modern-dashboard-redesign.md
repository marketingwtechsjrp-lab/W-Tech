# Modern Dashboard Redesign Task

## Objective
Redesign the `DashboardView.tsx` component to create a high-performance, visually stunning, and interactive dashboard using `ui-ux-pro-max` principles. The design will focus on "Glassmorphism", "Neon/Glow" effects (aligned with W-Tech branding), and advanced data visualization.

## Design System & Aesthetics
- **Style**: Glassmorphism + Futuristic/Modern.
- **Color Palette**: Dark mode centric (as per W-Tech preference), using deep blacks (`#0A0A0A`, `#111`), W-Tech Red (`#E50914` or similar), and Gold accents.
- **Typography**: Inter/Sora/Outfit (Modern Sans-serif).
- **Animations**: `framer-motion` for entry, hover, and layout transitions. `react-countup` for numbers.
- **Charts**: `react-apexcharts` with custom gradients, tooltips, and animations.

## Key Features to Preserve & Enhance
1.  **KPI Cards**: Revenue, Leads, Students, Orders.
    *   *Enhancement:* Add animated backgrounds, glow effects on hover, and trend sparklines.
2.  **Financial Chart (Sales vs Expenses)**:
    *   *Enhancement:* Convert to a gradient Area chart with toggleable timeframes and improved tooltips.
3.  **Lead Funnel**:
    *   *Enhancement:* 3D-like funnel visualization or smoother bar transitions.
4.  **Rankings (Sales & Courses)**:
    *   *Enhancement:* "Leaderboard" style list with avatars and progress bars.
5.  **Recent Activity/Orders**:
    *   *Enhancement:* A "Live Feed" or ticker style component.

## Implementation Steps
1.  **Structure & Layout**: Create a grid-based, responsive layout with glass panels.
2.  **Components**:
    *   `StatCard`: Reusable KPI component with motion.
    *   `ChartSection`: Wrapper for charts with glass styling.
    *   `Leaderboard`: Stylized list for rankings.
3.  **Data Integration**: Ensure all existing logic (Revenue from Transactions, Sales Volume, Attribution) is preserved.
4.  **Polishing**: Add subtle background glows and ensure "Wow" factor.

## Tech Stack
- React (Vite)
- Tailwind CSS (v3+)
- Framer Motion
- ApexCharts
- Lucide React Icons
