"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { StudentSubjectProgress } from "@/lib/student/types"

const chartConfig: ChartConfig = {
  percentage: {
    label: "Progresso",
    color: "var(--chart-1)",
  },
}

export function DisciplineProgressChart({ subjects }: { subjects: StudentSubjectProgress[] }) {
  const data = subjects.map((entry) => ({
    name: entry.name,
    percentage: entry.percentage,
  }))

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full min-w-0 overflow-hidden">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={104}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value) => `${value}%`} hideLabel />}
        />
        <Bar dataKey="percentage" fill="var(--color-percentage)" radius={[0, 6, 6, 0]} barSize={16} />
      </BarChart>
    </ChartContainer>
  )
}
