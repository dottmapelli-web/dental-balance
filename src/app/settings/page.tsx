
"use client";

import * as React from 'react';
import { useCategories, type CategoryDefinition, type ForecastType, type Subcategory } from '@/contexts/category-context';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Save, X, AlertCircle, WandSparkles, MoveRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, query, where, doc } from 'firebase/firestore';
import type { Transaction } from '@/data/transactions-data';
import { useAuth } from '@/contexts/auth-context';


const forecastTypes: ForecastType[] = ['Costi di Produzione', 'Costi Produttivi'];

const EditableCategoryItem = ({ 
    categoryName, 
    categoryData,
    isExpense,
    onCategoryUpdate,
    onCategoryDelete,
    onSubcategoryAdd,
    onSubcategoryUpdate,
    onSubcategoryDelete,
    onForecastTypeChange,
    onSubcategoryFlagChange
}: {
    categoryName: string;
    categoryData: CategoryDefinition[string];
    isExpense: boolean;
    onCategoryUpdate: (oldName: string, newName: string) => void;
    onCategoryDelete: (name: string) => void;
    onSubcategoryAdd: (category: string, subcategory: string) => void;
    onSubcategoryUpdate: (category: string, oldSub: Subcategory, newSubName: string) => void;
    onSubcategoryDelete: (category: string, subcategory: Subcategory) => void;
    onForecastTypeChange: (category: string, forecastType: ForecastType) => void;
    onSubcategoryFlagChange: (category: string, subcategory: Subcategory, checked: boolean) => void;
}) => {
    const [isEditingCategory, setIsEditingCategory] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState(categoryName);
    
    const [editingSub, setEditingSub] = React.useState<Subcategory | null>(null);
    const [newSubName, setNewSubName] = React.useState('');

    const [addingSub, setAddingSub] = React.useState(false);
    const [addingSubName, setAddingSubName] = React.useState('');

    const handleCategoryUpdate = () => {
        if (newCategoryName.trim() && newCategoryName.trim() !== categoryName) {
            onCategoryUpdate(categoryName, newCategoryName.trim());
        }
        setIsEditingCategory(false);
    };
    
    const handleSubcategoryUpdate = (oldSub: Subcategory) => {
        if (newSubName.trim() && newSubName.trim() !== oldSub.name) {
            onSubcategoryUpdate(categoryName, oldSub, newSubName.trim());
        }
        setEditingSub(null);
        setNewSubName('');
    };

    const handleAddSubcategory = () => {
        if(addingSubName.trim()){
            onSubcategoryAdd(categoryName, addingSubName.trim());
        }
        setAddingSub(false);
        setAddingSubName('');
    };

    return (
        <AccordionItem value={categoryName}>
            <div className="flex items-center w-full">
                {isEditingCategory ? (
                     <div className="flex items-center gap-2 flex-grow py-4 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                        <Input 
                             value={newCategoryName}
                             onChange={(e) => setNewCategoryName(e.target.value)}
                             className="h-8"
                        />
                        <Button size="icon" variant="ghost" onClick={handleCategoryUpdate} className="h-8 w-8 text-green-600 hover:text-green-700"><Save className="h-4 w-4"/></Button>
                        <Button size="icon" variant="ghost" onClick={() => setIsEditingCategory(false)} className="h-8 w-8"><X className="h-4 w-4"/></Button>
                     </div>
                ) : (
                    <>
                        <AccordionTrigger className="pl-4">
                            <span className="font-medium">{categoryName}</span>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 pr-2" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingCategory(true)}><Edit className="h-4 w-4"/></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Stai per eliminare la categoria "{categoryName}" e tutte le sue sottocategorie. Questa azione è irreversibile.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onCategoryDelete(categoryName)}>Elimina</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </>
                )}
            </div>
            <AccordionContent>
                <div className="pl-4 space-y-2">
                    {isExpense && (
                        <div className="flex items-center gap-2 pb-2" onClick={e => e.stopPropagation()}>
                            <label className="text-sm font-medium text-muted-foreground">Tipo Previsione:</label>
                            <Select 
                                value={categoryData.forecastType || 'Costi Produttivi'} 
                                onValueChange={(value) => onForecastTypeChange(categoryName, value as ForecastType)}
                            >
                                <SelectTrigger className="w-[200px] h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {forecastTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {categoryData.subcategories.map(sub => (
                         <div key={sub.name} className="flex items-center justify-between group">
                           {editingSub?.name === sub.name ? (
                               <div className="flex items-center gap-2 flex-grow">
                                   <Input 
                                        defaultValue={sub.name}
                                        onChange={e => setNewSubName(e.target.value)}
                                        className="h-8"
                                   />
                                   <Button size="icon" variant="ghost" onClick={() => handleSubcategoryUpdate(sub)} className="h-8 w-8 text-green-600 hover:text-green-700"><Save className="h-4 w-4"/></Button>
                                   <Button size="icon" variant="ghost" onClick={() => setEditingSub(null)} className="h-8 w-8"><X className="h-4 w-4"/></Button>
                               </div>
                           ) : (
                               <div className="flex items-center gap-3">
                                   <Checkbox 
                                        id={`flag-${categoryName}-${sub.name}`} 
                                        checked={sub.showInForecast} 
                                        onCheckedChange={(checked) => onSubcategoryFlagChange(categoryName, sub, !!checked)}
                                    />
                                   <Label htmlFor={`flag-${categoryName}-${sub.name}`} className="text-muted-foreground cursor-pointer">{sub.name}</Label>
                               </div>
                           )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!editingSub && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setEditingSub(sub); setNewSubName(sub.name);}}><Edit className="h-4 w-4"/></Button>}
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onSubcategoryDelete(categoryName, sub)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    ))}
                    {addingSub ? (
                         <div className="flex items-center gap-2">
                           <Input 
                                placeholder="Nuova sottocategoria"
                                value={addingSubName}
                                onChange={e => setAddingSubName(e.target.value)}
                                className="h-8"
                           />
                           <Button size="icon" variant="ghost" onClick={handleAddSubcategory} className="h-8 w-8 text-green-600 hover:text-green-700"><Save className="h-4 w-4"/></Button>
                           <Button size="icon" variant="ghost" onClick={() => setAddingSub(false)} className="h-8 w-8"><X className="h-4 w-4"/></Button>
                        </div>
                    ) : (
                        <Button variant="link" size="sm" onClick={() => setAddingSub(true)} className="p-0 h-auto">
                            <PlusCircle className="mr-2 h-4 w-4"/> Aggiungi sottocategoria
                        </Button>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
};


// ----- Migration Utility Component -----
interface OrphanedTransactionGroup {
    type: 'category' | 'subcategory';
    name: string;
    parentCategory?: string; // Only for subcategory type
    count: number;
    transactionIds: string[];
}
const MigrationUtility = () => {
    const { expenseCategories, incomeCategories, loading: loadingCategories } = useCategories();
    const { toast } = useToast();
    const { incrementTransactionsVersion } = useAuth();
    
    const [orphanedGroups, setOrphanedGroups] = React.useState<OrphanedTransactionGroup[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const [selectedMigrationTarget, setSelectedMigrationTarget] = React.useState<Record<string, string>>({});

    const allValidExpenseCats = React.useMemo(() => Object.keys(expenseCategories), [expenseCategories]);
    const allValidIncomeCats = React.useMemo(() => Object.keys(incomeCategories), [incomeCategories]);

    const findOrphanedTransactions = React.useCallback(async () => {
        if (loadingCategories) return;
        setIsLoading(true);
        setError(null);
        try {
            const allTransactionsSnapshot = await getDocs(collection(db, 'transactions'));
            const allTransactions: Transaction[] = allTransactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));

            const validExpenseSubcats: Record<string, string[]> = {};
            for(const cat in expenseCategories) {
                validExpenseSubcats[cat] = expenseCategories[cat].subcategories.map(s => s.name);
            }
            const validIncomeSubcats: Record<string, string[]> = {};
             for(const cat in incomeCategories) {
                validIncomeSubcats[cat] = incomeCategories[cat].subcategories.map(s => s.name);
            }

            const orphans: Record<string, OrphanedTransactionGroup> = {};

            allTransactions.forEach(t => {
                const isExpense = t.type === 'Uscita';
                const validCategories = isExpense ? allValidExpenseCats : allValidIncomeCats;
                const validSubcategories = isExpense ? validExpenseSubcats : validIncomeSubcats;

                let isOrphan = false;
                let orphanKey = '';

                // Check for orphaned category
                if (!t.category || !validCategories.includes(t.category)) {
                    isOrphan = true;
                    orphanKey = `cat|${t.category || 'Non Categoria'}`;
                    if (!orphans[orphanKey]) orphans[orphanKey] = { type: 'category', name: t.category || 'Non Categoria', count: 0, transactionIds: [] };
                }
                // Check for orphaned subcategory
                else if (t.subcategory && !(validSubcategories[t.category] || []).includes(t.subcategory)) {
                     isOrphan = true;
                     orphanKey = `sub|${t.category}|${t.subcategory}`;
                     if (!orphans[orphanKey]) orphans[orphanKey] = { type: 'subcategory', name: t.subcategory, parentCategory: t.category, count: 0, transactionIds: [] };
                }
                
                if(isOrphan && orphans[orphanKey]){
                    orphans[orphanKey].count++;
                    orphans[orphanKey].transactionIds.push(t.id);
                }
            });
            
            setOrphanedGroups(Object.values(orphans));

        } catch (e: any) {
            setError(`Impossibile analizzare le transazioni: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [expenseCategories, incomeCategories, loadingCategories, allValidExpenseCats, allValidIncomeCats]);

    React.useEffect(() => {
        findOrphanedTransactions();
    }, [findOrphanedTransactions]);

    const handleMigration = async (group: OrphanedTransactionGroup) => {
        const key = group.type === 'category' ? group.name : `${group.parentCategory}__${group.name}`;
        const target = selectedMigrationTarget[key];
        
        if (!target) {
            toast({ title: 'Azione Richiesta', description: 'Per favore, seleziona una nuova categoria/sottocategoria di destinazione.', variant: 'destructive' });
            return;
        }

        const [newCategory, newSubcategory] = target.split('__');
        
        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            group.transactionIds.forEach(id => {
                const docRef = doc(db, 'transactions', id);
                batch.update(docRef, {
                    category: newCategory,
                    subcategory: newSubcategory || ""
                });
            });
            await batch.commit();
            
            toast({ title: 'Migrazione Completata!', description: `${group.count} transazioni sono state aggiornate con successo.` });
            incrementTransactionsVersion(); // This will trigger a re-fetch of transactions and re-evaluation of orphans
            findOrphanedTransactions(); // Re-run check immediately

        } catch (e: any) {
            setError(`Errore durante l'aggiornamento delle transazioni: ${e.message}`);
            toast({ title: 'Errore di Migrazione', description: `Non è stato possibile aggiornare le transazioni: ${e.message}`, variant: 'destructive'});
        } finally {
            setIsLoading(false);
        }
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="ml-2 text-muted-foreground">Analisi dati in corso...</p>
            </div>
        );
    }

    if (error) {
         return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Errore</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    if (orphanedGroups.length === 0 && !isLoading) {
         return (
             <Alert variant="default" className="border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30">
                <WandSparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">Dati Coerenti</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-500">
                    Congratulazioni! Tutte le tue transazioni utilizzano categorie e sottocategorie valide. Non è richiesta alcuna azione.
                </AlertDescription>
            </Alert>
         );
    }
    
    const getTargetOptions = (group: OrphanedTransactionGroup) => {
        // Determine if the original group belongs to expense or income
        const isExpenseGroup = group.type === 'category' 
            ? allValidExpenseCats.includes(group.name) // Check if old category was an expense
            : allValidExpenseCats.includes(group.parentCategory!); // Check if parent was an expense

        const source = isExpenseGroup ? expenseCategories : incomeCategories;

        let options: { value: string; label: string }[] = [];
         for (const cat in source) {
            options.push({ value: cat, label: cat });
            if (source[cat].subcategories.length > 0) {
                 source[cat].subcategories.forEach(sub => {
                    options.push({ value: `${cat}__${sub.name}`, label: `  ↳ ${sub.name}` });
                 });
            }
        }
        return options;
    }

    return (
        <div className="space-y-4">
            {orphanedGroups.map((group) => {
                const key = group.type === 'category' ? group.name : `${group.parentCategory}__${group.name}`;
                return (
                    <div key={key} className="p-4 border rounded-lg bg-background">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div className="md:col-span-1">
                                <p className="font-semibold text-destructive">{group.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {group.count} transazioni in {group.type === 'category' ? 'categoria obsoleta' : `sottocategoria obsoleta di "${group.parentCategory}"`}
                                </p>
                            </div>
                             <div className="md:col-span-2 flex items-center gap-2">
                                <MoveRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <Select onValueChange={value => setSelectedMigrationTarget(prev => ({ ...prev, [key]: value }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Scegli nuova destinazione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getTargetOptions(group).map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                 <Button onClick={() => handleMigration(group)} disabled={!selectedMigrationTarget[key]}>
                                    Correggi
                                </Button>
                             </div>
                         </div>
                    </div>
                );
            })}
        </div>
    );
};


// ----- Main Settings Page Component -----
export default function SettingsPage() {
    const { expenseCategories, incomeCategories, loading, error, updateCategories } = useCategories();
    const { toast } = useToast();

    const [newCategoryName, setNewCategoryName] = React.useState('');
    const [addingCategoryType, setAddingCategoryType] = React.useState<'uscite' | 'entrate' | null>(null);

    const handleUpdate = async (type: 'uscite' | 'entrate', newCats: CategoryDefinition) => {
        try {
            await updateCategories(type, newCats);
            toast({ title: 'Successo', description: 'Categorie aggiornate con successo.'});
        } catch (e: any) {
            toast({ title: 'Errore', description: `Impossibile aggiornare le categorie: ${e.message}`, variant: 'destructive'});
        }
    }

    const handleAddCategory = (type: 'uscite' | 'entrate') => {
        if(!newCategoryName.trim()) return;

        const currentCats = type === 'uscite' ? { ...expenseCategories } : { ...incomeCategories };
        if(currentCats[newCategoryName.trim()]){
            toast({ title: 'Errore', description: 'Questa categoria esiste già.', variant: 'destructive'});
            return;
        }

        currentCats[newCategoryName.trim()] = {
            subcategories: [],
            forecastType: 'Costi Produttivi'
        };
        handleUpdate(type, currentCats);
        setNewCategoryName('');
        setAddingCategoryType(null);
    }
    
    const handleUpdateCategory = (type: 'uscite' | 'entrate', oldName: string, newName: string) => {
        const currentCats = type === 'uscite' ? { ...expenseCategories } : { ...incomeCategories };
        if(currentCats[newName]){
            toast({ title: 'Errore', description: 'Una categoria con questo nome esiste già.', variant: 'destructive'});
            return;
        }
        const categoryData = currentCats[oldName];
        delete currentCats[oldName];
        currentCats[newName] = categoryData;
        handleUpdate(type, currentCats);
    }

    const handleDeleteCategory = (type: 'uscite' | 'entrate', categoryName: string) => {
        const currentCats = type === 'uscite' ? { ...expenseCategories } : { ...incomeCategories };
        delete currentCats[categoryName];
        handleUpdate(type, currentCats);
    }
    
    const handleAddSubcategory = (type: 'uscite' | 'entrate', categoryName: string, subcategoryName: string) => {
        const currentCats = type === 'uscite' ? { ...expenseCategories } : { ...incomeCategories };
        if (currentCats[categoryName].subcategories.some(s => s.name === subcategoryName.trim())) {
             toast({ title: 'Errore', description: 'Questa sottocategoria esiste già.', variant: 'destructive'});
            return;
        }
        currentCats[categoryName].subcategories = [...currentCats[categoryName].subcategories, { name: subcategoryName.trim(), showInForecast: false }];
        handleUpdate(type, currentCats);
    }

    const handleUpdateSubcategory = (type: 'uscite' | 'entrate', categoryName: string, oldSub: Subcategory, newSubName: string) => {
        const currentCats = type === 'uscite' ? { ...expenseCategories } : { ...incomeCategories };
        const subs = currentCats[categoryName].subcategories;
        if (subs.some(s => s.name === newSubName)) {
             toast({ title: 'Errore', description: 'Una sottocategoria con questo nome esiste già in questa categoria.', variant: 'destructive'});
            return;
        }
        currentCats[categoryName].subcategories = subs.map(s => s.name === oldSub.name ? { ...s, name: newSubName } : s);
        handleUpdate(type, currentCats);
    }
    
    const handleDeleteSubcategory = (type: 'uscite' | 'entrate', categoryName: string, subcategoryToDelete: Subcategory) => {
        const currentCats = type === 'uscite' ? { ...expenseCategories } : { ...incomeCategories };
        currentCats[categoryName].subcategories = currentCats[categoryName].subcategories.filter(s => s.name !== subcategoryToDelete.name);
        handleUpdate(type, currentCats);
    }
    
    const handleForecastTypeChange = (categoryName: string, forecastType: ForecastType) => {
        const currentCats = { ...expenseCategories };
        currentCats[categoryName].forecastType = forecastType;
        handleUpdate('uscite', currentCats);
    }

    const handleSubcategoryFlagChange = (type: 'uscite' | 'entrate', categoryName: string, subcategory: Subcategory, checked: boolean) => {
        const currentCats = type === 'uscite' ? { ...expenseCategories } : { ...incomeCategories };
        const category = currentCats[categoryName];
        if (category) {
            category.subcategories = category.subcategories.map(sub => 
                sub.name === subcategory.name ? { ...sub, showInForecast: checked } : sub
            );
            handleUpdate(type, currentCats);
        }
    };

    return (
        <>
            <PageHeader 
                title="Impostazioni"
                description="Gestisci le categorie e sottocategorie per le tue transazioni e la loro classificazione nelle previsioni."
            />
            
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <WandSparkles className="mr-2 h-5 w-5 text-primary"/>
                        Utility di Migrazione Dati
                    </CardTitle>
                    <CardDescription>Correggi le transazioni che usano categorie o sottocategorie non più valide. Questa sezione appare solo se vengono trovate incongruenze.</CardDescription>
                </CardHeader>
                <CardContent>
                    <MigrationUtility />
                </CardContent>
            </Card>

            {loading && (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            )}

            {error && !loading && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Errore Caricamento Categorie</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Categorie di Uscita</CardTitle>
                            <CardDescription>Gestisci le categorie e sottocategorie per le spese e il loro tipo per le previsioni.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Accordion type="multiple" className="w-full">
                                {Object.entries(expenseCategories).sort(([catA], [catB]) => catA.localeCompare(catB)).map(([category, catData]) => (
                                    <EditableCategoryItem 
                                        key={category}
                                        categoryName={category}
                                        categoryData={catData}
                                        isExpense={true}
                                        onCategoryUpdate={(oldName, newName) => handleUpdateCategory('uscite', oldName, newName)}
                                        onCategoryDelete={(name) => handleDeleteCategory('uscite', name)}
                                        onSubcategoryAdd={(cat, sub) => handleAddSubcategory('uscite', cat, sub)}
                                        onSubcategoryUpdate={(cat, oldSub, newSub) => handleUpdateSubcategory('uscite', cat, oldSub, newSub)}
                                        onSubcategoryDelete={(cat, sub) => handleDeleteSubcategory('uscite', cat, sub)}
                                        onForecastTypeChange={handleForecastTypeChange}
                                        onSubcategoryFlagChange={(cat, sub, checked) => handleSubcategoryFlagChange('uscite', cat, sub, checked)}
                                    />
                                ))}
                            </Accordion>
                            <div className="mt-4">
                                {addingCategoryType === 'uscite' ? (
                                    <div className="flex items-center gap-2">
                                        <Input placeholder="Nuova categoria di uscita" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                        <Button size="icon" onClick={() => handleAddCategory('uscite')} className="h-9 w-9 text-green-600 hover:text-green-700" variant="ghost"><Save className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setAddingCategoryType(null)} className="h-9 w-9"><X className="h-4 w-4"/></Button>
                                    </div>
                                ) : (
                                    <Button variant="secondary" onClick={() => {setAddingCategoryType('uscite'); setNewCategoryName('');}}><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Categoria di Uscita</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Categorie di Entrata</CardTitle>
                            <CardDescription>Gestisci le categorie e sottocategorie per le entrate.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Accordion type="multiple" className="w-full">
                                {Object.entries(incomeCategories).sort(([catA], [catB]) => catA.localeCompare(catB)).map(([category, catData]) => (
                                     <EditableCategoryItem 
                                        key={category}
                                        categoryName={category}
                                        categoryData={catData}
                                        isExpense={false}
                                        onCategoryUpdate={(oldName, newName) => handleUpdateCategory('entrate', oldName, newName)}
                                        onCategoryDelete={(name) => handleDeleteCategory('entrate', name)}
                                        onSubcategoryAdd={(cat, sub) => handleAddSubcategory('entrate', cat, sub)}
                                        onSubcategoryUpdate={(cat, oldSub, newSub) => handleUpdateSubcategory('entrate', cat, oldSub, newSub)}
                                        onSubcategoryDelete={(cat, sub) => handleDeleteSubcategory('entrate', cat, sub)}
                                        onForecastTypeChange={() => {}} // No-op for income
                                        onSubcategoryFlagChange={(cat, sub, checked) => handleSubcategoryFlagChange('entrate', cat, sub, checked)}
                                    />
                                ))}
                            </Accordion>
                             <div className="mt-4">
                                {addingCategoryType === 'entrate' ? (
                                    <div className="flex items-center gap-2">
                                        <Input placeholder="Nuova categoria di entrata" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                        <Button size="icon" onClick={() => handleAddCategory('entrate')} className="h-9 w-9 text-green-600 hover:text-green-700" variant="ghost"><Save className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setAddingCategoryType(null)} className="h-9 w-9"><X className="h-4 w-4"/></Button>
                                    </div>
                                ) : (
                                    <Button variant="secondary" onClick={() => {setAddingCategoryType('entrate'); setNewCategoryName('');}}><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Categoria di Entrata</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}

    