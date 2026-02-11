/** Context about the current page the user is viewing. */
export interface PageContext {
  path: string;
  contactId?: string;
  workflowId?: string;
  contentId?: string;
  goalId?: string;
}
