# KabadiLink demo

## Environment configuration

The Netlify deployment publishes the existing browser-based prototype, not the AWS backend. Leave `VITE_API_URL` unset in Netlify to use the existing mock client. No application environment variables or AWS credentials are required for this demo.

`VITE_API_URL` is only needed for a separately deployed, compatible live API. Vite embeds `VITE_*` variables into public browser assets, so never put credentials or secrets in them. Changing these variables requires a new deployment.

The backend variables `TABLE_NAME`, `PHOTOS_BUCKET`, `SNS_TOPIC_ARN`, `DEMO_MODE`, `AWS_REGION`, and `DYNAMODB_ENDPOINT` do not configure the browser demo and are not needed on this Netlify site.

## Publishing

The repository-root `netlify.toml` keeps the build at the repository root so shared modules can use the root dependencies. Netlify installs those dependencies, then the configured command installs the frontend's locked dependencies and builds the app. Only `frontend/dist` is published, not source code or the AWS backend.

The application uses hash-based navigation, so its routes do not require a server-side SPA rewrite. Demo records remain in the current browser's local storage; they are sample data, are not shared across devices, and are not a production database. Publishing the demo preserves that existing behavior.

## Frontend tooling

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
