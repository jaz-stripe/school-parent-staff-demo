// pages/_app.tsx
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '../store';
import { AccountProvider } from '../contexts/AccountContext';

// Import global styles
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <AccountProvider>
        <Component {...pageProps} />
      </AccountProvider>
    </Provider>
  );
}

export default MyApp;
