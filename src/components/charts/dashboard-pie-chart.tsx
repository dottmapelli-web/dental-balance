
"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { PieProps } from "recharts";

interface DashboardPieChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
  onSliceClick?: (data: any, index: number) => void; // data is the slice payload
}

// Funzione personalizzata per renderizzare le etichette
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, ...props }: any) => {
  const RADIAN = Math.PI / 180;
  // Posiziona l'etichetta leggermente all'interno della fetta, non troppo al centro né troppo all'esterno
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const percentage = (percent * 100).toFixed(0);

  // Non mostrare l'etichetta se la fetta è troppo piccola (es. < 4%) per evitare sovrapposizioni
  if (percent * 100 < 4) {
    return null;
  }

  return (
    <text
      x={x}
      y={y}
      fill="var(--card-foreground)" // Colore di contrasto per leggibilità
      textAnchor={x > cx ? 'start' : 'end'} // Ancoraggio del testo
      dominantBaseline="central" // Allineamento verticale
      fontSize="11px" // Dimensione font ridotta
      fontWeight="500" // Leggermente bold per risaltare
    >
      {`${name} (${percentage}%)`}
    </text>
  );
};

export default function DashboardPieChart({ data, onSliceClick }: DashboardPieChartProps) {
  const handlePieClick: PieProps['onClick'] = (slicePayload, index, e) => { // slicePayload è il nome corretto
    if (onSliceClick) {
      onSliceClick(slicePayload, index);
    }
  };

  return (
    <ChartContainer config={{}} className="h-[300px] w-full max-w-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie 
            data={data} 
            dataKey="value" 
            nameKey="name" 
            cx="50%" 
            cy="50%" 
            outerRadius={100} 
            labelLine={false} // Manteniamo false per etichette interne
            label={renderCustomizedLabel} // Usiamo la funzione personalizzata
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
