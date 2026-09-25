/**
 * OrderCommandHandler — lado WRITE del CQRS.
 *
 * Reglas de negocio farmacéuticas protegidas aquí (no en el frontend,
 * no en el resolver): son invariantes del dominio.
 *  1. No se puede comprar un ítem sin stock suficiente.
 *  2. Si algún medicamento requiere fórmula médica, el comando debe traer
 *     evidencia de prescripción (documentUrl) o se rechaza ANTES de tocar
 *     el inventario.
 *  3. El decremento de stock y la creación del pedido ocurren en una
 *     transacción SQL para garantizar consistencia atómica bajo concurrencia
 *     (ej. dos pacientes comprando el último frasco disponible).
 */
const { pool } = require('../../db/pool');
const { CreateOrderCommand, UpdateOrderStatusCommand } = require('../commands/commands');
const { publishOrderStatusChanged } = require('../eventBus');

async function handleCreateOrder(rawInput) {
  const command = new CreateOrderCommand(rawInput);
  const shapeErrors = command.validateShape();
  if (shapeErrors.length) {
    return { success: false, order: null, errors: shapeErrors };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ids = command.items.map((i) => i.medicationId);
    const { rows: meds } = await client.query(
      'SELECT * FROM medications WHERE id = ANY($1::uuid[]) FOR UPDATE',
      [ids]
    );
    const medById = new Map(meds.map((m) => [m.id, m]));

    const errors = [];
    let requiresPrescription = false;
    let total = 0;

    for (const item of command.items) {
      const med = medById.get(item.medicationId);
      if (!med) {
        errors.push({ field: 'items', message: `Medicamento ${item.medicationId} no existe` });
        continue;
      }
      if (med.stock < item.quantity) {
        errors.push({
          field: 'items',
          message: `Stock insuficiente para "${med.commercial_name}" (disponible: ${med.stock})`,
        });
      }
      if (med.requires_prescription) requiresPrescription = true;
      total += Number(med.price) * item.quantity;
    }

    // Invariante de negocio: fórmula médica obligatoria
    if (requiresPrescription && !command.prescription?.documentUrl) {
      errors.push({
        field: 'prescription',
        message: 'Uno o más medicamentos requieren fórmula médica verificada antes de continuar',
      });
    }

    if (errors.length) {
      await client.query('ROLLBACK');
      return { success: false, order: null, errors };
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (patient_id, status, total) VALUES ($1, 'PENDING_APPROVAL', $2) RETURNING *`,
      [command.patientId, total]
    );
    const order = orderRows[0];

    for (const item of command.items) {
      const med = medById.get(item.medicationId);
      await client.query(
        `INSERT INTO order_items (order_id, medication_id, quantity, unit_price) VALUES ($1,$2,$3,$4)`,
        [order.id, item.medicationId, item.quantity, med.price]
      );
      // Decremento atómico de inventario (protegido por el FOR UPDATE de arriba)
      await client.query(
        `UPDATE medications SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.medicationId]
      );
    }

    if (command.prescription?.documentUrl) {
      await client.query(
        `INSERT INTO prescriptions (order_id, document_url, verified) VALUES ($1,$2,false)`,
        [order.id, command.prescription.documentUrl]
      );
    }

    await client.query('COMMIT');
    return { success: true, order: { id: order.id }, errors: [] };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, order: null, errors: [{ field: 'server', message: err.message }] };
  } finally {
    client.release();
  }
}

async function handleUpdateOrderStatus({ orderId, status }) {
  const command = new UpdateOrderStatusCommand({ orderId, status });

  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const current = rows[0];
  if (!current) {
    return { success: false, order: null, errors: [{ field: 'orderId', message: 'Pedido no encontrado' }] };
  }
  if (!command.isTransitionAllowed(current.status)) {
    return {
      success: false,
      order: null,
      errors: [{ field: 'status', message: `Transición inválida: ${current.status} -> ${status}` }],
    };
  }

  await pool.query(`UPDATE orders SET status = $1, updated_at = now() WHERE id = $2`, [status, orderId]);

  // Notifica a los clientes suscritos (GraphQL Subscription) del cambio de
  // estado — así se resuelve la consistencia eventual visible en la UI.
  publishOrderStatusChanged(orderId);

  return { success: true, order: { id: orderId }, errors: [] };
}

module.exports = { handleCreateOrder, handleUpdateOrderStatus };
