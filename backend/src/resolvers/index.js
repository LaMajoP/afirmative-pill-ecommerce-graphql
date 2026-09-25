const { GraphQLScalarType, Kind } = require('graphql');
const { Query } = require('./queries');
const { Mutation } = require('./mutations');
const { Subscription } = require('./subscriptions');
const { Medication, Order, OrderItem } = require('./typeResolvers');

const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Fecha/hora en formato ISO 8601',
  serialize: (value) => new Date(value).toISOString(),
  parseValue: (value) => new Date(value),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

const resolvers = {
  DateTime,
  Query,
  Mutation,
  Subscription,
  Medication,
  Order,
  OrderItem,
};

module.exports = { resolvers };
