import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
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
  platform: text("platform", { enum: ["x", "linkedin"] }).notNull(),
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
  headline: text("headline"),
  company: text("company"),
  title: text("title"),
  platform: text("platform", { enum: ["x", "linkedin"] }),
  platformUserId: text("platform_user_id"),
  profileUrl: text("profile_url"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  phone: text("phone"),
  bio: text("bio"),
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
});

// --- Campaigns ---

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  platform: text("platform", { enum: ["x", "linkedin"] }),
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
  title: text("title").notNull(),
  body: text("body"),
  contentType: text("content_type", {
    enum: ["post", "article", "thread", "reply", "image", "video"],
  }).notNull(),
  platformTarget: text("platform_target"),
  mediaPaths: text("media_paths").default("[]"), // JSON array of local paths
  status: text("status", {
    enum: ["draft", "review", "approved", "scheduled", "published"],
  })
    .notNull()
    .default("draft"),
  aiGenerated: integer("ai_generated", { mode: "boolean" }).notNull().default(false),
  generationPrompt: text("generation_prompt"),
  scheduledAt: integer("scheduled_at"),
  ...timestamps,
});

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
    enum: ["scheduled", "publishing", "published", "failed"],
  })
    .notNull()
    .default("scheduled"),
  engagementSnapshot: text("engagement_snapshot").default("{}"), // JSON
});

// --- Engagements ---

export const engagements = sqliteTable("engagements", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
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
    ],
  }).notNull(),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  content: text("content"),
  campaignId: text("campaign_id").references(() => campaigns.id),
  agentRunId: text("agent_run_id"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

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
