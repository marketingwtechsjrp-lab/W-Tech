---
name: vercel-react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering.
---

Comprehensive performance optimization guide for React and Next.js applications, maintained by Vercel.

### 1. Eliminating Waterfalls (CRITICAL)
- `async-parallel` - Use Promise.all() for independent operations
- `async-defer-await` - Move await into branches where actually used

### 2. Bundle Size Optimization (CRITICAL)
- `bundle-barrel-imports` - Import directly, avoid barrel files
- `bundle-dynamic-imports` - Use next/dynamic for heavy components
