
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit2, Target, CheckCircle, TrendingUp, Trash2, Loader2 } from "lucide-react";
import BudgetObjectiveModal, { type BudgetObjectiveFormData, type BudgetFormData as ModalBudgetFormData } from '@/components/budget-objective-modal';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { allExpenseCategories } from '@/config/transaction-categories';
import { type Transaction } from '@/data/transactions-data';
import { getMonth, getYear, parseISO, isValid, format } from 'date-fns';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

interface DefinedBudget {
  id: string;
  category: string;
  budgeted: number;
  period: string;
}

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

const getObjectiveIcon = (iconName?: ObjectiveListItem['iconName']) => {
  switch (iconName) {
    case 'TrendingUp': return <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400"/>;
    case 'Target': return <Target className="h-5 w-5 text-blue-500 dark:text-blue-400"/>;
    case 'CheckCircle': return <CheckCircle className="h-5 w-5 text-primary"/>;
    default: return <Target className="h-5 w-5 text-gray-500 dark:text-gray-400"/>;
  }
};

export default function BudgetObjectivesPage() {
  const [definedBudgets, setDefinedBudgets] = useState<DefinedBudget[]>([]);
  const [objectives, setObjectives] = useState<ObjectiveListItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetListItem | ObjectiveListItem | null>(null);
  const [modalType, setModalType] = useState<'budget' | 'objective' | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchFirestoreTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const transactionsCollectionRef = collection(db, "transactions");
      const q = query(transactionsCollectionRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedTransactions: Transaction[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedTransactions.push({
          id: docSnap.id,
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
      console.error("!!! Errore caricamento TRANSAZIONI da Firestore (Budget Page):", error);
      let rawErrorDetails = "Dettaglio grezzo non disponibile.";
      if (error) {
        rawErrorDetails = String(error);
        if (error.message) rawErrorDetails += ` | Msg: ${error.message}`;
        if (error.code) rawErrorDetails += ` | Code: ${error.code}`;
      }
      console.log("RAW ERROR OBJECT (transactions on budget page):", error);
      try {
        console.log("ERROR JSON.stringify (transactions on budget page):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e_stringify) {
        console.error("Could not stringify error object (transactions on budget page):", e_stringify);
      }
      toast({
        title: "Errore Caricamento Transazioni (Budget Page)",
        description: `Impossibile caricare le transazioni per il calcolo dei budget. ${rawErrorDetails}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [toast]);

  const fetchDefinedBudgets = useCallback(async () => {
    setIsLoadingBudgets(true);
    try {
      const budgetsCollectionRef = collection(db, "budgets");
      const q = query(budgetsCollectionRef, orderBy("category", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedBudgets: DefinedBudget[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedBudgets.push({ id: docSnap.id, ...docSnap.data() } as DefinedBudget);
      });
      setDefinedBudgets(fetchedBudgets);
    } catch (error: any) {
      console.error("!!! Errore caricamento BUDGET da Firestore:", error);
      let rawErrorDetails = "Dettaglio grezzo non disponibile.";
      if (error) {
        rawErrorDetails = String(error);
        if (error.message) rawErrorDetails += ` | Msg: ${error.message}`;
        if (error.code) rawErrorDetails += ` | Code: ${error.code}`;
      }
      console.log("RAW ERROR OBJECT (budgets):", error);
      try {
        console.log("ERROR JSON.stringify (budgets):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e_stringify) {
        console.error("Could not stringify error object (budgets):", e_stringify);
      }
      toast({ title: "Errore Caricamento Budget", description: `Impossibile caricare i budget definiti. ${rawErrorDetails}`, variant: "destructive" });
    } finally {
      setIsLoadingBudgets(false);
    }
  }, [toast]);

  const fetchObjectives = useCallback(async () => {
    setIsLoadingObjectives(true);
    try {
      const objectivesCollectionRef = collection(db, "objectives");
      const q = query(objectivesCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedObjectives: ObjectiveListItem[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedObjectives.push({ id: docSnap.id, ...docSnap.data() } as ObjectiveListItem);
      });
      setObjectives(fetchedObjectives);
    } catch (error: any) {
      console.error("!!! Errore caricamento OBIETTIVI da Firestore:", error);
       let rawErrorDetails = "Dettaglio grezzo non disponibile.";
      if (error) {
        rawErrorDetails = String(error);
        if (error.message) rawErrorDetails += ` | Msg: ${error.message}`;
        if (error.code) rawErrorDetails += ` | Code: ${error.code}`;
      }
      console.log("RAW ERROR OBJECT (objectives):", error);
      try {
        console.log("ERROR JSON.stringify (objectives):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e_stringify) {
        console.error("Could not stringify error object (objectives):", e_stringify);
      }
      toast({ title: "Errore Caricamento Obiettivi", description: `Impossibile caricare gli obiettivi. ${rawErrorDetails}`, variant: "destructive" });
    } finally {
      setIsLoadingObjectives(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFirestoreTransactions();
    fetchDefinedBudgets();
    fetchObjectives();
  }, [fetchFirestoreTransactions, fetchDefinedBudgets, fetchObjectives]);

  const displayedBudgets: BudgetListItem[] = useMemo(() => {
    if (isLoadingTransactions || isLoadingBudgets) return [];
    const today = new Date();
    const currentMonth = getMonth(today);
    const currentYear = getYear(today);

    return definedBudgets.map(budget => {
      let actualSpent = 0;
      if (budget.period === "Mensile") {
        const relevantTransactions = transactions.filter(t => {
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
  }, [definedBudgets, transactions, isLoadingTransactions, isLoadingBudgets]);

  const handleOpenModal = (type: 'budget' | 'objective', item: BudgetListItem | ObjectiveListItem | null = null) => {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = async (data: BudgetObjectiveFormData) => {
    if (modalType === 'budget' && data.type === 'budget') {
      const budgetDataFromForm = data as ModalBudgetFormData;
      const budgetToSave = {
        category: budgetDataFromForm.category,
        budgeted: budgetDataFromForm.budgeted,
        period: budgetDataFromForm.period,
      };
      try {
        if (editingItem && editingItem.id && 'category' in editingItem) {
          const budgetRef = doc(db, "budgets", editingItem.id);
          await updateDoc(budgetRef, budgetToSave);
          toast({ title: "Budget Aggiornato", description: `Budget per ${budgetDataFromForm.category} modificato.` });
        } else {
          await addDoc(collection(db, "budgets"), budgetToSave);
          toast({ title: "Nuovo Budget Aggiunto", description: `Budget per ${budgetDataFromForm.category} creato.` });
        }
        fetchDefinedBudgets(); // Refresh budget list
      } catch (error) {
        console.error("Errore salvataggio budget:", error);
        toast({ title: "Errore Salvataggio", description: "Impossibile salvare il budget.", variant: "destructive"});
      }
    } else if (modalType === 'objective' && data.type === 'objective') {
      const objectiveToSave = {
        name: data.name,
        target: data.target,
        current: data.current,
        unit: data.unit,
        status: data.current >= data.target ? "Completato" : "In Corso",
        iconName: data.current >= data.target ? 'CheckCircle' : (editingItem as ObjectiveListItem)?.iconName || 'Target' as ObjectiveListItem['iconName'],
      };
      try {
        if (editingItem && editingItem.id && 'name' in editingItem) {
          const objectiveRef = doc(db, "objectives", editingItem.id);
          await updateDoc(objectiveRef, objectiveToSave);
          toast({ title: "Obiettivo Aggiornato", description: `Obiettivo "${data.name}" modificato.` });
        } else {
          await addDoc(collection(db, "objectives"), objectiveToSave);
          toast({ title: "Nuovo Obiettivo Aggiunto", description: `Obiettivo "${data.name}" creato.` });
        }
        fetchObjectives(); // Refresh objectives list
      } catch (error) {
        console.error("Errore salvataggio obiettivo:", error);
        toast({ title: "Errore Salvataggio", description: "Impossibile salvare l'obiettivo.", variant: "destructive"});
      }
    }
    setIsModalOpen(false);
    setEditingItem(null);
    setModalType(null);
  };

  const handleDeleteBudget = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo budget?")) {
      try {
        await deleteDoc(doc(db, "budgets", id));
        toast({ title: "Budget Eliminato" });
        fetchDefinedBudgets(); // Refresh budget list
      } catch (error) {
        console.error("Errore eliminazione budget:", error);
        toast({ title: "Errore Eliminazione", description: "Impossibile eliminare il budget.", variant: "destructive"});
      }
    }
  };

  const handleDeleteObjective = async (id: string) => {
     if (window.confirm("Sei sicuro di voler eliminare questo obiettivo?")) {
      try {
        await deleteDoc(doc(db, "objectives", id));
        toast({ title: "Obiettivo Eliminato" });
        fetchObjectives(); // Refresh objectives list
      } catch (error) {
        console.error("Errore eliminazione obiettivo:", error);
        toast({ title: "Errore Eliminazione", description: "Impossibile eliminare l'obiettivo.", variant: "destructive"});
      }
    }
  };

  const isLoading = isLoadingBudgets || isLoadingObjectives || isLoadingTransactions;

  if (isLoading && isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Caricamento dati budget e obiettivi...</p>
      </div>
    );
  }

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
          key={modalType}
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
            <CardDescription>Visualizza lo stato dei budget impostati (dati da Firestore).</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBudgets && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /> Caricamento budget...</div>}
            {!isLoadingBudgets && displayedBudgets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nessun budget impostato in Firestore.</TableCell>
              </TableRow>
            )}
            {!isLoadingBudgets && displayedBudgets.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Speso (Mese Corr.)</TableHead>
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
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Obiettivi Finanziari</CardTitle>
            <CardDescription>Traccia il progresso verso gli obiettivi chiave (dati da Firestore).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingObjectives && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /> Caricamento obiettivi...</div>}
            {!isLoadingObjectives && objectives.length === 0 && (
                <p className="text-center text-muted-foreground py-10">Nessun obiettivo finanziario impostato in Firestore.</p>
            )}
            {!isLoadingObjectives && objectives.map((obj) => (
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}
