---
name: blog-post
description: Draft a new building[4].cloud blog post from a topic, notes or the current conversation, or review a draft Tommi wrote (typos, unclear jargon, technical accuracy). Use when asked to write, draft, outline, proofread or check a blog post.
---

# Writing for building[4].cloud

Two modes. Work out which one the request is; ask if it's unclear.

1. **Draft a post**: write a complete first draft from the topic, notes, or what was done in the
   conversation (for example, "write a post about today's site modernization").
2. **Review a draft**: Tommi wrote it. Fix typos and grammar, flag unclear jargon, and check
   technical accuracy. Keep his wording and voice; don't rewrite paragraphs that work.

## Before writing

- Read two or three recent posts in `content/posts/` to calibrate the voice.
- If the topic isn't clear enough to write a hands-on post, ask up to three questions first:
  what did he actually build or run, what's the environment, and who is the reader.
- Never invent results, command output, versions, prices or measurements. Use output from the
  conversation or real commands; otherwise leave a clearly marked placeholder (see below).

## Voice

- First person, conversational, practical. "I" for what Tommi did, "you" and "we" for the reader
  following along. A bit of humour is fine; hype is not.
- Hands-on walkthroughs: explain why briefly, then show the exact commands and what they return.
- Plain explanations of concepts before using them ("What is GitOps, Flux, Helm and all that stuff?").
- Use **Note!** in bold for important caveats, such as cost or security warnings.
- Link to official docs (Microsoft Learn, project docs) rather than restating them at length.

## Structure

- Opens with a hero image line `![<descriptive alt text>](/images/<slug>.png)`, then a short intro that
  says what the post covers and why it matters.
- `##` section headings that follow the steps, for example: what and why, setting it up, the main
  steps, cleaning up, wrapping it up. Use `###` only when a section really needs it.
- End with a short wrap-up section, then the sign-off:
  `I hope you learned something new from this blog post, and in case you want to contact me, feel
  free to reach me through [LinkedIn](https://linkedin.com/in/tommimarjomaa) or
  [X](https://x.com/tommimarjomaa).`
- Typical length is 1,000 to 2,000 words. Shorter is fine for cheat sheets and quick tips.

## Code and images

- Every code block has a language: `bash`, `powershell`, `json`, `yaml`, `python`, `kusto` and so on.
  Show command output in the same block (with a `$ ` prompt for bash when mixing the two) or a
  separate block after a sentence explaining it.
- Remove or redact secrets, subscription IDs, tenant IDs, keys and personal IP addresses in commands
  and output.
- Images live in `static/images/` and are referenced as `/images/<name>.png` with descriptive alt text.
  When a screenshot is needed but doesn't exist, leave a placeholder for Tommi:
  `<!-- TODO screenshot: <what it should show> -> /images/<slug>-<what>.png -->`
- No raw HTML with `style=""` or `<script>`: the site's CSP blocks both.

## Front matter

Create new posts at `content/posts/<slug>.md`, where the slug is the title in lowercase and hyphenated.
`archetypes/posts.md` holds the same template (`hugo new content posts/<slug>.md` fills it in). The date
uses Finnish time: `+03:00` in summer, `+02:00` in winter.

```yaml
---
author: "Tommi Marjomaa"
title: "Title in Title Case"
linktitle: "Title in Title Case"
description: "One or two sentences used on the post list and in social cards."
date: "YYYY-MM-DDTHH:MM:00+02:00"
tags: ["azure", "kubernetes"]
draft: true
---
```

- `draft: true` always. Only set `draft: false` when Tommi asks; publishing is his call.
- Reuse existing tags where they fit; list them with
  `grep -rhoE '^tags: .*' content/posts | sort | uniq -c`.

## Reviewing a draft

Report back in this order, then apply only what Tommi agrees to (typo fixes can be applied directly):

1. **Typos and grammar.** Fix them directly.
2. **Technical accuracy.** Wrong or outdated commands, flags, product names (Azure renames things
   often), versions, and missing prerequisites. Say what's wrong and why.
3. **Clarity.** Jargon used without explanation, missing steps a reader would trip over.
4. **Front matter.** Required fields, `draft: true`, a description that sells the post.

## Finishing

- Work on a new branch and open a PR, as described in CLAUDE.md. Tommi reviews the post on the PR preview.
- Hugo skips `draft: true` posts, so a draft doesn't appear on the PR preview. Tell Tommi, and offer
  to set `draft: false` on the branch if he wants to see it rendered there. Never merge.
- List every TODO placeholder left in the post in the PR description.
