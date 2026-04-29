---
name: Precision Engineering
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#424656'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#a33200'
  on-tertiary: '#ffffff'
  tertiary-container: '#cc4204'
  on-tertiary-container: '#fff6f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832600'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  h1:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
  code:
    fontFamily: monospace
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The brand personality is engineered for reliability, transparency, and high performance. Target users are developers and technical product managers who value efficiency over decoration. This design system evokes an emotional response of "stable power"—the UI stays out of the way to let data and code take center stage, while maintaining a polished, enterprise-ready feel.

The aesthetic follows a **Corporate / Modern** direction. It utilizes generous whitespace, a high-contrast utilitarian palette, and a focus on systematic alignment. The style avoids trendy flourishes in favor of functional clarity, ensuring that complex tracking data remains legible and actionable.

## Colors
The palette is rooted in a high-energy "Action Blue" used for primary interactions and brand presence. The neutral scale is carefully stepped to provide depth without introducing visual noise.

- **Primary & Interaction:** Use #0066FF for primary calls to action and #0044CC for hover/active states.
- **Surface & Background:** The main workspace uses #FFFFFF, with #F9FAFB (Background Alt) used to distinguish sidebars, headers, or secondary content sections.
- **Typography:** Primary information is set in #111827 for maximum readability, while metadata and labels use #6B7280.
- **Technical Context:** Code blocks use #1E293B to create a distinct visual "sink" for technical snippets, providing a dark-mode-lite experience within the light interface.
- **Borders:** A consistent #E5E7EB is used for structural division.

## Typography
This design system utilizes **Inter** for all UI elements to ensure a neutral, systematic, and utilitarian feel. 

- **Headlines:** Use H1 and H2 for page titles and major section headers. Tighten letter-spacing slightly for larger sizes to maintain visual density.
- **Body:** The 16px body size is the workhorse of the system, optimized for long-form documentation and data interpretation.
- **Labels:** Smaller 14px text is reserved for form labels, table headers, and secondary UI metadata.
- **Code:** Monospaced fonts should be used within code blocks (#1E293B background) to maintain syntax alignment and developer familiarity.

## Layout & Spacing
The layout philosophy follows a **Fixed Grid** approach for the main dashboard content (1280px max-width) and a **Fluid Grid** for documentation and data tables. 

A strict 8px-based spatial rhythm governs the system. All margins and paddings should be increments of 8px (or 4px for micro-adjustments). Gutters are set to 24px to provide enough breathing room between complex data visualizations. For dense data views, use the "Compact" variant of the spacing system, reducing the base increment to 4px.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Ambient Shadows**. 

1.  **Level 0 (Flat):** Used for the main background (#FFFFFF or #F9FAFB).
2.  **Level 1 (Card):** Uses a 1px border (#E5E7EB) and a subtle ambient shadow (0px 1px 3px rgba(0,0,0,0.1)) to lift the element off the background.
3.  **Level 2 (Dropdowns/Modals):** Uses a more pronounced shadow (0px 10px 15px -3px rgba(0,0,0,0.1)) to indicate temporary interaction layers.

This design system avoids heavy gradients, preferring flat fills and crisp borders to maintain a professional B2B aesthetic.

## Shapes
The shape language is precise and approachable. 

- **Buttons:** Use a 8px (0.5rem) radius to balance the seriousness of the brand with modern UI trends.
- **Cards & Containers:** Use a 12px (0.75rem) radius. This larger radius helps distinguish major content blocks from smaller UI components like buttons and inputs.
- **Form Inputs:** Mirror the button radius (8px) to create a cohesive interactive language.
- **Code Blocks:** Use a 8px radius to keep the technical sections feeling integrated with the rest of the interface.

## Components

### Buttons
Primary buttons use the Primary Blue (#0066FF) with white text. Secondary buttons use a transparent background with a 1px border (#E5E7EB) and Text Primary (#111827). All buttons feature an 8px corner radius and a medium font weight.

### Cards
Cards are the primary container for data. They feature a 12px radius, a 1px border (#E5E7EB), and the "Level 1" subtle shadow. Internal padding should be at least 24px (lg).

### Code Blocks
Code blocks are essential for this developer-focused system. They use a Slate-800 (#1E293B) background, 8px radius, and 16px internal padding. Text should be monospaced with syntax highlighting using the Success (#10B981) and Primary (#0066FF) colors for keywords.

### Input Fields
Inputs follow the button height and radius (8px). Use #FFFFFF for the background, #E5E7EB for the border, and #111827 for the input text. On focus, the border should change to Primary Blue (#0066FF) with a subtle 2px outer glow.

### Chips & Badges
Small, 4px-radius indicators used for status (Success/Error). They use a light tinted background (10% opacity of the status color) with high-contrast text for accessibility.