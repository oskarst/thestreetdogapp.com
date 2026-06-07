# Supabase email templates

Brand-matched HTML for the auth emails. Paste each file's contents into
**Supabase → Authentication → Email Templates** and set the subject line.

| File | Supabase template | Subject |
|------|-------------------|---------|
| `magic-link.html` | Magic Link | `Your sign-in link for The Street Dog App` |
| `reset-password.html` | Reset Password | `Reset your password for The Street Dog App` |
| `confirm-signup.html` | Confirm signup | `Confirm your email for The Street Dog App` |

Notes:
- Links use the **token_hash** flow:
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=...&next=...`
  which `/auth/callback` verifies with `verifyOtp`. This works server-side
  (no PKCE verifier cookie needed) and survives links opened on another
  device — unlike the default `{{ .ConfirmationURL }}` recovery link, which
  came back without a readable `code` and failed with auth_callback_failed.
- `{{ .SiteURL }}` must be the production URL (Auth → URL Configuration).
- `confirm-signup.html` is only needed if you turn **Confirm email** ON
  (Auth → Providers → Email). The app currently signs users in at
  registration with no confirmation, so it's optional.
- Colours match the app tokens: cream `#f7f4ed`, ink `#1a1612`,
  green `#22c55e`, hairline `#e8e3d4`. Inline-styled + table layout for
  broad email-client support.
- Make sure `https://woof.thestreetdogapp.com/auth/callback` is in
  Auth → URL Configuration → Redirect URLs, or the links fall back to the
  Site URL.
