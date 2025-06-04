
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit2, Target, CheckCircle, TrendingUp, Trash2 } from "lucide-react";
import BudgetObjectiveModal, { type BudgetObjectiveFormData, type BudgetFormData as ModalBudgetFormData } from '@/components/budget-objective-modal';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { allExpenseCategories } from '@/config/transaction-categories';
import { initialTransactions, type Transaction } from '@/data/transactions-data';
import { getMonth, getYear, parseISO, isValid } from 'date-fns';

// Interface for budget items stored in state (user-defined parts)
interface DefinedBudget {
  id: string;
  category: string;
  budgeted: number;
  period: string;
}

// Interface for budget items displayed in the table (includes calculated 'actual')
export interface BudgetListItem extends DefinedBudget {
  actual: number;
}

export interface ObjectiveListItem {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
  status: string; 
  iconName?: 'TrendingUp' | 'Target' | 'CheckCircle';
}

const initialDefinedBudgets: DefinedBudget[] = [
  { id: "1", category: "Materiali", budgeted: 5000, period: "Mensile" },
  { id: "2", category: "Personale", budgeted: 15000, period: "Mensile" },
  { id: "3", category: "Altre spese", budgeted: 2000, period: "Mensile" },
];

export const initialObjectives: ObjectiveListItem[] = [
  { id: "obj1", name: "Aumentare Entrate del 15%", target: 15, current: 10, unit: "%", status: "In Corso", iconName: 'TrendingUp' },
  { id: "obj2", name: "Ridurre Sprechi Materiali del 5%", target: 5, current: 2, unit: "%", status: "In Corso", iconName: 'Target' },
  { id: "obj3", name: "Acquisire 50 Nuovi Pazienti", target: 50, current: 50, unit: "pazienti", status: "Completato", iconName: 'CheckCircle' },
];

const getObjectiveIcon = (iconName?: ObjectiveListItem['iconName']) => {
  switch (iconName) {
    case 'TrendingUp': return <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400"/>;
    case 'Target': return <Target className="h-5 w-5 text-blue-500 dark:text-blue-400"/>;
    case 'CheckCircle': return <CheckCircle className="h-5 w-5 text-primary"/>;
    default: return <Target className="h-5 w-5 text-gray-500 dark:text-gray-400"/>;
  }
};

