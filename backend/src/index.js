require('dotenv').config();
const { createServer } = require('http');
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const fs = require('fs');
const path = require('path');

const { resolvers } = require('./resolvers');
const { buildContext } = require('./context');

const typeDefs = fs.readFileSync(path.join(__dirname, 'schema', 'schema.graphql'), 'utf8');
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function main() {
  const app = express();
  const httpServer = createServer(app);

  // --- Transporte WebSocket para GraphQL Subscriptions ---
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const serverCleanup = useServer({ schema, context: async () => buildContext() }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      // ÚNICO endpoint expuesto — Zero-REST Mandate: todo pasa por /graphql
      context: async () => buildContext(),
    })
  );

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Afirmative Pill GraphQL API lista en http://localhost:${PORT}/graphql`);
    console.log(`🔌 Subscriptions vía WebSocket en ws://localhost:${PORT}/graphql`);
  });
}

main().catch((err) => {
  console.error('Error iniciando el servidor:', err);
  process.exit(1);
});
