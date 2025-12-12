# MEPIE Foundation Website

Official website for the MEPIE Foundation - a UK Charitable Incorporated Organisation (CIO) supporting technical education and skills development in underserved communities.

## About

The MEPIE Foundation believes that compassion is a practical tool for building stronger communities. Our mission is to demonstrate a way of life rooted in helping rather than competing—supporting individuals through education, training, and development so they can uplift others in turn.

**First Project:** ME Technical School - Yaounde, Cameroon

## Technology Stack

- **Static Site:** HTML, CSS, JavaScript (no framework)
- **Build Tool:** Vite 5.0
- **Hosting:** Netlify (free tier)
- **Domain:** mepie-foundation.org

## Project Structure

```
MEPIE_FOUNDATION/
├── public/              # Static assets
│   ├── documents/       # PDFs (governing docs, financial reports)
│   └── images/          # Images (logos, trustees, projects)
├── src/
│   ├── *.html           # HTML pages
│   ├── css/             # Stylesheets
│   │   ├── base/        # Variables, reset, typography
│   │   ├── components/  # Buttons, cards, forms, header, footer
│   │   └── layouts/     # Containers, grid
│   └── js/              # JavaScript modules
├── vite.config.js       # Vite configuration
├── netlify.toml         # Netlify deployment config
└── package.json         # Dependencies and scripts
```

## Development

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

The site will be available at `http://localhost:3000` with hot module replacement.

## Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

## Deployment

### Automatic Deployment (Netlify)

1. Push code to GitHub
2. Netlify automatically builds and deploys
3. Site is live at mepie-foundation.org within 60 seconds

### Manual Deployment

```bash
# Build the site
npm run build

# Deploy to Netlify
netlify deploy --prod
```

## Monthly Maintenance

### Uploading Financial Reports

1. Export bookkeeping to PDF
2. Upload PDF to `/public/documents/financial-reports/YYYY-MM.pdf`
3. Edit the Financial Transparency page to add link
4. Commit and push changes

```bash
# Example
git add public/documents/financial-reports/2024-12.pdf
git add src/financial-transparency.html
git commit -m "Add December 2024 financial report"
git push origin main
```

## Content Updates

All content is in HTML files in the `src/` directory:

- **Home:** `src/index.html`
- **About:** `src/about.html`
- **Projects:** `src/projects.html`
- **Governance:** `src/governance.html`
- **Financial Transparency:** `src/financial-transparency.html`
- **Contact:** `src/contact.html`
- **Donate:** `src/donate.html`

To update content:
1. Edit the HTML file
2. Save changes
3. Test locally with `npm run dev`
4. Commit and push to deploy

## Design System

### Colors

- **Primary:** #1a5490 (Deep trustworthy blue)
- **Secondary:** #f39c12 (Warm optimistic orange)
- **Success:** #27ae60 (Financial transparency green)

### Typography

- **Headings:** Poppins
- **Body:** Inter

### Spacing

8px grid system (use CSS variables: `var(--space-1)` through `var(--space-8)`)

## Key Features

- ✅ Fully responsive (mobile-first)
- ✅ Accessible (WCAG 2.1 AA compliant)
- ✅ SEO optimized
- ✅ Fast loading (< 2s on 3G)
- ✅ Netlify Forms for contact
- ✅ 100% static (no database required)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Trustees

- Marshall Epie - Founding Trustee
- Aruna Ramineni - Founding Trustee
- Fitzroy Shrowder - Founding Trustee

## License

Copyright © 2024 MEPIE Foundation. All rights reserved.

This project is for the exclusive use of the MEPIE Foundation charity organization.

## Contact

- **Email:** contact@mepie-foundation.org
- **Website:** https://mepie-foundation.org
- **Registered:** Charity Commission for England and Wales (CIO)
- **Bank:** NatWest Bank

---

Built with ❤️ for creating ripple effects of positive change.
