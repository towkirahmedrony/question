# Porokh AI Question Importer

Staff tool that turns question-paper photos into reviewed MCQs for Porokh. It is
a thin client: all AI work happens in `porokh-backend`.

## Setup

```bash
npm install
cp .env.example .env.local   # VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

### AI extraction credentials

This app holds no AI provider key. Images are posted to
`POST /ai/extract-questions` on the backend, which calls Gemini with its own
server-side credential and returns only sanitised questions.

Extraction runs on its **own** Google Cloud project and key, separate from the
student AI Assistant. The backend reads:

| Variable | Purpose |
| --- | --- |
| `EXTRACTION_GEMINI_API_KEY` | Gemini key from the extraction Google Cloud project. Required; there is no fallback. |
| `EXTRACTION_GEMINI_MODEL` | Optional model override (default `gemini-3.8-flash`). |

When the key is missing the endpoint answers `503 EXTRACTION_NOT_CONFIGURED`.
See `porokh-backend/.env.example` and `porokh-backend/README.md` for the full
backend configuration.

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
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

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
# question
