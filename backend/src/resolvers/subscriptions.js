const { pubsub, ORDER_STATUS_CHANGED } = require('../cqrs/eventBus');
const { findOrderById } = require('../cqrs/projections/orderProjection');

const Subscription = {
  orderStatusChanged: {
    subscribe: (_parent, { orderId }) => pubsub.asyncIterator(`${ORDER_STATUS_CHANGED}.${orderId}`),
    // El evento publicado sólo trae el orderId; se re-hidrata desde la
    // proyección para que el cliente siempre reciba el estado más reciente.
    resolve: async ({ orderId }) => findOrderById(orderId),
  },
};

module.exports = { Subscription };
