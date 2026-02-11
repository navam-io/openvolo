import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  contacts,
  contactIdentities,
  tasks,
  chatConversations,
  workflowTemplates,
  workflowTemplateSteps,
  workflowEnrollments,
  contentItems,
  contentPosts,
  engagements,
  platformAccounts,
  syncCursors,
  engagementMetrics,
  workflowRuns,
  workflowSteps,
  scheduledJobs,
  mediaAssets,
  goals,
  goalWorkflows,
  goalProgress,
} from "./schema";

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

// Chat conversation types
export type ChatConversation = InferSelectModel<typeof chatConversations>;
export type NewChatConversation = InferInsertModel<typeof chatConversations>;

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

// Engagement types
export type Engagement = InferSelectModel<typeof engagements>;
export type NewEngagement = InferInsertModel<typeof engagements>;

// Workflow template types (formerly "campaigns")
export type WorkflowTemplate = InferSelectModel<typeof workflowTemplates>;
export type NewWorkflowTemplate = InferInsertModel<typeof workflowTemplates>;
export type WorkflowTemplateStep = InferSelectModel<typeof workflowTemplateSteps>;
export type NewWorkflowTemplateStep = InferInsertModel<typeof workflowTemplateSteps>;
export type WorkflowEnrollment = InferSelectModel<typeof workflowEnrollments>;
export type NewWorkflowEnrollment = InferInsertModel<typeof workflowEnrollments>;

// Workflow run types
export type WorkflowRun = InferSelectModel<typeof workflowRuns>;
export type NewWorkflowRun = InferInsertModel<typeof workflowRuns>;
export type WorkflowStep = InferSelectModel<typeof workflowSteps>;
export type NewWorkflowStep = InferInsertModel<typeof workflowSteps>;
export type WorkflowRunWithSteps = WorkflowRun & { steps: WorkflowStep[] };

// Scheduled job types
export type ScheduledJob = InferSelectModel<typeof scheduledJobs>;
export type NewScheduledJob = InferInsertModel<typeof scheduledJobs>;

// Media asset types
export type MediaAsset = InferSelectModel<typeof mediaAssets>;
export type NewMediaAsset = InferInsertModel<typeof mediaAssets>;

// Goal types
export type Goal = InferSelectModel<typeof goals>;
export type NewGoal = InferInsertModel<typeof goals>;
export type GoalWorkflow = InferSelectModel<typeof goalWorkflows>;
export type NewGoalWorkflow = InferInsertModel<typeof goalWorkflows>;
export type GoalProgress = InferSelectModel<typeof goalProgress>;
export type NewGoalProgress = InferInsertModel<typeof goalProgress>;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}
