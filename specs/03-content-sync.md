# Content & Engagement Golden Record: 4-Channel Sync

> Comprehensive specification for syncing content (posts, emails, newsletters)
> and engagement (likes, comments, DMs, replies) across X/Twitter, LinkedIn,
> Gmail, and Substack. Covers historical backfill, ongoing delta sync, and
> schema extensions for imported content.
> See [`specs/02-channels.md`](./02-channels.md) for the contacts golden record.

---

## 1. Channel API Fields for Content & Engagement

This section documents every retrievable field per platform for **posts** and
**engagement** (not contacts — that is covered in `02-channels.md`).

### 1.1 X/Twitter API v2

#### Tweets

**Endpoint:** `GET /2/users/:id/tweets` (up to 3200 most recent)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique tweet ID |
| `text` | string | Tweet body (up to 280 chars) |
| `created_at` | ISO 8601 | Publication timestamp |
| `author_id` | string | User ID of the author |
| `conversation_id` | string | Root tweet ID of the conversation thread |
| `in_reply_to_user_id` | string | User being replied to |
| `referenced_tweets` | array | `[{ type: "retweeted"/"quoted"/"replied_to", id }]` |
| `attachments` | object | `{ media_keys: [], poll_ids: [] }` |
| `entities` | object | URLs, hashtags, mentions, cashtags, annotations |
| `public_metrics` | object | `{ retweet_count, reply_count, like_count, quote_count, bookmark_count, impression_count }` |
| `context_annotations` | array | `[{ domain: { id, name }, entity: { id, name } }]` |
| `lang` | string | BCP 47 language tag |
| `source` | string | Client app used to post |

#### Mentions

**Endpoint:** `GET /2/users/:id/mentions` (up to 800 most recent)

Same tweet fields as above. Represents tweets that @mention the authenticated user.

#### Direct Messages

**Endpoint:** `GET /2/dm_events`

| Field | Type | Notes |
|---|---|---|
| `id` | string | DM event ID |
| `event_type` | string | `MessageCreate`, `ParticipantsJoin`, `ParticipantsLeave` |
| `text` | string | Message body |
| `dm_conversation_id` | string | DM conversation/thread ID |
| `created_at` | ISO 8601 | Timestamp |
| `sender_id` | string | User ID of sender |
| `attachments` | object | Media attached to message |

#### Media (via expansions)

| Field | Type | Notes |
|---|---|---|
| `media_key` | string | Unique media identifier |
| `type` | string | `photo`, `video`, `animated_gif` |
| `url` | string | Direct media URL |
| `preview_image_url` | string | Thumbnail URL |
| `alt_text` | string | Alt text description |
| `variants` | array | Video variants with bitrate/resolution |

#### Rate Limits

| Tier | Limit | Window |
|---|---|---|
| Free | 50-100 requests/day | 24 hours |
| Basic | 10,000 tweets/month read | Per month |
| Pro | ~1M tweets/month read | 15-min windows |

### 1.2 LinkedIn API

#### Posts

**Endpoint:** `GET /rest/posts?q=author`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Post URN (e.g., `urn:li:share:123456`) |
| `author` | string | Author URN |
| `commentary` | string | Post text body |
| `visibility` | string | `PUBLIC`, `CONNECTIONS`, `LOGGED_IN` |
| `lifecycleState` | string | `PUBLISHED`, `DRAFT` |
| `publishedAt` | integer | Unix timestamp (ms) |
| `content` | object | Media attachments, articles, polls |

#### Analytics (separate endpoint)

**Endpoint:** `GET /rest/organizationalEntityShareStatistics` or post-level analytics

| Field | Type | Notes |
|---|---|---|
| `impressionCount` | integer | Total views |
| `likeCount` | integer | Total likes/reactions |
| `commentCount` | integer | Total comments |
| `shareCount` | integer | Total reposts |
| `clickCount` | integer | Total link clicks |

Posts API does **NOT** return engagement metrics inline — a separate analytics
call is required per post or in batch.

#### Messaging

LinkedIn messaging API requires partner approval. Out of scope for initial
implementation.

#### Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| Most endpoints | 100 requests/day | 24 hours |
| Partner apps | Higher limits | Varies |

### 1.3 Gmail API

#### Messages

