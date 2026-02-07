import { desc, eq, count } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts, tasks, campaigns, contentItems } from "@/lib/db/schema";
import type { Contact, Task } from "@/lib/db/types";

export interface DashboardMetrics {
  totalContacts: number;
  activeCampaigns: number;
  pendingTasks: number;
  contentItems: number;
  recentContacts: Contact[];
  pendingTasksList: Task[];
}

export function getDashboardMetrics(): DashboardMetrics {
  const totalContacts = db.select({ value: count() }).from(contacts).get()?.value ?? 0;

  const activeCampaigns = db
    .select({ value: count() })
    .from(campaigns)
    .where(eq(campaigns.status, "active"))
    .get()?.value ?? 0;

  const pendingTasks = db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.status, "todo"))
    .get()?.value ?? 0;

  const totalContent = db.select({ value: count() }).from(contentItems).get()?.value ?? 0;

  const recentContacts = db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.createdAt))
    .limit(5)
    .all();

  const pendingTasksList = db
    .select()
    .from(tasks)
    .where(eq(tasks.status, "todo"))
    .orderBy(desc(tasks.createdAt))
    .limit(5)
    .all();

  return {
    totalContacts,
    activeCampaigns,
    pendingTasks,
    contentItems: totalContent,
    recentContacts,
    pendingTasksList,
  };
}
