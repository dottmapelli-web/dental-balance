
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { analyzeMonthlySummary, type AnalyzeMonthlySummaryInput, type AnalyzeMonthlySummaryOutput } from "@/ai/flows/analyze-monthly-summary";
import { generateMonthlyTextSummary } from "@/ai/flows/generate-monthly-text-summary";
import { AlertCircle, CheckCircle2, Loader2, BotMessageSquare, Wand2, Printer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getYear, getMonth, format, parseISO, isValid } from "date-fns";
import { it } from "date-fns/locale";
import { initialTransactions, type Transaction } from '@/data/transactions-data';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { LineChart as RechartsLineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line } from "recharts";
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  summaryText: z.string().min(10, { message: "Il riepilogo testuale è troppo corto (min 10 caratteri)." }).optional(),
  lastMonthSummaryText: z.string().optional(),
  budgetedIncome: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  actualIncome: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  budgetedExpenses: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  actualExpenses: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
});

type MonthlySummaryFormData = z.infer<typeof formSchema>;

const generateAvailablePeriods = () => {
  const periods = new Set<string>();
  initialTransactions.forEach(t => {
    const date = parseISO(t.date);
    if (isValid(date)) {
      periods.add(format(date, "yyyy-MM"));
    }
  });
  periods.add(format(new Date(), "yyyy-MM"));
  
  const sortedPeriods = Array.from(periods).sort().reverse();
  
  const years = new Set<string>();
  const monthsByYear: Record<string, { value: string; label: string }[]> = {};

  sortedPeriods.forEach(period => {
    const [yearStr, monthStr] = period.split('-');
    years.add(yearStr);
    if (!monthsByYear[yearStr]) {
      monthsByYear[yearStr] = [];
    }
    const monthIndex = parseInt(monthStr, 10) - 1;
    monthsByYear[yearStr].push({
      value: monthIndex.toString(),
      label: format(new Date(parseInt(yearStr), monthIndex), "MMMM", { locale: it }),
    });
  });
   for (const year in monthsByYear) {
    monthsByYear[year] = Array.from(new Set(monthsByYear[year].map(m => m.value)))
      .map(value => monthsByYear[year].find(m => m.value === value)!)
      .sort((a, b) => parseInt(a.value) - parseInt(b.value));
  }

  return {
    years: Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)),
    monthsByYear,
  };
};

