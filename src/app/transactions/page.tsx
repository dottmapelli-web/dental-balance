
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO, isValid, getMonth, getYear, startOfToday, addMonths, set, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { type RecurrenceFrequency, type TransactionStatus, transactionStatuses, recurrenceFrequencies } from "@/config/transaction-categories";
import { CalendarPlus, CalendarMinus, Edit3, Trash2, Search, Repeat, ChevronsUpDown, Filter, Copy, Edit, Loader2, Camera } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TransactionModal, { type TransactionFormData } from '@/components/transaction-modal';
import BulkStatusUpdateDialog from '../../components/bulk-status-update-dialog';
import InvoiceScannerModal from '@/components/invoice-scanner-modal';
import { useToast } from '@/hooks/use-toast';
import { type Transaction } from '@/data/transactions-data';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';


const generateYears = () => {
  const currentYr = getYear(new Date());
  return Array.from({ length: 5 }, (_, i) => (currentYr - i).toString());
};
const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), "MMMM", { locale: it }) }));
const statusOptions = ["all", ...transactionStatuses] as const;


const columnOrder: Array<keyof Transaction | 'actions'> = ['date', 'type', 'category', 'subcategory', 'amount', 'description', 'status', 'actions'];
const columnDisplayNames: Record<keyof Transaction | 'actions', string> = {
  date: 'Data',
  type: 'Tipo',
  category: 'Categoria',
  subcategory: 'Sottocategoria',
  amount: 'Importo',
  description: 'Descrizione',
  status: 'Stato',
  id: 'ID',
  isRecurring: 'Ricorrente',
  recurrenceDetails: 'Dettagli Ricorrenza',
  originalRecurringId: 'ID Ricorrenza Originale',
  actions: 'Azioni',
};


