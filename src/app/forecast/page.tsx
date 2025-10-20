
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, TrendingUp, Percent, Banknote, Landmark } from "lucide-react";
import { getYear, getMonth, parseISO, isValid, format } from "date-fns";
import { it } from "date-fns/locale";
import type { Transaction } from '@/data/transactions-data';
import { useCategories, type CategoryDefinition } from '@/contexts/category-context';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const generateYears = (transactions: Transaction[]): string[] => {
    const years = new Set<string>();
    const currentYear = getYear(new Date());
    years.add(currentYear.toString());
    years.add((currentYear - 1).toString());

    transactions.forEach(t => {
        const date = parseISO(t.date);
        if (isValid(date)) {
            years.add(getYear(date).toString());
        }
    });

    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
};

const monthsOfYear = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(2000, i), "MMM", { locale: it }),
}));


interface ForecastRowData {
    label: string;
    budget: number;
    actual: number;
    isSubcategory?: boolean;
    isTotal?: boolean;
    isMainSection?: boolean;
    isFinancialMetric?: boolean;
    isHighlighted?: boolean;
}

const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "€0,00";
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "-";
    return `${value.toFixed(2)}%`;
}

export default function ForecastPage() {
    const { expenseCategories, incomeCategories, loading: loadingCategories, error: categoriesError } = useCategories();
    const { transactionsVersion } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
    const [transactionsError, setTransactionsError] = useState<string | null>(null);
    const { toast } = useToast();

    const availableYears = useMemo(() => generateYears(transactions), [transactions]);
    const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || new Date().getFullYear().toString());
    const [selectedPeriod, setSelectedPeriod] = useState<string>(new Date().getMonth().toString()); // month index or 'total'

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
    
    const calculatedForecastData = useMemo((): ForecastRowData[] => {
        if (loadingCategories || isLoadingTransactions) return [];

        const year = parseInt(selectedYear);
        const month = selectedPeriod !== 'total' ? parseInt(selectedPeriod) : -1;

        const periodTransactions = transactions.filter(t => {
            const date = parseISO(t.date);
            const isInYear = isValid(date) && getYear(date) === year;
            if (!isInYear) return false;
            if (month === -1) return t.status === 'Completato'; // All year for total
            return getMonth(date) === month && t.status === 'Completato';
        });

        let tableRows: ForecastRowData[] = [];
        
        // --- RICAVI ---
        tableRows.push({ label: 'RICAVI', isMainSection: true, actual: 0, budget: 0 });
        let totalRicaviActual = 0;
        Object.keys(incomeCategories).sort().forEach(cat => {
            const actual = periodTransactions
                .filter(t => t.type === 'Entrata' && t.category === cat)
                .reduce((s, t) => s + Math.abs(t.amount), 0);
            totalRicaviActual += actual;
            tableRows.push({ label: cat, actual, budget: 0 });
        });
        tableRows.push({ label: 'TOTALE RICAVI', isTotal: true, actual: totalRicaviActual, budget: 0, isHighlighted: true });

        // --- COSTI DI PRODUZIONE ---
        tableRows.push({ label: 'COSTI DI PRODUZIONE', isMainSection: true, actual: 0, budget: 0 });
        let totalCostiProduzioneActual = 0;
        Object.entries(expenseCategories).filter(([,data]) => data?.forecastType === 'Costi di Produzione').sort(([catA], [catB]) => catA.localeCompare(catB)).forEach(([cat, catData]) => {
            const catActual = periodTransactions.filter(t => t.type === 'Uscita' && t.category === cat).reduce((s, t) => s + Math.abs(t.amount), 0);
            totalCostiProduzioneActual += catActual;
            tableRows.push({ label: cat, actual: catActual, budget: 0 });
            
            if (catData?.subcategories?.some(s => s.showInForecast)) {
                catData.subcategories.filter(s => s.showInForecast).sort((a,b) => a.name.localeCompare(b.name)).forEach(sub => {
                     const subActual = periodTransactions.filter(t => t.type === 'Uscita' && t.category === cat && t.subcategory === sub.name).reduce((s, t) => s + Math.abs(t.amount), 0);
                     tableRows.push({ label: sub.name, actual: subActual, budget: 0, isSubcategory: true });
                });
            }
        });
        tableRows.push({ label: 'TOTALI COSTI DI PRODUZIONE', isTotal: true, actual: totalCostiProduzioneActual, budget: 0, isHighlighted: true });

        // --- MARGINE ---
        const margineActual = totalRicaviActual - totalCostiProduzioneActual;
        const mocActual = totalRicaviActual > 0 ? (margineActual / totalRicaviActual) * 100 : 0;
        tableRows.push({ label: 'MARGINE DI CONTRIBUZIONE', isFinancialMetric: true, actual: margineActual, budget: 0, isHighlighted: true });
        tableRows.push({ label: 'MOC %', isFinancialMetric: true, actual: mocActual, budget: 0 });

        // --- COSTI PRODUTTIVI ---
        tableRows.push({ label: 'COSTI PRODUTTIVI', isMainSection: true, actual: 0, budget: 0 });
        let totalCostiProduttiviActual = 0;
        Object.entries(expenseCategories).filter(([,data]) => data?.forecastType === 'Costi Produttivi').sort(([catA], [catB]) => catA.localeCompare(catB)).forEach(([cat, catData]) => {
            const catActual = periodTransactions.filter(t => t.type === 'Uscita' && t.category === cat).reduce((s, t) => s + Math.abs(t.amount), 0);
            totalCostiProduttiviActual += catActual;
            tableRows.push({ label: cat, actual: catActual, budget: 0 });
            
            if (catData?.subcategories?.some(s => s.showInForecast)) {
                catData.subcategories.filter(s => s.showInForecast).sort((a,b) => a.name.localeCompare(b.name)).forEach(sub => {
                    const subActual = periodTransactions.filter(t => t.type === 'Uscita' && t.category === cat && t.subcategory === sub.name).reduce((s, t) => s + Math.abs(t.amount), 0);
                    tableRows.push({ label: sub.name, actual: subActual, budget: 0, isSubcategory: true });
                });
            }
        });
        tableRows.push({ label: 'TOTALE COSTI PRODUTTIVI', isTotal: true, actual: totalCostiProduttiviActual, budget: 0, isHighlighted: true });

        // --- FINAL METRICS ---
        const bepActual = mocActual > 0 ? totalCostiProduttiviActual / (mocActual / 100) : 0;
        const totalCostiActual = totalCostiProduzioneActual + totalCostiProduttiviActual;
        const ebitdaActual = margineActual - totalCostiProduttiviActual;
        tableRows.push({ label: 'BEP (Break Even Point)', isFinancialMetric: true, actual: bepActual, budget: 0 });
        tableRows.push({ label: 'TOTALE COSTI', isFinancialMetric: true, actual: totalCostiActual, budget: 0, isHighlighted: true });
        tableRows.push({ label: 'EBITDA', isFinancialMetric: true, actual: ebitdaActual, budget: 0, isHighlighted: true });

        return tableRows.filter(row => !(row.isMainSection && row.label !== 'RICAVI' && !tableRows.slice(tableRows.findIndex(r => r.label === row.label) + 1).some(r => !r.isMainSection && !r.isTotal && !r.isFinancialMetric && r.actual > 0)));

    }, [selectedYear, selectedPeriod, transactions, expenseCategories, incomeCategories, loadingCategories, isLoadingTransactions]);

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
    
    const pageTitle = selectedPeriod === 'total' ? `Previsioni Totali ${selectedYear}` : `Previsioni ${format(new Date(parseInt(selectedYear), parseInt(selectedPeriod)), "MMMM yyyy", { locale: it })}`;

    return (
        <>
            <PageHeader
                title="Previsioni"
                description={pageTitle}
                actions={
                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedYear}
                            onValueChange={setSelectedYear}
                            disabled={availableYears.length === 0}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Anno" />
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

            <div className="mb-6 overflow-x-auto pb-2">
                <div className="inline-flex items-center rounded-md shadow-sm bg-muted p-1 space-x-1">
                    {monthsOfYear.map(month => (
                         <Button 
                            key={month.value} 
                            variant={selectedPeriod === month.value ? 'default' : 'ghost'} 
                            size="sm"
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                selectedPeriod === month.value ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                            )}
                            onClick={() => setSelectedPeriod(month.value)}
                         >
                            {month.label}
                        </Button>
                    ))}
                    <Button 
                        key="total"
                        variant={selectedPeriod === 'total' ? 'default' : 'ghost'} 
                        size="sm"
                        className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            selectedPeriod === 'total' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                        )}
                        onClick={() => setSelectedPeriod('total')}
                    >
                        TOTALI
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%] font-bold">Voce</TableHead>
                                <TableHead className="text-right font-bold">Budget</TableHead>
                                <TableHead className="text-right font-bold">Actual</TableHead>
                                <TableHead className="text-right font-bold">Scostamento</TableHead>
                                <TableHead className="text-right font-bold">% Scostamento</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {calculatedForecastData.map((row, index) => {
                                if (row.isMainSection) {
                                    return (
                                        <TableRow key={index} className="hover:bg-transparent">
                                            <TableCell colSpan={5} className="pt-6 pb-2">
                                                <h3 className="font-bold text-md text-foreground">{row.label}</h3>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }
                                
                                const variance = row.actual - row.budget;
                                const variancePerc = row.budget !== 0 ? (variance / row.budget) * 100 : (row.actual > 0 ? 100 : 0);

                                const isPositiveVarianceGood = !row.label.toLowerCase().includes('costi') && row.label !== 'TOTALE COSTI';

                                return (
                                <TableRow key={index} className={cn(
                                    row.label.includes('TOTALE') && "bg-yellow-50 dark:bg-yellow-900/20",
                                    row.label === "MARGINE DI CONTRIBUZIONE" && "bg-green-50 dark:bg-green-900/20",
                                    row.label === "EBITDA" && "bg-green-50 dark:bg-green-900/20",
                                )}>
                                    <TableCell className={cn(
                                        "font-medium",
                                        row.isSubcategory && "pl-10 text-muted-foreground",
                                        (row.isTotal || row.isFinancialMetric) && "font-bold",
                                    )}>
                                        {row.label}
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(row.budget)}</TableCell>
                                    <TableCell className="text-right">{row.label.includes('%') ? formatPercentage(row.actual) : formatCurrency(row.actual)}</TableCell>
                                    <TableCell className={cn(
                                        "text-right",
                                        variance > 0 && isPositiveVarianceGood && "text-green-600 dark:text-green-400",
                                        variance < 0 && isPositiveVarianceGood && "text-red-600 dark:text-red-400",
                                        variance > 0 && !isPositiveVarianceGood && "text-red-600 dark:text-red-400",
                                        variance < 0 && !isPositiveVarianceGood && "text-green-600 dark:text-green-400",
                                    )}>{row.label.includes('%') ? formatPercentage(variance) : formatCurrency(variance)}</TableCell>
                                    <TableCell className={cn(
                                        "text-right font-bold",
                                        variance > 0 && isPositiveVarianceGood && "text-green-600 dark:text-green-400",
                                        variance < 0 && isPositiveVarianceGood && "text-red-600 dark:text-red-400",
                                        variance > 0 && !isPositiveVarianceGood && "text-red-600 dark:text-red-400",
                                        variance < 0 && !isPositiveVarianceGood && "text-green-600 dark:text-green-400",
                                    )}>{formatPercentage(variancePerc)}</TableCell>
                                </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">EBITDA (Actual)</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(calculatedForecastData.find(r => r.label === 'EBITDA')?.actual)}
                        </div>
                         <p className="text-xs text-muted-foreground">Utile effettivo del periodo.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Margine di Contribuzione</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(calculatedForecastData.find(r => r.label === 'MARGINE DI CONTRIBUZIONE')?.actual)}
                        </div>
                        <p className="text-xs text-muted-foreground">Ricavi meno costi variabili diretti.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">MOC % (Actual)</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold">
                            {formatPercentage(calculatedForecastData.find(r => r.label === 'MOC %')?.actual)}
                        </div>
                        <p className="text-xs text-muted-foreground">Margine in percentuale sui ricavi.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Costi Fissi (Actual)</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                             {formatCurrency(calculatedForecastData.find(r => r.label === 'TOTALE COSTI PRODUTTIVI')?.actual)}
                        </div>
                        <p className="text-xs text-muted-foreground">Costi che non variano con il volume.</p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
