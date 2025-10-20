
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Percent, Banknote, Landmark, Wand2, Calculator } from "lucide-react";
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Subcategory } from '@/contexts/category-context';


const months = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i), "MMMM", { locale: it }));

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

type MonthlyValues = number[];

interface ForecastRow {
  label: string;
  isSubcategory?: boolean;
  isTotal?: boolean;
  isMainSection?: boolean;
  isFinancialMetric?: boolean;
  isHighlighted?: boolean;
  actualValues: MonthlyValues;
  budgetValues: MonthlyValues;
  isEditable?: boolean;
  path?: string; // e.g., 'RICAVI.Pazienti' or 'COSTI_PRODUZIONE.Materiali.Materiale Conservativa'
}

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return "€0,00";
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return "-";
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
    const [selectedYear, setSelectedYear] = useState<string>(availableYears[0]);
    
    // State for budget data
    const [budgetData, setBudgetData] = useState<Record<string, MonthlyValues>>({});
    const [editingCell, setEditingCell] = useState<{ path: string; month: number } | null>(null);
    const [editingValue, setEditingValue] = useState<string>("");

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
            } catch (error: any) => {
                console.error("Errore caricamento transazioni (Forecast):", error);
                setTransactionsError(`Impossibile caricare le transazioni: ${error.message}`);
            } finally {
                setIsLoadingTransactions(false);
            }
        };
        fetchTransactions();
    }, [transactionsVersion]);

    const handleBudgetGeneration = (method: 'prevYear' | 'prevYearAvg') => {
        const prevYear = parseInt(selectedYear) - 1;
        const prevYearTransactions = transactions.filter(t => isValid(parseISO(t.date)) && getYear(parseISO(t.date)) === prevYear && t.status === 'Completato');
        
        if (prevYearTransactions.length === 0) {
            toast({
                title: "Dati Mancanti",
                description: `Nessuna transazione trovata per l'anno precedente (${prevYear}) per generare il budget.`,
                variant: "destructive"
            });
            return;
        }

        const newBudgetData: Record<string, MonthlyValues> = {};

        const processCategory = (catName: string, catData: any, type: 'Entrata' | 'Uscita', pathPrefix: string) => {
            const catPath = `${pathPrefix}.${catName}`;
            
            const getValues = () => {
                if (method === 'prevYearAvg') {
                    const total = prevYearTransactions
                        .filter(t => t.type === type && t.category === catName)
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                    return Array(12).fill(total / 12);
                } else { // prevYear
                    return Array.from({ length: 12 }, (_, monthIndex) => {
                        return prevYearTransactions
                            .filter(t => t.type === type && t.category === catName && getMonth(parseISO(t.date)) === monthIndex)
                            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                    });
                }
            };
            newBudgetData[catPath] = getValues();

            if (catData.subcategories && Array.isArray(catData.subcategories)) {
                catData.subcategories.forEach((sub: Subcategory) => {
                    if (sub.showInForecast) {
                        const subPath = `${catPath}.${sub.name}`;
                        const getSubValues = () => {
                             if (method === 'prevYearAvg') {
                                const total = prevYearTransactions
                                    .filter(t => t.type === type && t.category === catName && t.subcategory === sub.name)
                                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                                return Array(12).fill(total / 12);
                            } else {
                                return Array.from({ length: 12 }, (_, monthIndex) => {
                                    return prevYearTransactions
                                        .filter(t => t.type === type && t.category === catName && t.subcategory === sub.name && getMonth(parseISO(t.date)) === monthIndex)
                                        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                                });
                            }
                        };
                        newBudgetData[subPath] = getSubValues();
                    }
                });
            }
        };

        Object.entries(incomeCategories).forEach(([cat, data]) => processCategory(cat, data, 'Entrata', 'RICAVI'));
        Object.entries(expenseCategories).forEach(([cat, data]) => {
            if (data && data.forecastType) {
                const prefix = data.forecastType === 'Costi di Produzione' ? 'COSTI_DI_PRODUZIONE' : 'COSTI_PRODUTTIVI';
                processCategory(cat, data, 'Uscita', prefix);
            }
        });

        setBudgetData(newBudgetData);
        toast({
            title: "Budget Generato",
            description: `Il budget per l'anno ${selectedYear} è stato generato con successo.`,
        });
    };

    const handleBudgetChange = (path: string, month: number, value: string) => {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            setBudgetData(prev => {
                const newBudgetData = { ...prev };
                if (!newBudgetData[path]) newBudgetData[path] = Array(12).fill(0);
                newBudgetData[path][month] = numericValue;
                return newBudgetData;
            });
        }
    };

    const handleEditBlur = () => {
        setEditingCell(null);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const calculatedForecastData = useMemo((): ForecastRow[] => {
        if (loadingCategories) return [];
        const year = parseInt(selectedYear);
        
        const actuals: Record<string, MonthlyValues> = {};
        const budgets: Record<string, MonthlyValues> = { ...budgetData };

        const getActuals = (path: string, calculation: (month: number) => number): MonthlyValues => {
            if (!actuals[path]) {
                actuals[path] = Array.from({ length: 12 }, (_, i) => calculation(i));
            }
            return actuals[path];
        };

        const getBudgets = (path: string, dependentPaths: string[]): MonthlyValues => {
            if (!budgets[path]) {
                budgets[path] = Array(12).fill(0);
                for (let i = 0; i < 12; i++) {
                    budgets[path][i] = dependentPaths.reduce((sum, depPath) => {
                        const depValues = getBudgets(depPath, []); // Pass empty array to avoid recursion on already computed values
                        return sum + (depValues[i] || 0);
                    }, 0);
                }
            }
            return budgets[path];
        };

        let tableRows: ForecastRow[] = [];
        
        // --- RICAVI ---
        let ricaviPaths: string[] = [];
        tableRows.push({ label: 'RICAVI', isMainSection: true, actualValues: [], budgetValues: [] });
        Object.keys(incomeCategories).sort().forEach(cat => {
            const catPath = `RICAVI.${cat}`;
            ricaviPaths.push(catPath);
            tableRows.push({
                label: cat,
                actualValues: getActuals(catPath, (month) => transactions.filter(t => isValid(parseISO(t.date)) && getYear(parseISO(t.date)) === year && getMonth(parseISO(t.date)) === month && t.status === 'Completato' && t.type === 'Entrata' && t.category === cat).reduce((s, t) => s + Math.abs(t.amount), 0)),
                budgetValues: budgets[catPath] || Array(12).fill(0),
                isEditable: true,
                path: catPath,
            });
        });
        const totalRicaviPath = 'RICAVI.total';
        tableRows.push({
            label: 'TOTALE RICAVI',
            isTotal: true,
            actualValues: getActuals(totalRicaviPath, month => ricaviPaths.reduce((sum, p) => sum + (actuals[p]?.[month] || 0), 0)),
            budgetValues: getBudgets(totalRicaviPath, ricaviPaths),
        });

        // --- COSTI DI PRODUZIONE ---
        let costiProduzionePaths: string[] = [];
        tableRows.push({ label: 'COSTI DI PRODUZIONE', isMainSection: true, actualValues: [], budgetValues: [] });
        Object.entries(expenseCategories).filter(([,data]) => data && data.forecastType === 'Costi di Produzione').sort(([catA], [catB]) => catA.localeCompare(catB)).forEach(([cat, catData]) => {
            const catPath = `COSTI_DI_PRODUZIONE.${cat}`;
            costiProduzionePaths.push(catPath);
            let subcatPathsForCat: string[] = [];

            if (catData && catData.subcategories && catData.subcategories.some(s => s.showInForecast)) {
                catData.subcategories.filter(s => s.showInForecast).sort((a,b) => a.name.localeCompare(b.name)).forEach(sub => {
                    const subPath = `${catPath}.${sub.name}`;
                    subcatPathsForCat.push(subPath);
                    tableRows.push({
                        label: sub.name,
                        isSubcategory: true,
                        actualValues: getActuals(subPath, month => transactions.filter(t => isValid(parseISO(t.date)) && getYear(parseISO(t.date)) === year && getMonth(parseISO(t.date)) === month && t.status === 'Completato' && t.type === 'Uscita' && t.category === cat && t.subcategory === sub.name).reduce((s, t) => s + Math.abs(t.amount), 0)),
                        budgetValues: budgets[subPath] || Array(12).fill(0),
                        isEditable: true,
                        path: subPath,
                    });
                });
            }
            
            tableRows.push({
                label: cat,
                actualValues: getActuals(catPath, month => transactions.filter(t => isValid(parseISO(t.date)) && getYear(parseISO(t.date)) === year && getMonth(parseISO(t.date)) === month && t.status === 'Completato' && t.type === 'Uscita' && t.category === cat).reduce((s, t) => s + Math.abs(t.amount), 0)),
                budgetValues: getBudgets(catPath, subcatPathsForCat.length > 0 ? subcatPathsForCat : []),
                isEditable: subcatPathsForCat.length === 0,
                path: catPath,
            });
        });

        const totalCostiProduzionePath = 'COSTI_DI_PRODUZIONE.total';
        const actualTotalCostiProduzione = getActuals(totalCostiProduzionePath, month => costiProduzionePaths.reduce((sum, p) => sum + (actuals[p]?.[month] || 0), 0));
        const budgetTotalCostiProduzione = getBudgets(totalCostiProduzionePath, costiProduzionePaths);
        tableRows.push({ label: 'TOTALI COSTI DI PRODUZIONE', isTotal: true, actualValues: actualTotalCostiProduzione, budgetValues: budgetTotalCostiProduzione });
        
        // --- MARGINE ---
        const actualMargine = actuals[totalRicaviPath].map((inc, i) => inc - actualTotalCostiProduzione[i]);
        const budgetMargine = budgets[totalRicaviPath].map((inc, i) => inc - budgetTotalCostiProduzione[i]);
        tableRows.push({ label: 'MARGINE DI CONTRIBUZIONE', isFinancialMetric: true, isHighlighted: true, actualValues: actualMargine, budgetValues: budgetMargine });
        
        const actualMoc = actuals[totalRicaviPath].map((inc, i) => inc > 0 ? (actualMargine[i] / inc) * 100 : 0);
        const budgetMoc = budgets[totalRicaviPath].map((inc, i) => inc > 0 ? (budgetMargine[i] / inc) * 100 : 0);
        tableRows.push({ label: 'MOC %', isFinancialMetric: true, actualValues: actualMoc, budgetValues: budgetMoc });

        // --- COSTI PRODUTTIVI ---
        let costiProduttiviPaths: string[] = [];
        tableRows.push({ label: 'COSTI PRODUTTIVI', isMainSection: true, actualValues: [], budgetValues: [] });
        Object.entries(expenseCategories).filter(([,data]) => data && data.forecastType === 'Costi Produttivi').sort(([catA], [catB]) => catA.localeCompare(catB)).forEach(([cat, catData]) => {
            const catPath = `COSTI_PRODUTTIVI.${cat}`;
            costiProduttiviPaths.push(catPath);
            let subcatPathsForCat: string[] = [];

            if (catData && catData.subcategories && catData.subcategories.some(s => s.showInForecast)) {
                catData.subcategories.filter(s => s.showInForecast).sort((a,b) => a.name.localeCompare(b.name)).forEach(sub => {
                     const subPath = `${catPath}.${sub.name}`;
                     subcatPathsForCat.push(subPath);
                     tableRows.push({
                        label: sub.name,
                        isSubcategory: true,
                        actualValues: getActuals(subPath, month => transactions.filter(t => isValid(parseISO(t.date)) && getYear(parseISO(t.date)) === year && getMonth(parseISO(t.date)) === month && t.status === 'Completato' && t.type === 'Uscita' && t.category === cat && t.subcategory === sub.name).reduce((s, t) => s + Math.abs(t.amount), 0)),
                        budgetValues: budgets[subPath] || Array(12).fill(0),
                        isEditable: true,
                        path: subPath,
                    });
                });
            }
             tableRows.push({
                label: cat,
                actualValues: getActuals(catPath, month => transactions.filter(t => isValid(parseISO(t.date)) && getYear(parseISO(t.date)) === year && getMonth(parseISO(t.date)) === month && t.status === 'Completato' && t.type === 'Uscita' && t.category === cat).reduce((s, t) => s + Math.abs(t.amount), 0)),
                budgetValues: getBudgets(catPath, subcatPathsForCat.length > 0 ? subcatPathsForCat : []),
                isEditable: subcatPathsForCat.length === 0,
                path: catPath,
            });
        });
        const totalCostiProduttiviPath = 'COSTI_PRODUTTIVI.total';
        const actualTotalCostiProduttivi = getActuals(totalCostiProduttiviPath, month => costiProduttiviPaths.reduce((sum, p) => sum + (actuals[p]?.[month] || 0), 0));
        const budgetTotalCostiProduttivi = getBudgets(totalCostiProduttiviPath, costiProduttiviPaths);
        tableRows.push({ label: 'TOTALE COSTI PRODUTTIVI', isTotal: true, actualValues: actualTotalCostiProduttivi, budgetValues: budgetTotalCostiProduttivi });

        // --- FINAL METRICS ---
        const actualBep = actualMoc.map((moc, i) => moc > 0 ? (actualTotalCostiProduttivi[i] / (moc / 100)) : 0);
        const budgetBep = budgetMoc.map((moc, i) => moc > 0 ? (budgetTotalCostiProduttivi[i] / (moc / 100)) : 0);
        tableRows.push({ label: 'BEP (Break Even Point)', isFinancialMetric: true, actualValues: actualBep, budgetValues: budgetBep });

        const actualTotalCosti = actualTotalCostiProduzione.map((pc, i) => pc + actualTotalCostiProduttivi[i]);
        const budgetTotalCosti = budgetTotalCostiProduzione.map((pc, i) => pc + budgetTotalCostiProduttivi[i]);
        tableRows.push({ label: 'TOTALE COSTI', isFinancialMetric: true, isTotal: true, actualValues: actualTotalCosti, budgetValues: budgetTotalCosti });
        
        const actualEbitda = actualMargine.map((m, i) => m - actualTotalCostiProduttivi[i]);
        const budgetEbitda = budgetMargine.map((m, i) => m - budgetTotalCostiProduttivi[i]);
        tableRows.push({ label: 'EBITDA', isFinancialMetric: true, isHighlighted: true, actualValues: actualEbitda, budgetValues: budgetEbitda });

        return tableRows;
    }, [selectedYear, transactions, expenseCategories, incomeCategories, budgetData, loadingCategories]);


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
        <>
            <PageHeader
                title="Previsioni e Budget"
                description={`Analisi previsionale e confronto con il budget per l'anno ${selectedYear}.`}
                actions={
                    <div className="flex items-center gap-2">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                <Wand2 className="mr-2 h-4 w-4" />
                                Genera Budget
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Metodo di Generazione</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleBudgetGeneration('prevYear')}>
                                    <Calculator className="mr-2 h-4 w-4" />
                                    <span>Da Mesi Anno Precedente</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBudgetGeneration('prevYearAvg')}>
                                    <Calculator className="mr-2 h-4 w-4" />
                                    <span>Da Media Anno Precedente</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Tabella Previsionale e Budget</CardTitle>
                    <CardDescription>Riepilogo mensile di ricavi e costi, confrontati con il budget impostato.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="w-full whitespace-nowrap">
                        <Table className="min-w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead rowSpan={2} className="sticky left-0 bg-background/95 backdrop-blur-sm min-w-[250px] font-bold z-20 align-bottom">Voce</TableHead>
                                    {months.map((month) => (
                                        <TableHead key={month} colSpan={4} className="text-center border-l">
                                            {month}
                                        </TableHead>
                                    ))}
                                    <TableHead colSpan={4} className="text-center sticky right-0 bg-background/95 backdrop-blur-sm border-l z-20">
                                        Totale {selectedYear}
                                    </TableHead>
                                </TableRow>
                                <TableRow>
                                    {Array(13).fill(0).map((_, i) => (
                                        <React.Fragment key={i}>
                                            <TableHead className={cn("text-right font-medium text-muted-foreground w-[100px]", i===0 ? "border-l" : "")}>Budget</TableHead>
                                            <TableHead className="text-right font-medium text-muted-foreground w-[100px]">Actual</TableHead>
                                            <TableHead className="text-right font-medium text-muted-foreground w-[100px]">Scost. €</TableHead>
                                            <TableHead className={cn("text-right font-medium text-muted-foreground w-[100px]", i===12 ? "sticky right-0 bg-background/95 backdrop-blur-sm z-10" : "")}>Scost. %</TableHead>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calculatedForecastData.map((row, rowIndex) => {
                                    const totalActual = row.actualValues.reduce((a, b) => a + b, 0);
                                    const totalBudget = row.budgetValues.reduce((a, b) => a + b, 0);
                                    
                                    const isMocRow = row.label === 'MOC %';
                                    
                                    const finalTotalActual = isMocRow ? (
                                        (() => {
                                            const totalRicavi = calculatedForecastData.find(r => r.label === 'TOTALE RICAVI')?.actualValues.reduce((a, b) => a + b, 0) || 0;
                                            const totalMargine = calculatedForecastData.find(r => r.label === 'MARGINE DI CONTRIBUZIONE')?.actualValues.reduce((a, b) => a + b, 0) || 0;
                                            return totalRicavi > 0 ? (totalMargine / totalRicavi) * 100 : 0;
                                        })()
                                    ) : totalActual;
                                    const finalTotalBudget = isMocRow ? (
                                        (() => {
                                            const totalRicavi = calculatedForecastData.find(r => r.label === 'TOTALE RICAVI')?.budgetValues.reduce((a, b) => a + b, 0) || 0;
                                            const totalMargine = calculatedForecastData.find(r => r.label === 'MARGINE DI CONTRIBUZIONE')?.budgetValues.reduce((a, b) => a + b, 0) || 0;
                                            return totalRicavi > 0 ? (totalMargine / totalRicavi) * 100 : 0;
                                        })()
                                    ) : totalBudget;
                                    const finalTotalVariance = finalTotalActual - finalTotalBudget;
                                    const finalTotalVariancePerc = finalTotalBudget !== 0 && isFinite(finalTotalBudget) && finalTotalBudget !== null ? (finalTotalVariance / finalTotalBudget) * 100 : 0;


                                    if (row.isMainSection) {
                                      return (
                                        <TableRow key={rowIndex} className="bg-muted/20 hover:bg-muted/20">
                                          <TableCell colSpan={53} className="sticky left-0 bg-muted/20 font-extrabold text-lg pt-6 text-primary z-10">{row.label}</TableCell>
                                        </TableRow>
                                      );
                                    }

                                    return (
                                    <TableRow key={rowIndex} className={cn(
                                        row.isTotal && "bg-muted/50",
                                        row.isHighlighted && "bg-green-50 dark:bg-green-900/20"
                                    )}>
                                        <TableCell className={cn(
                                            "sticky left-0 bg-background/95 backdrop-blur-sm font-medium z-10",
                                            row.isTotal && "font-bold",
                                            row.isSubcategory && "pl-8 text-muted-foreground",
                                            row.isFinancialMetric && "font-semibold"
                                        )}>
                                            {row.label}
                                        </TableCell>

                                        {months.map((_, monthIndex) => {
                                            const budget = row.budgetValues[monthIndex] || 0;
                                            const actual = row.actualValues[monthIndex] || 0;
                                            const variance = actual - budget;
                                            const variancePerc = budget !== 0 ? (variance / budget) * 100 : 0;
                                            const isEditing = editingCell?.path === row.path && editingCell?.month === monthIndex;
                                            
                                            return(
                                            <React.Fragment key={monthIndex}>
                                                <TableCell className={cn("text-right font-mono p-2", monthIndex === 0 ? "border-l" : "")}>
                                                    {row.isEditable ? (
                                                        isEditing ? (
                                                            <Input 
                                                                type="text"
                                                                value={editingValue}
                                                                onChange={(e) => setEditingValue(e.target.value)}
                                                                onBlur={handleEditBlur}
                                                                onKeyDown={handleEditKeyDown}
                                                                onBlurCapture={() => handleBudgetChange(row.path!, monthIndex, editingValue)}
                                                                autoFocus
                                                                className="h-6 text-right p-1"
                                                            />
                                                        ) : (
                                                            <div className="h-6 cursor-pointer" onClick={() => { setEditingCell({ path: row.path!, month: monthIndex }); setEditingValue(budget.toString());}}>
                                                                {isMocRow ? formatPercentage(budget) : formatCurrency(budget)}
                                                            </div>
                                                        )
                                                    ) : ( isMocRow ? formatPercentage(budget) : formatCurrency(budget) )}
                                                </TableCell>
                                                <TableCell className="font-mono text-right p-2">{isMocRow ? formatPercentage(actual) : formatCurrency(actual)}</TableCell>
                                                <TableCell className={cn("font-mono text-right p-2", variance > 0 && !isMocRow ? "text-green-600" : variance < 0 ? "text-red-600" : "")}>{isMocRow ? formatPercentage(variance) : formatCurrency(variance)}</TableCell>
                                                <TableCell className={cn("font-mono text-right p-2 border-r", variancePerc > 0 && !isMocRow ? "text-green-600" : variancePerc < 0 ? "text-red-600" : "")}>{formatPercentage(variancePerc)}</TableCell>
                                            </React.Fragment>
                                        )})}

                                        
                                        <TableCell className="font-mono text-right font-bold p-2 sticky right-[300px] sm:right-[320px] bg-background/95 z-10">{isMocRow ? formatPercentage(finalTotalBudget) : formatCurrency(finalTotalBudget)}</TableCell>
                                        <TableCell className="font-mono text-right font-bold p-2 sticky right-[200px] sm:right-[240px] bg-background/95 z-10">{isMocRow ? formatPercentage(finalTotalActual) : formatCurrency(finalTotalActual)}</TableCell>
                                        <TableCell className={cn("font-mono text-right font-bold p-2 sticky right-[100px] sm:right-[160px] bg-background/95 z-10", finalTotalVariance > 0 && !isMocRow ? "text-green-600" : finalTotalVariance < 0 ? "text-red-600" : "")}>{isMocRow ? formatPercentage(finalTotalVariance) : formatCurrency(finalTotalVariance)}</TableCell>
                                        <TableCell className={cn("font-mono text-right font-bold p-2 sticky right-0 bg-background/95 z-10", finalTotalVariancePerc > 0 && !isMocRow ? "text-green-600" : finalTotalVariancePerc < 0 ? "text-red-600" : "")}>{formatPercentage(finalTotalVariancePerc)}</TableCell>
                                        
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
                        <CardTitle className="text-sm font-medium">EBITDA Annuale (Actual)</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(calculatedForecastData.find(r => r.label === 'EBITDA')?.actualValues.reduce((a,b) => a+b, 0) || 0)}
                        </div>
                         <p className="text-xs text-muted-foreground">Utile effettivo prima di interessi, tasse, svalutazioni e ammortamenti.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Margine di Contribuzione (Actual)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(calculatedForecastData.find(r => r.label === 'MARGINE DI CONTRIBUZIONE')?.actualValues.reduce((a,b) => a+b, 0) || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Ricavi effettivi meno i costi variabili diretti.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">MOC % Annuale (Actual)</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold">
                            {(() => {
                                const totalRicavi = calculatedForecastData.find(r => r.label === 'TOTALE RICAVI')?.actualValues.reduce((a,b) => a+b, 0) || 0;
                                const totalMargine = calculatedForecastData.find(r => r.label === 'MARGINE DI CONTRIBUZIONE')?.actualValues.reduce((a,b) => a+b, 0) || 0;
                                const moc = totalRicavi > 0 ? (totalMargine/totalRicavi) * 100 : 0;
                                return `${moc.toFixed(2)}%`;
                            })()}
                        </div>
                        <p className="text-xs text-muted-foreground">Margine di contribuzione effettivo in percentuale sui ricavi.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Costi Fissi Annuali (Actual)</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(calculatedForecastData.find(r => r.label === 'TOTALE COSTI PRODUTTIVI')?.actualValues.reduce((a,b) => a+b, 0) || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Costi effettivi che non variano con il volume di produzione.</p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

    