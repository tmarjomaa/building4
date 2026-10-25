# building[4].cloud

Personal tech blog (Azure, DevOps, PowerShell, Kubernetes, IaC) at https://building4.cloud.
Hugo static site plus one small Azure Functions API, hosted on Azure Static Web Apps.

## Stack and layout

- **Hugo 0.148.2 extended** (pinned in the workflow as `HUGO_VERSION`). Config: `config.toml`.
- **Theme:** `themes/hugo-kiera`, a git submodule of funkydan2/hugo-kiera. Never edit files inside it;
  override them instead by adding a file at the same path under `layouts/`, `static/` or `data/`.
- **Site overrides of the theme** (check these before assuming theme behaviour):
  - `layouts/partials/*`: header, footer, article, meta, header_includes, single_footer, and others.
  - `layouts/_default/rss.xml`: upstream strips all control characters from feed content. The local
    copy keeps `\t\n\r` so code blocks and line breaks survive in the feed.
  - `static/fontawesome/`: Font Awesome Free 6.7.2. The theme ships 6.4.0, which lacks `fa-x-twitter`.
  - `data/social.toml`: the theme's social links, with the twitter entry pointing to X.
- **Content:** posts in `content/posts/*.md`, images in `static/images/`.
- **API:** `api/` is an Azure Functions app (Node.js v4 programming model, Node 22, extension bundle v4).
  The single function `api/src/functions/temperatures-get.js` serves `GET/POST /api/temperatures` with
  the latest RuuviTag readings from Cosmos DB (`measurementdb` / `measurementdata`, `@azure/cosmos` v4).
  App settings: `COSMOSDB_CONNECTION_STRING` and `cosmos_ruuvi_macs` (a comma-separated list of MAC
  addresses). Every Static Web Apps environment, including PR previews, needs both.
- **Hosting/CI:** `.github/workflows/azure-static-web-apps-*.yml`. Pushing to `main` deploys to
  production; each PR gets its own preview environment. `static/staticwebapp.config.json` holds the
  API runtime (`node:22`), the 404 rewrite and the security headers.

## Workflow

- Always work on a new branch and open a PR into `main` with `gh`. Never push to `main` directly.
- Only merge a PR when Tommi explicitly asks. Use a merge commit (`gh pr merge --merge --delete-branch`).
- Tommi checks changes on the PR's Static Web Apps preview, not with a local Hugo server.
  To compare builds before opening a PR, Claude may download Hugo 0.148.2 extended from the official
  gohugoio/hugo GitHub release (verify the checksum) into its scratch folder. Don't install it.
- Commit messages: a short imperative subject, then a body explaining why.

## Rules that are easy to break

- **The CSP allows only `'self'`** (see `staticwebapp.config.json`). Every script, stylesheet, font and
  image must be served from the site itself. Prefer self-hosting over adding a domain to the CSP;
  if a domain really is needed, update the CSP in the same PR. Remove `sourceMappingURL` comments from
  vendored minified files (DevTools fetching the map trips `connect-src`).
- **No inline styles or scripts.** `style-src` has no `'unsafe-inline'`, so `style="..."` attributes are
  blocked. Syntax highlighting therefore uses CSS classes (`markup.highlight.noClasses = false`); if
  the style changes, regenerate it with `hugo gen chromastyles --style=monokai > static/css/syntax.css`.
- **Line endings:** many files are committed with CRLF. Edit them so the endings are preserved; a diff
  that rewrites every line is a line-ending accident, and must be fixed before opening a PR.
- **Published posts:** don't edit anything in `content/posts/` that has `draft: false` unless asked.

## Blog posts

- Front matter fields: `author`, `title`, `linktitle`, `description`, `date` (ISO 8601 in Finnish time:
  `+03:00` in summer, `+02:00` in winter), `tags`, `draft`. See `archetypes/` and existing posts for examples.
- New posts always start with `draft: true`. Never set `draft: false` unless Tommi asks.
- File names are lowercase-hyphenated slugs; images go in `static/images/` and are referenced as
  `/images/<name>.png`.
