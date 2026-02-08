"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface BarChartCardProps {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  dataKeys: { key: string; label: string; color: string; stacked?: boolean }[];
  xAxisKey: string;
  className?: string;
  layout?: "vertical" | "horizontal";
  yAxisFormatter?: (value: number) => string;
}

export function BarChartCard({
  title,
  description,
  data,
  dataKeys,
  xAxisKey,
  className,
  layout = "horizontal",
  yAxisFormatter,
}: BarChartCardProps) {
  const config: ChartConfig = {};
  for (const dk of dataKeys) {
    config[dk.key] = { label: dk.label, color: dk.color };
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-heading-3">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const isVertical = layout === "vertical";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-heading-3">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[250px] w-full">
          <BarChart
            data={data}
            layout={isVertical ? "vertical" : "horizontal"}
            margin={{ left: 4, right: 4 }}
          >
            <CartesianGrid vertical={!isVertical} horizontal={isVertical} />
            {isVertical ? (
              <>
                <YAxis
                  dataKey={xAxisKey}
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={80}
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={yAxisFormatter}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xAxisKey}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v: string) =>
                    typeof v === "string" && v.includes("-") ? v.slice(5) : v
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={40}
                  tickFormatter={yAxisFormatter}
                />
              </>
            )}
            <ChartTooltip content={<ChartTooltipContent />} />
            {dataKeys.map((dk) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                fill={`var(--color-${dk.key})`}
                radius={[4, 4, 0, 0]}
                stackId={dk.stacked ? "stack" : undefined}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
