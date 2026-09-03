# Contact form — how inquiries reach operations@

The form on `contact.html` POSTs each inquiry to a **Cloudflare Worker**, which
sends the email through **Microsoft Graph** as
`operations@theblueradiance.com`, using an app registration in the Blue
Radiance Microsoft 365 tenant.

- The email comes from Blue Radiance's own tenant
- **Nothing is stored** — anywhere. The inquiry becomes an email and that is all
- No third-party form service receives or processes the data
- Cloudflare runs the code and passes it on; it keeps no copy
- **Cost: zero** — Cloudflare Workers free plan, no card. The app registration
  is Entra ID, part of the Microsoft 365 tenant already paid for

The website itself is unchanged and stays on GitHub Pages.

| | |
|---|---|
| Endpoint | `https://br-contact-form.br-contact-form.workers.dev` |
| Worker source | [BLUE-RADIANCE-MARINE/br-contact-api](https://github.com/BLUE-RADIANCE-MARINE/br-contact-api) |
| Entra app | `br-contact-form` — `c6b42809-529b-413b-a227-26aca33d21d4` |
| Cloudflare account | ithead@theblueradiance.com |

It is set in one constant in `assets/js/site.js`:

```js
var ENDPOINT = 'https://br-contact-form.br-contact-form.workers.dev';
```

If that constant is ever emptied, the form stops sending and instead shows the
operations email and phone number with a pre-filled draft. It never fails
silently.

---

## Why not Azure or Power Automate

- **Azure Static Web Apps / Logic Apps** need an Azure **subscription**. Blue
  Radiance has a Microsoft 365 tenant but no Azure subscription, and one cannot
  be created without a card on file.
- **Power Automate**'s *When an HTTP request is received* trigger is a
  **premium** connector requiring a paid per-user or per-flow licence.

Cloudflare Workers needs neither, and the email still originates from the Blue
Radiance tenant.

---

## Security

### The app can only send as operations@

`Mail.Send` as an application permission normally covers **every mailbox in the
tenant**. An Exchange application access policy restricts it to the operations
mailbox. This was verified by testing, not just by reading configuration:

| Attempt | Result |
|---|---|
| Send as `operations@theblueradiance.com` | `202` — allowed |
| Send as `ithead@theblueradiance.com` | `403` — blocked |

The policy is applied by `scripts/restrict-mailbox-access.ps1` in the
`br-contact-api` repository. **If the app registration is ever recreated, that
script must be run again** — otherwise the app silently regains the ability to
send as anyone in the company.

> Note: the policy's `ScopeIdentity` reads `AmbarishDixit`. That is a stale
> internal alias on the mailbox that now serves operations@; the display name
> was changed but the alias was not. It is cosmetic — the test above confirms
> the restriction resolves to the right mailbox.

### Other measures

- The endpoint URL is public, as it must be for any static site. All it can do
  is send one email to one fixed address. It cannot read mail, cannot be
  redirected, and exposes no secret.
- Submissions are validated **in the Worker**, not only in the browser, so a bot
  posting directly is still caught by the honeypot and the field checks.
- CR/LF is stripped from every field before the subject is built, so a
  submission cannot forge mail headers.
- The message is HTML-escaped before it enters the email.
- Best-effort rate limit: 5 submissions per minute per IP.

### The client secret

Stored only as a Cloudflare Worker secret. It is not in either repository and
has never been written to disk. It **expires in two years** — set a reminder.
When it lapses the form stops sending and shows the fallback message; to
rotate, create a new secret on the `br-contact-form` app registration and run
`wrangler secret put CLIENT_SECRET`.

---

## CORS

The form sends `Content-Type: text/plain;charset=UTF-8` so the browser treats
it as a CORS *simple request* and skips the `OPTIONS` preflight. The body is
still JSON; the Worker parses it either way. The Worker returns
`Access-Control-Allow-Origin: https://theblueradiance.com`.

Do not "tidy" that content type to `application/json` — it adds a preflight for
no benefit.

---

## Testing and troubleshooting

Submit the form on the live site. The button reads *Sending…*, then a green
confirmation appears and the fields clear. The email arrives at operations@,
and **pressing Reply addresses the enquirer**, not the Worker.

Live logs: `npx wrangler tail` in the `br-contact-api` repository.

| Symptom | Cause |
|---|---|
| Red failure message on the site | Worker unreachable, or `ALLOWED_ORIGIN` does not match the domain |
| `502` in the logs | Client secret expired, or admin consent removed |
| `403` from Graph | Application access policy is blocking — check the AppId matches |
| `429` | Rate limit — five per minute per IP |
