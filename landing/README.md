# Zentria Landing Page

Simple landing page para capturar leads y mostrar servicios.

## Estructura

```
landing/
├── index.html      # Página principal
├── css/
│   └── styles.css # Estilos
└── js/
    └── tracking.js # Tracking y form handling
```

## Secciones

1. **Hero** - Presentación principal con CTA
2. **Servicios** - Los 4 servicios principales
3. **Precios** - 3 planes (Básico, Avanzado, Enterprise)
4. **Curso** - Formulario de inscripción al curso
5. **Contacto** - Formulario principal de leads
6. **Pago** - Métodos de pago (mockup)

## Tracking

El script captura automáticamente:
- UTM parameters (source, medium, campaign, term, content)
- Secciones vistas
- Clicks en botones y CTAs
- Form submissions

## Webhook

Los forms envían datos a:
```
http://136.115.7.41/webhook/lead-capture
```

## Deploy

Copiar archivos al servidor:
```bash
scp -r landing/* user@server:/var/www/zentria/
```

O usar nginx para servir desde `/landing/`.
