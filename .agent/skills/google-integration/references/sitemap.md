# Sitemap Automation Guide

W-Tech uses an automated process to keep the `sitemap.xml` in sync with dynamic content from Supabase.

## Table Sources
The sitemap fetches data from:
1.  **Static Pages**: Hardcoded list (Home, Courses, Blog, etc.).
2.  **`SITE_LandingPages`**: All slugs.
3.  **`SITE_Courses`**: Slugs where `status = 'Published'`.
4.  **`SITE_BlogPosts`**: Slugs where `status = 'Published'`.

## Build Integration
The sitemap is generated during the Vite build process.
`package.json` script:
`"build": "vite build && node scripts/generate-sitemap.js"`

## Script Usage
The script `scripts/generate-sitemap.js` can be run manually to force an update:
`node scripts/generate-sitemap.js`

## XML Structure
- **Location**: `public/sitemap.xml`
- **Prefix**: Uses `https://w-techbrasil.com.br` or the configured environment URL.
- **Priority Rules**:
    - Root (`/`): 1.0
    - Main pages: 0.8
    - Landing Pages / Courses: 0.7
    - Blog Posts: 0.6
- **Frequency**: `weekly` (standard).
