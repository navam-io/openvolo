import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { contacts, tasks, campaigns, contentItems, agentRuns, engagements } from "./schema";

// Contact types
export type Contact = InferSelectModel<typeof contacts>;
export type NewContact = InferInsertModel<typeof contacts>;

// Task types
export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

// Other entity types (used by dashboard)
export type Campaign = InferSelectModel<typeof campaigns>;
export type ContentItem = InferSelectModel<typeof contentItems>;
export type AgentRun = InferSelectModel<typeof agentRuns>;
export type Engagement = InferSelectModel<typeof engagements>;
