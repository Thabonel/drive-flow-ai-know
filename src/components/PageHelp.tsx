// Reusable page help component with dialog

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

interface PageHelpProps {
  title: string;
  description: string;
  tips?: string[];
}

export function PageHelp({ title, description, tips }: PageHelpProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-4 space-y-4">
            <p className="text-base">{description}</p>

            {tips && tips.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-sm">Quick Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