**Endpoint:** `GET /gmail/v1/users/me/messages`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique message ID |
| `threadId` | string | Thread/conversation ID |
| `labelIds` | array | Gmail labels (INBOX, SENT, DRAFT, etc.) |
| `snippet` | string | Short preview text |
| `historyId` | string | Monotonic history sequence number |
| `internalDate` | string | Unix timestamp (ms) when received |
| `payload.headers` | array | From, To, CC, Subject, Date, Message-ID, In-Reply-To, References |
| `payload.body` | object | Message body (plain or HTML) |
| `payload.parts` | array | MIME parts for multipart messages |
| `payload.parts[].filename` | string | Attachment filename (if present) |

#### Threads

**Endpoint:** `GET /gmail/v1/users/me/threads`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Thread ID |
| `messages` | array | All messages in the thread |
| `snippet` | string | Thread preview text |
| `historyId` | string | Latest history ID in the thread |

#### History API (delta sync)

**Endpoint:** `GET /gmail/v1/users/me/history?startHistoryId={id}`

Returns changes since a given history ID:
- `messagesAdded` — new messages
- `messagesDeleted` — removed messages
- `labelsAdded` — label changes
- `labelsRemoved` — label changes

This is the most efficient delta sync mechanism across all platforms.

#### Rate Limits

| Quota | Limit |
|---|---|
| Per-user | 250 quota units/second |
| messages.get | 5 units per call |
| messages.list | 5 units per call |
| threads.list | 10 units per call |

### 1.4 Substack

**No official API.** Two access methods:

#### Unofficial API (session-cookie auth)

**Endpoint:** `GET /api/v1/posts`

| Field | Type | Notes |
|---|---|---|
| `id` | integer | Post ID |
| `title` | string | Post title |
| `subtitle` | string | Post subtitle |
| `slug` | string | URL slug |
| `post_date` | ISO 8601 | Publication date |
| `canonical_url` | string | Full post URL |
| `cover_image` | string | Cover image URL |
| `word_count` | integer | Word count |
| `tags` | array | Post tags |
| `type` | string | `newsletter`, `podcast`, `thread` |
| `audience` | string | `everyone`, `only_paid` |
| `reaction_count` | integer | Total reactions/likes |
| `comment_count` | integer | Total comments |
| `restack_count` | integer | Total restacks (reposts) |

#### RSS Feed (reliable fallback)

Standard RSS/Atom feed at `https://{publication}.substack.com/feed`:
- `title` — post title
- `link` — canonical URL
- `pubDate` — publication date
- `content:encoded` — full HTML content
- `description` — summary/excerpt

#### Rate Limits

No official limits. Recommended: ~1 request/second max to avoid blocking.

---

## 2. Schema Changes to Existing Tables

### 2.1 `content_items` — Add Columns

| Column | Type | Default | Purpose |
|---|---|---|---|
| `origin` | text enum `"authored"/"imported"` | `"authored"` | Distinguishes OV-created vs synced content |
| `direction` | text enum `"outbound"/"inbound"` | `"outbound"` | Critical for emails/DMs: user sent vs received |
| `platformAccountId` | text FK nullable | null | Source platform account for imports |
| `threadId` | text nullable | null | X `conversation_id`, Gmail `threadId` |
| `parentItemId` | text FK nullable (self-ref) | null | Parent content for replies/threads |
| `contactId` | text FK nullable | null | Sender contact for inbound content |
| `platformData` | text | `"{}"` | Raw platform-specific JSON (see Section 5) |

### 2.2 `content_items` — Modify Existing

| Change | From | To |
|---|---|---|
| `title` | `.notNull()` | nullable (tweets/DMs have no title) |
| `contentType` enum | `post, article, thread, reply, image, video` | + `email`, `dm`, `newsletter` |
| `status` enum | `draft, review, approved, scheduled, published` | + `imported` |

### 2.3 `content_posts` — Modify Existing

| Change | From | To |
|---|---|---|
| `status` enum | `scheduled, publishing, published, failed` | + `imported` |

Existing columns are already sufficient for imported content: `platformPostId`,
`platformUrl`, `publishedAt`, `engagementSnapshot`.

### 2.4 `engagements` — Add Columns

