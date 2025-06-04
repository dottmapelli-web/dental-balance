
"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BudgetListItem, ObjectiveListItem } from '@/app/budget-objectives/page';

const budgetPeriods = ['Mensile', 'Bimestrale', 'Trimestrale', 'Semestrale', 'Annuale'] as const;

const budgetFormSchema = z.object({
  type: z.literal('budget'),
  category: z.string().min(1, "La categoria è obbligatoria."),
  budgeted: z.coerce.number().min(0, "L'importo preventivato non può essere negativo."),
  actual: z.coerce.number().min(0, "L'importo speso non può essere negativo."),
  period: z.enum(budgetPeriods),
});
export type BudgetFormData = z.infer<typeof budgetFormSchema>;

const objectiveFormSchema = z.object({
  type: z.literal('objective'),
  name: z.string().min(1, "Il nome dell'obiettivo è obbligatorio."),
  target: z.coerce.number().positive("Il target deve essere un numero positivo."),
  current: z.coerce.number().min(0,"Il valore corrente non può essere negativo."),
  unit: z.string().min(1, "L'unità di misura è obbligatoria (es. %, €)."),
});
export type ObjectiveFormData = z.infer<typeof objectiveFormSchema>;

export const budgetObjectiveFormSchema = z.discriminatedUnion("type", [budgetFormSchema, objectiveFormSchema]);
export type BudgetObjectiveFormData = z.infer<typeof budgetObjectiveFormSchema>;

interface BudgetObjectiveModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  modalType: 'budget' | 'objective';
  editingItem?: BudgetListItem | ObjectiveListItem | null;
  onSave: (data: BudgetObjectiveFormData) => void;
  allExpenseCategories: string[];
}

export default function BudgetObjectiveModal({
  isOpen,
  onOpenChange,
  modalType,
  editingItem,
  onSave,
  allExpenseCategories,
}: BudgetObjectiveModalProps) {
  
  const defaultBudgetValues = useMemo<BudgetFormData>(() => ({
    type: 'budget',
    category: allExpenseCategories[0] || '',
    budgeted: 0,
    actual: 0,
    period: 'Mensile',
  }), [allExpenseCategories]);

  const defaultObjectiveValues = useMemo<ObjectiveFormData>(() => ({
    type: 'objective',
    name: '',
    target: 1, // Changed from 0 to 1 to satisfy positive() validation
    current: 0,
    unit: '%',
  }), []);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<BudgetObjectiveFormData>({
    resolver: zodResolver(budgetObjectiveFormSchema),
    defaultValues: modalType === 'budget' ? defaultBudgetValues : defaultObjectiveValues,
  });

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        if (modalType === 'budget' && 'category' in editingItem) {
          const budget = editingItem as BudgetListItem;
          reset({
            type: 'budget',
            category: budget.category,
            budgeted: budget.budgeted,
            actual: budget.actual,
            period: budget.period as typeof budgetPeriods[number],
          });
        } else if (modalType === 'objective' && 'name' in editingItem) {
          const objective = editingItem as ObjectiveListItem;
          reset({
            type: 'objective',
            name: objective.name,
            target: objective.target,
            current: objective.current,
            unit: objective.unit,
          });
        } else { 
           if (modalType === 'budget') reset(defaultBudgetValues);
           else reset(defaultObjectiveValues);
        }
      } else { 
        if (modalType === 'budget') reset(defaultBudgetValues);
        else reset(defaultObjectiveValues);
      }
    }
  }, [isOpen, modalType, editingItem, reset, defaultBudgetValues, defaultObjectiveValues]);

  const processSubmit: SubmitHandler<BudgetObjectiveFormData> = (data) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? `Modifica ${modalType === 'budget' ? 'Budget' : 'Obiettivo'}` : `Nuovo ${modalType === 'budget' ? 'Budget' : 'Obiettivo'}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 py-4">
          {/* The 'type' field is implicitly set by the defaultValues and reset logic */}

          {modalType === 'budget' && (
            <>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Controller
                  name="category"
                  control={control}
                  rules={{ required: "La categoria è obbligatoria."}} // This ensures category is treated as part of BudgetFormData
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {allExpenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
              </div>
              <div>
                <Label htmlFor="budgeted">Importo Preventivato (€)</Label>
                <Input id="budgeted" type="number" step="0.01" {...register("budgeted")} />
                {errors.budgeted && <p className="text-sm text-destructive mt-1">{errors.budgeted.message}</p>}
              </div>
              <div>
                <Label htmlFor="actual">Importo Speso (€)</Label>
                <Input id="actual" type="number" step="0.01" {...register("actual")} />
                {errors.actual && <p className="text-sm text-destructive mt-1">{errors.actual.message}</p>}
              </div>
              <div>
                <Label htmlFor="period">Periodo</Label>
                 <Controller
                  name="period"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? 'Mensile'}>
                      <SelectTrigger id="period"><SelectValue placeholder="Seleziona periodo" /></SelectTrigger>
                      <SelectContent>
                        {budgetPeriods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.period && <p className="text-sm text-destructive mt-1">{errors.period.message}</p>}
              </div>
            </>
          )}

          {modalType === 'objective' && (
            <>
              <div>
                <Label htmlFor="name">Nome Obiettivo</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="target">Valore Target</Label>
                <Input id="target" type="number" step="0.01" {...register("target")} />
                {errors.target && <p className="text-sm text-destructive mt-1">{errors.target.message}</p>}
              </div>
              <div>
                <Label htmlFor="current">Valore Corrente</Label>
                <Input id="current" type="number" step="0.01" {...register("current")} />
                {errors.current && <p className="text-sm text-destructive mt-1">{errors.current.message}</p>}
              </div>
              <div>
                <Label htmlFor="unit">Unità (es. %, €, n°)</Label>
                <Input id="unit" {...register("unit")} />
                {errors.unit && <p className="text-sm text-destructive mt-1">{errors.unit.message}</p>}
              </div>
            </>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Annulla</Button>
            </DialogClose>
            <Button type="submit">{editingItem ? "Salva Modifiche" : "Aggiungi"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
