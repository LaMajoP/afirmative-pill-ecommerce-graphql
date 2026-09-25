/**
 * Canal de eventos en memoria para GraphQL Subscriptions.
 * En producción se recomienda `graphql-redis-subscriptions` para que el
 * evento se propague entre múltiples instancias del Gateway/Lambda; aquí
 * se usa el PubSub en memoria de `graphql-subscriptions` para el taller.
 */
const { PubSub } = require('graphql-subscriptions');

const pubsub = new PubSub();

const ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED';

function publishOrderStatusChanged(orderId) {
  pubsub.publish(`${ORDER_STATUS_CHANGED}.${orderId}`, { orderId });
}

module.exports = { pubsub, ORDER_STATUS_CHANGED, publishOrderStatusChanged };