| Column | Type | Default | Purpose |
|---|---|---|---|
| `contentPostId` | text FK nullable | null | Links to specific post engaged with |
| `platform` | text | (required) | Denormalized platform for fast filtering |
| `platformEngagementId` | text nullable | null | Dedup key from platform |
| `threadId` | text nullable | null | Conversation grouping |
| `source` | text enum | `"manual"` | `manual`, `campaign`, `imported`, `agent` |
| `platformData` | text | `"{}"` | Raw platform-specific JSON |

### 2.5 `engagements` — Modify Existing

| Change | From | To |
|---|---|---|
| `contactId` | `.notNull()` | nullable (anonymous engagement has no known contact) |
| `engagementType` enum | `connection_request, message, like, comment, share, follow, view, reply` | + `retweet`, `quote`, `bookmark`, `impression`, `click`, `open`, `restack`, `reaction` |

### 2.6 Updated Schema Definitions

```typescript
// content_items — updated definition
export const contentItems = sqliteTable("content_items", {
  id: text("id").primaryKey(),
  title: text("title"), // Changed: nullable (tweets/DMs have no title)
  body: text("body"),
  contentType: text("content_type", {
    enum: ["post", "article", "thread", "reply", "image", "video", "email", "dm", "newsletter"],
  }).notNull(),
  platformTarget: text("platform_target"),
  mediaPaths: text("media_paths").default("[]"),
  status: text("status", {
    enum: ["draft", "review", "approved", "scheduled", "published", "imported"],
  })
    .notNull()
    .default("draft"),
  aiGenerated: integer("ai_generated", { mode: "boolean" }).notNull().default(false),
  generationPrompt: text("generation_prompt"),
  scheduledAt: integer("scheduled_at"),
  // New columns for content sync
  origin: text("origin", { enum: ["authored", "imported"] })
    .notNull()
    .default("authored"),
  direction: text("direction", { enum: ["outbound", "inbound"] })
    .notNull()
    .default("outbound"),
  platformAccountId: text("platform_account_id")
    .references(() => platformAccounts.id),
  threadId: text("thread_id"),
  parentItemId: text("parent_item_id"),  // self-referencing FK to content_items.id
  contactId: text("contact_id")
    .references(() => contacts.id),
  platformData: text("platform_data").default("{}"),
  ...timestamps,
});

// content_posts — updated definition
export const contentPosts = sqliteTable("content_posts", {
  id: text("id").primaryKey(),
  contentItemId: text("content_item_id")
    .notNull()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  platformAccountId: text("platform_account_id")
    .notNull()
    .references(() => platformAccounts.id, { onDelete: "cascade" }),
  platformPostId: text("platform_post_id"),
  platformUrl: text("platform_url"),
  publishedAt: integer("published_at"),
  status: text("status", {
    enum: ["scheduled", "publishing", "published", "failed", "imported"],
  })
    .notNull()
    .default("scheduled"),
  engagementSnapshot: text("engagement_snapshot").default("{}"),
});

// engagements — updated definition
export const engagements = sqliteTable("engagements", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .references(() => contacts.id, { onDelete: "cascade" }), // Changed: nullable
  platformAccountId: text("platform_account_id")
    .references(() => platformAccounts.id),
  engagementType: text("engagement_type", {
    enum: [
      "connection_request", "message", "like", "comment", "share",
      "follow", "view", "reply", "retweet", "quote", "bookmark",
      "impression", "click", "open", "restack", "reaction",
    ],
  }).notNull(),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  content: text("content"),
  campaignId: text("campaign_id").references(() => campaigns.id),
  agentRunId: text("agent_run_id"),
  // New columns for engagement sync
  contentPostId: text("content_post_id")
    .references(() => contentPosts.id),
  platform: text("platform", { enum: ["x", "linkedin", "gmail", "substack"] }),
  platformEngagementId: text("platform_engagement_id"),
  threadId: text("thread_id"),
  source: text("source", { enum: ["manual", "campaign", "imported", "agent"] })
    .notNull()
    .default("manual"),
  platformData: text("platform_data").default("{}"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});
```

---

## 3. New `sync_cursors` Table

One row per `(platformAccountId, dataType)` pair. Tracks sync progress for
both historical backfill and ongoing delta sync.

### 3.1 Schema Definition

