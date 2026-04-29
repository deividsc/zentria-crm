# Google Stitch Prompt - Landing Demo para Tracking SDK

## Instrucciones para Google Stitch

Crear una landing page completa para el producto "Zentria Tracking SDK" usando Google Stitch.

---

## Página: Landing Demo - Zentria Tracking SDK

### 1. Configuración del Proyecto
- **Nombre del proyecto**: Zentria Landing
- **Tipo**: Website / Landing Page
- **Etiquetas**: SaaS, Developer Tool, B2B, Tech

---

### 2. Estructura de Página

#### Header (Fixed, blur en scroll)
- **Logo**: "Zentria" texto bold, color #0066FF
- **Navegación**: Features | Pricing | Docs (links, color #374151)
- **Botón derecho**: "Get Started" (primary, filled #0066FF, white text)

#### Hero Section
- **Título**: "Track every conversion with precision"
  - Font: Inter Bold, 56px, color #111827
  - Ancho máximo 640px
- **Subtítulo**: "The SDK that captures every visitor action, identifies leads, and feeds your AI scoring engine. Setup in minutes, not days."
  - Font: Inter Regular, 20px, color #6B7280
  - Ancho máximo 560px
- **CTA Primario**: "Start Free Trial" 
  - Botón filled #0066FF, white, 16px bold
  - Border-radius: 8px, padding 16px 32px
- **CTA Secundario**: "Watch Demo"
  - Botón ghost/outline, #0066FF border
  - Border-radius: 8px
- **Badges debajo**: "No credit card required" • "5 min setup" (small, gray)
- **Ilustración derecha**: Dashboard mockup con stats cards

#### Logo Bar
- **Título**: "Trusted by leading companies"
- 6 logos en grayscale (placeholder rectangles o icons)
- Spacing even, opacity 60%

#### Features Grid (3 columnas)
| # | Icono | Título | Descripción |
|---|------|--------|------------|
| 1 | Rayo ⚡ | "Real-time Events" | Capture pageview, click, form_submit, scroll_depth events instantly |
| 2 | Fingerprint 👆 | "Identity Resolution" | Merge anonymous visitors to known leads via fingerprinting |
| 3 | Code 💻 | "Easy Integration" | npm install or script tag. Works with any stack |

- Grid: 3 columnas, gap 32px
- Card: white bg, subtle shadow, border-radius 12px, padding 24px

#### Code Preview Section
- **Título**: "Embed in seconds"
- **Tabs**: npm | CDN | WordPress
- **Código** (dark theme, syntax highlighting):
```javascript
// npm
npm i @zentria/tracking

// Code
import { zentria } from '@zentria/tracking';

zentria.init({
  apiKey: 'zk_live_xxx',
  debug: true
});

zentria.track('pageview');
```
- Fondo: #1E293B (slate-800)
- Texto: #F8FAFC
- Border-radius: 12px
- Botón "Copy" esquina superior derecha

#### Testimonials (3 cards)
| Avatar | Nombre | Empresa | Quote |
|--------|--------|---------|-------|
| Circle 64px | "Sarah Chen" | "TechStart" | "Setup took 5 minutes. We saw 40% more conversions!" |
| Circle 64px | "Marcus Rodriguez" | "GrowthHub" | "The identity resolution is game-changing for our leads." |
| Circle 64px | "Emma Wilson" | "ScaleAI" | "Finally, tracking that just works." |

- Card: white, border #E5E7EB, border-radius 12px
- 5 stars arriba del quote

#### Pricing Table
| Tier | Precio | Features | CTA |
|------|--------|---------|------|
| Starter | $29/mo | 10K events/month<br>1 site<br>Basic analytics | "Start Free" |
| Pro | $99/mo | 100K events<br>Unlimited sites<br>Advanced analytics<br>Priority support | "Get Started" |
| Enterprise | Custom | Unlimited events<br>Custom integrations<br>Dedicated support | "Contact Sales" |

- "Most popular" badge en Pro
- Card Pro elevada (shadow más fuerte)

#### CTA Final
- Fondo: gradient #0066FF a #0044CC
- Título: "Ready to start tracking?"
- Input: email placeholder "Enter your email"
- Botón: "Get Started" (white, #0066FF text)
- Badges: "GDPR Compliant" | "256-bit encryption"

#### Footer
- **Columnas**: Product | Company | Developers | Legal
- **Links** en cada columna
- Social icons: Twitter, GitHub, LinkedIn
- Copyright: "© 2026 Zentria. All rights reserved."

---

### 3. Design Tokens

| Token | Valor |
|-------|-------|
| Primary | #0066FF |
| Primary Dark | #0044CC |
| Text Primary | #111827 |
| Text Secondary | #6B7280 |
| Background | #FFFFFF |
| Background Alt | #F9FAFB |
| Border | #E5E7EB |
| Code Background | #1E293B |
| Success | #10B981 |
| Error | #EF4444 |

**Typography**:
- Font Family: Inter (Google Fonts)
- H1: 56px / 64px line-height / Bold
- H2: 40px / 48px / Bold
- H3: 24px / 32px / Semibold
- Body: 16px / 24px / Regular
- Small: 14px / 20px / Regular
- Code: 14px / Fira Code or monospace

**Spacing**:
- Base: 4px
- Section padding: 80px vertical, 24px horizontal
- Container max-width: 1200px
- Grid gap: 32px

**Border Radius**:
- Small: 4px
- Default: 8px
- Card: 12px
- Full: 9999px (pill)

---

### 4. Responsive Breakpoints

| Breakpoint | Ancho | Ajuste |
|-----------|-------|-------|
| Desktop | ≥1024px | 3 columnas |
| Tablet | 768-1023px | 2 columnas |
| Mobile | <768px | 1 columna, hamburger menu |

---

### 5. Export Needed

**Para importar a代码:**
1. **Figma**: Exportar como archivo .fig o proporcionar link de sharing
2. **Web**: Exportar como código HTML/CSS/React/TypeScript

---

## ¿Qué necesito que me exportes?

Para crear la landing en código, necesito que me Exportes desde Google Stitch:

1. **Opción A - Figma**: Archivo .fig o link para importar
2. **Opción B - Código**: HTML/CSS/React con Tailwind

¿Cuál preferís y cuándo me lo mandás? Así sigo implementando el Tracking SDK paralelamente.