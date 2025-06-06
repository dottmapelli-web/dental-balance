
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/auth-context'; // Assuming auth-context.tsx exists in src/contexts
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, UserPlus } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email("Email non valida."),
  password: z.string().min(6, "La password deve essere di almeno 6 caratteri."),
});
type LoginFormData = z.infer<typeof loginSchema>;

const signupSchema = z.object({
  email: z.string().email("Email non valida."),
  password: z.string().min(6, "La password deve essere di almeno 6 caratteri."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
});
type SignupFormData = z.infer<typeof signupSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "login" | "signup";
}

export default function AuthModal({ isOpen, onOpenChange, initialTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">(initialTab);
  const { login, signup, loading, error: authError, clearError } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (isOpen) {
      clearError?.(); // Clear previous errors when modal opens
      setActiveTab(initialTab); // Reset to initial tab
      loginForm.reset();
      signupForm.reset();
    }
  }, [isOpen, initialTab, loginForm, signupForm, clearError]);

  const onLoginSubmit: SubmitHandler<LoginFormData> = async (data) => {
    const success = await login(data.email, data.password);
    if (success) {
      toast({ title: "Accesso Effettuato", description: "Bentornato!" });
      onOpenChange(false);
    }
  };

  const onSignupSubmit: SubmitHandler<SignupFormData> = async (data) => {
    const success = await signup(data.email, data.password);
    if (success) {
      toast({ title: "Registrazione Completata", description: "Benvenuto! Ora puoi accedere." });
      setActiveTab("login"); // Switch to login tab after successful signup
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {activeTab === "login" ? "Accedi a Dental Balance" : "Registrati a Dental Balance"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {activeTab === "login"
              ? "Inserisci le tue credenziali per continuare."
              : "Crea un nuovo account per iniziare."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "signup")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Accedi</TabsTrigger>
            <TabsTrigger value="signup">Registrati</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="tua@email.com" {...loginForm.register("email")} />
                {loginForm.formState.errors.email && <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" placeholder="••••••••" {...loginForm.register("password")} />
                {loginForm.formState.errors.password && <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.password.message}</p>}
              </div>
              {authError && activeTab === "login" && <p className="text-sm text-destructive text-center">{authError}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && activeTab === "login" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Accedi
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" placeholder="tua@email.com" {...signupForm.register("email")} />
                {signupForm.formState.errors.email && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" placeholder="Min. 6 caratteri" {...signupForm.register("password")} />
                {signupForm.formState.errors.password && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Conferma Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Ripeti la password" {...signupForm.register("confirmPassword")} />
                {signupForm.formState.errors.confirmPassword && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.confirmPassword.message}</p>}
              </div>
              {authError && activeTab === "signup" && <p className="text-sm text-destructive text-center">{authError}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && activeTab === "signup" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Registrati
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full">
              Chiudi
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
