
"use client";

import React, { useState } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { analyzeMonthlySummary, type AnalyzeMonthlySummaryInput, type AnalyzeMonthlySummaryOutput } from "@/ai/flows/analyze-monthly-summary";
import { AlertCircle, CheckCircle2, Loader2, BotMessageSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  summaryText: z.string().min(50, { message: "Il riepilogo testuale è troppo corto (min 50 caratteri)." }),
  lastMonthSummaryText: z.string().optional(),
  budgetedIncome: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  actualIncome: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  budgetedExpenses: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
  actualExpenses: z.coerce.number().positive({ message: "L'importo deve essere positivo." }),
});

type MonthlySummaryFormData = z.infer<typeof formSchema>;

export default function MonthlySummaryPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeMonthlySummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<MonthlySummaryFormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit: SubmitHandler<MonthlySummaryFormData> = async (data) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeMonthlySummary(data as AnalyzeMonthlySummaryInput);
      setAnalysisResult(result);
    } catch (e) {
      console.error("Error analyzing summary:", e);
      setError("Si è verificato un errore durante l'analisi. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Riepilogo Mensile"
        description="Analizza i dati finanziari mensili e identifica anomalie con l'aiuto dell'IA."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Inserisci Dati del Mese</CardTitle>
            <CardDescription>Compila i campi sottostanti per generare l'analisi.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="summaryText">Riepilogo Testuale del Mese Corrente</Label>
                <Textarea
                  id="summaryText"
                  placeholder="Descrivi dettagliatamente l'attività finanziaria del mese..."
                  {...register("summaryText")}
                  className="min-h-[120px]"
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

              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
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
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Caricamento analisi...</p>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {analysisResult && !error && (
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
            {!isLoading && !analysisResult && !error && (
              <p className="text-sm text-muted-foreground text-center py-10">
                Inserisci i dati e avvia l'analisi per visualizzare i risultati.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    