export default function BudgetObjectivesPage() {
  const [definedBudgets, setDefinedBudgets] = useState<DefinedBudget[]>(initialDefinedBudgets);
  const [objectives, setObjectives] = useState<ObjectiveListItem[]>(initialObjectives);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetListItem | ObjectiveListItem | null>(null);
  const [modalType, setModalType] = useState<'budget' | 'objective' | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const displayedBudgets: BudgetListItem[] = useMemo(() => {
    const today = new Date();
    const currentMonth = getMonth(today);
    const currentYear = getYear(today);

    return definedBudgets.map(budget => {
      let actualSpent = 0;
      if (budget.period === "Mensile") {
        const relevantTransactions = initialTransactions.filter(t => {
          const transactionDate = parseISO(t.date);
          return (
            isValid(transactionDate) &&
            t.type === 'Uscita' &&
            t.category === budget.category &&
            getMonth(transactionDate) === currentMonth &&
            getYear(transactionDate) === currentYear
          );
        });
        actualSpent = relevantTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      }
      // TODO: Implement logic for other periods (Bimestrale, Trimestrale, etc.) if needed
      return { ...budget, actual: actualSpent };
    });
  }, [definedBudgets, initialTransactions]); 

  const handleOpenModal = (type: 'budget' | 'objective', item: BudgetListItem | ObjectiveListItem | null = null) => {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = (data: BudgetObjectiveFormData) => {
    if (modalType === 'budget' && data.type === 'budget') {
      const budgetDataFromForm = data as ModalBudgetFormData; 
      if (editingItem && editingItem.id && 'category' in editingItem) { 
        setDefinedBudgets(prev => prev.map(b => b.id === editingItem.id ? { 
            id: editingItem.id, 
            category: budgetDataFromForm.category, 
            budgeted: budgetDataFromForm.budgeted, 
            period: budgetDataFromForm.period 
        } : b));
        toast({ title: "Budget Aggiornato", description: `Budget per ${budgetDataFromForm.category} modificato.` });
      } else { 
        setDefinedBudgets(prev => [...prev, { 
            id: crypto.randomUUID(), 
            category: budgetDataFromForm.category, 
            budgeted: budgetDataFromForm.budgeted, 
            period: budgetDataFromForm.period 
        }]);
        toast({ title: "Nuovo Budget Aggiunto", description: `Budget per ${budgetDataFromForm.category} creato.` });
      }
    } else if (modalType === 'objective' && data.type === 'objective') {
      const newObjectiveData = {
        id: editingItem?.id || crypto.randomUUID(),
        name: data.name,
        target: data.target,
        current: data.current,
        unit: data.unit,
        status: data.current >= data.target ? "Completato" : "In Corso",
        iconName: data.current >= data.target ? 'CheckCircle' : (editingItem as ObjectiveListItem)?.iconName || 'Target' as ObjectiveListItem['iconName'],
      };
      if (editingItem && editingItem.id) { 
        setObjectives(prev => prev.map(o => o.id === editingItem.id ? newObjectiveData : o));
        toast({ title: "Obiettivo Aggiornato", description: `Obiettivo "${data.name}" modificato.` });
      } else { 
        setObjectives(prev => [...prev, newObjectiveData]);
        toast({ title: "Nuovo Obiettivo Aggiunto", description: `Obiettivo "${data.name}" creato.` });
      }
    }
    setIsModalOpen(false);
    setEditingItem(null);
    setModalType(null);
  };

  const handleDeleteBudget = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo budget?")) {
      setDefinedBudgets(prev => prev.filter(b => b.id !== id));
      toast({ title: "Budget Eliminato" });
    }
  };

  const handleDeleteObjective = (id: string) => {
     if (window.confirm("Sei sicuro di voler eliminare questo obiettivo?")) {
      setObjectives(prev => prev.filter(o => o.id !== id));
      toast({ title: "Obiettivo Eliminato" });
    }
  };

  return (
    <>
      <PageHeader
        title="Budget & Obiettivi"
        description="Imposta e monitora i budget di spesa e gli obiettivi finanziari dello studio."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuovo Budget/Obiettivo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => handleOpenModal('budget')}>
                Aggiungi Nuovo Budget
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenModal('objective')}>
                Aggiungi Nuovo Obiettivo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {isModalOpen && modalType && (
        <BudgetObjectiveModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          modalType={modalType}
          editingItem={editingItem} 
          onSave={handleSaveItem}
          allExpenseCategories={allExpenseCategories}
        />
      )}

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
                {displayedBudgets.map((item) => {
                  const progress = item.budgeted > 0 ? Math.min((item.actual / item.budgeted) * 100, 100) : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell>€{isClient ? item.budgeted.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.budgeted.toFixed(2)}</TableCell>
                      <TableCell>€{isClient ? item.actual.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.actual.toFixed(2)}</TableCell>
                      <TableCell className="w-[150px]">
                        <Progress value={progress} aria-label={`${progress.toFixed(0)}% speso`} className={progress > 85 ? "[&>div]:bg-destructive" : ""} />
                        <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.period}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal('budget', item)}>
                          <Edit2 className="h-4 w-4" />
                           <span className="sr-only">Modifica Budget</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBudget(item.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                           <span className="sr-only">Elimina Budget</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                 {displayedBudgets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nessun budget impostato.</TableCell>
                  </TableRow>
                )}
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
                     {getObjectiveIcon(obj.iconName)}
                    <h3 className="text-md font-semibold">{obj.name}</h3>
                  </div>
                  <Badge variant={obj.status === "Completato" ? "default" : "secondary"} className={obj.status === "Completato" ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-800/50 dark:text-green-300 dark:border-green-700" : ""}>
                    {obj.status}
                  </Badge>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span>{isClient ? obj.current.toLocaleString('it-IT') : obj.current}{obj.unit} / {isClient ? obj.target.toLocaleString('it-IT') : obj.target}{obj.unit}</span>
                  </div>
                  <Progress value={obj.target > 0 ? (obj.current / obj.target) * 100 : 0} aria-label={`Progresso obiettivo ${obj.name}`} className={obj.status === "Completato" ? "[&>div]:bg-green-500 dark:[&>div]:bg-green-400" : ""} />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal('objective', obj)}>
                        <Edit2 className="mr-1 h-3 w-3" />
                        Modifica
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteObjective(obj.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="mr-1 h-3 w-3" />
                        Elimina
                    </Button>
                </div>
              </div>
            ))}
            {objectives.length === 0 && (
                <p className="text-center text-muted-foreground py-10">Nessun obiettivo finanziario impostato.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

