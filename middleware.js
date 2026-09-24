import { next } from '@vercel/edge';

/**
 * HTTP Basic Auth at Vercel's edge.
 *
 * This is the REAL gate — unlike the in-page one, nothing is sent to the
 * browser until the request is authenticated. `curl https://host/` returns a
 * 401 and no markup. The in-page gate (see ACCESS.md) stays as the fallback
 * for any other host and for local dev; this supersedes it in production.
 *
 * Why middleware rather than Vercel's own Password Protection: that setting
 * is Pro/Enterprise only and lives in the dashboard, so it can't be committed
 * or reviewed. This works on every plan including Hobby, and it's in the repo.
 * If the project is on Pro, the dashboard setting is less code and worth
 * preferring — see ACCESS.md.
 */

export const config = {
  /**
   * ⚠️ EVERYTHING, deliberately. The obvious matcher excludes static assets
   * for speed, but that would leave the hero photography, the CTA video and
   * the whole `/assets` tree publicly fetchable by direct URL — which is most
   * of what's worth protecting on a design prototype. The cost is one edge
   * invocation per asset; the prototype's traffic is a handful of reviewers.
   */
  matcher: '/:path*',
};

const REALM = 'Capella prototype';

function unauthorized() {
  return new Response('Authentication required.\n', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Content-Type': 'text/plain; charset=utf-8',
      // A cached 401 would be replayed to an authenticated visitor, and a
      // cached 200 would be replayed to an anonymous one. Neither is wanted.
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Length-independent comparison. Not truly constant-time — the edge runtime
 * has no `timingSafeEqual` — but it doesn't bail on the first differing byte,
 * which is the cheap leak. Over a network, against a human-typed password,
 * the remaining signal is noise.
 */
function slowEqual(a, b) {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const len = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

export default function middleware(request) {
  const expected = process.env.SITE_PASSWORD;

  // ⚠️ FAIL CLOSED. If the env var is missing the site is unprotected, so
  // refuse to serve rather than quietly opening to the public — a deploy that
  // forgot the variable should be obviously broken, not silently public.
  if (!expected) {
    return new Response(
      'SITE_PASSWORD is not set on this deployment, so the site will not be served.\n',
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const header = request.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return unauthorized();

  let decoded;
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized(); // malformed base64
  }

  // "user:password" — the username is ignored, anything will do.
  const separator = decoded.indexOf(':');
  const password = separator === -1 ? '' : decoded.slice(separator + 1);
  if (!slowEqual(password, expected)) return unauthorized();

  const response = next();
  // Tells the in-page gate to stand down so an authenticated visitor isn't
  // asked for the same password twice. Not HttpOnly on purpose — the page's
  // own script has to read it, and it is a flag, not a credential. Forging it
  // bypasses only the in-page gate, which this middleware has already made
  // redundant.
  response.headers.set(
    'Set-Cookie',
    'cu-proto-gate=unlocked; Path=/; Max-Age=86400; SameSite=Lax; Secure'
  );
  // Belt and braces with the <meta> tag: covers assets and any crawler that
  // reads headers but not markup.
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  return response;
}