```typescript
export const syncCursors = sqliteTable("sync_cursors", {
  id: text("id").primaryKey(),
  platformAccountId: text("platform_account_id")
    .notNull()
    .references(() => platformAccounts.id, { onDelete: "cascade" }),
  dataType: text("data_type", {
    enum: ["tweets", "mentions", "dms", "posts", "analytics", "emails", "newsletters"],
  }).notNull(),
  cursor: text("cursor"),               // Platform-native pagination value
  oldestFetchedAt: integer("oldest_fetched_at"),  // Earliest item synced (unix epoch)
  newestFetchedAt: integer("newest_fetched_at"),  // Latest item synced (unix epoch)
  totalItemsSynced: integer("total_items_synced").notNull().default(0),
  syncStatus: text("sync_status", {
    enum: ["idle", "running", "paused", "failed", "complete"],
  })
    .notNull()
    .default("idle"),
  syncProgress: real("sync_progress").default(0.0), // 0.0 to 1.0
  syncDirection: text("sync_direction", {
    enum: ["backward", "forward"],
  }).default("forward"),
  requestedRangeStart: integer("requested_range_start"), // User-selected start (unix epoch)
  requestedRangeEnd: integer("requested_range_end"),     // User-selected end (unix epoch)
  lastSyncStartedAt: integer("last_sync_started_at"),
  lastSyncCompletedAt: integer("last_sync_completed_at"),
  lastError: text("last_error"),
  consecutiveErrors: integer("consecutive_errors").notNull().default(0),
  metadata: text("metadata").default("{}"), // JSON for platform-specific state
  ...timestamps,
});
```

### 3.2 Indexes

```sql
-- One cursor per platform account per data type
CREATE UNIQUE INDEX idx_sync_cursor_account_type
  ON sync_cursors(platform_account_id, data_type);
```

### 3.3 Cursor Semantics Per Platform

| Platform | Data Type | Cursor Value | Direction |
|---|---|---|---|
| X | tweets | `pagination_token` or `since_id` | Forward: `since_id`; Backward: `until_id` |
| X | mentions | `pagination_token` or `since_id` | Same as tweets |
| X | dms | `pagination_token` | Forward: latest `dm_event.id` |
| LinkedIn | posts | `start` offset or timestamp | Forward: `publishedAt` of newest post |
| LinkedIn | analytics | batch offset | Forward: re-fetch latest posts |
| Gmail | emails | `historyId` for delta, `pageToken` for pagination | Forward: `historyId`; Backward: `before:` query |
| Substack | newsletters | post ID or offset | Forward: latest post ID |

---

## 4. New `engagement_metrics` Table

Time-series snapshots of aggregate engagement per content post. Supplements
the existing `engagementSnapshot` JSON column in `content_posts` with a
queryable history.

### 4.1 Schema Definition

```typescript
export const engagementMetrics = sqliteTable("engagement_metrics", {
  id: text("id").primaryKey(),
  contentPostId: text("content_post_id")
    .notNull()
    .references(() => contentPosts.id, { onDelete: "cascade" }),
  snapshotAt: integer("snapshot_at").notNull(), // Unix epoch when snapshot was taken
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  bookmarks: integer("bookmarks").notNull().default(0),
  replies: integer("replies").notNull().default(0),
  quotes: integer("quotes").notNull().default(0),
  reactions: integer("reactions").notNull().default(0),
  opens: integer("opens").notNull().default(0),
  platformData: text("platform_data").default("{}"), // Platform-specific extra metrics
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});
```

### 4.2 Indexes

```sql
-- Time-series queries per post
CREATE INDEX idx_engagement_metrics_post_time
  ON engagement_metrics(content_post_id, snapshot_at);
```

### 4.3 Rationale: Attributable vs Aggregate

Platform APIs return two kinds of engagement data:

| Type | Example | Storage |
|---|---|---|
| **Aggregate counts** | X returns `like_count = 47` | `engagement_metrics` table |
| **Attributable interactions** | X reply with `author_id`, DM with `sender_id` | `engagements` table |

Only attributable interactions (where we know WHO engaged) create rows in the
`engagements` table. Anonymous aggregate counts from platform APIs go into
`engagement_metrics` as time-series snapshots.

---

## 5. `platformData` JSON Shapes

