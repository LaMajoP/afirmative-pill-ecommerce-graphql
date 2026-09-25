const { handleCreateOrder, handleUpdateOrderStatus } = require('../cqrs/handlers/OrderCommandHandler');
const { findOrderById } = require('../cqrs/projections/orderProjection');

const Mutation = {
  createOrder: async (_parent, { input }) => {
    const result = await handleCreateOrder(input);
    if (!result.success) return result;
    // El comando sólo devuelve el id; la respuesta se hidrata desde el
    // read model, reforzando la separación write (comando) / read (proyección).
    const order = await findOrderById(result.order.id);
    return { success: true, order, errors: [] };
  },

  updateOrderStatus: async (_parent, { orderId, status }) => {
    const result = await handleUpdateOrderStatus({ orderId, status });
    if (!result.success) return result;
    const order = await findOrderById(result.order.id);
    return { success: true, order, errors: [] };
  },
};

module.exports = { Mutation };
