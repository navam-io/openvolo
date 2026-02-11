import { listGoals } from "@/lib/db/queries/goals";
import { GoalsListClient } from "./goals-list-client";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; goalType?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const { data, total } = listGoals({
    status: params.status,
    goalType: params.goalType,
    page,
    pageSize: 25,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-1">Goals</h1>
        <p className="text-muted-foreground mt-1">
          Track demand generation goals and measure workflow impact.
        </p>
      </div>
      <GoalsListClient
        goals={data}
        total={total}
        page={page}
        currentStatus={params.status}
        currentGoalType={params.goalType}
      />
    </div>
  );
}
