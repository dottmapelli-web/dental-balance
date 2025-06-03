
"use client";

import React, { useState, useEffect } from 'react';
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
import { AlertCircle, CheckCircle2, Loader2, BotMessageSquare, Wand2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getYear, getMonth, format } from "date-fns";
import { it } from "date-fns/locale";
import { initialTransactions } from '@/app/transactions/page'; // Used to determine available months/years

const formSchema = z.object({
  summaryText: z.string().min(10, { message: "Il riepilogo testuale è troppo corto (min 10 caratteri)." }).optional(),
  lastMonthSummaryText: z.string().optional(),
  budgetedIncome: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  actualIncome: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  budgetedExpenses: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  actualExpenses: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
});

type MonthlySummaryFormData = z.infer<typeof formSchema>;

const generateYears = () => {
  const uniqueYears = new Set(initialTransactions.map(t => getYear(new Date(t.date))));
  const currentYr = getYear(new Date());
  uniqueYears.add(currentYr); // Ensure current year is always an option
  return Array.from(uniqueYears).sort((a, b) => b - a).map(String);
};

const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), "MMMM", { locale: it }) }));


export default function MonthlySummaryPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeMonthlySummaryOutput | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingSummaryGeneration, setIsLoadingSummaryGeneration] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>(getMonth(new Date()).toString());
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const availableYears = React.useMemo(() => generateYears(), []);


  const { register, handleSubmit, formState: { errors }, setValue, control, watch } = useForm<MonthlySummaryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        budgetedIncome: 0,
        actualIncome: 0,
        budgetedExpenses: 0,
        actualExpenses: 0,
    }
  });
  const currentSummaryText = watch("summaryText");

  const handleGenerateSummary = async () => {
    setIsLoadingSummaryGeneration(true);
    setError(null);
    try {
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      const result = await generateMonthlyTextSummary({ month, year });
      setValue("summaryText", result.summaryText);
    } catch (e) {
      console.error("Error generating summary:", e);
      setError("Si è verificato un errore durante la generazione del riepilogo. Riprova più tardi.");
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
    } catch (e) {
      console.error("Error analyzing summary:", e);
      setError("Si è verificato un errore durante l'analisi. Riprova più tardi.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Report Mensile"
        description="Analizza i dati finanziari mensili e identifica anomalie con l'aiuto dell'IA."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Inserisci Dati del Mese</CardTitle>
            <CardDescription>
              Seleziona mese/anno, genera o scrivi un riepilogo dell'attività finanziaria, e inserisci i relativi importi. 
              L'AI analizzerà questi dati per individuare anomalie e coerenze.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitAnalysis)} className="space-y-6">
              <div className="space-y-2">
                <Label>Periodo per il Riepilogo</Label>
                <div className="flex gap-2 items-center">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Mese" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full sm:w-[120px]">
                      <SelectValue placeholder="Anno" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="summaryText">Riepilogo Testuale del Mese Corrente</Label>
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

              <Button type="submit" disabled={isLoadingAnalysis} className="w-full sm:w-auto">
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
            {(isLoadingAnalysis || isLoadingSummaryGeneration) && (
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
                Genera o inserisci un riepilogo e compila i dati numerici, poi avvia l'analisi.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
