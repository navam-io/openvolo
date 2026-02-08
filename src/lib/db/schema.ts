import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Helper for default timestamps (unix epoch seconds)
const timestamps = {
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
};

// --- Platform Accounts ---

export const platformAccounts = sqliteTable("platform_accounts", {
  id: text("id").primaryKey(),
  platform: text("platform", { enum: ["x", "linkedin", "gmail", "substack"] }).notNull(),
  displayName: text("display_name").notNull(),
  authType: text("auth_type", { enum: ["oauth", "session", "api_key"] }).notNull(),
  credentialsEncrypted: text("credentials_encrypted"), // JSON string, AES-256
  rateLimitState: text("rate_limit_state"), // JSON
  status: text("status", { enum: ["active", "paused", "needs_reauth"] })
    .notNull()
    .default("active"),
  lastSyncedAt: integer("last_synced_at"),
  ...timestamps,
});

// --- Contacts ---

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  headline: text("headline"),
  company: text("company"),
  title: text("title"),
  // Deprecated: use contactIdentities table instead
  platform: text("platform", { enum: ["x", "linkedin", "gmail", "substack"] }),
  platformUserId: text("platform_user_id"),
  profileUrl: text("profile_url"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  phone: text("phone"),
  bio: text("bio"),
  location: text("location"),
  website: text("website"),
  photoUrl: text("photo_url"),
  verifiedEmail: integer("verified_email").notNull().default(0),
  enrichmentScore: integer("enrichment_score").notNull().default(0),
  tags: text("tags").default("[]"), // JSON array
  funnelStage: text("funnel_stage", {
    enum: ["prospect", "engaged", "qualified", "opportunity", "customer", "advocate"],
  })
    .notNull()
    .default("prospect"),
  score: integer("score").notNull().default(0),
  metadata: text("metadata").default("{}"), // JSON
  lastInteractionAt: integer("last_interaction_at"),
  ...timestamps,
}, (table) => [
  index("idx_contacts_email").on(table.email),
  index("idx_contacts_name").on(table.name),
  index("idx_contacts_company").on(table.company),
]);

// --- Contact Identities (multi-platform golden record) ---

export const contactIdentities = sqliteTable("contact_identities", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: ["x", "linkedin", "gmail", "substack"] }).notNull(),
  platformUserId: text("platform_user_id").notNull(),
  platformHandle: text("platform_handle"),
  platformUrl: text("platform_url"),
  platformData: text("platform_data").default("{}"), // JSON
  isPrimary: integer("is_primary").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  lastSyncedAt: integer("last_synced_at"),
  syncErrors: text("sync_errors"),
  ...timestamps,
}, (table) => [
  uniqueIndex("idx_identity_platform_user").on(table.platform, table.platformUserId),
  index("idx_identity_contact").on(table.contactId),
]);

// --- Campaigns ---

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  platform: text("platform", { enum: ["x", "linkedin", "gmail", "substack"] }),
  campaignType: text("campaign_type", {
    enum: ["outreach", "engagement", "content", "nurture"],
  }).notNull(),
  status: text("status", { enum: ["draft", "active", "paused", "completed"] })
    .notNull()
    .default("draft"),
  config: text("config").default("{}"), // JSON - targeting, timing, daily limits
  goalMetrics: text("goal_metrics").default("{}"), // JSON
  startsAt: integer("starts_at"),
  endsAt: integer("ends_at"),
  ...timestamps,
});

// --- Campaign Steps ---

export const campaignSteps = sqliteTable("campaign_steps", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  stepType: text("step_type", {
    enum: ["connect", "message", "follow", "like", "comment", "wait", "condition"],
  }).notNull(),
  config: text("config").default("{}"), // JSON - template, duration, condition
  delayHours: integer("delay_hours").default(0),
});

// --- Campaign Contacts ---

