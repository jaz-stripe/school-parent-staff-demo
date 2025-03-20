// contexts/AccountContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';

interface Account {
  id: number;
  accountId: string;
  name: string;
  email: string;
  logo: string;
  onboarding_complete: boolean;
}

interface AccountContextType {
  currentAccount: Account | null;
  setCurrentAccount: (account: Account | null) => void;
  accounts: Account[];
  loading: boolean;
  error: string | null;
}

const AccountContext = createContext<AccountContextType>({
  currentAccount: null,
  setCurrentAccount: () => {},
  accounts: [],
  loading: true,
  error: null
});

export const AccountProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load available accounts and possibly the last selected account from localStorage
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        
        if (data.success) {
          setAccounts(data.accounts);
          
          // Try to restore the last selected account
          const savedAccountId = localStorage.getItem('selectedAccountId');
          if (savedAccountId) {
            const savedAccount = data.accounts.find(
              (acc: Account) => acc.id.toString() === savedAccountId
            );
            if (savedAccount) {
              setCurrentAccount(savedAccount);
            } else if (data.accounts.length > 0) {
              // If saved account not found, use the first one
              setCurrentAccount(data.accounts[0]);
              localStorage.setItem('selectedAccountId', data.accounts[0].id.toString());
            }
          } else if (data.accounts.length > 0) {
            // If no saved account but accounts exist, use the first one
            setCurrentAccount(data.accounts[0]);
            localStorage.setItem('selectedAccountId', data.accounts[0].id.toString());
          }
        } else {
          setError(data.message || 'Failed to load accounts');
        }
      } catch (err) {
        setError('Failed to load accounts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // When account changes, save to localStorage
  useEffect(() => {
    if (currentAccount) {
      localStorage.setItem('selectedAccountId', currentAccount.id.toString());
    } else {
      localStorage.removeItem('selectedAccountId');
    }
  }, [currentAccount]);

  return (
    <AccountContext.Provider
      value={{
        currentAccount,
        setCurrentAccount,
        accounts,
        loading,
        error
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => useContext(AccountContext);
