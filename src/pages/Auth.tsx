import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Eye, EyeOff, AlertCircle, Mail, CheckCircle } from 'lucide-react';
import { validatePassword, validateEmail, validateFullName, getPasswordStrength } from '@/lib/validation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordRequirements } from '@/components/PasswordRequirements';

const Auth = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string[];
    fullName?: string;
    confirmPassword?: string;
  }>({});

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    await signIn(email, password);
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationErrors({});

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    // Validate all inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const nameValidation = validateFullName(fullName);

    const errors: typeof validationErrors = {};

    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }

    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors;
    }

    if (!nameValidation.isValid) {
      errors.fullName = nameValidation.error;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // If there are validation errors, show them and don't submit
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    const result = await signUp(email, password, fullName);
    setIsLoading(false);

    // Show success screen if signup succeeded
    if (!result.error) {
      setSignUpEmail(email);
      setSignUpSuccess(true);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    await resetPassword(email);
    setResetEmailSent(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Brain className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground">AI Query Hub</h1>
        </div>
        
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="reset">Reset</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>
                  Sign in to your AI Query Hub account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showSignInPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showSignInPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>{signUpSuccess ? 'Check Your Email' : 'Create account'}</CardTitle>
                <CardDescription>
                  {signUpSuccess
                    ? 'We\'ve sent you a confirmation email'
                    : 'Sign up for your AI Query Hub account'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {signUpSuccess ? (
                  <div className="space-y-4 py-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <Mail className="h-8 w-8 text-green-600 dark:text-green-500" />
                      </div>
                    </div>

                    <div className="text-center space-y-2">
                      <h3 className="font-semibold text-lg">Confirm Your Email</h3>
                      <p className="text-sm text-muted-foreground">
                        We've sent a confirmation email to:
                      </p>
                      <p className="font-medium text-foreground">{signUpEmail}</p>
                    </div>

                    <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Next steps:</strong>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Check your inbox (and spam folder)</li>
                          <li>Click the confirmation link in the email</li>
                          <li>You'll be automatically logged in</li>
                        </ol>
                      </AlertDescription>
                    </Alert>

                    <div className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Didn't receive the email?
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSignUpSuccess(false);
                          setSignUpEmail('');
                          setSignUpPassword('');
                          setConfirmPassword('');
                        }}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      required
                      className={validationErrors.fullName ? 'border-red-500' : ''}
                    />
                    {validationErrors.fullName && (
                      <p className="text-sm text-red-500">{validationErrors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      className={validationErrors.email ? 'border-red-500' : ''}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-red-500">{validationErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showSignUpPassword ? "text" : "password"}
                        placeholder="Create a password"
                        required
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        className={`pr-10 ${validationErrors.password ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showSignUpPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Password requirements checklist */}
                    <PasswordRequirements password={signUpPassword} />

                    {/* Password strength indicator */}
                    {signUpPassword && (
                      <div className="space-y-1 mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Password strength:</span>
                          <span
                            className="font-medium capitalize"
                            style={{ color: getPasswordStrength(signUpPassword).color }}
                          >
                            {getPasswordStrength(signUpPassword).strength.replace('-', ' ')}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${getPasswordStrength(signUpPassword).percentage}%`,
                              backgroundColor: getPasswordStrength(signUpPassword).color
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pr-10 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {validationErrors.confirmPassword && (
                      <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                    )}
                    {/* Show match indicator when both fields have values */}
                    {signUpPassword && confirmPassword && !validationErrors.confirmPassword && (
                      <p className={`text-sm ${signUpPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                        {signUpPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reset">
            <Card>
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  Enter your email to receive a password reset link
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resetEmailSent ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Password reset email sent! Check your inbox for instructions.
                    </p>
                    <Button
                      variant="link"
                      onClick={() => setResetEmailSent(false)}
                      className="mt-2"
                    >
                      Send another email
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;