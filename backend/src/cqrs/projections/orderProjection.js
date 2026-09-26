 // OrderProjection — lado READ del agregado Order.
 // El cliente consulta esta proyección para ver costo total, ítems y
 // estado operacional mientras el comando de compra se procesa
 // (consistencia eventual: el estado puede ir cambiando entre requests).

const { pool } = require('../../db/pool');

function mapOrderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patient_id,
    status: row.status,
    total: Number(row.total),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findOrderById(id) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  return mapOrderRow(rows[0]);
}

async function findOrdersByPatient(patientId) {
  const { rows } = await pool.query(
    'SELECT * FROM orders WHERE patient_id = $1 ORDER BY created_at DESC',
    [patientId]
  );
  return rows.map(mapOrderRow);
}

async function findPrescriptionByOrderId(orderId) {
  const { rows } = await pool.query('SELECT * FROM prescriptions WHERE order_id = $1', [orderId]);
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, documentUrl: row.document_url, verified: row.verified };
}

module.exports = { findOrderById, findOrdersByPatient, findPrescriptionByOrderId, mapOrderRow };
