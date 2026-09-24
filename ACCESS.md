# Access — the password gate

The prototype is gated behind a password (`potato`) so it isn't casually
browsable. **Read the next section before relying on it.**

---

## ⚠️ This is a deterrent, not security

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

### If it genuinely must not be public

The **host has to refuse the request** — the content must never leave the
server unauthenticated. In rough order of effort:

| Option | Effort | Notes |
| --- | --- | --- |
| **Hosting platform's own password protection** | minutes | Vercel (Deployment Protection), Netlify (password-protected sites), Cloudflare Access. This is the right answer for a prototype. |
| **HTTP Basic Auth** at nginx/Apache/`.htaccess` | ~an hour | Works anywhere you control the server. Browser-native prompt. |
| **Encrypt the page body** (e.g. staticrypt) | half a day | Keeps it a static file with no server. The password becomes the decryption key, so the content genuinely isn't readable without it. Needs a build step and breaks the Vite dev flow. |

Ask before assuming the current gate satisfies a privacy or contractual
requirement. It very likely does not.

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

The stored value is a SHA-256 hex digest, not the password:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('NEW_PASSWORD').digest('hex'))"
```

Put the result in `GATE_HASH` in `js/main.js`. Nothing else needs to change.

---

## Also in place

`<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` keeps
the page out of search results. That is independent of the gate — a crawler
that ignores the gate is still told not to index. It is a request, not an
enforcement.
