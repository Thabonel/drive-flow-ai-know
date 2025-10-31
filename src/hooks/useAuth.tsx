import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      // Use the new registration Edge Function with backend validation
      const { data: registerData, error: registerError } = await supabase.functions.invoke('register-user', {
        body: {
          email,
          password,
          fullName
        }
      });

      // Handle validation errors from backend
      if (registerError) {
        toast({
          title: "Registration Error",
          description: registerError.message || "Failed to create account",
          variant: "destructive",
        });
        return { error: registerError };
      }

      // Handle specific validation errors
      if (registerData?.validationErrors) {
        const errorMessages: string[] = [];

        if (registerData.validationErrors.email) {
          errorMessages.push(registerData.validationErrors.email);
        }

        if (registerData.validationErrors.password) {
          errorMessages.push(...registerData.validationErrors.password);
        }

        if (registerData.validationErrors.fullName) {
          errorMessages.push(registerData.validationErrors.fullName);
        }

        toast({
          title: "Validation Error",
          description: errorMessages.join('. '),
          variant: "destructive",
        });
        return { error: { message: errorMessages.join('. ') } };
      }

      // Handle general errors
      if (registerData?.error) {
        toast({
          title: "Registration Error",
          description: registerData.error,
          variant: "destructive",
        });
        return { error: { message: registerData.error } };
      }

      // Success
      toast({
        title: "Registration Successful",
        description: registerData?.message || "Please check your email to verify your account.",
      });

      return { error: null };

    } catch (error) {
      console.error('Sign up error:', error);

      toast({
        title: "Registration Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });

      return { error: error instanceof Error ? error : new Error('Registration failed') };
    }
  }, []); // No dependencies - function doesn't depend on props or state

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  }, []); // No dependencies

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, []); // No dependencies

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Password Reset Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Email Sent",
      description: "Check your inbox for a password reset link.",
    });

    return { error: null };
  }, []); // No dependencies

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }), [user, session, loading, signUp, signIn, signOut, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}