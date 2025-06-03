
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit2, Target, CheckCircle, TrendingUp } from "lucide-react";

const budgetItems = [
  { id: "1", category: "Materiali Dentali", budgeted: 5000, actual: 4500, period: "Mensile" },
  { id: "2", category: "Stipendi Staff", budgeted: 15000, actual: 14800, period: "Mensile" },
  { id: "3", category: "Marketing", budgeted: 2000, actual: 2200, period: "Mensile" },
  { id: "4", category: "Formazione Staff", budgeted: 3000, actual: 1500, period: "Annuale" },
  { id: "5", category: "Nuova Attrezzatura", budgeted: 20000, actual: 5000, period: "Annuale" },
];

const objectives = [
  { id: "obj1", name: "Aumentare Entrate del 15%", target: 15, current: 10, unit: "%", status: "In Corso", icon: <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400"/> },
  { id: "obj2", name: "Ridurre Sprechi Materiali del 5%", target: 5, current: 2, unit: "%", status: "In Corso", icon: <Target className="h-5 w-5 text-blue-500 dark:text-blue-400"/> },
  { id: "obj3", name: "Acquisire 50 Nuovi Pazienti", target: 50, current: 50, unit: "pazienti", status: "Completato", icon: <CheckCircle className="h-5 w-5 text-primary"/> },
];

export default function BudgetObjectivesPage() {
  return (
    <>
      <PageHeader
        title="Budget e Obiettivi"
        description="Imposta e monitora i budget di spesa e gli obiettivi finanziari dello studio."
        actions={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuovo Budget/Obiettivo
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Monitoraggio Budget</CardTitle>
            <CardDescription>Visualizza lo stato dei budget impostati.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Speso</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetItems.map((item) => {
                  const progress = Math.min((item.actual / item.budgeted) * 100, 100);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell>€{item.budgeted.toFixed(2)}</TableCell>
                      <TableCell>€{item.actual.toFixed(2)}</TableCell>
                      <TableCell className="w-[150px]">
                        <Progress value={progress} aria-label={`${progress.toFixed(0)}% speso`} className={progress > 85 ? "[&>div]:bg-destructive" : ""} />
                        <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.period}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Edit2 className="h-4 w-4" />
                           <span className="sr-only">Modifica</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Obiettivi Finanziari</CardTitle>
            <CardDescription>Traccia il progresso verso gli obiettivi chiave.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {objectives.map((obj) => (
              <div key={obj.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                     {obj.icon}
                    <h3 className="text-md font-semibold">{obj.name}</h3>
                  </div>
                  <Badge variant={obj.status === "Completato" ? "default" : "secondary"} className={obj.status === "Completato" ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-800/50 dark:text-green-300 dark:border-green-700" : ""}>
                    {obj.status}
                  </Badge>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span>{obj.current}{obj.unit} / {obj.target}{obj.unit}</span>
                  </div>
                  <Progress value={(obj.current / obj.target) * 100} aria-label={`Progresso obiettivo ${obj.name}`} className={obj.status === "Completato" ? "[&>div]:bg-green-500 dark:[&>div]:bg-green-400" : ""} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    