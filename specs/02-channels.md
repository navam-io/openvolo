# Channel Expansion: Gmail + Substack

> Extends the platform model from social-only (X, LinkedIn) to multi-channel outreach
> (X, LinkedIn, Gmail, Substack). See [`specs/01-origin.md`](./01-origin.md) for the
> foundation spec.

---

## 1. Overview

OpenVolo expands from a social CRM to an **outreach CRM** by adding two new channels:

| Channel | Type | Primary Use | Contact Identifier |
|---|---|---|---|
| **X / Twitter** | Social | Public engagement, DMs | `@handle` / platform_user_id |
| **LinkedIn** | Social | Professional networking | Profile URL / platform_user_id |
| **Gmail** | Email | Direct outreach, sequences | Email address |
| **Substack** | Newsletter | Content publishing, subscribers | Email / subscriber ID |

Gmail enables email-based outreach campaigns (cold outreach, follow-ups, drip sequences).
Substack enables newsletter publishing and subscriber management as a content distribution
channel.

---

## 2. Platform Enum

The platform enum extends from 2 to 4 values across the application:

```
["x", "linkedin"] --> ["x", "linkedin", "gmail", "substack"]
```

### Schema Impact (3 tables)

| Table | Column | Change |
|---|---|---|
| `platform_accounts` | `platform` | Add `gmail`, `substack` |
| `contacts` | `platform` | Add `gmail`, `substack` |
| `campaigns` | `platform` | Add `gmail`, `substack` |

`content_items.platform_target` is already a plain `text()` field with no enum constraint
-- no change needed.

SQLite does not enforce text enums at the database level. These are application-level
constraints enforced by Drizzle ORM and Zod validation. No migration is required for
existing data.

---

## 3. Gmail Channel

### Purpose
Email-based outreach for contacts where social engagement is insufficient or email is
the preferred communication channel.

### Capabilities (Planned)
- **Email sequences** -- multi-step campaigns with configurable delays
- **Template management** -- reusable email templates in content library
- **Open/click tracking** -- engagement metrics for email campaigns
- **Reply detection** -- auto-advance contacts through funnel on reply

### Auth Pattern
- **OAuth 2.0** via Google API (Gmail API scope)
- **Auth type:** `oauth`
- **Required scopes:** `gmail.send`, `gmail.readonly`
- **Token storage:** Encrypted in `platform_accounts.credentials_encrypted`

### Content Types
- Email templates (subject + body)
- Signature blocks
- Attachment references

---

## 4. Substack Channel

### Purpose
Newsletter publishing and subscriber management. Positions OpenVolo as a content
distribution hub alongside social engagement.

### Capabilities (Planned)
- **Subscriber import** -- sync Substack subscribers as contacts
- **Newsletter publishing** -- publish content items as Substack posts
- **Engagement tracking** -- subscriber opens, clicks, reactions
- **Cross-promotion** -- connect social campaigns with newsletter content

### Auth Pattern
- **API key or session-based** authentication
- **Auth type:** `api_key` or `session`
- **Token storage:** Encrypted in `platform_accounts.credentials_encrypted`

### Content Types
- Newsletter posts/articles
- Subscriber notes
- Cross-posted social content

---

## 5. Campaign Types by Channel

| Campaign Type | X | LinkedIn | Gmail | Substack |
|---|---|---|---|---|
| `outreach` | DM sequences | Connection + message | Cold email sequences | -- |
| `engagement` | Like/comment/repost | Endorse/comment | Reply management | Reader engagement |
| `content` | Threads, posts | Articles, posts | Email newsletters | Newsletter posts |
| `nurture` | Ongoing engagement | Relationship building | Drip sequences | Regular updates |

---

## 6. Phase Placement

Gmail and Substack channel definitions are part of the **schema and UI foundation** and
can be added to the platform enum immediately. Full implementation of each channel's
auth flow and API integration follows the existing roadmap:

| Component | Phase | Notes |
|---|---|---|
| Platform enum expansion | 1 (now) | Schema + API + UI updates |
| Gmail OAuth 2.0 flow | 1 or 2 | Alongside X OAuth work |
| Gmail API integration | 2 | With campaign builder |
| Substack API integration | 4 | With LinkedIn expansion |
| Email template editor | 2 | With content editor |
| Subscriber sync | 4 | With cross-platform merging |

---

## 7. UI Display Labels

Shared label map used across all UI components:

```typescript
const platformLabels: Record<string, string> = {
  x: "X / Twitter",
  linkedin: "LinkedIn",
  gmail: "Gmail",
  substack: "Substack",
};
```

---

## 8. API Validation

Zod schemas for contact and campaign creation validate platform against the expanded enum:

```typescript
z.enum(["x", "linkedin", "gmail", "substack"])
```
