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

  // Altura proporcional ao número de disciplinas, para as barras não ficarem espremidas.
  const height = Math.max(200, data.length * 36 + 16)

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full min-w-0 overflow-hidden"
      style={{ height }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickFormatter={(value: string) => (value.length > 22 ? `${value.slice(0, 21)}…` : value)}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value) => `${value}%`} hideLabel />}
        />
        <Bar
          dataKey="percentage"
          fill="var(--color-percentage)"
          radius={[0, 6, 6, 0]}
          barSize={14}
          background={{ fill: "var(--muted)" }}
        />
      </BarChart>
    </ChartContainer>
  )
}
