---
paths:
  - "src/**/*.css"
  - "src/**/*.tsx"
---

# Styling Rules

- Dark theme by default (bg: #0a0a0b ~ #141416)
- Use CSS custom properties for all theme colors (defined in index.css)
- 4px spacing grid: padding/margin in multiples of 4px
- Transitions: 150-200ms ease-out for UI state changes
- Use CSS Modules for component-scoped styles
- No inline styles except for dynamic values (e.g., slider position)
- Monospace font for numerical values and coordinates
- Minimum touch target: 32px for interactive elements
- Ensure WCAG AA contrast ratios (4.5:1 for text, 3:1 for UI)
