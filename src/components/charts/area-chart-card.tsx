"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

interface AreaChartCardProps {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  dataKeys: { key: string; label: string; color: string; stacked?: boolean }[];
  xAxisKey: string;
  className?: string;
  yAxisFormatter?: (value: number) => string;
}

export function AreaChartCard({
  title,
  description,
  data,
  dataKeys,
  xAxisKey,
  className,
  yAxisFormatter,
}: AreaChartCardProps) {
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-heading-3">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[250px] w-full">
          <AreaChart data={data} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
              tickFormatter={yAxisFormatter}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                dataKey={dk.key}
                type="monotone"
                fill={`var(--color-${dk.key})`}
                stroke={`var(--color-${dk.key})`}
                fillOpacity={0.15}
                stackId={dk.stacked ? "stack" : undefined}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
