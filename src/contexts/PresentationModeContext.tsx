import { createContext, useContext, useState, ReactNode } from 'react';

interface PresentationModeContextType {
  isPresentationMode: boolean;
  enterPresentationMode: () => void;
  exitPresentationMode: () => void;
}

const PresentationModeContext = createContext<PresentationModeContextType | undefined>(undefined);

export function PresentationModeProvider({ children }: { children: ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  const enterPresentationMode = () => {
    setIsPresentationMode(true);
  };

  const exitPresentationMode = () => {
    setIsPresentationMode(false);
  };

  return (
    <PresentationModeContext.Provider
      value={{ isPresentationMode, enterPresentationMode, exitPresentationMode }}
    >
      {children}
    </PresentationModeContext.Provider>
  );
}

export function usePresentationMode() {
  const context = useContext(PresentationModeContext);
  if (context === undefined) {
    throw new Error('usePresentationMode must be used within a PresentationModeProvider');
  }
  return context;
}
