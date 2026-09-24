# Access — how the prototype is protected

Password: **`potato`**.

There are **two** gates, and they do very different jobs:

| | Where it runs | Protects the content? |
| --- | --- | --- |
| **Vercel edge middleware** (`middleware.js`) | On Vercel, before anything is served | **Yes.** `curl` gets a 401 and no markup |
| **In-page gate** (`.pw-gate`) | In the browser, after the page is delivered | **No.** A deterrent only |

**On Vercel the middleware is the real protection.** The in-page gate is the
fallback for any other host, and for local dev. When the middleware
authenticates a request it sets a `cu-proto-gate=unlocked` cookie, and the
in-page gate stands down — so a reviewer is asked for the password once, by
the browser, not twice.

---

## Deploying to Vercel

The middleware reads the password from an environment variable; it is **not**
in the repo.

1. **Import the repo** at [vercel.com/new](https://vercel.com/new). The
   framework preset should detect as Vite; `vercel.json` pins it anyway
   (`buildCommand: npm run build`, `outputDirectory: dist`).
2. **Add the environment variable** — Project → Settings → Environment
   Variables:

   | Name | Value | Environments |
   | --- | --- | --- |
   | `SITE_PASSWORD` | `potato` | Production, Preview, Development |

   Add it to **all three**. Preview deployments are public URLs too, and a
   preview without the variable refuses to serve (see below).
3. **Deploy.** You should get a browser password prompt. Any username works;
   only the password is checked.

### Verifying it actually works

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://<your-deployment>/
# 401  — correct: no markup was sent

curl -sS -o /dev/null -w '%{http_code}\n' -u anything:potato https://<your-deployment>/
# 200

curl -sS -o /dev/null -w '%{http_code}\n' https://<your-deployment>/assets/hero-rfi-desktop.webp
# 401  — assets are gated too, not just the HTML
```

If the first command returns 200 and HTML, the middleware is not running —
check that `middleware.js` is at the **repo root** and that the deployment
picked it up (Vercel lists it under the deployment's Functions).

### It fails closed

If `SITE_PASSWORD` is missing the middleware returns **503 and serves
nothing**, rather than quietly letting the site go public. A deploy that
forgot the variable is obviously broken instead of silently exposed.

### Vercel's own Password Protection

Vercel has a built-in equivalent (Project → Settings → Deployment
Protection → Password Protection). It is **Pro/Enterprise only** and is a
dashboard setting, so it can't be committed or code-reviewed. If this project
is on a paid plan, prefer it — it is less code to own — and then
`middleware.js` can be deleted. On Hobby it isn't available, which is why the
middleware exists.

> ⚠️ **Deployment Protection has a `Vercel Authentication` option too**, which
> requires visitors to log into a Vercel account with access to the project.
> That is free on Hobby but no good for sharing with people outside the team.

---

## ⚠️ The in-page gate is a deterrent, not security

**The gate does not protect the content.** It is client-side. The entire page
— markup, copy, images, the RFI form — is sent to anyone who requests the URL,
before any password is typed. Specifically:

```bash
curl https://<host>/            # returns the whole page. No password involved.
```

Anyone can also open devtools and delete one class from `<html>`, or read the
page source from the browser's own cache. The password is stored as a SHA-256
hash rather than plain text, which stops it *leaking* to someone reading the
bundle — worth doing if the password is reused anywhere — but `potato` is a
dictionary word and falls to an offline guess instantly. And it hardly
matters, because the content is readable without the password anyway.

**What the gate is actually good for:** stopping the prototype being stumbled
into, screenshotted by a passer-by, or opened by someone who was sent the link
and shouldn't have been. That is a real and reasonable goal. It is not the
same as the page being private.

**On Vercel this no longer matters** — the middleware refuses the request
before any of it is sent. The in-page gate is only what protects a deployment
on some *other* host, and there it protects nothing. If this is ever moved off
Vercel, the replacement host needs its own equivalent: HTTP Basic Auth at
nginx/Apache, Netlify's password protection, Cloudflare Access, or encrypting
the page body (staticrypt) if it has to stay a bare static file.

---

## How it works

| Piece | Where |
| --- | --- |
| `is-locked` hard-coded on `<html>` | `index.html`, first line |
| Inline unlock-check script | `index.html` `<head>`, before the stylesheet |
| Gate markup | `index.html`, first element in `<body>` |
| Gate styles + the `display: none` lock | `css/styles.css`, top of the file |
| `initPasswordGate()` + the hash | `js/main.js` |

**It fails closed.** `is-locked` is written into the HTML, not added by JS. If
JS is disabled, blocked, or throws, the class stays and the page stays hidden.
Don't "tidy" this into a class that JavaScript adds — that inverts it into
failing *open*.

**The lock is `display: none` on everything except the gate**, not an opaque
overlay. The page has to be out of the accessibility tree and out of the tab
order while locked, or a screen-reader user — or anyone pressing Tab — walks
straight past the gate into the content. Verified: while locked there are
exactly two focusable elements on the page, both inside the gate.

**Unlocking dispatches a `resize` event.** Everything in the page initialises
on `DOMContentLoaded`, while it is still `display: none`, so anything that
measures itself reads zero. The hero's copy cap (§5 in `HANDOFF.md`) is the
one that matters — it would otherwise pin the headline to a 0px column.
`resize` is what the hero, carousel and parallax already listen to for a
re-measure, so the gate reuses it rather than inventing a new hook. **If you
add anything that measures on load, make sure it also re-measures on
`resize`.**

**`crypto.subtle` needs a secure context** — HTTPS or localhost. On a plain
`http://` LAN address it is undefined, so the gate fails closed and says the
preview needs HTTPS rather than silently letting everyone through.

**Session, not local, storage.** Unlocking lasts for the browser session;
closing the tab re-prompts.

---

## Changing the password

**Two places, and both have to change**, or the two gates disagree:

1. **Vercel** — update the `SITE_PASSWORD` environment variable and redeploy
   (env changes don't apply to existing deployments).
2. **The in-page gate** — it stores a SHA-256 digest, not the password:

   ```bash
   node -e "console.log(require('crypto').createHash('sha256').update('NEW_PASSWORD').digest('hex'))"
   ```

   Put the result in `GATE_HASH` in `js/main.js`.

If you only change Vercel, local dev and any non-Vercel host keep the old
password. If you only change `GATE_HASH`, the live site keeps the old one.

---

## Also in place

`noindex, nofollow, noarchive, nosnippet` is applied three ways, because each
covers a gap the others don't:

- a `<meta name="robots">` tag in `index.html` — covers the page itself;
- an `X-Robots-Tag` header in `vercel.json` — covers **assets**, which have no
  markup to put a meta tag in;
- the same header from the middleware on authenticated responses.

All of it is a request, not an enforcement. The middleware is what actually
stops a crawler, by returning 401.
