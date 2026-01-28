import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, inviteToken?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: any }>;
  refreshUser: () => Promise<void>;
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

  const signUp = async (email: string, password: string, fullName: string, inviteToken?: string) => {
    try {
      // Use the new registration Edge Function with backend validation
      const { data: registerData, error: registerError } = await supabase.functions.invoke('register-user', {
        body: {
          email,
          password,
          fullName,
          inviteToken
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

      // If session was returned (invite token used), set it for auto-login
      if (registerData?.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: registerData.session.access_token,
          refresh_token: registerData.session.refresh_token
        });

        if (!sessionError) {
          toast({
            title: "Welcome to AI Query Hub!",
            description: registerData.message || "Your Executive account is ready.",
            duration: 5000,
          });
          return { error: null };
        }
      }

      // Success (regular signup with email confirmation)
      toast({
        title: "Account Created",
        description: registerData?.message || "We've sent a confirmation email to your inbox. Please check your email (and spam folder) to activate your account.",
        duration: 7000,
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
  };

  const signIn = async (email: string, password: string) => {
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
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    // Clear local state regardless of error
    setUser(null);
    setSession(null);

    // Only show error if it's not the "session missing" error
    // (which just means user was already signed out)
    if (error && !error.message.includes('session missing')) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
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
  };

  const resendConfirmationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      toast({
        title: "Resend Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Confirmation Email Sent",
      description: "Please check your inbox (and spam folder).",
    });

    return { error: null };
  };

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUser(data.user);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      resendConfirmationEmail,
      refreshUser,
    }}>
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