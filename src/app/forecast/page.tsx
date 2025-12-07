
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, TrendingUp, Percent, Banknote, Landmark, ChevronDown, Wand2 } from "lucide-react";
import { getYear, getMonth, parseISO, isValid, format } from "date-fns";
import { it } from "date-fns/locale";
import type { Transaction } from '@/data/transactions-data';
import { useCategories } from '@/contexts/category-context';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';


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
    isExpandable?: boolean;
    subRows?: ForecastRowData[];
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
    const [selectedPeriod, setSelectedPeriod] = useState<string>(new Date().getMonth().toString());

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const [budgetData, setBudgetData] = useState<Record<string, number[]>>({});
    const [editingCell, setEditingCell] = useState<{ label: string; period: number | 'total' } | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');


    const handleBudgetChange = (label: string, period: number, value: number) => {
        setBudgetData(prev => {
            const newBudgetData = { ...prev };
            if (!newBudgetData[label]) {
                newBudgetData[label] = Array(12).fill(0);
            }
            newBudgetData[label][period] = value;
            return newBudgetData;
        });
    };

    const handleSaveEdit = () => {
        if (editingCell) {
            const { label, period } = editingCell;
            const numericValue = parseFloat(editingValue);
            if (!isNaN(numericValue) && period !== 'total') {
                handleBudgetChange(label, period, numericValue);
            }
        }
        setEditingCell(null);
        setEditingValue('');
    };
    
    const getBudgetValue = (label: string, periodIndex: number): number => {
        if (periodIndex === -1) { // Total column
            return budgetData[label]?.reduce((a, b) => a + b, 0) || 0;
        }
        return budgetData[label]?.[periodIndex] || 0;
    };


    const generateBudget = (method: 'lastYearMonthly' | 'lastYearAverage') => {
        const lastYear = parseInt(selectedYear) - 1;
        const lastYearTransactions = transactions.filter(t => isValid(parseISO(t.date)) && getYear(parseISO(t.date)) === lastYear);

        const newBudgetData: Record<string, number[]> = {};

        const allLabels = new Set([
            ...Object.keys(incomeCategories),
            ...Object.keys(expenseCategories).flatMap(cat => [cat, ...(expenseCategories[cat]?.subcategories.map(sub => `${cat}__${sub.name}`) || [])]),
        ]);

        if (method === 'lastYearMonthly') {
            allLabels.forEach(label => {
                const [cat, sub] = label.split('__');
                newBudgetData[label] = Array(12).fill(0).map((_, monthIndex) => {
                    return lastYearTransactions
                        .filter(t => getMonth(parseISO(t.date)) === monthIndex && t.category === cat && (!sub || t.subcategory === sub))
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                });
            });
        } else { // lastYearAverage
            allLabels.forEach(label => {
                const [cat, sub] = label.split('__');
                const totalYearlyAmount = lastYearTransactions
                    .filter(t => t.category === cat && (!sub || t.subcategory === sub))
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                const monthlyAverage = totalYearlyAmount / 12;
                newBudgetData[label] = Array(12).fill(monthlyAverage);
            });
        }

        setBudgetData(newBudgetData);
        toast({ title: 'Budget Generato', description: 'I valori di budget sono stati popolati automaticamente.' });
    };

    const toggleCategoryExpansion = (categoryLabel: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryLabel)) {
                newSet.delete(categoryLabel);
            } else {
                newSet.add(categoryLabel);
            }
            return newSet;
        });
    };

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
            } catch (error) {
                console.error("Errore caricamento transazioni (Forecast):", error);
                setTransactionsError(`Impossibile caricare le transazioni: ${(error as any).message}`);
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
    
        const getFilteredTransactions = (filterFn: (t: Transaction) => boolean): Transaction[] => {
            return transactions.filter(t => {
                const date = parseISO(t.date);
                const isInYear = isValid(date) && getYear(date) === year;
                if (!isInYear) return false;
                const isInMonth = month === -1 ? true : getMonth(date) === month;
                return isInMonth && t.status === 'Completato' && filterFn(t);
            });
        };
    
        const aggregateData = (
            sourceCategories: Record<string, any>, 
            transactionType: 'Entrata' | 'Uscita',
            sectionTitle: string
        ): { rows: ForecastRowData[], totalActual: number, totalBudget: number } => {
            
            let sectionRows: ForecastRowData[] = [];
            let sectionTotalActual = 0;
            let sectionTotalBudget = 0;
    
            Object.entries(sourceCategories).sort(([catA], [catB]) => catA.localeCompare(catB)).forEach(([cat, catData]) => {
                let subRows: ForecastRowData[] = [];
                let categoryTotalActual = 0;
                let categoryTotalBudget = 0;
    
                const subcategories = catData?.subcategories || [];
                
                // Add an "Uncategorized" sub-row if there are transactions with no subcategory
                const uncategorizedTransactions = getFilteredTransactions(t => t.type === transactionType && t.category === cat && !t.subcategory);
                if (uncategorizedTransactions.length > 0) {
                     const subActual = uncategorizedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
                     const subBudget = getBudgetValue(`${cat}__`, month);
                     subRows.push({ label: "Non specificato", actual: subActual, budget: subBudget, isSubcategory: true });
                     categoryTotalActual += subActual;
                     categoryTotalBudget += subBudget;
                }
    
                if (subcategories.length > 0) {
                    subcategories.sort((a: any, b: any) => a.name.localeCompare(b.name)).forEach((sub: any) => {
                        const subActual = getFilteredTransactions(t => t.type === transactionType && t.category === cat && t.subcategory === sub.name)
                                          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                        const subBudget = getBudgetValue(`${cat}__${sub.name}`, month);
                        
                        if (subActual > 0 || subBudget > 0) { // Only add if there is data
                            subRows.push({ label: sub.name, actual: subActual, budget: subBudget, isSubcategory: true });
                            categoryTotalActual += subActual;
                            categoryTotalBudget += subBudget;
                        }
                    });
                }
                
                // The main category row now SUMS its sub-rows instead of doing its own calculation.
                // const catActual = getFilteredTransactions(t => t.type === transactionType && t.category === cat).reduce((sum, t) => sum + Math.abs(t.amount), 0);
                const catBudget = getBudgetValue(cat, month); // This budget might be a manual override for the whole cat
                
                // Use the sum of sub-rows if they exist, otherwise the category-level calculation.
                const finalCatActual = subRows.length > 0 ? categoryTotalActual : getFilteredTransactions(t => t.type === transactionType && t.category === cat).reduce((sum, t) => sum + Math.abs(t.amount), 0);
                const finalCatBudget = subRows.length > 0 ? categoryTotalBudget : catBudget;
                
                if (finalCatActual > 0 || finalCatBudget > 0) {
                    sectionRows.push({ label: cat, actual: finalCatActual, budget: finalCatBudget, isExpandable: subRows.length > 0, subRows });
                    sectionTotalActual += finalCatActual;
                    sectionTotalBudget += finalCatBudget;
                }
            });
    
            return { rows: sectionRows, totalActual: sectionTotalActual, totalBudget: sectionTotalBudget };
        };
    
        let tableRows: ForecastRowData[] = [];
        
        // --- RICAVI ---
        const ricaviAggregation = aggregateData(incomeCategories, 'Entrata', 'RICAVI');
        if (ricaviAggregation.totalActual > 0 || ricaviAggregation.totalBudget > 0) {
            tableRows.push({ label: 'RICAVI', isMainSection: true, actual: 0, budget: 0 });
            tableRows.push(...ricaviAggregation.rows);
            tableRows.push({ label: 'TOTALE RICAVI', isTotal: true, actual: ricaviAggregation.totalActual, budget: ricaviAggregation.totalBudget, isHighlighted: true });
        }
        const totalRicaviActual = ricaviAggregation.totalActual;
        const totalRicaviBudget = ricaviAggregation.totalBudget;

        // --- COSTI DI PRODUZIONE (variabili) ---
        const costiProduzioneCategories = Object.fromEntries(Object.entries(expenseCategories).filter(([,data]) => data?.forecastType === 'Costi di Produzione'));
        const costiProduzioneAggregation = aggregateData(costiProduzioneCategories, 'Uscita', 'COSTI DI PRODUZIONE (variabili)');
        if(costiProduzioneAggregation.totalActual > 0 || costiProduzioneAggregation.totalBudget > 0) {
            tableRows.push({ label: 'COSTI DI PRODUZIONE (variabili)', isMainSection: true, actual: 0, budget: 0 });
            tableRows.push(...costiProduzioneAggregation.rows);
            tableRows.push({ label: 'TOTALI COSTI DI PRODUZIONE (variabili)', isTotal: true, actual: costiProduzioneAggregation.totalActual, budget: costiProduzioneAggregation.totalBudget, isHighlighted: true });
        }
        const totalCostiProduzioneActual = costiProduzioneAggregation.totalActual;
        const totalCostiProduzioneBudget = costiProduzioneAggregation.totalBudget;

        // --- MARGINE ---
        const margineActual = totalRicaviActual - totalCostiProduzioneActual;
        const margineBudget = totalRicaviBudget - totalCostiProduzioneBudget;
        const mocActual = totalRicaviActual > 0 ? (margineActual / totalRicaviActual) * 100 : 0;
        const mocBudget = totalRicaviBudget > 0 ? (margineBudget / totalRicaviBudget) * 100 : 0;
        if (margineActual !== 0 || margineBudget !== 0 || totalRicaviActual !== 0 || totalRicaviBudget !== 0){
            tableRows.push({ label: 'MARGINE DI CONTRIBUZIONE', isFinancialMetric: true, actual: margineActual, budget: margineBudget, isHighlighted: true });
            tableRows.push({ label: 'MOC %', isFinancialMetric: true, actual: mocActual, budget: mocBudget });
        }
        
        // --- COSTI PRODUTTIVI (fissi) ---
        const costiProduttiviCategories = Object.fromEntries(Object.entries(expenseCategories).filter(([,data]) => data?.forecastType === 'Costi Produttivi'));
        const costiProduttiviAggregation = aggregateData(costiProduttiviCategories, 'Uscita', 'COSTI PRODUTTIVI (fissi)');
        if(costiProduttiviAggregation.totalActual > 0 || costiProduttiviAggregation.totalBudget > 0){
            tableRows.push({ label: 'COSTI PRODUTTIVI (fissi)', isMainSection: true, actual: 0, budget: 0 });
            tableRows.push(...costiProduttiviAggregation.rows);
            tableRows.push({ label: 'TOTALE COSTI PRODUTTIVI (fissi)', isTotal: true, actual: costiProduttiviAggregation.totalActual, budget: costiProduttiviAggregation.totalBudget, isHighlighted: true });
        }
        const totalCostiProduttiviActual = costiProduttiviAggregation.totalActual;
        const totalCostiProduttiviBudget = costiProduttiviAggregation.totalBudget;
        
        // --- FINAL METRICS ---
        if (totalCostiProduttiviActual > 0 || totalCostiProduttiviBudget > 0 || margineActual > 0 || margineBudget > 0) {
            const bepActual = mocActual > 0 ? totalCostiProduttiviActual / (mocActual / 100) : 0;
            const bepBudget = mocBudget > 0 ? totalCostiProduttiviBudget / (mocBudget / 100) : 0;
    
            const totalCostiActual = totalCostiProduzioneActual + totalCostiProduttiviActual;
            const totalCostiBudget = totalCostiProduzioneBudget + totalCostiProduttiviBudget;
            
            const ebitdaActual = margineActual - totalCostiProduttiviActual;
            const ebitdaBudget = margineBudget - totalCostiProduttiviBudget;
    
            tableRows.push({ label: 'BEP (Break Even Point)', isFinancialMetric: true, actual: bepActual, budget: bepBudget });
            tableRows.push({ label: 'TOTALE COSTI', isFinancialMetric: true, actual: totalCostiActual, budget: totalCostiBudget, isHighlighted: true });
            tableRows.push({ label: 'EBITDA', isFinancialMetric: true, actual: ebitdaActual, budget: ebitdaBudget, isHighlighted: true });
        }
        return tableRows;
    
    }, [selectedYear, selectedPeriod, transactions, expenseCategories, incomeCategories, loadingCategories, isLoadingTransactions, budgetData]);


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

    const renderRow = (row: ForecastRowData, index: number) => {
        if (row.isMainSection && !calculatedForecastData.slice(index + 1).some(r => !r.isMainSection && r.actual > 0)) {
            // Check if the section is empty
            const nextMainSectionIndex = calculatedForecastData.findIndex((r, i) => i > index && r.isMainSection);
            const sectionRows = calculatedForecastData.slice(index + 1, nextMainSectionIndex > -1 ? nextMainSectionIndex : calculatedForecastData.length);
            if (sectionRows.every(r => r.actual === 0 && r.budget === 0 && !r.isFinancialMetric && !r.isTotal)) {
                 return null; // Don't render empty main sections
            }
        }


        if (row.isMainSection) {
            return (
                <TableRow key={index} className="hover:bg-transparent">
                    <TableCell colSpan={5} className="pt-6 pb-2">
                        <h3 className="font-bold text-md text-foreground">{row.label}</h3>
                    </TableCell>
                </TableRow>
            );
        }

        const isCost = (row.label.toLowerCase().includes('costi') && !row.label.toLowerCase().includes('ricavi')) || row.isSubcategory;
        const isEbitdaOrMargine = row.label === 'EBITDA' || row.label === 'MARGINE DI CONTRIBUZIONE';

        const variance = row.actual - row.budget;
        const variancePerc = row.budget !== 0 ? (variance / Math.abs(row.budget)) * 100 : (row.actual !== 0 ? 100 : 0);

        const isPositiveVarianceGood = !isCost || isEbitdaOrMargine;
        
        const isExpanded = expandedCategories.has(row.label);

        const currentPeriodIndex = selectedPeriod === 'total' ? -1 : parseInt(selectedPeriod);

        return (
            <React.Fragment key={index}>
                <TableRow 
                    className={cn(
                        row.label.includes('TOTALE') && "bg-yellow-50 dark:bg-yellow-900/20",
                        (isEbitdaOrMargine) && "bg-green-50 dark:bg-green-900/20",
                        row.isExpandable && "cursor-pointer"
                    )}
                    onClick={row.isExpandable ? () => toggleCategoryExpansion(row.label) : undefined}
                >
                    <TableCell className={cn(
                        "font-medium",
                        row.isSubcategory && "pl-10 text-muted-foreground",
                        (row.isTotal || row.isFinancialMetric) && "font-bold",
                    )}>
                        <div className="flex items-center">
                            {row.label}
                            {row.isExpandable && <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", isExpanded && "rotate-180")} />}
                        </div>
                    </TableCell>
                    <TableCell 
                        className="text-right"
                        onClick={(e) => {
                            if (!row.isFinancialMetric && !row.isTotal && currentPeriodIndex !== -1) {
                                e.stopPropagation();
                                setEditingCell({ label: row.isSubcategory ? `${calculatedForecastData.find(r => r.subRows?.some(sr => sr.label === row.label))?.label}__${row.label}` : row.label, period: currentPeriodIndex });
                                setEditingValue(row.budget.toString());
                            }
                        }}
                    >
                        {editingCell?.label === (row.isSubcategory ? `${calculatedForecastData.find(r => r.subRows?.some(sr => sr.label === row.label))?.label}__${row.label}` : row.label) && editingCell?.period === currentPeriodIndex ? (
                            <Input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                                autoFocus
                                className="h-8 text-right"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            formatCurrency(row.budget)
                        )}
                    </TableCell>
                    <TableCell className="text-right">{row.label.includes('%') ? formatPercentage(row.actual) : formatCurrency(row.actual)}</TableCell>
                    <TableCell className={cn(
                        "text-right",
                        (variance > 0 && isPositiveVarianceGood) && "text-green-600 dark:text-green-400",
                        (variance < 0 && isPositiveVarianceGood) && "text-red-600 dark:text-red-400",
                        (variance > 0 && !isPositiveVarianceGood) && "text-red-600 dark:text-red-400",
                        (variance < 0 && !isPositiveVarianceGood) && "text-green-600 dark:text-green-400"
                    )}>{row.label.includes('%') ? formatPercentage(variance) : formatCurrency(variance)}</TableCell>
                    <TableCell className={cn(
                        "text-right font-bold",
                        (variance > 0 && isPositiveVarianceGood) && "text-green-600 dark:text-green-400",
                        (variance < 0 && isPositiveVarianceGood) && "text-red-600 dark:text-red-400",
                        (variance > 0 && !isPositiveVarianceGood) && "text-red-600 dark:text-red-400",
                        (variance < 0 && !isPositiveVarianceGood) && "text-green-600 dark:text-green-400"
                    )}>{formatPercentage(variancePerc)}</TableCell>
                </TableRow>
                {isExpanded && row.subRows?.map((subRow, subIndex) => renderRow(subRow, `${index}-${subIndex}` as any))}
            </React.Fragment>
        );
    };

    return (
        <>
            <PageHeader
                title="Previsioni"
                description={pageTitle}
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
                                <DropdownMenuItem onSelect={() => generateBudget('lastYearMonthly')}>Da Mesi Anno Precedente</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => generateBudget('lastYearAverage')}>Da Media Anno Precedente</DropdownMenuItem>
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
                                <TableHead className="text-right font-bold">Scostamento (€)</TableHead>
                                <TableHead className="text-right font-bold">% Scostamento</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {calculatedForecastData.length > 0 ? 
                                calculatedForecastData.map((row, index) => renderRow(row, index)) :
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Nessun dato da visualizzare per il periodo selezionato.</TableCell></TableRow>
                            }
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
                             {formatCurrency(calculatedForecastData.find(r => r.label === 'TOTALE COSTI PRODUTTIVI (fissi)')?.actual)}
                        </div>
                        <p className="text-xs text-muted-foreground">Costi che non variano con il volume.</p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

    