const monthlyChartConfig = {
  income: { label: "Entrate", color: "hsl(var(--chart-1))" },
  expenses: { label: "Uscite", color: "hsl(var(--chart-2))" },
  balance: { label: "Saldo Mensile", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;


export default function MonthlySummaryPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeMonthlySummaryOutput | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingSummaryGeneration, setIsLoadingSummaryGeneration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { years: availableYearsForForm, monthsByYear } = React.useMemo(() => generateAvailablePeriods(), []);
  const availableYearsForChart = availableYearsForForm; // Can be the same or derived differently if needed

  const [chartSelectedYear, setChartSelectedYear] = useState<string>(() => availableYearsForChart[0] || getYear(new Date()).toString());
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  
  const [formSelectedYear, setFormSelectedYear] = useState<string>(() => availableYearsForForm[0] || getYear(new Date()).toString());
  const [formSelectedMonth, setFormSelectedMonth] = useState<string>(() => {
    const currentYear = availableYearsForForm[0] || getYear(new Date()).toString();
    const yearMonths = monthsByYear[currentYear] || [];
    const currentMonthActual = getMonth(new Date()).toString();
    return yearMonths.find(m => m.value === currentMonthActual)?.value || yearMonths[0]?.value || getMonth(new Date()).toString();
  });
  const [availableMonthsForForm, setAvailableMonthsForForm] = useState(monthsByYear[formSelectedYear] || []);

  useEffect(() => {
    const year = parseInt(chartSelectedYear);
    const dataForYear = Array.from({ length: 12 }).map((_, i) => ({
      month: format(new Date(year, i), "MMM", { locale: it }),
      income: 0,
      expenses: 0,
      balance: 0,
    }));

    initialTransactions.forEach(t => {
      const transactionDate = parseISO(t.date);
      if (isValid(transactionDate) && getYear(transactionDate) === year) {
        const monthIndex = getMonth(transactionDate);
        if (t.type === 'Entrata') {
          dataForYear[monthIndex].income += t.amount;
        } else if (t.type === 'Uscita') {
          dataForYear[monthIndex].expenses += Math.abs(t.amount);
        }
      }
    });

    dataForYear.forEach(monthData => {
      monthData.balance = monthData.income - monthData.expenses;
    });
    setMonthlyChartData(dataForYear);
  }, [chartSelectedYear, initialTransactions]);


  useEffect(() => {
    setAvailableMonthsForForm(monthsByYear[formSelectedYear] || []);
    if (!(monthsByYear[formSelectedYear] || []).find(m => m.value === formSelectedMonth)) {
      setFormSelectedMonth((monthsByYear[formSelectedYear] || [])[0]?.value || getMonth(new Date()).toString());
    }
  }, [formSelectedYear, monthsByYear, formSelectedMonth]);


  const { register, handleSubmit, formState: { errors }, setValue, control } = useForm<MonthlySummaryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        budgetedIncome: 0,
        actualIncome: 0,
        budgetedExpenses: 0,
        actualExpenses: 0,
    }
  });

  const handleGenerateSummary = async () => {
    setIsLoadingSummaryGeneration(true);
    setError(null);
    setValue("summaryText", ""); 
    try {
      const month = parseInt(formSelectedMonth);
      const year = parseInt(formSelectedYear);
      const result = await generateMonthlyTextSummary({ month, year });
      setValue("summaryText", result.summaryText);
      if (result.summaryText.toLowerCase().includes("errore") || result.summaryText.toLowerCase().includes("impossibile generare")) {
        setError("Problema durante la generazione del riepilogo. Controlla il testo generato per i dettagli.");
      }
    } catch (e: any) {
      console.error("Error generating summary:", e);
      let errorMessage = "Si è verificato un errore durante la generazione del riepilogo. Riprova più tardi.";
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else if (e && typeof e.details === 'string') {
        errorMessage = e.details;
      } else if (e && typeof e.message === 'string') {
         errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoadingSummaryGeneration(false);
    }
  };

  const onSubmitAnalysis: SubmitHandler<MonthlySummaryFormData> = async (data) => {
    setIsLoadingAnalysis(true);
    setError(null);
    setAnalysisResult(null);

    if (!data.summaryText || data.summaryText.length < 10) {
        setError("Per favore, inserisci o genera un riepilogo testuale del mese corrente (min 10 caratteri) prima di procedere con l'analisi.");
        setIsLoadingAnalysis(false);
        return;
    }
    
    try {
      const result = await analyzeMonthlySummary(data as AnalyzeMonthlySummaryInput);
      setAnalysisResult(result);
    } catch (e: any) {
      console.error("Error analyzing summary:", e);
      let analysisErrorMessage = "Si è verificato un errore durante l'analisi. Riprova più tardi.";
       if (e instanceof Error) {
        analysisErrorMessage = e.message;
      } else if (typeof e === 'string') {
        analysisErrorMessage = e;
      } else if (e && typeof e.details === 'string') {
        analysisErrorMessage = e.details;
      } else if (e && typeof e.message === 'string') {
         analysisErrorMessage = e.message;
      }
      setError(analysisErrorMessage);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handlePrintReport = () => {
    toast({
      title: "Stampa Report",
      description: "La funzionalità di stampa del report non è ancora implementata.",
    });
  };

  return (
    <>
      <PageHeader
        title="Report Mensile"
        description="Analizza i dati finanziari mensili, genera riepiloghi e identifica anomalie con l'aiuto dell'IA."
        actions={
          <div className="flex items-center gap-2">
            <Select value={chartSelectedYear} onValueChange={setChartSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Anno Grafico" />
              </SelectTrigger>
              <SelectContent>
                {availableYearsForChart.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handlePrintReport}>
              <Printer className="mr-2 h-4 w-4" />
              Stampa Report
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-headline">Andamento Finanziario Mensile ({chartSelectedYear})</CardTitle>
          <CardDescription>Visualizzazione delle entrate, uscite e saldo mensile per l'anno selezionato.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={monthlyChartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={monthlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickFormatter={(value) => `€${value / 1000}k`} tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value, payload) => {
                        if (payload && payload.length > 0) {
                            return `Mese: ${payload[0].payload.month}, ${chartSelectedYear}`;
                        }
                        return value;
                      }}
                      formatter={(value, name, props) => {
                        const formattedValue = typeof value === 'number' 
                            ? `€${value.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                            : value;
                        
                        let label = props.name;
                        if (props.dataKey === 'income') label = 'Entrate';
                        else if (props.dataKey === 'expenses') label = 'Uscite';
                        else if (props.dataKey === 'balance') label = 'Saldo Mensile';
                        
                        return [formattedValue, label];
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="income" stroke="var(--color-income)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-income)" }} activeDot={{ r: 6 }} name="Entrate" />
                <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-expenses)" }} activeDot={{ r: 6 }} name="Uscite" />
                <Line type="monotone" dataKey="balance" stroke="var(--color-balance)" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4, fill: "var(--color-balance)" }} activeDot={{ r: 6 }} name="Saldo Mensile" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Inserisci Dati e Genera Riepilogo AI</CardTitle>
            <CardDescription>
              Seleziona mese/anno per il riepilogo, genera o scrivi un testo sull'attività finanziaria, e inserisci i relativi importi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitAnalysis)} className="space-y-6">
              <div className="space-y-2">
                <Label>Periodo per il Riepilogo AI</Label>
                <div className="flex gap-2 items-center">
                  <Select value={formSelectedMonth} onValueChange={setFormSelectedMonth}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Mese" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonthsForForm.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={formSelectedYear} onValueChange={(value) => {
                      setFormSelectedYear(value);
                      const newYearMonths = monthsByYear[value] || [];
                      const currentActualMonth = getMonth(new Date()).toString();
                      const newDefaultMonth = newYearMonths.find(m=>m.value === currentActualMonth)?.value || newYearMonths[0]?.value || "0";
                      setFormSelectedMonth(newDefaultMonth);
                    }}>
                    <SelectTrigger className="w-full sm:w-[120px]">
                      <SelectValue placeholder="Anno" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYearsForForm.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="summaryText">Riepilogo Testuale del Mese Selezionato</Label>
                  <Button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={isLoadingSummaryGeneration}
                    variant="outline"
                    size="sm"
                  >
                    {isLoadingSummaryGeneration ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    Genera con AI
                  </Button>
                </div>
                <Controller
                    name="summaryText"
                    control={control}
                    render={({ field }) => (
                        <Textarea
                        id="summaryText"
                        placeholder="Descrivi dettagliatamente l'attività finanziaria del mese o genera un riepilogo con l'AI..."
                        {...field}
                        className="min-h-[120px]"
                        />
                    )}
                />
                {errors.summaryText && <p className="text-sm text-destructive mt-1">{errors.summaryText.message}</p>}
              </div>

              <div>
                <Label htmlFor="lastMonthSummaryText">Riepilogo Testuale del Mese Precedente (Opzionale)</Label>
                <Textarea
                  id="lastMonthSummaryText"
                  placeholder="Descrivi l'attività finanziaria del mese precedente, se disponibile..."
                  {...register("lastMonthSummaryText")}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budgetedIncome">Entrate Preventivate</Label>
                  <Input id="budgetedIncome" type="number" step="0.01" {...register("budgetedIncome")} />
                  {errors.budgetedIncome && <p className="text-sm text-destructive mt-1">{errors.budgetedIncome.message}</p>}
                </div>
                <div>
                  <Label htmlFor="actualIncome">Entrate Effettive</Label>
                  <Input id="actualIncome" type="number" step="0.01" {...register("actualIncome")} />
                  {errors.actualIncome && <p className="text-sm text-destructive mt-1">{errors.actualIncome.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budgetedExpenses">Uscite Preventivate</Label>
                  <Input id="budgetedExpenses" type="number" step="0.01" {...register("budgetedExpenses")} />
                  {errors.budgetedExpenses && <p className="text-sm text-destructive mt-1">{errors.budgetedExpenses.message}</p>}
                </div>
                <div>
                  <Label htmlFor="actualExpenses">Uscite Effettive</Label>
                  <Input id="actualExpenses" type="number" step="0.01" {...register("actualExpenses")} />
                  {errors.actualExpenses && <p className="text-sm text-destructive mt-1">{errors.actualExpenses.message}</p>}
                </div>
              </div>

              <Button type="submit" disabled={isLoadingAnalysis || isLoadingSummaryGeneration} className="w-full sm:w-auto">
                {isLoadingAnalysis ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisi in corso...
                  </>
                ) : (
                  <>
                  <BotMessageSquare className="mr-2 h-4 w-4" />
                  Analizza Riepilogo
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <BotMessageSquare className="mr-2 h-5 w-5 text-primary" />
              Risultati Analisi IA
            </CardTitle>
            <CardDescription>Anomalie e coerenza rilevate dall'intelligenza artificiale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(isLoadingAnalysis || isLoadingSummaryGeneration) && !error && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>{isLoadingSummaryGeneration ? "Generazione riepilogo..." : "Caricamento analisi..."}</p>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {analysisResult && !error && !isLoadingAnalysis && !isLoadingSummaryGeneration && (
              <div>
                <Alert variant={analysisResult.isConsistent ? "default" : "destructive"} className="mb-4">
                  {analysisResult.isConsistent ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{analysisResult.isConsistent ? "Bilancio Coerente" : "Incoerenze Rilevate"}</AlertTitle>
                  <AlertDescription>
                    {analysisResult.isConsistent
                      ? "Il bilancio di questo mese sembra coerente con i dati forniti e/o i periodi precedenti."
                      : "Sono state rilevate potenziali incoerenze o discrepanze nel bilancio di questo mese."}
                  </AlertDescription>
                </Alert>

                <Separator className="my-4" />

                <h3 className="text-lg font-semibold mb-2">Dettaglio Anomalie:</h3>
                {analysisResult.anomalies && analysisResult.anomalies.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {analysisResult.anomalies.map((anomaly, index) => (
                      <li key={index}>{anomaly}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessuna anomalia specifica rilevata.</p>
                )}
              </div>
            )}
            {!isLoadingAnalysis && !isLoadingSummaryGeneration && !analysisResult && !error && (
              <p className="text-sm text-muted-foreground text-center py-10">
                Compila i dati e avvia l'analisi, oppure genera prima un riepilogo testuale con l'AI.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}


    