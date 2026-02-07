import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { contacts, contactIdentities, tasks, campaigns, contentItems, agentRuns, engagements, platformAccounts } from "./schema";

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

// Other entity types (used by dashboard)
export type Campaign = InferSelectModel<typeof campaigns>;
export type ContentItem = InferSelectModel<typeof contentItems>;
export type AgentRun = InferSelectModel<typeof agentRuns>;
export type Engagement = InferSelectModel<typeof engagements>;