export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionTypeForModal, setTransactionTypeForModal] = useState<'Entrata' | 'Uscita'>('Uscita');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  // Default to previous month if current month has no data yet (avoids "no results" on open)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    getMonth(new Date()) > 0 ? (getMonth(new Date()) - 1).toString() : "0"
  );
  const [selectedStatus, setSelectedStatus] = useState<typeof statusOptions[number]>("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
  const { toast } = useToast();
  const { transactionsVersion, incrementTransactionsVersion } = useAuth();

  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setLoadingError(null);
    console.log("fetchTransactions: Attempting to fetch transactions from Firestore...");
    try {
      const transactionsCollectionRef = collection(db, "transactions");
      const q = query(transactionsCollectionRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedTransactions: Transaction[] = [];
      console.log(`fetchTransactions: querySnapshot received, size: ${querySnapshot.size}`);
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
          status: data.status as TransactionStatus,
          isRecurring: data.isRecurring || false,
          recurrenceDetails: data.recurrenceDetails ? {
            ...data.recurrenceDetails,
            startDate: data.recurrenceDetails.startDate instanceof Timestamp ? format(data.recurrenceDetails.startDate.toDate(), "yyyy-MM-dd") : data.recurrenceDetails.startDate,
            endDate: data.recurrenceDetails.endDate && data.recurrenceDetails.endDate instanceof Timestamp ? format(data.recurrenceDetails.endDate.toDate(), "yyyy-MM-dd") : undefined,
          } : undefined,
          originalRecurringId: data.originalRecurringId,
        });
      });
      setTransactions(fetchedTransactions);
      console.log("fetchTransactions: Successfully fetched and set transactions. Count:", fetchedTransactions.length);
    } catch (error: any) {
      console.error("!!! ERROR fetching transactions in fetchTransactions:", error);
      console.error("fetchTransactions - Error object (raw):", error);
      let detailedDescription = "Impossibile caricare le transazioni da Firestore.";
      if (error.message) detailedDescription += ` Dettaglio: ${error.message}`;
      if (error.code) detailedDescription += ` (Codice: ${error.code})`;
      setLoadingError(detailedDescription);
      toast({
        title: "Errore nel Caricamento Transazioni",
        description: detailedDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("fetchTransactions: setIsLoading(false)");
    }
  }, [toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, transactionsVersion]);


  const handleSort = (key: keyof Transaction) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      if (!isValid(transactionDate)) return false;
      const matchesYear = getYear(transactionDate).toString() === selectedYear;
      const matchesMonth = getMonth(transactionDate).toString() === selectedMonth;
      const matchesStatus = selectedStatus === "all" || t.status === selectedStatus;
      const matchesSearch = (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.subcategory && t.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesYear && matchesMonth && matchesSearch && matchesStatus;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        if (valA === undefined || valB === undefined) return 0;

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (sortConfig.key === 'date') {
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);
            if (isValid(dateA) && isValid(dateB)) {
              comparison = dateA.getTime() - dateB.getTime();
            } else {
              comparison = 0;
            }
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return filtered;
  }, [transactions, searchTerm, selectedYear, selectedMonth, selectedStatus, sortConfig]);

  const recurringTransactionsDefinitions = useMemo(() => {
    return transactions.filter(t => t.isRecurring && !t.originalRecurringId);
  }, [transactions]);

  const handleTransactionSubmit = async (data: TransactionFormData, id?: string) => {
    const transactionDataToSave: any = { 
      date: Timestamp.fromDate(data.date),
      description: data.description || "",
      category: data.category,
      subcategory: data.subcategory || "",
      type: data.type,
      amount: data.type === 'Uscita' ? -Math.abs(data.amount) : Math.abs(data.amount),
      status: data.status as TransactionStatus,
      isRecurring: data.isRecurring || false,
      originalRecurringId: editingTransaction?.originalRecurringId || null, // Mantieni se è un'istanza
    };

    if (data.isRecurring && data.recurrenceFrequency && data.type === 'Uscita') { // Solo uscite possono essere ricorrenti (come da modal)
      transactionDataToSave.recurrenceDetails = {
        frequency: data.recurrenceFrequency as RecurrenceFrequency,
        startDate: Timestamp.fromDate(data.date), // La data della definizione è la start date
        endDate: data.recurrenceEndDate ? Timestamp.fromDate(data.recurrenceEndDate) : null,
      };
      // Se stiamo creando una *nuova* definizione ricorrente, originalRecurringId deve essere null
      if (!id) { // Solo per nuove transazioni che sono definizioni ricorrenti
        transactionDataToSave.originalRecurringId = null;
      }
    } else {
      transactionDataToSave.recurrenceDetails = null;
    }
    
    console.log("Attempting to save transaction. ID:", id, "Data to save:", JSON.stringify(transactionDataToSave, null, 2));

    try {
      if (id) {
        const transactionRef = doc(db, "transactions", id);
        await updateDoc(transactionRef, transactionDataToSave);
        toast({ title: "Transazione Modificata", description: "La transazione è stata aggiornata con successo." });
        console.log("Transaction updated successfully. ID:", id);
      } else {
        console.log("Adding new transaction (principal doc):", JSON.stringify(transactionDataToSave, null, 2));
        const newDocRef = await addDoc(collection(db, "transactions"), transactionDataToSave);
        toast({ title: "Transazione Principale Aggiunta", description: `La transazione principale (${transactionDataToSave.description || 'N/A'}) è stata creata.` });
        console.log("Principal transaction added successfully. New ID:", newDocRef.id);

        if (transactionDataToSave.isRecurring && transactionDataToSave.recurrenceDetails && !transactionDataToSave.originalRecurringId) {
          console.log("Preparing batch for recurring instances. Original Definition ID:", newDocRef.id);
          const batch = writeBatch(db);
          const definitionDate = data.date;
          const recurrenceEndDate = data.recurrenceEndDate; 
          let instancesCreatedCount = 0;
          const MAX_RECURRING_INSTANCES = 120;

          for (let i = 0; i < MAX_RECURRING_INSTANCES; i++) { 
            let nextInstanceDate: Date;
            switch(transactionDataToSave.recurrenceDetails.frequency) {
                case 'Mensile': nextInstanceDate = addMonths(definitionDate, i + 1); break;
                case 'Bimestrale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 2); break;
                case 'Trimestrale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 3); break;
                case 'Semestrale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 6); break;
                case 'Annuale': nextInstanceDate = addMonths(definitionDate, (i + 1) * 12); break;
                default: nextInstanceDate = addMonths(definitionDate, i + 1); break;
            }

            if (recurrenceEndDate && nextInstanceDate > recurrenceEndDate) {
              console.log(`Recurring instance date ${format(nextInstanceDate, "yyyy-MM-dd")} is after end date ${format(recurrenceEndDate, "yyyy-MM-dd")}. Stopping.`);
              break; 
            }
            
            console.log(`Generating instance ${i+1} (after definition) for date: ${format(nextInstanceDate, "yyyy-MM-dd")}`);

            const instanceData = {
              ...transactionDataToSave,
              date: Timestamp.fromDate(nextInstanceDate), 
              isRecurring: false,
              recurrenceDetails: null, 
              originalRecurringId: newDocRef.id,
              status: 'Pianificato' as TransactionStatus, 
            };
            const newInstanceRef = doc(collection(db, "transactions"));
            batch.set(newInstanceRef, instanceData);
            instancesCreatedCount++;
          }

          if (instancesCreatedCount > 0) {
            console.log(`Attempting to commit batch for ${instancesCreatedCount} recurring instances.`);
            await batch.commit();
            toast({ title: "Istanze Ricorrenti Create", description: `${instancesCreatedCount} istanze future sono state pianificate.`});
            console.log("Recurring instances batch committed successfully.");
          } else {
            console.log("No recurring instances to generate or commit for this definition.");
          }
        }
      }
      console.log("Requesting fetchTransactions after save operation.");
      incrementTransactionsVersion();
    } catch (error: any) {
      console.error("!!! ERROR saving/batching transaction:", error);
      console.error("Error object (raw):", error);
      let detailedDescription = "Impossibile salvare la transazione.";
      if (error.message) detailedDescription += ` Dettaglio: ${error.message}`;
      if (error.code) detailedDescription += ` (Codice: ${error.code})`;
      
      toast({ 
        title: "Errore nel Salvataggio", 
        description: detailedDescription,
        variant: "destructive" 
      });
    }
    setEditingTransaction(null);
  };

  const handleScannerItemsAccepted = async (items: any[]) => {
    console.log(`Attempting to save ${items.length} items from scanner.`);
    try {
      const batch = writeBatch(db);
      for (const data of items) {
        const transactionDataToSave: any = { 
          date: Timestamp.fromDate(data.date),
          description: data.description || "",
          category: data.category,
          subcategory: data.subcategory || "",
          type: data.type,
          amount: data.type === 'Uscita' ? -Math.abs(data.amount) : Math.abs(data.amount),
          status: data.status as TransactionStatus,
          isRecurring: false,
          originalRecurringId: null,
          recurrenceDetails: null,
        };
        const newDocRef = doc(collection(db, "transactions"));
        batch.set(newDocRef, transactionDataToSave);
      }
      await batch.commit();
      toast({ title: "Importazione Completata", description: `${items.length} voci salvate con successo.` });
      incrementTransactionsVersion();
    } catch (error: any) {
      console.error("!!! ERROR saving scanned transactions:", error);
      toast({ title: "Errore Importazione", description: error.message, variant: "destructive" });
    }
  };



  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionTypeForModal(transaction.type);
    setIsModalOpen(true);
  };

  const handleDuplicate = (transactionToDuplicate: Transaction) => {
    const newTransactionData: Transaction = {
      ...transactionToDuplicate,
      id: '', 
      date: format(startOfToday(), "yyyy-MM-dd"), 
      status: 'Pianificato', 
      isRecurring: false, 
      recurrenceDetails: undefined,
      originalRecurringId: undefined,
    };
    setEditingTransaction(newTransactionData);
    setTransactionTypeForModal(newTransactionData.type);
    setIsModalOpen(true);
    toast({ title: "Transazione Pronta per Duplicazione", description: "Modifica i dettagli e salva come nuova transazione." });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa transazione e le sue eventuali istanze ricorrenti future pianificate?")) return;

    console.log(`Attempting to delete transaction ID: ${id}`);
    try {
      const batch = writeBatch(db);
      const transactionRef = doc(db, "transactions", id);
      batch.delete(transactionRef);
      console.log(`Marked transaction ${id} for deletion.`);

      const deletedTransaction = transactions.find(t => t.id === id);
      if (deletedTransaction?.isRecurring && !deletedTransaction.originalRecurringId) {
        console.log(`Transaction ${id} is a recurring definition. Looking for future instances to delete.`);
        const instancesQuery = query(
            collection(db, "transactions"), 
            where("originalRecurringId", "==", id),
            where("status", "in", ["Pianificato", "In Attesa"])
        );
        const instancesSnapshot = await getDocs(instancesQuery);
        if (instancesSnapshot.empty) {
            console.log(`No future/pending instances found for recurring definition ${id}.`);
        } else {
            instancesSnapshot.forEach(instanceDoc => {
                console.log(`Marking instance ${instanceDoc.id} (from definition ${id}) for deletion.`);
                batch.delete(doc(db, "transactions", instanceDoc.id));
            });
        }
      }

      await batch.commit();
      console.log(`Batch delete for transaction ${id} (and instances, if any) committed.`);
      toast({ title: "Transazione Eliminata", description: "La transazione e le istanze future pianificate sono state rimosse." });
      incrementTransactionsVersion();
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (error: any) {
      console.error("!!! ERROR deleting transaction:", error);
      console.error("Delete Error object (raw):", error);
      let detailedDescription = "Impossibile eliminare la transazione.";
      if (error.message) detailedDescription += ` Dettaglio: ${error.message}`;
      if (error.code) detailedDescription += ` (Codice: ${error.code})`;
      toast({ title: "Errore Eliminazione", description: detailedDescription, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Sei sicuro di voler eliminare ${selectedRows.size} transazioni selezionate e le loro eventuali istanze ricorrenti future pianificate?`)) return;
    
    console.log(`Attempting to bulk delete ${selectedRows.size} transactions.`);
    try {
      const batch = writeBatch(db);
      const idsToDelete = Array.from(selectedRows);

      for (const id of idsToDelete) {
        const transactionRef = doc(db, "transactions", id);
        batch.delete(transactionRef);
        console.log(`Marked transaction ${id} for bulk deletion.`);
        
        const deletedTransaction = transactions.find(t => t.id === id);
        if (deletedTransaction?.isRecurring && !deletedTransaction.originalRecurringId) {
            console.log(`Transaction ${id} (in bulk delete) is a recurring definition. Looking for future instances.`);
            const instancesQuery = query(
                collection(db, "transactions"), 
                where("originalRecurringId", "==", id),
                where("status", "in", ["Pianificato", "In Attesa"])
            );
            const instancesSnapshot = await getDocs(instancesQuery);
            instancesSnapshot.forEach(instanceDoc => {
                console.log(`Marking instance ${instanceDoc.id} (from definition ${id}) for bulk deletion.`);
                batch.delete(doc(db, "transactions", instanceDoc.id));
            });
        }
      }
      await batch.commit();
      console.log(`Bulk delete batch committed for ${idsToDelete.length} transactions.`);
      toast({ title: "Transazioni Eliminate", description: `${idsToDelete.length} transazioni selezionate e le loro istanze future pianificate sono state rimosse.` });
      incrementTransactionsVersion(); 
      setSelectedRows(new Set());
    } catch (error: any) {
      console.error("!!! ERROR bulk deleting transactions:", error);
      console.error("Bulk Delete Error object (raw):", error);
      let detailedDescription = "Impossibile eliminare le transazioni selezionate.";
      if (error.message) detailedDescription += ` Dettaglio: ${error.message}`;
      if (error.code) detailedDescription += ` (Codice: ${error.code})`;
      toast({ title: "Errore Eliminazione Multipla", description: detailedDescription, variant: "destructive" });
    }
  };


  const handleBulkStatusUpdateConfirm = async (newStatus: TransactionStatus) => {
    if (selectedRows.size === 0) return;
    console.log(`Attempting to bulk update status to "${newStatus}" for ${selectedRows.size} transactions.`);
    try {
      const batch = writeBatch(db);
      selectedRows.forEach(id => {
        const transactionRef = doc(db, "transactions", id);
        batch.update(transactionRef, { status: newStatus });
        console.log(`Marked transaction ${id} for status update to "${newStatus}".`);
      });
      await batch.commit();
      console.log(`Bulk status update batch to "${newStatus}" committed.`);
      toast({ title: "Stato Aggiornato", description: `Lo stato di ${selectedRows.size} transazioni è stato aggiornato a "${newStatus}".` });
      incrementTransactionsVersion();
      setSelectedRows(new Set());
      setIsBulkStatusModalOpen(false);
    } catch (error: any) {
      console.error("!!! ERROR bulk updating status:", error);
      console.error("Bulk Status Update Error object (raw):", error);
      let detailedDescription = "Impossibile aggiornare lo stato delle transazioni.";
      if (error.message) detailedDescription += ` Dettaglio: ${error.message}`;
      if (error.code) detailedDescription += ` (Codice: ${error.code})`;
      toast({ title: "Errore Aggiornamento Stato", description: detailedDescription, variant: "destructive" });
    }
  };


  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAllRows = () => { 
    if (selectedRows.size === filteredAndSortedTransactions.length && filteredAndSortedTransactions.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAndSortedTransactions.map(t => t.id)));
    }
  };


  const openModalForNew = (type: 'Entrata' | 'Uscita') => {
    setEditingTransaction(null);
    setTransactionTypeForModal(type);
    setIsModalOpen(true);
  };


  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Caricamento transazioni da Firestore...</p>
      </div>
    );
  }


  return (
    <TooltipProvider>
      <PageHeader
        title="Transazioni"
        description="Visualizza e gestisci tutte le entrate e uscite."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsScannerModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Camera className="h-4 w-4 mr-2" />
              Importa Fattura (AI)
            </Button>
            <Button onClick={() => { toast({title: "Esporta non implementato"}) }} variant="outline">
              Esporta Dati
            </Button>
          </div>
        }
      />

      {loadingError && !isLoading && (
         <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errore Caricamento Transazioni</AlertTitle>
          <AlertDescription>{loadingError} La tabella potrebbe non essere aggiornata o completa.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="group cursor-pointer glass-panel border-[hsl(var(--gold-400)/0.2)] hover:border-[hsl(var(--gold-500))] transition-all duration-500 overflow-hidden relative" onClick={() => openModalForNew('Entrata')}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-all duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-lg font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Nuova Entrata</CardTitle>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <CalendarPlus className="h-5 w-5 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-sm text-muted-foreground/80 font-medium">Registra un nuovo incasso o entrata nel sistema.</p>
          </CardContent>
        </Card>
        
        <Card className="group cursor-pointer glass-panel border-[hsl(var(--gold-400)/0.2)] hover:border-[hsl(var(--gold-500))] transition-all duration-500 overflow-hidden relative" onClick={() => openModalForNew('Uscita')}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-3xl group-hover:bg-rose-500/10 transition-all duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-lg font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Nuova Uscita</CardTitle>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <CalendarMinus className="h-5 w-5 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-sm text-muted-foreground/80 font-medium">Registra una nuova spesa o uscita per lo studio.</p>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer glass-panel border-[hsl(var(--gold-400)/0.3)] hover:border-[hsl(var(--gold-500))] transition-all duration-500 overflow-hidden relative glow-gold-sm" onClick={() => setIsScannerModalOpen(true)}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[hsl(var(--gold-500)/0.1)] blur-3xl group-hover:bg-[hsl(var(--gold-500)/0.2)] transition-all duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-lg font-bold text-[hsl(var(--gold-600))] dark:text-[hsl(var(--gold-400))] uppercase tracking-wider">Importa (AI)</CardTitle>
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--gold-500)/0.1)] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Camera className="h-5 w-5 text-[hsl(var(--gold-600))]" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-sm text-muted-foreground/80 font-medium">Estrai spese automaticamente da scontrini o fatture.</p>
          </CardContent>
        </Card>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        transactionTypeInitial={transactionTypeForModal}
        editingTransaction={editingTransaction}
        onSubmitSuccess={handleTransactionSubmit}
      />

      <InvoiceScannerModal
        isOpen={isScannerModalOpen}
        onOpenChange={setIsScannerModalOpen}
        onItemsAccepted={handleScannerItemsAccepted}
      />

      <BulkStatusUpdateDialog
        isOpen={isBulkStatusModalOpen}
        onOpenChange={setIsBulkStatusModalOpen}
        onConfirm={handleBulkStatusUpdateConfirm}
        transactionStatuses={transactionStatuses}
      />


      <Card className="mb-8 glass-panel border-[hsl(var(--gold-400)/0.2)] overflow-hidden">
        <CardHeader className="border-b border-[hsl(var(--gold-400)/0.1)] bg-[hsl(var(--gold-100)/0.05)]">
          <CardTitle className="text-xl font-bold flex items-center text-[hsl(var(--gold-700))] dark:text-[hsl(var(--gold-200))]">
            <Repeat className="mr-2 h-5 w-5 text-[hsl(var(--gold-500))]" />
            Transazioni Ricorrenti
          </CardTitle>
          <CardDescription className="text-[hsl(var(--gold-700)/0.6)] dark:text-[hsl(var(--gold-200)/0.5)]">Configurazioni principali per le spese e entrate periodiche.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && recurringTransactionsDefinitions.length === 0 && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
          {!isLoading && recurringTransactionsDefinitions.length === 0 && !loadingError && (
            <p className="text-sm text-muted-foreground">Nessuna transazione ricorrente definita.</p>
          )}
          {!isLoading && recurringTransactionsDefinitions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Inizio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Sottocategoria</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Stato (Def.)</TableHead>
                  <TableHead>Frequenza</TableHead>
                  <TableHead>Data Fine</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringTransactionsDefinitions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{isValid(parseISO(t.date)) ? format(parseISO(t.date), "dd/MM/yyyy", { locale: it }) : "Data non valida"}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === "Entrata" ? "default" : "destructive"} className={t.type === "Entrata" ? "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-200 dark:border-green-700" : "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-200 dark:border-red-700"}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {t.subcategory ? <Badge variant="outline">{t.subcategory}</Badge> : "-"}
                    </TableCell>
                    <TableCell className={`font-semibold ${t.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      €{t.type === 'Entrata' ? t.amount.toFixed(2) : Math.abs(t.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={t.status === "Completato" ? "default" : t.status === "In Attesa" ? "secondary" : "outline"}
                        className={
                            t.status === "Completato" ? "border-green-500 text-green-600 dark:border-green-600 dark:text-green-400 bg-green-500/10" :
                            t.status === "In Attesa" ? "border-yellow-500 text-yellow-600 dark:border-yellow-600 dark:text-yellow-400 bg-yellow-500/10" :
                            "border-blue-500 text-blue-600 dark:border-blue-600 dark:text-blue-400 bg-blue-500/10"
                        }
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.recurrenceDetails?.frequency}</TableCell>
                    <TableCell>{t.recurrenceDetails?.endDate ? (isValid(parseISO(t.recurrenceDetails.endDate)) ? format(parseISO(t.recurrenceDetails.endDate), "dd/MM/yyyy", { locale: it }) : "Data fine non valida") : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="mr-1" onClick={() => handleEdit(t)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Modifica Definizione</p></TooltipContent>
                      </Tooltip>
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Elimina Definizione e Istanze</p></TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6"/>

      <Card className="glass-panel border-[hsl(var(--gold-400)/0.2)] overflow-hidden mb-20 shadow-2xl">
        <CardHeader className="border-b border-[hsl(var(--gold-400)/0.1)] bg-[hsl(var(--gold-100)/0.05)]">
          <CardTitle className="text-xl font-bold text-[hsl(var(--gold-700))] dark:text-[hsl(var(--gold-200))]">Archivio Transazioni</CardTitle>
          <CardDescription className="text-[hsl(var(--gold-700)/0.6)] dark:text-[hsl(var(--gold-200)/0.5)]">Visualizza e analizza tutte le movimentazioni finanziarie dello studio.</CardDescription>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mt-6">
            <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[150px] rounded-full border-[hsl(var(--gold-400)/0.3)] bg-white/40 dark:bg-black/20 focus:ring-[hsl(var(--gold-500))]">
                  <SelectValue placeholder="Mese" />
                </SelectTrigger>
                <SelectContent className="glass-panel border-[hsl(var(--gold-400)/0.2)]">
                  {months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[110px] rounded-full border-[hsl(var(--gold-400)/0.3)] bg-white/40 dark:bg-black/20 focus:ring-[hsl(var(--gold-500))]">
                  <SelectValue placeholder="Anno" />
                </SelectTrigger>
                <SelectContent className="glass-panel border-[hsl(var(--gold-400)/0.2)]">
                  {generateYears().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as typeof statusOptions[number])}>
                <SelectTrigger className="w-full sm:w-[160px] rounded-full border-[hsl(var(--gold-400)/0.3)] bg-white/40 dark:bg-black/20 focus:ring-[hsl(var(--gold-500))]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4 text-[hsl(var(--gold-500))]" />
                    <SelectValue placeholder="Stato" />
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-panel border-[hsl(var(--gold-400)/0.2)]">
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s === "all" ? "Tutti gli Stati" : s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full lg:w-[350px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--gold-500))]" />
              <Input
                type="search"
                placeholder="Cerca transazione..."
                className="pl-10 w-full rounded-full border-[hsl(var(--gold-400)/0.3)] bg-white/40 dark:bg-black/20 focus:ring-[hsl(var(--gold-500))]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {selectedRows.size > 0 && (
             <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Button variant="destructive" onClick={handleBulkDelete} size="sm" className="rounded-full px-4 shadow-lg shadow-rose-500/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina Selezionate ({selectedRows.size})
                </Button>
                <Button variant="outline" onClick={() => setIsBulkStatusModalOpen(true)} size="sm" className="rounded-full px-4 border-[hsl(var(--gold-400)/0.3)] hover:bg-[hsl(var(--gold-100))] dark:hover:bg-white/5">
                    <Edit className="mr-2 h-4 w-4 text-[hsl(var(--gold-500))]" />
                    Modifica Stato ({selectedRows.size})
                </Button>
             </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && transactions.length === 0 && <div className="text-center p-6"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /><p className="mt-2 text-muted-foreground">Caricamento istanze transazioni...</p></div>}
          {!isLoading && transactions.length === 0 && !loadingError && (
             <p className="text-center text-muted-foreground py-10">Nessuna transazione trovata in Firestore. Inizia aggiungendone qualcuna!</p>
          )}
          {filteredAndSortedTransactions.length > 0 && (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[40px]">
                    <Checkbox
                        checked={selectedRows.size === filteredAndSortedTransactions.length && filteredAndSortedTransactions.length > 0}
                        onCheckedChange={handleSelectAllRows}
                        aria-label="Seleziona tutte"
                    />
                    </TableHead>
                    {columnOrder.map(key => (
                        <TableHead key={key} onClick={() => key !== 'actions' && handleSort(key as keyof Transaction)} className={key !== 'actions' ? "cursor-pointer hover:bg-muted/50" : ""}>
                            <div className="flex items-center">
                                {columnDisplayNames[key as keyof Transaction | 'actions']}
                                {sortConfig.key === (key as keyof Transaction) && key !== 'actions' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                                {sortConfig.key !== (key as keyof Transaction) && key !== 'actions' && <ChevronsUpDown className="ml-2 h-3 w-3 text-muted-foreground" />}
                            </div>
                        </TableHead>
                    ))}
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredAndSortedTransactions.map((transaction) => (
                    <TableRow key={transaction.id} data-state={selectedRows.has(transaction.id) ? "selected" : ""}>
                    <TableCell>
                        <Checkbox
                        checked={selectedRows.has(transaction.id)}
                        onCheckedChange={() => handleSelectRow(transaction.id)}
                        aria-label={`Seleziona transazione ${transaction.description}`}
                        />
                    </TableCell>
                    <TableCell>{isValid(parseISO(transaction.date)) ? format(parseISO(transaction.date), "dd/MM/yyyy", { locale: it }) : "Data non valida"}</TableCell>
                    <TableCell>
                        <Badge variant={transaction.type === "Entrata" ? "default" : "destructive"} className={transaction.type === "Entrata" ? "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-200 dark:border-green-700" : "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-200 dark:border-red-700"}>
                        {transaction.type}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell>
                        {transaction.subcategory ? <Badge variant="outline">{transaction.subcategory}</Badge> : "-"}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        €{transaction.type === 'Entrata' ? transaction.amount.toFixed(2) : Math.abs(transaction.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium flex items-center">
                        <span className="truncate max-w-[200px] inline-block" title={transaction.description}>{transaction.description}</span>
                        {transaction.isRecurring && !transaction.originalRecurringId && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span><Repeat className="ml-2 h-3 w-3 text-blue-500 flex-shrink-0" /></span>
                            </TooltipTrigger>
                            <TooltipContent><p>Transazione Ricorrente (Definizione)</p></TooltipContent>
                        </Tooltip>
                        )}
                        {transaction.originalRecurringId && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span><Repeat className="ml-2 h-3 w-3 text-gray-400 flex-shrink-0" /></span>
                            </TooltipTrigger>
                            <TooltipContent><p>Istanza di transazione ricorrente</p></TooltipContent>
                        </Tooltip>
                        )}
                        </TableCell>
                    <TableCell>
                        <Badge
                            variant={transaction.status === "Completato" ? "default" : transaction.status === "In Attesa" ? "secondary" : "outline"}
                            className={
                                transaction.status === "Completato" ? "border-green-500 text-green-600 dark:border-green-600 dark:text-green-400 bg-green-500/10" :
                                transaction.status === "In Attesa" ? "border-yellow-500 text-yellow-600 dark:border-yellow-600 dark:text-yellow-400 bg-yellow-500/10" :
                                "border-blue-500 text-blue-600 dark:border-blue-600 dark:text-blue-400 bg-blue-500/10"
                            }
                        >
                            {transaction.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleDuplicate(transaction)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Duplica Transazione</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}
                                        disabled={!!transaction.originalRecurringId && transaction.isRecurring === false && !transactions.find(t => t.id === transaction.originalRecurringId)?.isRecurring}
                                >
                                <Edit3 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{!!transaction.originalRecurringId && transaction.isRecurring === false && !transactions.find(t => t.id === transaction.originalRecurringId)?.isRecurring ? "Modifica la definizione ricorrente originale" : "Modifica Transazione/Definizione"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(transaction.id)}>
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Elimina</p></TooltipContent>
                        </Tooltip>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          )}
          {!isLoading && filteredAndSortedTransactions.length === 0 && transactions.length > 0 && !loadingError && (
             <p className="text-center text-muted-foreground py-10">Nessuna transazione trovata per i filtri selezionati.</p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
