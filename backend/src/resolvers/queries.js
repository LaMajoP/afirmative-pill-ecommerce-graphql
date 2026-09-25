const { findMedications, findMedicationById, findCategories } = require('../cqrs/projections/catalogProjection');
const { findOrderById, findOrdersByPatient } = require('../cqrs/projections/orderProjection');

const Query = {
  medications: async (_parent, { filter = {}, limit, offset }) => {
    return findMedications(filter, limit, offset);
  },

  medication: async (_parent, { id }, { loaders }) => {
    // Usa el DataLoader también aquí para compartir la caché por-request
    // con cualquier otro campo que pida el mismo id en la misma consulta.
    return loaders.medicationById.load(id);
  },

  categories: async () => findCategories(),

  order: async (_parent, { id }) => findOrderById(id),

  ordersByPatient: async (_parent, { patientId }) => findOrdersByPatient(patientId),
};

module.exports = { Query };
