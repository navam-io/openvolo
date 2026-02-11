import { notFound } from "next/navigation";
import { getGoal, listGoalProgress } from "@/lib/db/queries/goals";
import { GoalDetailClient } from "./goal-detail-client";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const goal = getGoal(id);
  if (!goal) notFound();

  // Default to 30-day progress history
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const progress = listGoalProgress(id, since);

  return <GoalDetailClient goal={goal} progress={progress} />;
}
