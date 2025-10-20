
"use client";

import React, { useMemo } from 'react';
import { getYear, parseISO, isValid } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Transaction } from '@/data/transactions-data';
import { Separator } from '@/components/ui/separator';

interface AnnualDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  year: string;
  transactions: Transaction[];
}

interface AggregatedData {
  [category: string]: {
    total: number;
    subcategories: {
      [subcategory: string]: number;
    };
  };
}

export default function AnnualDetailModal({ isOpen, onOpenChange, year, transactions }: AnnualDetailModalProps) {
  const isClient = React.useState(false);

  const { incomeData, expenseData, totalIncome, totalExpenses } = useMemo(() => {
    if (!year || !transactions) {
      return { incomeData: {}, expenseData: {}, totalIncome: 0, totalExpenses: 0 };
    }

    const transactionsForYear = transactions.filter(t => isValid(parseISO(t.date)) && getYear(parseISO(t.date)).toString() === year);

    const aggregate = (type: 'Entrata' | 'Uscita'): [AggregatedData, number] => {
      const data: AggregatedData = {};
      let totalAmount = 0;
      
      transactionsForYear
        .filter(t => t.type === type)
        .forEach(t => {
          const category = t.category || "Senza Categoria";
          const subcategory = t.subcategory || "N/A";
          const amount = type === 'Entrata' ? t.amount : Math.abs(t.amount);
          
          totalAmount += amount;

          if (!data[category]) {
            data[category] = { total: 0, subcategories: {} };
          }
          data[category].total += amount;

          if (!data[category].subcategories[subcategory]) {
            data[category].subcategories[subcategory] = 0;
          }
          data[category].subcategories[subcategory] += amount;
        });

      return [data, totalAmount];
    };

    const [incomeData, totalIncome] = aggregate('Entrata');
    const [expenseData, totalExpenses] = aggregate('Uscita');

    return { incomeData, expenseData, totalIncome, totalExpenses };
  }, [year, transactions]);

  const renderCategoryDetails = (data: AggregatedData) => {
    return Object.entries(data)
      .sort(([catA], [catB]) => catA.localeCompare(catB))
      .map(([category, details]) => (
      <AccordionItem value={category} key={category}>
        <AccordionTrigger>
          <div className="flex justify-between w-full pr-4">
            <span className="font-semibold">{category}</span>
            <span className="font-mono">€{details.total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <Table>
            <TableBody>
              {Object.entries(details.subcategories)
                .sort(([subA], [subB]) => subA.localeCompare(subB))
                .map(([subcategory, amount]) => (
                <TableRow key={subcategory}>
                  <TableCell className="pl-8 text-muted-foreground">{subcategory}</TableCell>
                  <TableCell className="text-right font-mono">€{amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AccordionContent>
      </AccordionItem>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Dettaglio Finanziario per l'Anno {year}</DialogTitle>
          <DialogDescription>
            Riepilogo dettagliato di tutte le entrate e le uscite per l'anno selezionato, raggruppate per categoria e sottocategoria.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div>
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">Entrate Totali: €{totalIncome.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                <Separator />
                <ScrollArea className="h-96 mt-2 pr-4">
                    <Accordion type="multiple">
                        {Object.keys(incomeData).length > 0 ? renderCategoryDetails(incomeData) : <p className="p-4 text-muted-foreground">Nessuna entrata registrata per questo anno.</p>}
                    </Accordion>
                </ScrollArea>
            </div>
             <div>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Uscite Totali: €{totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                <Separator />
                <ScrollArea className="h-96 mt-2 pr-4">
                    <Accordion type="multiple">
                        {Object.keys(expenseData).length > 0 ? renderCategoryDetails(expenseData) : <p className="p-4 text-muted-foreground">Nessuna uscita registrata per questo anno.</p>}
                    </Accordion>
                </ScrollArea>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
