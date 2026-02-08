"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface RankedColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  format?: (value: unknown) => string;
}

interface RankedTableCardProps {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  columns: RankedColumn[];
  /** Key used to size the bar indicator (optional). */
  barKey?: string;
  className?: string;
}

export function RankedTableCard({
  title,
  description,
  data,
  columns,
  barKey,
  className,
}: RankedTableCardProps) {
  const maxBarValue = barKey
    ? Math.max(...data.map((row) => Number(row[barKey]) || 0), 1)
    : 0;

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-heading-3">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.align === "right" ? "text-right" : ""}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {idx + 1}
                </TableCell>
                {columns.map((col) => {
                  const value = row[col.key];
                  const formatted = col.format ? col.format(value) : String(value ?? "—");
                  const isBarCol = barKey && col.key === barKey;

                  return (
                    <TableCell
                      key={col.key}
                      className={col.align === "right" ? "text-right" : ""}
                    >
                      {isBarCol ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 rounded-full bg-primary/30"
                            style={{
                              width: `${(Number(value) / maxBarValue) * 100}%`,
                              minWidth: "4px",
                            }}
                          />
                          <span className="font-mono text-xs tabular-nums">
                            {formatted}
                          </span>
                        </div>
                      ) : (
                        formatted
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