export const campaignContacts = sqliteTable("campaign_contacts", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["pending", "active", "completed", "replied", "removed"],
  })
    .notNull()
    .default("pending"),
  currentStepIndex: integer("current_step_index").notNull().default(0),
  enrolledAt: integer("enrolled_at")
    .notNull()
    .default(sql`(unixepoch())`),
  completedAt: integer("completed_at"),
});

// --- Content Items ---

export const contentItems = sqliteTable("content_items", {
  id: text("id").primaryKey(),
  title: text("title"), // nullable — tweets/DMs have no title
  body: text("body"),
  contentType: text("content_type", {
    enum: ["post", "article", "thread", "reply", "image", "video", "email", "dm", "newsletter"],
  }).notNull(),
  platformTarget: text("platform_target"),
  mediaPaths: text("media_paths").default("[]"), // JSON array of local paths
  status: text("status", {
    enum: ["draft", "review", "approved", "scheduled", "published", "imported"],
  })
    .notNull()
    .default("draft"),
  aiGenerated: integer("ai_generated", { mode: "boolean" }).notNull().default(false),
  generationPrompt: text("generation_prompt"),
  scheduledAt: integer("scheduled_at"),
  // Phase 2 additions
  origin: text("origin", { enum: ["authored", "received", "imported"] }),
  direction: text("direction", { enum: ["inbound", "outbound"] }),
  platformAccountId: text("platform_account_id").references(() => platformAccounts.id),
  threadId: text("thread_id"), // groups threaded content
  parentItemId: text("parent_item_id"), // self-reference for replies
  contactId: text("contact_id").references(() => contacts.id), // associated contact
  platformData: text("platform_data").default("{}"), // JSON — raw platform-specific data
  ...timestamps,
}, (table) => [
  index("idx_content_items_type").on(table.contentType),
  index("idx_content_items_status").on(table.status),
  index("idx_content_items_origin").on(table.origin),
  index("idx_content_items_account").on(table.platformAccountId),
]);

// --- Content Posts (published instances) ---

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
  engagementSnapshot: text("engagement_snapshot").default("{}"), // JSON
}, (table) => [
  uniqueIndex("idx_content_posts_platform_id").on(table.platformPostId, table.platformAccountId),
]);

// --- Engagements ---

export const engagements = sqliteTable("engagements", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .references(() => contacts.id, { onDelete: "cascade" }), // nullable for anonymous engagement
  platformAccountId: text("platform_account_id").references(() => platformAccounts.id),
  engagementType: text("engagement_type", {
    enum: [
      "connection_request",
      "message",
      "like",
      "comment",
      "share",
      "follow",
      "view",
      "reply",
      "retweet",
      "quote",
      "bookmark",
      "impression",
      "click",
      "open",
      "restack",
      "reaction",
    ],
  }).notNull(),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  content: text("content"),
  campaignId: text("campaign_id").references(() => campaigns.id),
  agentRunId: text("agent_run_id"),
  // Phase 2 additions
  contentPostId: text("content_post_id").references(() => contentPosts.id),
  platform: text("platform", { enum: ["x", "linkedin", "gmail", "substack"] }),
  platformEngagementId: text("platform_engagement_id"), // dedup key
  threadId: text("thread_id"),
  source: text("source"), // e.g. "timeline", "notification", "search"
  platformData: text("platform_data").default("{}"), // JSON
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_engagements_contact").on(table.contactId),
  index("idx_engagements_content_post").on(table.contentPostId),
  index("idx_engagements_platform_id").on(table.platformEngagementId),
]);

// --- Tasks ---

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type", {
    enum: ["manual", "agent_review", "follow_up", "content_review"],
  })
    .notNull()
    .default("manual"),
  status: text("status", { enum: ["todo", "in_progress", "blocked", "done"] })
    .notNull()
    .default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] })
    .notNull()
    .default("medium"),
  assignee: text("assignee", { enum: ["user", "agent"] })
    .notNull()
    .default("user"),
  relatedContactId: text("related_contact_id").references(() => contacts.id),
  relatedCampaignId: text("related_campaign_id").references(() => campaigns.id),
  dueAt: integer("due_at"),
  completedAt: integer("completed_at"),
  ...timestamps,
});

