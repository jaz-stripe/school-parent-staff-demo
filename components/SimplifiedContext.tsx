// components/SimplifiedContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SimplifiedContextType {
  isSimplified: boolean;
  toggleSimplified: () => void;
}

const SimplifiedContext = createContext<SimplifiedContextType>({
  isSimplified: false,
  toggleSimplified: () => {},
});

interface SimplifiedProviderProps {
  children: ReactNode;
}

export function SimplifiedProvider({ children }: SimplifiedProviderProps) {
  const [isSimplified, setIsSimplified] = useState(false);

  const toggleSimplified = () => {
    setIsSimplified((prev) => !prev);
  };

  return (
    <SimplifiedContext.Provider value={{ isSimplified, toggleSimplified }}>
      {children}
    </SimplifiedContext.Provider>
  );
}

export function useSimplified() {
  return useContext(SimplifiedContext);
}