Each platform stores raw data in `platformData` JSON columns on `content_items`,
`content_posts`, and `engagements`. Shapes below are documented for reference
and are not schema-enforced.

### 5.1 Content `platformData` — X Tweet

```json
{
  "conversationId": "1234567890",
  "referencedTweets": [
    { "type": "replied_to", "id": "1234567889" }
  ],
  "entities": {
    "urls": [{ "expanded_url": "https://example.com", "display_url": "example.com" }],
    "hashtags": [{ "tag": "ai" }],
    "mentions": [{ "username": "openai", "id": "123" }]
  },
  "contextAnnotations": [
    { "domain": { "id": "46", "name": "Technology" }, "entity": { "id": "123", "name": "AI" } }
  ],
  "media": [
    { "mediaKey": "m1", "type": "photo", "url": "https://pbs.twimg.com/..." }
  ],
  "lang": "en",
  "source": "Twitter Web App"
}
```

### 5.2 Content `platformData` — LinkedIn Post

```json
{
  "visibility": "PUBLIC",
  "lifecycleState": "PUBLISHED",
  "urn": "urn:li:share:7123456789",
  "content": {
    "media": [
      { "title": "Quarterly Report", "mediaType": "image", "url": "https://media.licdn.com/..." }
    ],
    "article": {
      "title": "My Article",
      "url": "https://linkedin.com/pulse/..."
    }
  }
}
```

### 5.3 Content `platformData` — Gmail Email

```json
{
  "messageId": "<abc123@mail.gmail.com>",
  "inReplyTo": "<parent123@mail.gmail.com>",
  "references": ["<root@mail.gmail.com>", "<parent@mail.gmail.com>"],
  "labels": ["INBOX", "IMPORTANT"],
  "headers": {
    "from": "Jane Doe <jane@example.com>",
    "to": "user@gmail.com",
    "cc": "team@example.com",
    "date": "Mon, 15 Jan 2025 10:30:00 -0800"
  },
  "attachments": [
    { "filename": "report.pdf", "mimeType": "application/pdf", "size": 245760 }
  ],
  "historyId": "987654"
}
```

### 5.4 Content `platformData` — Substack Newsletter

```json
{
  "subtitle": "Weekly roundup of AI developments",
  "slug": "ai-weekly-jan-15",
  "wordCount": 1850,
  "tags": ["ai", "weekly"],
  "audience": "everyone",
  "coverImage": "https://substackcdn.com/image/...",
  "emailOpenRate": 0.42
}
```

### 5.5 Engagement `platformData` — X Reply

```json
{
  "tweetId": "1234567890",
  "conversationId": "1234567880",
  "inReplyToUserId": "user123",
  "publicMetrics": { "likeCount": 3, "replyCount": 1 }
}
```

### 5.6 Engagement `platformData` — X DM

```json
{
  "dmEventId": "dm_event_123",
  "dmConversationId": "conv_456",
  "eventType": "MessageCreate",
  "attachments": []
}
```

### 5.7 Engagement `platformData` — LinkedIn Comment

```json
{
  "commentUrn": "urn:li:comment:(urn:li:share:123,456)",
  "parentCommentUrn": null,
  "likeCount": 2
}
```

### 5.8 Engagement `platformData` — Gmail Reply

```json
{
  "messageId": "<reply123@mail.gmail.com>",
  "inReplyTo": "<original@mail.gmail.com>",
  "threadId": "thread_789",
  "labels": ["INBOX", "SENT"]
}
```

### 5.9 Engagement `platformData` — Substack Comment

```json
{
  "postId": 12345,
  "commentId": 67890,
  "parentCommentId": null,
  "isAuthor": false
}
```

---

## 6. Email Modeling Strategy

Emails are modeled as **content** (not just engagement), enabling full
thread reconstruction and analytics.

### 6.1 Mapping

| Email Concept | OpenVolo Model |
|---|---|
| Outbound email (user sent) | `content_item` with `origin=authored` or `imported`, `direction=outbound`, `contentType=email` |
| Inbound email (received) | `content_item` with `origin=imported`, `direction=inbound`, `contentType=email`, `contactId=sender` |
| Email thread | Group of `content_items` sharing the same `threadId`, linked via `parentItemId` chain |
| Email subject | `content_items.title` |
| Email plain-text body | `content_items.body` |
| Email metadata | `content_items.platformData` (headers, attachments, labels, Message-ID) |

