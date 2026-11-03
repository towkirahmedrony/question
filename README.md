# Porokh AI Question Importer

Staff tool that turns question-paper photos, pasted text, PDFs, CSV and TXT
files into reviewed MCQs for Porokh. It is a thin client: content extraction
runs in the browser and all AI work happens in `porokh-backend`.

## Workflow

1. Paste text, take photos, pick gallery images, or add PDF/CSV/TXT files.
2. The browser reads TXT and CSV, extracts text from PDFs and renders scanned
   PDF pages as images. The original file never leaves the device.
3. The prepared text/page images are sent to `POST /ai/extract-questions`, which
   calls Gemini with the backend's server-side key.
4. Gemini returns one **Structured Plain Text** document, not JSON.
5. Review and edit the plain text, then import it as-is. The backend parses it,
   links institutions, and writes the canonical question rows.

## Supported inputs

- Direct pasted text.
- Camera capture and gallery images (JPG, PNG, WEBP).
- PDF: text pages are read locally, scanned pages are rendered and OCR'd by
  Gemini; encrypted or damaged files show a clear error.
- CSV: RFC 4180 quoting, UTF-8/Bangla, header detection and mapping of the
  admin columns (`q_text_bn`, `opt_1_bn`, `correct_opt`, `exp_bn`, ...).
- TXT: read as UTF-8 and chunked on line boundaries.
- Any mix of the above in one session. Sources are labelled per request so the
  model does not merge content across them.

## Setup

```bash
npm install
cp .env.example .env.local   # VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

### AI extraction credentials

This app holds no AI provider key. Content is posted to
`POST /ai/extract-questions` on the backend, which calls Gemini with its own
server-side credential and returns only the sanitised plain text.

Extraction runs on its **own** Google Cloud project and key, separate from the
student AI Assistant. See `porokh-backend/.env.example` and
`porokh-backend/README.md` for the full backend configuration. When the key is
missing the endpoint answers `503 EXTRACTION_NOT_CONFIGURED`.

## Backend endpoints used

| Endpoint | Purpose |
| --- | --- |
| `POST /ai/extract-questions` | Mixed text/image sources -> Structured Plain Text. |
| `POST /content/questions/parse-text` | Validate and preview the edited plain text. |
| `POST /content/questions/import-text` | Parse and import the approved plain text into Supabase. |
| `POST /content/questions/import` | Existing admin JSON import (untouched). |

## Deployment

Deploy on Vercel with the existing `vercel.json` (Vite preset, `dist/`). Set
`VITE_API_URL`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the project
environment. The deployed origin must be added to the backend `CLIENT_URL`
(comma separated) or the browser preflight will be rejected; do not widen the
backend's fixed origin list.

## Scripts

```bash
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build
npm run typecheck  # tsc -b
npm test           # node --test
npm run lint       # oxlint
```

## Template notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
