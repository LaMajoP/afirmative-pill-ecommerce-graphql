import { ApolloProvider } from '@apollo/client';
import { getApolloClient } from '../src/lib/apolloClient';
import { CartProvider } from '../src/context/CartContext';
import '../src/styles/globals.css';

/**
 * Árbol de contexto raíz: ApolloProvider (gestión unificada de estado
 * y caché GraphQL) envolviendo el CartProvider (estado local del carrito).
 */
export default function App({ Component, pageProps }) {
  const client = getApolloClient();
  return (
    <ApolloProvider client={client}>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </ApolloProvider>
  );
}
