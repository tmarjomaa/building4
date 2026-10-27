---
author: "Tommi Marjomaa"
title: "Claude Code to the Rescue! Helping Out the Lazy Admin"
linktitle: "Claude Code to the Rescue! Helping Out the Lazy Admin"
description: "My blog had been left alone for almost two years. I handed the repo to Claude Code, mostly stayed out of the way, and ended up with eight pull requests worth of fixes, from an EOL Node.js runtime to a malware domain and a CSP that was quietly breaking my code blocks."
date: "2026-10-27T12:00:00+02:00"
tags: ["azure", "staticwebapps", "hugo", "github", "genai", "claudecode"]
draft: true
---

<!-- TODO screenshot: hero image for the post -> /images/claude-code-to-the-rescue.png -->
![Claude Code working through the building[4].cloud repository](/images/claude-code-to-the-rescue.png)

Confession time. The last post on this site was published in December 2024, and the repository behind it had been in roughly the same state for even longer. Nothing was broken (as far as I knew), so nothing got touched. Runtimes went end of life, a theme drifted years behind upstream, and leftover configuration for things I never used just sat there. Classic lazy admin.

So I tried something different. Instead of finding a free weekend that never comes, I opened the repo in [Claude Code](https://docs.claude.com/en/docs/claude-code/overview), Anthropic's coding agent, and asked it to have a look. This post is the story of how that went: what it found, what we changed, and what my role was. Spoiler: it was mostly reviewing, watching, and making sure we didn't do anything really stupid.

## What is building[4].cloud made of?

A quick recap for context. This blog is a [Hugo](https://gohugo.io/) static site using the [hugo-kiera](https://github.com/funkydan2/hugo-kiera) theme as a git submodule. It's hosted on [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/overview), which builds and deploys it from GitHub Actions, and every pull request gets its own preview environment. I wrote about the setup back in [We're Live and Kicking in Azure Static Web Apps](/posts/we-are-live-and-kicking/) and [How to Use Staging in Azure Static Web Apps](/posts/how-to-use-staging-in-azure-static-web-apps/).

There's also one small Azure Functions API, `/api/temperatures`, which returns the latest RuuviTag readings from Cosmos DB.

## How we worked

I started simple: give me an overview of the repo. Then: audit it for anything legacy, deprecated or end of life. Claude Code came back with a list, and from there we went through it **one pull request at a time**:

1. Claude Code made the change on a new branch and opened a PR with a description of what and why.
2. I checked the result on the PR's Static Web Apps preview environment.
3. If I was happy, I merged it.

I don't run Hugo locally, so to check its own work Claude Code downloaded the same Hugo version the pipeline uses (0.148.2 extended, checksum verified) into a scratch folder, built the site before and after each change, and diffed the output. It also served the builds locally with the production Content Security Policy and loaded pages in a browser to look for console errors. That turned out to matter a lot, as you'll see.

Eight PRs got merged in one Sunday. Here's what they were.

## The API: an EOL runtime nobody pinned

The first finding was the API. The Static Web Apps configuration didn't pin a Node.js version for the API at all, and Node 20 left Azure Functions support on 30 April 2026. The function itself still used the old v3 programming model (`function.json` plus `module.exports`), with an extension bundle of `[2.*, 3.0.0)` and `@azure/cosmos` v3.

The fix was to pin the runtime in `staticwebapp.config.json`:

```json
{
  "platform": {
    "apiRuntime": "node:22"
  },
  ...
}
```

Then migrate the function to the [Node.js v4 programming model](https://learn.microsoft.com/azure/azure-functions/functions-reference-node), where the trigger is declared in code instead of a separate `function.json`:

```javascript
const { app } = require("@azure/functions");

app.http("temperatures-get", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    route: "temperatures",
    handler: async (request, context) => {
        // ...
    }
});
```

The extension bundle went to `[4.*, 5.0.0)`, `@azure/cosmos` to v4, and the Cosmos client is now created once and reused instead of on every request.

While migrating, Claude Code spotted a bug that had been there since day one. The error handler looked like this:

```javascript
} catch (err) {
    context.log(err.message);
    context.res.status(500).send(error);
}
```

See it? The caught variable is `err`, but the response sends `error`, which doesn't exist. So any failure threw a second error instead of returning a 500. Now it logs the error and returns a generic `Failed to read temperatures` message. Before opening the PR, it ran the handler locally against a stubbed Cosmos client and checked that GET, POST and the error path all behaved like before.

## A malware domain hiding in a template

The second finding was a bit scarier. My `header_includes.html` partial had this line:

```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
```

The polyfill.io domain was taken over in 2024 and used to serve malicious code. The good news: the tag only rendered when MathJax was enabled, and it wasn't, so visitors never loaded it. The ES6 polyfill isn't needed by any current browser anyway, so out it went.

**Note!** If you've got an old Hugo site (or any site) with a polyfill.io reference somewhere in a template, go and check it now.

## GitHub Actions on a deprecated Node.js

Small one. The workflow used `actions/checkout@v4`, which runs on Node 20, and GitHub has deprecated Node 20 on Actions runners. The current major, v7, runs on Node 24. The changes in v6 and v7 don't affect a workflow that only uses `push` and `pull_request` triggers, so this was a one-line change:

```yaml
- uses: actions/checkout@v7
```

## The CSP had been breaking my code blocks all along

This was my favourite finding, because I had no idea.

The site sends a Content Security Policy header from `staticwebapp.config.json`, and its `style-src` doesn't allow `'unsafe-inline'`. Good for security. But Hugo's default syntax highlighting writes an inline `style="color:..."` attribute on every token, and the CSP blocks every one of them. So code blocks on the live site had been rendering without their Monokai colours. My AKS post alone logged 69 CSP violations in the browser console.

<!-- TODO screenshot: DevTools console on the AKS post full of CSP style-src violations (before) -> /images/claude-code-to-the-rescue-csp-errors.png -->

The fix is to tell Hugo to use CSS classes instead of inline styles, and serve the colours as a normal stylesheet. In `config.toml`:

```toml
[markup]
  [markup.highlight]
    codeFences = true
    noClasses = false
    style = "monokai"
```

The stylesheet is generated with Hugo itself and added to the theme's `customCSS` list:

```bash
hugo gen chromastyles --style=monokai > static/css/syntax.css
```

Across the whole site, inline `style=` attributes went from 1,749 to 0.

<!-- TODO screenshot: the same post after the fix, code block with Monokai colours and a clean console -> /images/claude-code-to-the-rescue-code-colours.png -->

### Tightening the policy

While in there, the CSP itself got a cleanup. It still allowed Google Analytics (the site has no analytics), had a stale `sha256` hash for an inline script that no page has, and was missing a few directives that don't fall back to `default-src`: `object-src`, `base-uri`, `form-action` and `frame-ancestors`.

### The one I spotted

Here's where the reviewer earned his keep. When I checked the preview with DevTools open, I saw a CSP error that the local testing hadn't caught. The cause: normalize.css was loaded from cdnjs, and the minified file ends with a `sourceMappingURL` comment. With DevTools open, the browser tries to fetch the source map, and `connect-src 'self'` blocks it. Visitors would never see it, but a red error in the console is still a red error. The fix was to host normalize.css on the site itself, with the map comment removed, and drop cdnjs from the CSP.

<!-- TODO screenshot: the normalize.css source map CSP error in DevTools -> /images/claude-code-to-the-rescue-sourcemap-error.png -->

## Removing what was never used

The site has never had comments, but `config.toml` still had an empty `[services.disqus]` block, and the post footer partial had branches for both Disqus and utterances. Neither was configured, so neither ever rendered. Claude Code removed them and compared the build output against `main`: the only differences were whitespace. Exactly what you want from a cleanup PR.

## Five years of theme updates

The hugo-kiera submodule was pinned to a commit from June 2020. Upstream had 69 more commits, including fixes for Hugo deprecations, and now requires Hugo 0.128 or newer (the pipeline uses 0.148.2). Updating a submodule is one command. Knowing what it changes on your site is the hard part, and this is where the before/after build diff really paid off.

### An RSS regression

The new upstream RSS template strips all control characters from the feed content. That sounds reasonable, until you notice that newlines and tabs are control characters too. Code blocks in the feed would collapse into a single line, and words across soft line breaks would be joined together ("distribution" and "intensity" becoming one word, for example). The fix was a local `layouts/_default/rss.xml` override that keeps `\t`, `\n` and `\r` but still strips the characters that are invalid in XML:

```go-html-template
<description>{{ .Content | replaceRE `[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]` "" | html}}</description>
```

With the override, the feeds came out identical to before.

### Twitter is X now

The site had a partial local copy of Font Awesome 5. Dropping it in favour of the theme's Font Awesome 6.4.0 seemed like the obvious move, until we wanted the X logo for the header and share buttons: `fa-x-twitter` arrived in Font Awesome 6.4.2. So the site now vendors Font Awesome Free 6.7.2 from the official npm package, and a local `data/social.toml` overrides the theme's copy with the twitter entry pointing to X:

```toml
[[social_icons]]
id = "twitter"
url = "https://x.com/%s"
title = "X"
icon = "fab fa-x-twitter"
```

<!-- TODO screenshot: header and share icons before (Twitter bird) and after (X logo) -> /images/claude-code-to-the-rescue-x-icons.png -->

The other visible change from the theme update: "6 minutes read" became "6 minute read". I can live with that.

## Self-hosting the fonts

The last external dependency was Google Fonts. Roboto Slab and Ruda are now served from the site itself: 11 `woff2` files (about 110 KB in total) with a local `fonts.css` that keeps the same `unicode-range` values, so browsers still download only the character sets a page needs. Both fonts' licences (Apache 2.0 and SIL OFL 1.1) allow self-hosting. As a bonus, visitors' browsers no longer contact Google on every page view, which also removes the GDPR question around Google Fonts.

That made the final CSP very short. Before:

```text
default-src 'self'; script-src 'self' https://www.google-analytics.com 'sha256-...'; style-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://www.google-analytics.com; img-src 'self'
```

After:

```text
default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'
```

Everything comes from the site itself.

## Teaching the next session

The last PR wasn't a fix at all. Claude Code wrote a `CLAUDE.md` file, which it loads automatically in every session in this repo. It documents the stack, which theme files the site overrides and why, and the rules that are easy to break: the CSP allows only `'self'`, no inline styles or scripts, a branch and PR for every change, and hands off published posts. The next time Claude Code comes back to this repo, it doesn't have to rediscover all of that.

It also added a project [skill](https://docs.claude.com/en/docs/claude-code/skills) for writing blog posts in this site's style. And yes, you guessed it: the first draft of this post was written with that skill, from the PR descriptions, and then edited by me.

<!-- TODO: anything to add about how much of the draft you rewrote -->

## My role: reviewer, and part bystander

I'll be honest: a lot of the time I was a bystander, watching where things ended up when I let Claude Code work its way through the repo. My job was to set the direction, read every PR, check the preview, and make sure we didn't end up doing anything really stupid. Nothing got merged without me looking at it on the preview environment first, and nothing went to `main` directly.

A few things stood out:

- **It found real problems, not just version bumps.** The API error handler bug and the CSP silently breaking code highlighting had both been there for years.
- **Verifying was part of the work.** Building before and after and diffing the output is what caught the RSS regression. I wouldn't have spotted that by clicking around the preview.
- **A human looking at the result still matters.** The normalize.css source map error only showed up when I opened DevTools on the preview.
- **Small PRs made reviewing easy.** Eight focused PRs with clear descriptions were much easier to check than one big "modernize everything" change would have been.

<!-- TODO: your own impressions in your words: what surprised you, what you'd do differently, would you do it again -->

## Wrapping it up

In one Sunday, a blog that had been coasting for two years got a supported API runtime, lost a reference to a malware domain, got its code colours back, dropped every external dependency, and gained a set of notes so the next round of maintenance starts from where this one ended. All without me writing much code, but with me reading all of it.

If you've got a side project quietly gathering dust, this is a pretty good way to get it back into shape. Just keep the changes small, check every one of them, and stay in the driver's seat.

I hope you learned something new from this blog post, and in case you want to contact me, feel free to reach me through [LinkedIn](https://linkedin.com/in/tommimarjomaa) or [X](https://x.com/tommimarjomaa).
