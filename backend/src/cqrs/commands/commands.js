 // COMANDOS DE DOMINIO (Write Model)
 // Un comando NO es un simple DTO: encapsula la intención de negocio y,
 // antes de ejecutarse, se valida a sí mismo contra las invariantes.
 // Los resolvers de Mutation nunca tocan la base de datos directamente:
 // siempre delegan en un Command -> Handler.


// Write Mode
class CreateOrderCommand {
  constructor({ patientId, items, prescription }) {
    this.patientId = patientId;
    this.items = items; // [{ medicationId, quantity }]
    this.prescription = prescription; // { documentUrl } | null
  }

  /** Validaciones de forma (previas a tocar la BD). */
  validateShape() {
    const errors = [];
    if (!this.patientId) errors.push({ field: 'patientId', message: 'patientId es requerido' });
    if (!this.items || this.items.length === 0) {
      errors.push({ field: 'items', message: 'El pedido debe tener al menos un ítem' });
    }
    (this.items || []).forEach((it, idx) => {
      if (it.quantity <= 0) {
        errors.push({ field: `items[${idx}].quantity`, message: 'La cantidad debe ser mayor a 0' });
      }
    });
    return errors;
  }
}

class UpdateOrderStatusCommand {
  constructor({ orderId, status }) {
    this.orderId = orderId;
    this.status = status;
  }

  /** Invariante: sólo se permiten ciertas transiciones de estado. */
  static ALLOWED_TRANSITIONS = {
    PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
    APPROVED: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: [],
    CANCELLED: [],
  };

  isTransitionAllowed(currentStatus) {
    return UpdateOrderStatusCommand.ALLOWED_TRANSITIONS[currentStatus]?.includes(this.status);
  }
}

module.exports = { CreateOrderCommand, UpdateOrderStatusCommand };