// --- Agent Runs ---

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  trigger: text("trigger", { enum: ["user", "scheduled", "campaign"] })
    .notNull()
    .default("user"),
  status: text("status", {
    enum: ["queued", "running", "completed", "failed", "cancelled"],
  })
    .notNull()
    .default("queued"),
  input: text("input").default("{}"), // JSON
  output: text("output"), // JSON
  error: text("error"),
  model: text("model"),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  costUsd: real("cost_usd").default(0),
  parentRunId: text("parent_run_id"), // subagent tracking
  startedAt: integer("started_at"),
  completedAt: integer("completed_at"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- Agent Steps ---

export const agentSteps = sqliteTable("agent_steps", {
  id: text("id").primaryKey(),
  agentRunId: text("agent_run_id")
    .notNull()
    .references(() => agentRuns.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  stepType: text("step_type", {
    enum: ["thinking", "tool_call", "tool_result", "decision", "error"],
  }).notNull(),
  description: text("description"),
  data: text("data"), // JSON
  durationMs: integer("duration_ms"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- Sync Cursors (pagination state for platform imports) ---

export const syncCursors = sqliteTable("sync_cursors", {
  id: text("id").primaryKey(),
  platformAccountId: text("platform_account_id")
    .notNull()
    .references(() => platformAccounts.id, { onDelete: "cascade" }),
  dataType: text("data_type", {
    enum: ["tweets", "mentions", "followers", "following", "dms", "likes", "connections", "google_contacts", "gmail_metadata", "x_profiles"],
  }).notNull(),
  cursor: text("cursor"), // platform pagination token
  oldestFetchedAt: integer("oldest_fetched_at"), // oldest item timestamp fetched
  newestFetchedAt: integer("newest_fetched_at"), // newest item timestamp fetched
  totalItemsSynced: integer("total_items_synced").notNull().default(0),
  syncStatus: text("sync_status", {
    enum: ["idle", "syncing", "completed", "failed"],
  })
    .notNull()
    .default("idle"),
  syncProgress: text("sync_progress"), // JSON — { current, total, message }
  syncDirection: text("sync_direction", { enum: ["forward", "backward"] })
    .notNull()
    .default("backward"), // backward = fetch older, forward = fetch newer
  lastSyncStartedAt: integer("last_sync_started_at"),
  lastSyncCompletedAt: integer("last_sync_completed_at"),
  lastError: text("last_error"),
  ...timestamps,
}, (table) => [
  uniqueIndex("idx_sync_cursor_account_type").on(table.platformAccountId, table.dataType),
]);

// --- Engagement Metrics (time-series snapshots) ---

export const engagementMetrics = sqliteTable("engagement_metrics", {
  id: text("id").primaryKey(),
  contentPostId: text("content_post_id")
    .notNull()
    .references(() => contentPosts.id, { onDelete: "cascade" }),
  snapshotAt: integer("snapshot_at")
    .notNull()
    .default(sql`(unixepoch())`),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  bookmarks: integer("bookmarks").notNull().default(0),
  quotes: integer("quotes").notNull().default(0),
  retweets: integer("retweets").notNull().default(0),
}, (table) => [
  index("idx_engagement_metrics_post").on(table.contentPostId),
  index("idx_engagement_metrics_snapshot").on(table.snapshotAt),
]);

// --- Scheduled Jobs ---

export const scheduledJobs = sqliteTable("scheduled_jobs", {
  id: text("id").primaryKey(),
  jobType: text("job_type").notNull(),
  payload: text("payload").default("{}"), // JSON
  status: text("status", { enum: ["pending", "running", "completed", "failed"] })
    .notNull()
    .default("pending"),
  runAt: integer("run_at").notNull(),
  startedAt: integer("started_at"),
  completedAt: integer("completed_at"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  error: text("error"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});