### 6.2 Thread Reconstruction

1. Gmail API returns `threadId` on every message
2. All messages with the same `threadId` get the same `content_items.threadId`
3. Within a thread, messages link to their parent via `parentItemId` using
   the `In-Reply-To` header to find the parent's `platformData.messageId`
4. Root message in a thread has `parentItemId = null`

### 6.3 Contact Resolution

For each email From/To/CC address:

1. **Exact match:** search `contacts.email` for the address
2. **Identity match:** search `contact_identities.platformData` for the address
   (Gmail contacts may have multiple emails)
3. **No match:** optionally auto-create a new contact with `name` parsed from
   the email `From` header display name and `email` set to the address
   - Auto-creation is configurable (on/off in settings)
   - Auto-created contacts get `funnelStage = "prospect"` and `score = 0`

### 6.4 Default Import Filters

| Filter | Rule | Rationale |
|---|---|---|
| Labels | Only sync `INBOX` + `SENT` | Skip SPAM, TRASH, PROMOTIONS, SOCIAL, UPDATES |
| Size | Skip emails > 5 MB | Avoid large attachment overhead |
| System emails | Skip `from:noreply@*` or `from:no-reply@*` | No CRM value |
| Mailing lists | Skip `List-Unsubscribe` header present | Bulk mail, not personal |

All filters are configurable — users can override defaults in settings.

---

## 7. Historical Sync Workflow

User-initiated flow to backfill content and engagement from a selected time
range.

### 7.1 User Flow

```
1. User navigates to Settings > Sync > [Platform Account]
2. Selects data types to sync (tweets, mentions, DMs, posts, emails, etc.)
3. Selects time range: 1 week / 2 weeks / 1 month / 3 months / 6 months / 1 year / custom
4. Clicks "Start Sync"
```

### 7.2 System Flow

```
1. CREATE    → sync_cursor rows for each selected data type
               Set requestedRangeStart/End, syncDirection=backward, syncStatus=idle
2. SCHEDULE  → Create scheduled_job (jobType=historical_sync)
               Payload: { platformAccountId, dataTypes, cursorIds }
3. EXECUTE   → For each data type, repeat:
               a. Fetch next page from platform API
               b. Check rate limit (rateLimitState in platform_accounts)
               c. Normalize to content_item + content_post pair
               d. Deduplicate by platformPostId (skip if already exists)
               e. Store: INSERT content_item, INSERT content_post
               f. Update sync_cursor: cursor, totalItemsSynced, syncProgress
               g. Check: have we reached requestedRangeStart? → mark complete
               h. Otherwise: continue to next page
4. COMPLETE  → Set syncStatus=complete, lastSyncCompletedAt=now
               Log sync results to scheduled_job output
```

### 7.3 Progress Tracking

Progress is tracked via the `sync_cursors` table:

| Field | Usage |
|---|---|
| `syncProgress` | `0.0` → `1.0` based on items fetched vs estimated total |
| `totalItemsSynced` | Running count of items stored |
| `syncStatus` | `idle` → `running` → `complete` (or `failed` / `paused`) |
| `oldestFetchedAt` | Timestamp of oldest item fetched so far |
| `newestFetchedAt` | Timestamp of newest item fetched so far |

UI polls `/api/sync/{platformAccountId}` for live progress.

### 7.4 Error Handling

| Error | Response |
|---|---|
| `429 Too Many Requests` | Pause sync, set `syncStatus=paused`, retry after `Retry-After` header |
| `401 Unauthorized` | Set `platform_accounts.status=needs_reauth`, pause sync |
| `5xx Server Error` | Exponential backoff: 30s → 1min → 5min |
| 3 consecutive failures | Set `syncStatus=failed`, log `lastError`, stop retrying |
| Network timeout | Treat as 5xx, same backoff |

On failure, the sync can be resumed from the last cursor position — no data
is lost.

---

## 8. Ongoing Delta Sync Workflow

Continuous sync that runs on a schedule to import new content and engagement
since the last sync.

### 8.1 Platform-Specific Delta Mechanisms

