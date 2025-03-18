// pages/_app.tsx
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '../store';
import { SimplifiedProvider } from '../components/SimplifiedContext';

// Import global styles
import '../styles/globals.css';
import '../styles/stripe-elements.css'; // Add this line

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <SimplifiedProvider>
        <Component {...pageProps} />
      </SimplifiedProvider>
    </Provider>
  );
}

export default MyApp;
