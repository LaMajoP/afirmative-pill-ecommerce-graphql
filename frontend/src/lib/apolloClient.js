import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const HTTP_URL = process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL || 'http://localhost:4000/graphql';
const WS_URL = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql';

const httpLink = new HttpLink({ uri: HTTP_URL });

// El WS link sólo se crea en el navegador (Next.js hace SSR sin `window`)
const wsLink =
  typeof window !== 'undefined'
    ? new GraphQLWsLink(createClient({ url: WS_URL }))
    : null;

// `split` enruta cada operación: las Subscriptions van por WebSocket,
// Queries y Mutations van por HTTP — todo sigue siendo GraphQL puro,
// cero llamadas REST desde el cliente (Zero-REST Mandate).
const splitLink =
  typeof window !== 'undefined' && wsLink
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
        },
        wsLink,
        httpLink
      )
    : httpLink;

export function createApolloClient() {
  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            medications: {
              // Cachea resultados por combinación de filtros/paginación
              keyArgs: ['filter'],
            },
          },
        },
      },
    }),
  });
}

let client;
export function getApolloClient() {
  if (!client) client = createApolloClient();
  return client;
}
