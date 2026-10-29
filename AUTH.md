# Authentication

The Minecraft scene is reused from the supplied Enchanted Archive index.html, isolated in a same-origin iframe at /login to preserve its original Three.js version, fonts, procedural textures, DOM projection, and animation timings. Only demo credential handling, demo text, and destination navigation were adapted. The original directory was not changed. The / route checks the server session before rendering the existing CourtApp. All Groq requests pass through the protected /api/verdict route.

Local testing is configured in ignored .env.local. Passwords use salted scrypt (N=32768, r=8, p=1). No plaintext password is stored there. Sessions are stateless cookies carrying a base64url JSON username and expiry, authenticated with HMAC-SHA256 and a twelve-hour lifetime. Every request verifies the signature, configured username, and expiry using environment configuration; no session store is needed. Cookies are HttpOnly, SameSite=Strict, Path=/, and Secure in production. Logout clears the cookie. A previously copied cookie remains valid until expiry or signing-secret rotation. Login and verdict/logout POSTs require the request Origin to match the server URL.

## Before public deployment

Run `node scripts/set-password.mjs` from the project root and enter a unique password with at least 12 characters. This updates only .env.local, sets AUTH_LOCAL_TEST_ONLY=false, generates a new salt/hash and signing secret, and preserves the Groq settings. Restart the server. Copy these environment settings through your hosting provider's secret manager; never commit .env.local. The production login endpoint fails closed unless AUTH_LOCAL_TEST_ONLY=false and refuses the original local test password or any password shorter than 12 characters. Production uses HTTPS-only cookies, so use HTTPS.

Vercel serverless and multiple instances are supported: all instances must use the same authentication environment configuration. The login rate limit is deliberately best-effort, per-instance memory and can reset on cold starts. The first five invalid attempts per fifteen minutes receive 401; subsequent invalid attempts receive 429 and Retry-After. Credentials are verified before consulting the bucket, so a valid login is never blocked by rate limiting. This limits failure responses rather than password-hash computation; no persistent brute-force lockout is claimed.

## Vercel environment setup

Run `node scripts/set-password.mjs` locally and enter a unique password with at least 12 characters. The script silently writes the authentication settings into ignored .env.local and preserves existing Groq settings. Do not run it merely to deploy without copying the newly generated settings: each run rotates the signing secret. No values are printed.

In Vercel Project Settings ? Environment Variables, add these names for each deployment environment you use:

- AUTH_USERNAME
- AUTH_PASSWORD_HASH
- AUTH_SECRET
- AUTH_LOCAL_TEST_ONLY
- GROQ_API_KEY
- GROQ_MODEL (optional; the server has a default)

Copy the four generated AUTH settings from .env.local privately into Vercel, preserving the generated deployment flag. For AUTH_PASSWORD_HASH, remove the backslashes that escape dollar signs in .env.local; Vercel needs the raw hash. Keep the local file escaped. The script generates authentication settings only; use your existing Groq settings for the other variables. Redeploy after updating Vercel's environment variables. HTTPS cookie security is enabled automatically in production. No shared database or additional dependencies are required.

When deploying behind a proxy, preserve the public request origin so same-origin POST checks work. Do not expose the origin server through an alternate unprotected route. AUTH_SECRET must contain at least 64 characters of cryptographic random material. No additional npm dependencies were needed.

## Source and assets

The supplied project has no top-level license for its original scene code. Reuse here is based on the owner's explicit instruction to integrate their supplied source; no broader redistribution permission is inferred. The supplied README states all block textures and geometry are procedural and no Mojang assets are included. Bundled third-party notices are in public/minecraft: Three.js r169 (MIT), Pixelify Sans (SIL OFL 1.1), and Special Elite (Apache 2.0). Font license texts were retrieved from the official google/fonts repository. The source's existing license comments remain in the embedded HTML.

## Checks

`npm run lint`, `npm run build`, and `node --test tests/auth.test.mjs` cover static checks and authentication security. With `npm run dev` running, `node scripts/check-auth.mjs` checks the HTTP flow without calling Groq. It fills the best-effort failure bucket and checks that valid credentials still succeed. Restart the dev server first for a fresh HTTP test window. Full WebGL and successful live Groq verdict verification require a browser and configured Groq account.

Next.js expands dollar signs in dotenv values. Keep the generated backslash escapes in AUTH_PASSWORD_HASH inside .env.local. When setting it directly in a hosting secret manager, use the raw scrypt$salt$hash value without backslashes.
