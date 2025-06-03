
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardBarChart from "@/components/charts/dashboard-bar-chart";
import DashboardPieChart from "@/components/charts/dashboard-pie-chart";
import DashboardCashflowLineChart from "@/components/charts/dashboard-cashflow-line-chart";

const chartData = [
  { month: "Gen", income: 4000, expenses: 2400 },
  { month: "Feb", income: 3000, expenses: 1398 },
  { month: "Mar", income: 2000, expenses: 5800 },
  { month: "Apr", income: 2780, expenses: 3908 },
  { month: "Mag", income: 1890, expenses: 4800 },
  { month: "Giu", income: 2390, expenses: 3800 },
];

const pieChartData = [
  { name: "Stipendi", value: 400, fill: "hsl(var(--chart-1))" },
  { name: "Materiali", value: 300, fill: "hsl(var(--chart-2))" },
  { name: "Affitto", value: 300, fill: "hsl(var(--chart-3))" },
  { name: "Utenze", value: 200, fill: "hsl(var(--chart-4))" },
  { name: "Altro", value: 278, fill: "hsl(var(--chart-5))" },
];

const barChartConfig = {
  income: { label: "Entrate", color: "hsl(var(--chart-1))" },
  expenses: { label: "Uscite", color: "hsl(var(--chart-2))" },
};

const lineChartConfig = {
  cashflow: { label: "Flusso di Cassa", color: "hsl(var(--chart-1))" },
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Panoramica finanziaria dello Studio De Vecchi & Mapelli."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrate Totali (Mese)</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€12,345</div>
            <p className="text-xs text-muted-foreground">+5.2% rispetto al mese scorso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uscite Totali (Mese)</CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€8,765</div>
            <p className="text-xs text-muted-foreground">-1.8% rispetto al mese scorso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Attuale</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€3,580</div>
            <p className="text-xs text-muted-foreground">Bilancio positivo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Entrate vs Uscite Mensili</CardTitle>
            <CardDescription>Confronto degli ultimi 6 mesi.</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardBarChart data={chartData} config={barChartConfig} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Distribuzione Spese</CardTitle>
            <CardDescription>Categorie di spesa principali questo mese.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <DashboardPieChart data={pieChartData} />
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Flusso di Cassa Recente</CardTitle>
            <CardDescription>Andamento del flusso di cassa negli ultimi 30 giorni.</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardCashflowLineChart data={[]} config={lineChartConfig} />
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Obiettivi Finanziari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-primary">Risparmio Mensile</span>
                <span className="text-sm font-medium">€1,200 / €2,000 (60%)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: "60%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-accent">Riduzione Costi Materiali</span>
                <span className="text-sm font-medium">-5% / -10% (50%)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div className="bg-accent h-2.5 rounded-full" style={{ width: "50%" }}></div>
              </div>
            </div>
             <Badge variant="outline">Prossima Revisione: 31 Luglio</Badge>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