| Platform | Mechanism | How It Works |
|---|---|---|
| X tweets | `since_id` parameter | Pass ID of newest known tweet; API returns only newer tweets |
| X mentions | `since_id` parameter | Same as tweets |
| X DMs | `since_id` or pagination token | Pass latest known DM event ID |
| LinkedIn posts | Timestamp comparison | Re-fetch recent posts sorted by `LAST_MODIFIED`, skip posts with `publishedAt` <= `newestFetchedAt` |
| LinkedIn analytics | Re-fetch and diff | Re-fetch metrics for recent posts, store new `engagement_metrics` snapshot |
| Gmail | History API | `GET /history?startHistoryId={id}` — returns only changes since that history point |
| Substack | ID comparison | Re-fetch recent posts, skip posts with `id` <= newest known |

### 8.2 Default Cadence

| Data Type | Default Interval | Rationale |
|---|---|---|
| X tweets | 6 hours | Moderate volume, generous limits |
| X mentions | 2 hours | Time-sensitive for engagement |
| X DMs | 1 hour | Conversations need quick sync |
| LinkedIn posts | 24 hours | Low rate limits, slow-changing |
| LinkedIn analytics | 24 hours | Metrics update slowly |
| Gmail emails | 15 minutes | History API is efficient, emails are time-sensitive |
| Substack newsletters | 24 hours | Low publishing frequency |

Cadence is configurable per platform account via `platform_accounts.sync_config`
JSON column (already exists). Implemented using the `scheduled_jobs` table with
recurring job entries.

### 8.3 Delta Sync Execution

```
1. Scheduled job triggers
2. Load sync_cursor for (platformAccountId, dataType)
3. Use cursor value (since_id, historyId, etc.) to fetch only new items
4. Normalize → deduplicate → store (same as historical sync step 3)
5. Update cursor with new position
6. Update platform_accounts.lastSyncedAt
```

---

## 9. Engagement Aggregation

### 9.1 Per-Post Metrics

For any content post, current engagement metrics come from the latest
`engagement_metrics` snapshot:

```sql
SELECT * FROM engagement_metrics
WHERE content_post_id = ?
ORDER BY snapshot_at DESC
LIMIT 1;
```

### 9.2 Engagement Velocity

Compare two consecutive snapshots to calculate velocity:

```
velocity = (current.likes - previous.likes) / (current.snapshotAt - previous.snapshotAt)
```

Useful for identifying posts that are gaining traction vs plateauing.

### 9.3 Per-Contact Engagement Score

Weighted scoring of attributable interactions across all platforms:

| Engagement Type | Weight | Rationale |
|---|---|---|
| Reply / Comment | 5 | High-effort, direct interaction |
| DM / Message | 4 | Private, intentional outreach |
| Share / Repost | 3 | Amplification signal |
| Like / Reaction | 1 | Low-effort positive signal |
| View / Impression | 0.1 | Passive engagement |
| Click / Open | 0.5 | Intent signal |

Score calculation:
```
contactScore = SUM(weight * count) for each engagement type
             across all engagements WHERE contactId = ?
```

This score updates `contacts.score` periodically (daily or on-demand).

### 9.4 Cross-Platform Dashboard Aggregation

Aggregate metrics for the dashboard overview:

| Metric | Calculation |
|---|---|
| Total posts | `COUNT(content_posts) WHERE status IN ('published', 'imported')` |
| Total impressions | `SUM(latest engagement_metrics.impressions)` across all posts |
| Engagement rate | `SUM(likes + comments + shares) / SUM(impressions)` |
| Best performer | Post with highest engagement rate in selected time window |
| Platform breakdown | Group above metrics by `platform_accounts.platform` |

---

## 10. Known Issues & Required Fixes

### 10.1 Bug Fixes Required

| Table | Issue | Impact | Fix |
|---|---|---|---|
| `content_items.title` | `NOT NULL` constraint | Blocks import of tweets and DMs (they have no title) | Make `title` nullable |
| `engagements.contactId` | `NOT NULL` constraint | Blocks import of anonymous engagement (likes from unknown users) | Make `contactId` nullable |

### 10.2 Missing Indexes

