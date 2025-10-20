
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Percent, Banknote, Landmark } from "lucide-react";
import { getYear, getMonth, parseISO, isValid, format } from "date-fns";
import { it } from "date-fns/locale";
import type { Transaction } from '@/data/transactions-data';
import { useCategories, type CategoryDefinition } from '@/contexts/category-context';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const months = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i), "MMMM", { locale: it }));

const generateYears = (transactions: Transaction[]): string[] => {
  if (transactions.length === 0) return [getYear(new Date()).toString()];
  const years = new Set<string>();
  transactions.forEach(t => {
    const date = parseISO(t.date);
    if (isValid(date)) {
      years.add(getYear(date).toString());
    }
  });
  if (years.size === 0) return [getYear(new Date()).toString()];
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
};

interface ForecastRow {
  label: string;
  isSubcategory?: boolean;
  isTotal?: boolean;
  isMainSection?: boolean;
  isFinancialMetric?: boolean;
  isHighlighted?: boolean;
  values: number[];
  categoryKey?: string;
  subcategoryKey?: string;
}

const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


export default function ForecastPage() {
    const { expenseCategories, incomeCategories, loading: loadingCategories, error: categoriesError } = useCategories();
    const { transactionsVersion } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
    const [transactionsError, setTransactionsError] = useState<string | null>(null);

    const availableYears = useMemo(() => generateYears(transactions), [transactions]);
    const [selectedYear, setSelectedYear] = useState<string>(availableYears[0]);

    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
          setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    useEffect(() => {
        const fetchTransactions = async () => {
            setIsLoadingTransactions(true);
            setTransactionsError(null);
            try {
                const transactionsCollectionRef = collection(db, "transactions");
                const q = query(transactionsCollectionRef, orderBy("date", "desc"));
                const querySnapshot = await getDocs(q);
                const fetchedTransactions: Transaction[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedTransactions.push({
                        id: doc.id,
                        date: data.date instanceof Timestamp ? format(data.date.toDate(), "yyyy-MM-dd") : data.date,
                        description: data.description,
                        category: data.category,
                        subcategory: data.subcategory,
                        type: data.type,
                        amount: data.amount,
                        status: data.status as Transaction['status'],
                        isRecurring: data.isRecurring || false,
                        recurrenceDetails: data.recurrenceDetails,
                        originalRecurringId: data.originalRecurringId,
                    });
                });
                setTransactions(fetchedTransactions);
            } catch (error: any) {
                console.error("Errore caricamento transazioni (Forecast):", error);
                setTransactionsError(`Impossibile caricare le transazioni: ${error.message}`);
            } finally {
                setIsLoadingTransactions(false);
            }
        };
        fetchTransactions();
    }, [transactionsVersion]);

    const calculatedMonthlyData = useMemo(() => {
        const year = parseInt(selectedYear);
        const monthlyTotals: {
            income: number[],
            productionCosts: number[],
            fixedCosts: number[],
            incomeByCategory: Record<string, number[]>,
            productionCostsByCategory: Record<string, number[]>,
            fixedCostsByCategory: Record<string, number[]>,
            productionCostsBySubcategory: Record<string, Record<string, number[]>>,
            fixedCostsBySubcategory: Record<string, Record<string, number[]>>,
        } = {
            income: Array(12).fill(0),
            productionCosts: Array(12).fill(0),
            fixedCosts: Array(12).fill(0),
            incomeByCategory: {},
            productionCostsByCategory: {},
            fixedCostsByCategory: {},
            productionCostsBySubcategory: {},
            fixedCostsBySubcategory: {},
        };

        transactions.forEach(t => {
            const date = parseISO(t.date);
            if (!isValid(date) || getYear(date) !== year || t.status !== 'Completato') return;

            const month = getMonth(date);
            const amount = Math.abs(t.amount);

            if (t.type === 'Entrata') {
                monthlyTotals.income[month] += amount;
                if (!monthlyTotals.incomeByCategory[t.category]) {
                    monthlyTotals.incomeByCategory[t.category] = Array(12).fill(0);
                }
                monthlyTotals.incomeByCategory[t.category][month] += amount;
            } else if (t.type === 'Uscita') {
                const categoryInfo = expenseCategories[t.category];
                if (!categoryInfo) return;

                const isProductionCost = categoryInfo.forecastType === 'Costi di Produzione';

                if (isProductionCost) {
                    monthlyTotals.productionCosts[month] += amount;
                    if (!monthlyTotals.productionCostsByCategory[t.category]) {
                        monthlyTotals.productionCostsByCategory[t.category] = Array(12).fill(0);
                    }
                    monthlyTotals.productionCostsByCategory[t.category][month] += amount;
                    // Subcategory logic for production costs
                    if(t.subcategory && categoryInfo.subcategories.find(s => s.name === t.subcategory && s.showInForecast)){
                         if (!monthlyTotals.productionCostsBySubcategory[t.category]) {
                            monthlyTotals.productionCostsBySubcategory[t.category] = {};
                        }
                        if(!monthlyTotals.productionCostsBySubcategory[t.category][t.subcategory]){
                            monthlyTotals.productionCostsBySubcategory[t.category][t.subcategory] = Array(12).fill(0);
                        }
                        monthlyTotals.productionCostsBySubcategory[t.category][t.subcategory][month] += amount;
                    }
                } else { // Fixed costs
                    monthlyTotals.fixedCosts[month] += amount;
                    if (!monthlyTotals.fixedCostsByCategory[t.category]) {
                        monthlyTotals.fixedCostsByCategory[t.category] = Array(12).fill(0);
                    }
                    monthlyTotals.fixedCostsByCategory[t.category][month] += amount;
                     // Subcategory logic for fixed costs
                    if(t.subcategory && categoryInfo.subcategories.find(s => s.name === t.subcategory && s.showInForecast)){
                        if (!monthlyTotals.fixedCostsBySubcategory[t.category]) {
                            monthlyTotals.fixedCostsBySubcategory[t.category] = {};
                        }
                        if(!monthlyTotals.fixedCostsBySubcategory[t.category][t.subcategory]){
                            monthlyTotals.fixedCostsBySubcategory[t.category][t.subcategory] = Array(12).fill(0);
                        }
                        monthlyTotals.fixedCostsBySubcategory[t.category][t.subcategory][month] += amount;
                    }
                }
            }
        });

        // Build Table Rows
        let tableRows: ForecastRow[] = [];

        // --- RICAVI ---
        tableRows.push({ label: 'RICAVI', isMainSection: true, values: [] });
        Object.keys(incomeCategories).sort().forEach(cat => {
            if(monthlyTotals.incomeByCategory[cat]){
                tableRows.push({ label: cat, values: monthlyTotals.incomeByCategory[cat] });
            }
        });
        tableRows.push({ label: 'TOTALE RICAVI', isTotal: true, values: monthlyTotals.income });
        
        const contributionMargin = monthlyTotals.income.map((inc, i) => inc - monthlyTotals.productionCosts[i]);
        const mocPercentage = monthlyTotals.income.map((inc, i) => inc > 0 ? (contributionMargin[i] / inc) * 100 : 0);

        // --- COSTI DI PRODUZIONE ---
        tableRows.push({ label: 'COSTI DI PRODUZIONE', isMainSection: true, values: [] });
        Object.keys(expenseCategories).filter(c => expenseCategories[c]?.forecastType === 'Costi di Produzione').sort().forEach(cat => {
            if(monthlyTotals.productionCostsByCategory[cat] || monthlyTotals.productionCostsBySubcategory[cat]){
                tableRows.push({ label: cat, values: monthlyTotals.productionCostsByCategory[cat] || Array(12).fill(0) });
                if(monthlyTotals.productionCostsBySubcategory[cat]){
                    Object.keys(monthlyTotals.productionCostsBySubcategory[cat]).sort().forEach(subcat => {
                        tableRows.push({ label: subcat, isSubcategory: true, values: monthlyTotals.productionCostsBySubcategory[cat][subcat] });
                    });
                }
            }
        });
        tableRows.push({ label: 'TOTALI COSTI DI PRODUZIONE', isTotal: true, values: monthlyTotals.productionCosts });

        // MARGINE & MOC%
        tableRows.push({ label: 'MARGINE DI CONTRIBUZIONE', isFinancialMetric: true, isHighlighted: true, values: contributionMargin });
        tableRows.push({ label: 'MOC %', isFinancialMetric: true, values: mocPercentage });

        // --- COSTI PRODUTTIVI ---
        tableRows.push({ label: 'COSTI PRODUTTIVI', isMainSection: true, values: [] });
        Object.keys(expenseCategories).filter(c => expenseCategories[c]?.forecastType === 'Costi Produttivi').sort().forEach(cat => {
            if(monthlyTotals.fixedCostsByCategory[cat] || monthlyTotals.fixedCostsBySubcategory[cat]){
                tableRows.push({ label: cat, values: monthlyTotals.fixedCostsByCategory[cat] || Array(12).fill(0) });
                if(monthlyTotals.fixedCostsBySubcategory[cat]){
                     Object.keys(monthlyTotals.fixedCostsBySubcategory[cat]).sort().forEach(subcat => {
                        tableRows.push({ label: subcat, isSubcategory: true, values: monthlyTotals.fixedCostsBySubcategory[cat][subcat] });
                    });
                }
            }
        });
        tableRows.push({ label: 'TOTALE COSTI PRODUTTIVI', isTotal: true, values: monthlyTotals.fixedCosts });
        
        // --- FINAL METRICS ---
        const bep = mocPercentage.map((moc, i) => moc > 0 ? (monthlyTotals.fixedCosts[i] / (moc / 100)) : 0);
        const totalCosts = monthlyTotals.productionCosts.map((pc, i) => pc + monthlyTotals.fixedCosts[i]);
        const ebitda = monthlyTotals.income.map((inc, i) => inc - totalCosts[i]);

        tableRows.push({ label: 'BEP (Break Even Point)', isFinancialMetric: true, values: bep });
        tableRows.push({ label: 'TOTALE COSTI', isFinancialMetric: true, isTotal: true, values: totalCosts });
        tableRows.push({ label: 'EBITDA', isFinancialMetric: true, isHighlighted: true, values: ebitda });


        return tableRows;

    }, [selectedYear, transactions, expenseCategories, incomeCategories]);


    if (isLoadingTransactions || loadingCategories) {
        return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Caricamento dati previsioni...</p>
          </div>
        );
    }
    
    if (transactionsError || categoriesError) {
        return (
            <Alert variant="destructive" className="m-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore Caricamento Dati</AlertTitle>
                <AlertDescription>{transactionsError || categoriesError} Impossibile visualizzare la pagina delle previsioni.</AlertDescription>
            </Alert>
        );
    }

    return (
        <TooltipProvider>
            <PageHeader
                title="Previsioni Finanziarie"
                description={`Analisi previsionale dettagliata per l'anno ${selectedYear}, basata sui dati reali delle transazioni.`}
                actions={
                    <div className="flex items-center gap-2">
                         <Select
                            value={selectedYear}
                            onValueChange={setSelectedYear}
                            disabled={availableYears.length === 0}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Seleziona Anno" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Tabella Previsionale Annuale</CardTitle>
                    <CardDescription>Riepilogo mensile di ricavi, costi e principali metriche finanziarie.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="w-full whitespace-nowrap">
                        <Table className="min-w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background/95 backdrop-blur-sm min-w-[250px] font-bold z-10">Voce</TableHead>
                                    {months.map(month => <TableHead key={month} className="text-right">{month}</TableHead>)}
                                    <TableHead className="text-right font-bold">Totale {selectedYear}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calculatedMonthlyData.map((row, rowIndex) => {
                                    const rowTotal = row.values.reduce((acc, val) => acc + val, 0);
                                    
                                    // Handle MOC % average correctly
                                    const isMocRow = row.label === 'MOC %';
                                    const totalRicaviRow = calculatedMonthlyData.find(r => r.label === 'TOTALE RICAVI');
                                    const totalMargineRow = calculatedMonthlyData.find(r => r.label === 'MARGINE DI CONTRIBUZIONE');
                                    const totalRicavi = totalRicaviRow?.values.reduce((a, b) => a + b, 0) || 0;
                                    const totalMargine = totalMargineRow?.values.reduce((a, b) => a + b, 0) || 0;
                                    const finalTotalValue = isMocRow 
                                        ? (totalRicavi > 0 ? (totalMargine / totalRicavi) * 100 : 0) 
                                        : rowTotal;

                                    return (
                                    <TableRow key={rowIndex} className={cn(
                                        row.isTotal && "bg-muted/50",
                                        row.isHighlighted && "bg-green-50 dark:bg-green-900/20"
                                    )}>
                                        <TableCell className={cn(
                                            "sticky left-0 bg-background/95 backdrop-blur-sm font-medium z-10",
                                            row.isTotal && "font-bold",
                                            row.isMainSection && "font-extrabold text-lg pt-6 text-primary",
                                            row.isSubcategory && "pl-8 text-muted-foreground",
                                            row.isFinancialMetric && "font-semibold"
                                        )}>
                                            {row.label}
                                        </TableCell>

                                        {row.values.map((value, colIndex) => (
                                            <TableCell key={colIndex} className="text-right font-mono">
                                                {row.isMainSection ? "" : 
                                                 row.label === 'MOC %' ? `${value.toFixed(2)}%` : formatCurrency(value)}
                                            </TableCell>
                                        ))}

                                        <TableCell className="text-right font-bold font-mono sticky right-0 bg-background/95 backdrop-blur-sm z-10">
                                             {row.isMainSection ? "" : 
                                              row.label === 'MOC %' ? `${finalTotalValue.toFixed(2)}%` : formatCurrency(finalTotalValue)}
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">EBITDA Annuale</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(calculatedMonthlyData.find(r => r.label === 'EBITDA')?.values.reduce((a,b) => a+b, 0) || 0)}
                        </div>
                         <p className="text-xs text-muted-foreground">Utile prima di interessi, tasse, svalutazioni e ammortamenti.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Margine di Contribuzione</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(calculatedMonthlyData.find(r => r.label === 'MARGINE DI CONTRIBUZIONE')?.values.reduce((a,b) => a+b, 0) || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Ricavi meno i costi variabili diretti.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">MOC % Annuale</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold">
                            {(() => {
                                const totalRicavi = calculatedMonthlyData.find(r => r.label === 'TOTALE RICAVI')?.values.reduce((a,b) => a+b, 0) || 0;
                                const totalMargine = calculatedMonthlyData.find(r => r.label === 'MARGINE DI CONTRIBUZIONE')?.values.reduce((a,b) => a+b, 0) || 0;
                                const moc = totalRicavi > 0 ? (totalMargine/totalRicavi) * 100 : 0;
                                return `${moc.toFixed(2)}%`;
                            })()}
                        </div>
                        <p className="text-xs text-muted-foreground">Margine di contribuzione in percentuale sui ricavi.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Totale Costi Fissi Annuali</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(calculatedMonthlyData.find(r => r.label === 'TOTALE COSTI PRODUTTIVI')?.values.reduce((a,b) => a+b, 0) || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Costi che non variano con il volume di produzione.</p>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}

