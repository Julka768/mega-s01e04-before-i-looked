---
name: preview-upload
description: Put a saved rig page on a public HTTPS link with Surge, and later take the lane marker off it (ADR 0003). Use for a plan's "Preview for review" and "Clean up" issues.
---

# preview-upload

A preview is one HTML file from `pnpm preview`, on Surge, under a link we can upload over.

## Before anything

- Ask the human before each upload: what goes up, where, who can see it (anyone with the link),
  how to undo it (`npx surge teardown <domain>`).
- The human signs in to Surge themselves: `npx surge login`. Check with `npx surge whoami`.
  Never type their password.

## Put it up (plan § "Preview for review")

```sh
pnpm preview                                    # var/preview/digest-<night>.html, marker from .env
npx surge var/preview <domain>.surge.sh         # e.g. rig-digest-lane07.surge.sh
```

Open the link in a browser with no rig session before you send it. Send the link; keep the
issue open until the reviewer has looked (AGENTS.md: close only when "Done when" holds).

## Take the marker off (plan § "Clean up")

```sh
pnpm preview --no-marker                        # banner reads "no marker set"
npx surge var/preview <domain>.surge.sh         # same domain, upload over
```

Surge keeps every deploy at its own `<id>--<domain>.surge.sh` URL, and the first one still shows
the marker after the upload over. Fetch each deploy URL Surge printed. If one still shows the
marker: `npx surge teardown <domain>`, then the same upload again. Check again: the main link
shows "no marker set", the old deploy URLs return 404.

## Don'ts

- No preview in the repo, in an issue or in chat (ADR 0003). `var/` is git-ignored.
- Not GitHub Pages or a gist: their history keeps the marker.
