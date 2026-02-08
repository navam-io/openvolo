import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { contacts, contactIdentities, tasks, campaigns, contentItems, contentPosts, agentRuns, engagements, platformAccounts, syncCursors, engagementMetrics } from "./schema";

// Contact types
export type Contact = InferSelectModel<typeof contacts>;
export type NewContact = InferInsertModel<typeof contacts>;

// Contact identity types
export type ContactIdentity = InferSelectModel<typeof contactIdentities>;
export type NewContactIdentity = InferInsertModel<typeof contactIdentities>;
export type ContactWithIdentities = Contact & { identities: ContactIdentity[] };

// Task types
export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

// Platform account types
export type PlatformAccount = InferSelectModel<typeof platformAccounts>;
export type NewPlatformAccount = InferInsertModel<typeof platformAccounts>;

// Content types
export type ContentItem = InferSelectModel<typeof contentItems>;
export type NewContentItem = InferInsertModel<typeof contentItems>;
export type ContentPost = InferSelectModel<typeof contentPosts>;
export type NewContentPost = InferInsertModel<typeof contentPosts>;

// Content with post — joined content_item + content_post
export type ContentItemWithPost = ContentItem & {
  post: ContentPost | null;
  metrics: EngagementMetric | null;
};

// Sync cursor types
export type SyncCursor = InferSelectModel<typeof syncCursors>;
export type NewSyncCursor = InferInsertModel<typeof syncCursors>;

// Engagement metric types
export type EngagementMetric = InferSelectModel<typeof engagementMetrics>;
export type NewEngagementMetric = InferInsertModel<typeof engagementMetrics>;

// Other entity types (used by dashboard)
export type Campaign = InferSelectModel<typeof campaigns>;
export type AgentRun = InferSelectModel<typeof agentRuns>;
export type Engagement = InferSelectModel<typeof engagements>;
export type NewEngagement = InferInsertModel<typeof engagements>;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}
