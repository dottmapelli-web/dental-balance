
"use client";

import React, { useState } from 'react';
import { useCategories, type CategoryDefinition, type ForecastType, type Subcategory } from '@/contexts/category-context';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Save, X, AlertCircle } from 'lucide-react';
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
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState(categoryName);
    
    const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
    const [newSubName, setNewSubName] = useState('');

    const [addingSub, setAddingSub] = useState(false);
    const [addingSubName, setAddingSubName] = useState('');

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
            <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-2">
                    {isEditingCategory ? (
                        <div className="flex items-center gap-2 flex-grow" onClick={(e) => e.stopPropagation()}>
                           <Input 
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="h-8"
                           />
                           <Button size="icon" variant="ghost" onClick={handleCategoryUpdate} className="h-8 w-8 text-green-600 hover:text-green-700"><Save className="h-4 w-4"/></Button>
                           <Button size="icon" variant="ghost" onClick={() => setIsEditingCategory(false)} className="h-8 w-8"><X className="h-4 w-4"/></Button>
                        </div>
                    ) : (
                        <span className="font-medium">{categoryName}</span>
                    )}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {!isEditingCategory && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingCategory(true)}><Edit className="h-4 w-4"/></Button>}
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
                </div>
            </AccordionTrigger>
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


export default function SettingsPage() {
    const { expenseCategories, incomeCategories, loading, error, updateCategories } = useCategories();
    const { toast } = useToast();

    const [newCategoryName, setNewCategoryName] = useState('');
    const [addingCategoryType, setAddingCategoryType] = useState<'uscite' | 'entrate' | null>(null);

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
            
            {loading && (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            )}

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Errore</AlertTitle>
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
