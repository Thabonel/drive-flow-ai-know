import { Check, X } from 'lucide-react';

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'One uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'One lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      label: 'One number',
      met: /[0-9]/.test(password),
    },
    {
      label: 'One special character (!@#$%^&*)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];

  // Don't show anything if password is empty
  if (!password) return null;

  return (
    <div className="space-y-2 mt-3 p-3 bg-muted/50 rounded-lg">
      <p className="text-xs font-medium text-muted-foreground">Password requirements:</p>
      <ul className="space-y-1.5">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={`flex items-center gap-2 text-sm transition-colors ${
              req.met ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'
            }`}
          >
            {req.met ? (
              <Check className="h-4 w-4 flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 flex-shrink-0 opacity-50" />
            )}
            <span className={req.met ? 'font-medium' : ''}>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
