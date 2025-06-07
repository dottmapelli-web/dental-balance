"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email non valida."),
  password: z.string().min(6, "La password deve contenere almeno 6 caratteri."),
});
type LoginFormInputs = z.infer<typeof loginSchema>;

const signupSchema = z.object({
  email: z.string().email("Email non valida."),
  password: z.string().min(6, "La password deve contenere almeno 6 caratteri."),
  confirmPassword: z.string().min(6, "La password deve contenere almeno 6 caratteri."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
});
type SignupFormInputs = z.infer<typeof signupSchema>;


interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "login" | "signup";
}

export default function AuthModal({ isOpen, onOpenChange, initialTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const auth = useAuth();

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLogin,
  } = useForm<LoginFormInputs>({ resolver: zodResolver(loginSchema) });

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors },
    reset: resetSignup,
  } = useForm<SignupFormInputs>({ resolver: zodResolver(signupSchema) });

  useEffect(() => {
    if (isOpen) {
      auth.clearError(); // Clear previous auth errors when modal opens
      resetLogin();
      resetSignup();
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, auth, resetLogin, resetSignup]);

  useEffect(() => {
    // If user logs in successfully, close the modal
    if (auth.user && isOpen) {
      onOpenChange(false);
    }
  }, [auth.user, isOpen, onOpenChange]);

  const onLogin: SubmitHandler<LoginFormInputs> = async (data) => {
    await auth.signIn(data.email, data.password);
  };

  const onSignup: SubmitHandler<SignupFormInputs> = async (data) => {
    await auth.signUp(data.email, data.password);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {activeTab === "login" ? "Accedi" : "Registrati"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {activeTab === "login"
              ? "Inserisci le tue credenziali per accedere."
              : "Crea un nuovo account per iniziare."}
          </DialogDescription>
        </DialogHeader>

        {auth.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errore di Autenticazione</AlertTitle>
            <AlertDescription>{auth.error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Accedi</TabsTrigger>
            <TabsTrigger value="signup">Registrati</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4 py-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" {...registerLogin("email")} />
                {loginErrors.email && <p className="text-sm text-destructive mt-1">{loginErrors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" {...registerLogin("password")} />
                {loginErrors.password && <p className="text-sm text-destructive mt-1">{loginErrors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={auth.loading}>
                {auth.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accedi
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignupSubmit(onSignup)} className="space-y-4 py-4">
              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" {...registerSignup("email")} />
                {signupErrors.email && <p className="text-sm text-destructive mt-1">{signupErrors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" {...registerSignup("password")} />
                {signupErrors.password && <p className="text-sm text-destructive mt-1">{signupErrors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="signup-confirmPassword">Conferma Password</Label>
                <Input id="signup-confirmPassword" type="password" {...registerSignup("confirmPassword")} />
                {signupErrors.confirmPassword && <p className="text-sm text-destructive mt-1">{signupErrors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={auth.loading}>
                {auth.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
