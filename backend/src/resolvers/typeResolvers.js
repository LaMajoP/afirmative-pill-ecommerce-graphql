const { findPrescriptionByOrderId } = require('../cqrs/projections/orderProjection');

/**
 * Aquí es exactamente donde ocurriría el problema N+1 clásico:
 * cada Medication necesita resolver su Category, y cada Order necesita
 * resolver N OrderItems que a su vez cada uno necesita su Medication.
 * Todos estos campos usan `loaders.*` (DataLoader) en vez de golpear la
 * base de datos directamente -> se agrupan en lotes automáticamente.
 */

const Medication = {
  category: async (medication, _args, { loaders }) => {
    if (!medication.categoryId) return null;
    return loaders.categoryById.load(medication.categoryId);
  },
  inStock: (medication) => medication.stock > 0,
};

const Order = {
  items: async (order, _args, { loaders }) => {
    return loaders.orderItemsByOrderId.load(order.id);
  },
  prescription: async (order) => findPrescriptionByOrderId(order.id),
};

const OrderItem = {
  medication: async (orderItem, _args, { loaders }) => {
    return loaders.medicationById.load(orderItem.medicationId);
  },
  subtotal: (orderItem) => orderItem.quantity * orderItem.unitPrice,
};

module.exports = { Medication, Order, OrderItem };
