
"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { PieProps } from "recharts";

interface DashboardPieChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
  onSliceClick?: (data: any, index: number) => void;
}

// Componente personalizzato per il contenuto dell'etichetta
const CustomizedLabelContent = (props: any) => {
  const { cx, x, y, name, percent } = props;

  // Non mostrare l'etichetta se la fetta è troppo piccola (es. < 4%) o se mancano dati
  if (!name || typeof percent !== 'number' || percent * 100 < 4) {
    return null;
  }

  const textAnchor = x >= cx ? 'start' : 'end';

  return (
    <text
      x={x}
      y={y}
      fill="var(--foreground)"
      textAnchor={textAnchor}
      dominantBaseline="central"
      fontSize="11px"
      className="recharts-pie-label-text"
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export default function DashboardPieChart({ data, onSliceClick }: DashboardPieChartProps) {
  const handlePieClick: PieProps['onClick'] = (slicePayload, index, e) => {
    if (onSliceClick) {
      onSliceClick(slicePayload, index);
    }
  };

  return (
    <ChartContainer config={{}} className="h-[300px] w-full max-w-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 5, right: 45, bottom: 5, left: 45 }}> {/* Aggiunti margini per le etichette */}
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={75} // Ridotto per dare spazio alle etichette esterne
            labelLine={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }} // Linee guida per le etichette esterne
            label={<CustomizedLabelContent />} // Usa il componente personalizzato per il testo dell'etichetta
            onClick={handlePieClick}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer focus:outline-none" />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
