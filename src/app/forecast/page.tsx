
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Download, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { format, getYear, getMonth, parseISO, isValid } from "date-fns";
import { it } from 'date-fns/locale';
import { type Transaction } from '@/data/transactions-data';
import debounce from 'lodash.debounce';
import { cn } from '@/lib/utils';
import { useCategories } from '@/contexts/category-context';

const generateYears = () => {
  const currentYr = getYear(new Date());
  return Array.from({ length: 5 }, (_, i) => (currentYr - i).toString());
};

type CalculatedValues = {
  budget: number;
  actual: number;
  scostamento: number;
  percScostamento: number;
  breakdown?: Record<string, { budget: number, actual: number }>; 
};

type MonthlyData = Record<string, CalculatedValues>;

const renderValue = (value: number) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const renderPercentage = (value: number) => `${value.toFixed(2)}%`;

export default function ForecastPage() {
  const [isClient, setIsClient] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { expenseCategories, incomeCategories, loading: loadingCategories } = useCategories();
  const [budgetData, setBudgetData] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const { toast } = useToast();
  const { transactionsVersion } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => setIsClient(true), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const transactionsCollectionRef = collection(db, "transactions");
      const transSnapshot = await getDocs(transactionsCollectionRef);
      const fetchedTransactions: Transaction[] = [];
      transSnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedTransactions.push({ 
          id: doc.id,
          date: data.date instanceof Timestamp ? format(data.date.toDate(), "yyyy-MM-dd") : data.date,
          description: data.description,
          category: data.category,
          subcategory: data.subcategory,
          type: data.type,
          amount: data.amount,
          status: data.status,
          isRecurring: data.isRecurring,
          recurrenceDetails: data.recurrenceDetails,
          originalRecurringId: data.originalRecurringId,
        });
      });
      setTransactions(fetchedTransactions);

      const budgetsCollectionRef = collection(db, "budgets_forecast");
      const budgetQuery = query(budgetsCollectionRef, where('year', '==', parseInt(selectedYear)));
      const budgetSnapshot = await getDocs(budgetQuery);
      const fetchedBudgets: Record<string, number> = {};
      budgetSnapshot.forEach((doc) => {
        const data = doc.data();
        // Key for main category budget
        fetchedBudgets[`${data.month}_${data.category}`] = data.amount;
        // Key for subcategory budget (if exists)
        if (data.subcategory) {
             fetchedBudgets[`${data.month}_${data.category}_${data.subcategory}`] = data.amount;
        }
      });
      setBudgetData(fetchedBudgets);

    } catch (e: any) {
      console.error("Errore caricamento dati forecast:", e);
      setError("Impossibile caricare i dati per il bilancio previsionale.");
      toast({ title: "Errore Dati", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, toast]);

  useEffect(() => {
    fetchData();
  }, [selectedYear, transactionsVersion, fetchData]);
  
  const debouncedSaveBudget = useCallback(
    debounce(async (year: number, month: number, category: string, subcategory: string | null, amount: number) => {
      try {
        const docId = subcategory ? `${year}-${month}-${category}-${subcategory}` : `${year}-${month}-${category}`;
        const budgetRef = doc(db, "budgets_forecast", docId);
        const dataToSave: { year: number, month: number, category: string, subcategory?: string, amount: number } = { year, month, category, amount };
        if (subcategory) {
            dataToSave.subcategory = subcategory;
        }
        await setDoc(budgetRef, dataToSave);
        toast({ title: "Budget Salvato", description: `Valore per ${subcategory || category} aggiornato.` });
      } catch (e: any) {
        toast({ title: "Errore Salvataggio Budget", description: e.message, variant: "destructive" });
      }
    }, 1000),
    [toast]
  );

  const handleBudgetChange = (month: number, category: string, subcategory: string | null, value: string) => {
    const amount = parseFloat(value) || 0;
    const key = subcategory ? `${month}_${category}_${subcategory}` : `${month}_${category}`;
    setBudgetData(prev => ({ ...prev, [key]: amount }));
    debouncedSaveBudget(parseInt(selectedYear), month, category, subcategory, amount);
  };
  
 const calculatedMonthlyData = useMemo((): MonthlyData[] => {
    if (isLoading || loadingCategories) return [];
    
    const monthlyResults: MonthlyData[] = Array(12).fill(0).map(() => ({}));
    const currentYearTransactions = transactions.filter(t => {
      const d = parseISO(t.date);
      return isValid(d) && getYear(d).toString() === selectedYear;
    });
    
    const allCategories = { ...incomeCategories, ...expenseCategories };

    for (let i = 0; i < 12; i++) { // For each month
        const month = i;
        if (!monthlyResults[month]) monthlyResults[month] = {};

        // Initialize all promoted subcategories and main categories
        Object.entries(allCategories).forEach(([catName, catData]) => {
            if (!catData) return;

            // Main category row (if it has non-promoted subs or no subs)
            if (!catData.subcategories || catData.subcategories.some(s => !s.showInForecast) || catData.subcategories.length === 0) {
                 if (!monthlyResults[month][catName]) monthlyResults[month][catName] = { budget: 0, actual: 0, scostamento: 0, percScostamento: 0, breakdown: {} };
            }
            
            // Promoted subcategory rows
            if(catData.subcategories){
                catData.subcategories.forEach(sub => {
                    if (sub.showInForecast) {
                        const subKey = `${catName}__${sub.name}`;
                        if (!monthlyResults[month][subKey]) monthlyResults[month][subKey] = { budget: 0, actual: 0, scostamento: 0, percScostamento: 0, breakdown: {} };
                    }
                });
            }
        });
    }

    currentYearTransactions.forEach(t => {
        const transactionDate = parseISO(t.date);
        if (!isValid(transactionDate)) return;
        
        const month = getMonth(transactionDate);
        const catInfo = allCategories[t.category];

        if (catInfo) {
            const amount = Math.abs(t.amount);
            const subcategoryInfo = catInfo.subcategories?.find(s => s.name === t.subcategory);

            if (subcategoryInfo?.showInForecast) {
                 const subKey = `${t.category}__${t.subcategory}`;
                 if(monthlyResults[month] && monthlyResults[month][subKey]) {
                    monthlyResults[month][subKey].actual += amount;
                 }
            } else {
                if(monthlyResults[month] && monthlyResults[month][t.category]) {
                    monthlyResults[month][t.category].actual += amount;

                    const subcatKeyForBreakdown = t.subcategory || "N/D";
                    if (!monthlyResults[month][t.category].breakdown![subcatKeyForBreakdown]) {
                         monthlyResults[month][t.category].breakdown![subcatKeyForBreakdown] = { budget: 0, actual: 0 };
                    }
                    monthlyResults[month][t.category].breakdown![subcatKeyForBreakdown].actual += amount;
                }
            }
        }
    });

    for (let i = 0; i < 12; i++) { // For each month
        const month = i;
        const monthData = monthlyResults[month];
        if (!monthData) continue;
        
        Object.entries(allCategories).forEach(([catName, catData]) => {
            if(!catData) return;
            
            // Main category row budget
            if (monthData[catName]) {
                 monthData[catName].budget = budgetData[`${month}_${catName}`] || 0;
            }
            
            // Subcategory budgets
            if (catData.subcategories){
                catData.subcategories.forEach(sub => {
                    const subKey = `${catName}__${sub.name}`;
                    if (sub.showInForecast) {
                        if (monthData[subKey]) {
                            monthData[subKey].budget = budgetData[`${month}_${catName}_${sub.name}`] || 0;
                        }
                    } else {
                        if (monthData[catName]?.breakdown?.[sub.name]) {
                            monthData[catName].breakdown[sub.name].budget = budgetData[`${month}_${catName}_${sub.name}`] || 0;
                        }
                    }
                });
            }
        });

        let totaleRicavi = { budget: 0, actual: 0, breakdown: {} as Record<string, { budget: number, actual: number }> };
        let totaleCostiProduzione = { budget: 0, actual: 0, breakdown: {} as Record<string, { budget: number, actual: number }> };
        let totaleCostiProduttivi = { budget: 0, actual: 0, breakdown: {} as Record<string, { budget: number, actual: number }> };

        Object.entries(monthData).forEach(([key, values]) => {
            const [catName] = key.split('__');
            const categoryInfo = allCategories[catName];

            if (categoryInfo) {
                const isIncome = catName in incomeCategories;
                const forecastType = expenseCategories[catName]?.forecastType;
                
                if (isIncome) {
                    totaleRicavi.budget += values.budget;
                    totaleRicavi.actual += values.actual;
                    totaleRicavi.breakdown[key] = { budget: values.budget, actual: values.actual };
                } else { // Is expense
                    if (forecastType === 'Costi di Produzione') {
                        totaleCostiProduzione.budget += values.budget;
                        totaleCostiProduzione.actual += values.actual;
                        totaleCostiProduzione.breakdown[key] = { budget: values.budget, actual: values.actual };
                    } else { // 'Costi Produttivi' or undefined
                        totaleCostiProduttivi.budget += values.budget;
                        totaleCostiProduttivi.actual += values.actual;
                        totaleCostiProduttivi.breakdown[key] = { budget: values.budget, actual: values.actual };
                    }
                }
            }
        });
        
        monthData['totale_ricavi'] = { budget: totaleRicavi.budget, actual: totaleRicavi.actual, scostamento: 0, percScostamento: 0, breakdown: totaleRicavi.breakdown };
        monthData['totale_costi_di_produzione'] = { budget: totaleCostiProduzione.budget, actual: totaleCostiProduzione.actual, scostamento: 0, percScostamento: 0, breakdown: totaleCostiProduzione.breakdown };
        monthData['totale_costi_produttivi'] = { budget: totaleCostiProduttivi.budget, actual: totaleCostiProduttivi.actual, scostamento: 0, percScostamento: 0, breakdown: totaleCostiProduttivi.breakdown };
        monthData['margine_di_contribuzione'] = { budget: totaleRicavi.budget - totaleCostiProduzione.budget, actual: totaleRicavi.actual - totaleCostiProduzione.actual, scostamento: 0, percScostamento: 0, breakdown: {} };
        monthData['totale_costi'] = { budget: totaleCostiProduzione.budget + totaleCostiProduttivi.budget, actual: totaleCostiProduzione.actual + totaleCostiProduttivi.actual, scostamento: 0, percScostamento: 0, breakdown: {} };
        monthData['ebitda'] = { budget: (totaleRicavi.budget - totaleCostiProduzione.budget) - totaleCostiProduttivi.budget, actual: (totaleRicavi.actual - totaleCostiProduzione.actual) - totaleCostiProduttivi.actual, scostamento: 0, percScostamento: 0, breakdown: {} };

        Object.values(monthData).forEach(values => {
           values.scostamento = values.actual - values.budget;
           values.percScostamento = values.budget !== 0 ? (values.scostamento / Math.abs(values.budget)) * 100 : (values.actual > 0 ? 100 : 0);
        });
    }

    return monthlyResults;
  }, [transactions, budgetData, isLoading, loadingCategories, selectedYear, incomeCategories, expenseCategories]);

  const annualTotals = useMemo(() => {
    const totals: Record<string, CalculatedValues> = {};
    if (calculatedMonthlyData.length === 0) return totals;

    const allMainCategories = { ...incomeCategories, ...expenseCategories };
    const keysToInitialize = new Set<string>();

     Object.entries(allMainCategories).forEach(([catName, catData]) => {
        if (!catData) return;
        
        if (catData.subcategories && catData.subcategories.length > 0) {
            let hasPromotedSub = false;
            catData.subcategories.forEach(sub => {
                if (sub.showInForecast) {
                    keysToInitialize.add(`${catName}__${sub.name}`);
                    hasPromotedSub = true;
                }
            });
            // Add the main category itself if it has un-promoted subs
            if (catData.subcategories.some(s => !s.showInForecast)) {
                keysToInitialize.add(catName);
            }
        } else {
            // Add main category if it has no subcategories at all
            keysToInitialize.add(catName);
        }
    });

    ['totale_ricavi', 'totale_costi_di_produzione', 'totale_costi_produttivi', 'margine_di_contribuzione', 'totale_costi', 'ebitda'].forEach(k => keysToInitialize.add(k));

    keysToInitialize.forEach(key => {
        totals[key] = { budget: 0, actual: 0, scostamento: 0, percScostamento: 0, breakdown: {} };
    });
    
    calculatedMonthlyData.forEach(monthData => {
        for(const key in monthData) {
            if(totals[key]) {
                totals[key].budget += monthData[key].budget;
                totals[key].actual += monthData[key].actual;

                if (monthData[key].breakdown) {
                    for(const breakKey in monthData[key].breakdown) {
                        if (!totals[key].breakdown![breakKey]) {
                            totals[key].breakdown![breakKey] = { budget: 0, actual: 0 };
                        }
                        totals[key].breakdown![breakKey].budget += monthData[key].breakdown![breakKey].budget || 0;
                        totals[key].breakdown![breakKey].actual += monthData[key].breakdown![breakKey].actual || 0;
                    }
                }
            }
        }
    });

    for(const key in totals) {
        if(totals[key]){
            totals[key].scostamento = totals[key].actual - totals[key].budget;
            totals[key].percScostamento = totals[key].budget !== 0 ? (totals[key].scostamento / Math.abs(totals[key].budget)) * 100 : (totals[key].actual > 0 ? 100 : 0);
        }
    }
    
    return totals;
  }, [calculatedMonthlyData, incomeCategories, expenseCategories]);

  const handleExportToCSV = () => {
    // ... CSV export logic, can be adapted later if needed
  };

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const renderBreakdownRows = (breakdown: Record<string, { budget: number, actual: number }> | undefined, isPositiveGood: boolean, isSubcategory: boolean) => {
      if (!breakdown || Object.keys(breakdown).length === 0) return null;
      return Object.entries(breakdown).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, values]) => {
          const scostamento = values.actual - values.budget;
          const percScostamento = values.budget !== 0 ? (scostamento / Math.abs(values.budget)) * 100 : (values.actual > 0 ? 100 : 0);
          const scostamentoClass = scostamento === 0 ? '' : (isPositiveGood ? (scostamento > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : (scostamento > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'));
          
          return (
              <TableRow key={`break-${key}`} className="bg-muted/30 hover:bg-muted/50">
                  <TableCell className={cn("font-light", isSubcategory ? "pl-12 italic" : "pl-8")}>{key}</TableCell>
                  <TableCell>{isClient ? renderValue(values.budget) : '€0.00'}</TableCell>
                  <TableCell>{isClient ? renderValue(values.actual) : '€0.00'}</TableCell>
                  <TableCell className={scostamentoClass}>{isClient ? renderValue(scostamento) : ""}</TableCell>
                  <TableCell className={scostamentoClass}>{isClient ? renderPercentage(percScostamento) : ""}</TableCell>
              </TableRow>
          );
      });
  };

  const renderTableRows = (data: MonthlyData | Record<string, CalculatedValues>, monthIndex: number | 'annual') => {
      const isAnnual = monthIndex === 'annual';

      const allCategories = { ...incomeCategories, ...expenseCategories };
      
      const renderRow = (key: string, label: string, values: CalculatedValues | undefined, rowClass: string, isPositiveGood: boolean) => {
          if (!values) return null;

          const [catName, subName] = key.split('__');
          const isPromotedSub = !!subName;
          const mainCategoryData = allCategories[catName];
          const hasBreakdown = !isPromotedSub && mainCategoryData && mainCategoryData.subcategories && mainCategoryData.subcategories.some(s => !s.showInForecast);
          const isExpandable = hasBreakdown || ['totale_ricavi', 'totale_costi_di_produzione', 'totale_costi_produttivi'].includes(key);

          const isExpanded = expandedRows.has(key);
          const scostamentoClass = values.scostamento === 0 ? '' : (isPositiveGood ? (values.scostamento > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : (scostamento > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'));
          
          const canEditBudget = !isAnnual;

          return (
            <React.Fragment key={key}>
              <TableRow className={cn(rowClass, isExpandable && "cursor-pointer")} onClick={isExpandable ? () => toggleRow(key) : undefined}>
                  <TableCell className={cn("font-medium flex items-center", isPromotedSub && "pl-8 italic")}>
                    {isExpandable && (isExpanded ? <ChevronDown className="h-4 w-4 mr-2"/> : <ChevronRight className="h-4 w-4 mr-2"/>)}
                    {label}
                  </TableCell>
                  <TableCell>
                      {canEditBudget && !isPromotedSub ? (
                        <Input type="number" step="0.01"
                            defaultValue={values.budget.toFixed(2)}
                            onChange={(e) => handleBudgetChange(monthIndex as number, catName, null, e.target.value)}
                            className="h-8"
                            onClick={(e) => e.stopPropagation()}
                            />
                      ) : (canEditBudget && isPromotedSub) ? (
                         <Input type="number" step="0.01"
                            defaultValue={values.budget.toFixed(2)}
                            onChange={(e) => handleBudgetChange(monthIndex as number, catName, subName, e.target.value)}
                            className="h-8"
                            onClick={(e) => e.stopPropagation()}
                            />
                      ) : (isClient ? renderValue(values.budget) : '€0.00')}
                  </TableCell>
                  <TableCell>{isClient ? renderValue(values.actual) : '€0.00'}</TableCell>
                  <TableCell className={scostamentoClass}>{isClient ? renderValue(values.scostamento) : '€0.00'}</TableCell>
                  <TableCell className={scostamentoClass}>{isClient ? renderPercentage(values.percScostamento) : '0.00%'}</TableCell>
              </TableRow>
              {isExpanded && values.breakdown && (isPromotedSub
                ? null // Promoted subs don't have breakdown
                : renderBreakdownRows(values.breakdown, isPositiveGood, key.includes('totale_') ? false : true)
              )}
            </React.Fragment>
          );
      };
      
      const rowsToRender: {type: 'header' | 'row', key?: string, label?: string, values?: any, rowClass?: string, isPositiveGood?: boolean}[] = [];

      rowsToRender.push({ type: 'header', label: 'RICAVI' });
      Object.entries(incomeCategories).forEach(([catName, catData]) => {
          if (!catData) return;
          if (!catData.subcategories || catData.subcategories.some(s => !s.showInForecast) || catData.subcategories.length === 0) {
              rowsToRender.push({ type: 'row', key: catName, label: catName, values: data[catName], rowClass: '', isPositiveGood: true });
          }
          if (catData.subcategories) {
            catData.subcategories.forEach(sub => {
                if (sub.showInForecast) {
                    const key = `${catName}__${sub.name}`;
                    rowsToRender.push({ type: 'row', key, label: sub.name, values: data[key], rowClass: '', isPositiveGood: true });
                }
            });
          }
      });
      rowsToRender.push({ type: 'row', key: 'totale_ricavi', label: 'TOTALE RICAVI', values: data['totale_ricavi'], rowClass: 'bg-muted/50 font-bold', isPositiveGood: true });

      rowsToRender.push({ type: 'header', label: 'COSTI DI PRODUZIONE' });
      Object.entries(expenseCategories).filter(([,val]) => val?.forecastType === 'Costi di Produzione').forEach(([catName, catData]) => {
           if (!catData) return;
           if (!catData.subcategories || catData.subcategories.some(s => !s.showInForecast) || catData.subcategories.length === 0) {
              rowsToRender.push({ type: 'row', key: catName, label: catName, values: data[catName], rowClass: '', isPositiveGood: false });
           }
           if (catData.subcategories) {
                catData.subcategories.forEach(sub => {
                    if (sub.showInForecast) {
                        const key = `${catName}__${sub.name}`;
                        rowsToRender.push({ type: 'row', key, label: sub.name, values: data[key], rowClass: '', isPositiveGood: false });
                    }
                });
           }
      });
      rowsToRender.push({ type: 'row', key: 'totale_costi_di_produzione', label: 'TOTALE COSTI DI PRODUZIONE', values: data['totale_costi_di_produzione'], rowClass: 'bg-muted/50 font-bold', isPositiveGood: false });
      
      rowsToRender.push({ type: 'row', key: 'margine_di_contribuzione', label: 'MARGINE DI CONTRIBUZIONE', values: data['margine_di_contribuzione'], rowClass: 'bg-green-100 dark:bg-green-900/50 font-bold', isPositiveGood: true });
      
      rowsToRender.push({ type: 'header', label: 'COSTI PRODUTTIVI' });
      Object.entries(expenseCategories).filter(([,val]) => val?.forecastType !== 'Costi di Produzione').forEach(([catName, catData]) => {
           if (!catData) return;
           if (!catData.subcategories || catData.subcategories.some(s => !s.showInForecast) || catData.subcategories.length === 0) {
              rowsToRender.push({ type: 'row', key: catName, label: catName, values: data[catName], rowClass: '', isPositiveGood: false });
           }
           if (catData.subcategories) {
                catData.subcategories.forEach(sub => {
                    if (sub.showInForecast) {
                        const key = `${catName}__${sub.name}`;
                        rowsToRender.push({ type: 'row', key, label: sub.name, values: data[key], rowClass: '', isPositiveGood: false });
                    }
                });
           }
      });
      rowsToRender.push({ type: 'row', key: 'totale_costi_produttivi', label: 'TOTALE COSTI PRODUTTIVI', values: data['totale_costi_produttivi'], rowClass: 'bg-muted/50 font-bold', isPositiveGood: false });
      
      rowsToRender.push({ type: 'row', key: 'totale_costi', label: 'TOTALE COSTI', values: data['totale_costi'], rowClass: 'bg-yellow-100 dark:bg-yellow-900/50 font-bold', isPositiveGood: false });
      rowsToRender.push({ type: 'row', key: 'ebitda', label: 'EBITDA', values: data['ebitda'], rowClass: 'bg-green-200 dark:bg-green-800/60 font-extrabold text-lg', isPositiveGood: true });


      return (
          <>
            {rowsToRender.map((row, index) => {
                if (row.type === 'header') {
                    return <TableRow key={`header-${index}`} className="bg-background font-semibold text-foreground hover:bg-background"><TableCell colSpan={5}>{row.label}</TableCell></TableRow>;
                }
                return renderRow(row.key!, row.label!, row.values, row.rowClass!, row.isPositiveGood!);
            })}
          </>
      );
  };
  
  if (isLoading || loadingCategories) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Caricamento dati bilancio previsionale per il {selectedYear}...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Previsioni Bilancio"
        description={`Bilancio previsionale per l'anno ${selectedYear}, confrontando dati a budget con i dati reali.`}
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleziona Anno" />
              </SelectTrigger>
              <SelectContent>
                {generateYears().map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Esporta
            </Button>
          </div>
        }
      />

      {error && (
        <Card className="mb-6 bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle /> Errore</CardTitle>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="0">
            <TabsList className="p-2 h-auto flex-wrap justify-start">
              {Array.from({ length: 12 }, (_, i) => (
                <TabsTrigger key={i} value={i.toString()}>{format(new Date(0, i), "MMM", { locale: it })}</TabsTrigger>
              ))}
              <TabsTrigger value="12" className="font-bold">TOTALI</TabsTrigger>
            </TabsList>
            
            {calculatedMonthlyData.map((monthData, i) => (
              <TabsContent key={i} value={i.toString()} className="p-4">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-[300px]">Voce</TableHead>
                              <TableHead>Budget</TableHead>
                              <TableHead>Actual</TableHead>
                              <TableHead>Scostamento</TableHead>
                              <TableHead>% Scostamento</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {renderTableRows(monthData, i)}
                      </TableBody>
                  </Table>
              </TabsContent>
            ))}
            <TabsContent value="12" className="p-4">
               <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[300px]">Voce</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Actual</TableHead>
                          <TableHead>Scostamento</TableHead>
                          <TableHead>% Scostamento</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {renderTableRows(annualTotals, 'annual')}
                  </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}

    