```sql
-- Dedup during import: look up existing posts by platform ID
CREATE INDEX idx_content_posts_platform_post_id
  ON content_posts(platform_post_id);

-- Fast engagement lookup by post
CREATE INDEX idx_engagements_content_post_id
  ON engagements(content_post_id);

-- Fast engagement lookup by platform dedup key
CREATE UNIQUE INDEX idx_engagements_platform_id
  ON engagements(platform_engagement_id)
  WHERE platform_engagement_id IS NOT NULL;

-- Content items by thread for thread reconstruction
CREATE INDEX idx_content_items_thread_id
  ON content_items(thread_id)
  WHERE thread_id IS NOT NULL;

-- Content items by origin for filtering imported vs authored
CREATE INDEX idx_content_items_origin
  ON content_items(origin);
```

### 10.3 JSON Column Limitations

`content_posts.engagementSnapshot` stores engagement as a JSON blob that
cannot be queried with SQL. The new `engagement_metrics` table supplements
this with queryable, time-series engagement data. The `engagementSnapshot`
column is retained for backward compatibility and quick single-post lookups.

---

## 11. Migration Path

### 11.1 Schema Changes

All schema changes are applied via `drizzle-kit push` (no manual SQL):

1. **Modify `content_items`:**
   - Relax `title` to nullable
   - Add `origin`, `direction`, `platformAccountId`, `threadId`, `parentItemId`,
     `contactId`, `platformData` columns
   - Extend `contentType` enum with `email`, `dm`, `newsletter`
   - Extend `status` enum with `imported`

2. **Modify `content_posts`:**
   - Extend `status` enum with `imported`

3. **Modify `engagements`:**
   - Relax `contactId` to nullable
   - Add `contentPostId`, `platform`, `platformEngagementId`, `threadId`,
     `source`, `platformData` columns
   - Extend `engagementType` enum with `retweet`, `quote`, `bookmark`,
     `impression`, `click`, `open`, `restack`, `reaction`

4. **Create `sync_cursors` table** (Section 3)

5. **Create `engagement_metrics` table** (Section 4)

### 11.2 Data Backfill

Existing data needs default values for new columns:

```sql
-- Existing content_items are user-authored, outbound
UPDATE content_items SET origin = 'authored' WHERE origin IS NULL;
UPDATE content_items SET direction = 'outbound' WHERE direction IS NULL;

-- Existing engagements are manual or campaign-sourced
UPDATE engagements SET source = 'manual' WHERE source IS NULL AND campaign_id IS NULL;
UPDATE engagements SET source = 'campaign' WHERE source IS NULL AND campaign_id IS NOT NULL;
```

### 11.3 New Query Files

| File | Purpose |
|---|---|
| `src/lib/db/queries/content.ts` | Content CRUD: list, get, create, update, search by type/origin/platform |
| `src/lib/db/queries/engagements.ts` | Engagement CRUD: list by contact/post, create, aggregate |
| `src/lib/db/queries/sync.ts` | Sync cursor management: get/update cursor, sync status |
| `src/lib/db/queries/metrics.ts` | Engagement metrics: snapshot CRUD, velocity, per-post latest |

### 11.4 New API Routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/content` | GET, POST | List/create content items |
| `/api/content/[id]` | GET, PUT, DELETE | Single content item CRUD |
| `/api/engagements` | GET, POST | List/create engagements |
| `/api/engagements/[id]` | GET | Single engagement detail |
| `/api/sync/[platformAccountId]` | GET, POST | Get sync status, trigger sync |
| `/api/sync/[platformAccountId]/[dataType]` | GET, PUT | Per-data-type cursor status |

---

## 12. Phase Placement

| Component | Phase | Dependencies |
|---|---|---|
| Schema changes + new tables | 2 | — |
| Content CRUD queries + API routes | 2 | Schema changes |
| X tweet/mention sync (historical + delta) | 2 | X API client (Phase 1), content queries |
| Gmail email sync (historical + delta) | 2 | Gmail OAuth (Phase 2), content queries |
| Sync management UI | 2 | Sync API routes |
| LinkedIn post + analytics sync | 3 | LinkedIn OAuth (Phase 2) |
| Substack newsletter sync | 3 | Substack integration (Phase 2) |
| X DM sync | 3 | X API client, DM permissions |
| Engagement timeline / activity feed UI | 3 | Engagement queries |
| Cross-platform analytics dashboard | 3 | Engagement metrics, all syncs |
