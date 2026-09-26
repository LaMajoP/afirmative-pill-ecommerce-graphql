// DataLoader Pattern — mitigación del problema N+1.
//
// Cada resolver anidado (ej. OrderItem.medication) pide UNA entidad a la vez,
// pero DataLoader espera un tick del event loop, junta todas las claves
// solicitadas en ese ciclo y dispara UNA sola consulta en lote:
//   SELECT * FROM medications WHERE id IN ($1, $2, ..., $n)
// y memoriza los resultados durante el ciclo de vida de la petición
// (caché por request — se crea un loader nuevo en cada `context()`).

const DataLoader = require('dataloader');
const { pool } = require('../db/pool');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    commercialName: row.commercial_name,
    activeIngredient: row.active_ingredient,
    categoryId: row.category_id,
    laboratory: row.laboratory,
    presentation: row.presentation,
    price: Number(row.price),
    stock: row.stock,
    requiresPrescription: row.requires_prescription,
    indications: row.indications,
    contraindications: row.contraindications,
  };
}

//Batch function: recibe N ids, hace 1 sola consulta, devuelve en el MISMO orden. */
async function batchMedicationsByIds(ids) {
  console.log(`[DataLoader] Batch de ${ids.length} medicamento(s) en 1 sola consulta SQL:`, ids);
  const { rows } = await pool.query(
    'SELECT * FROM medications WHERE id = ANY($1::uuid[])', //resolver las relaciones anidadas
    [ids]
  );
  const byId = new Map(rows.map((r) => [r.id, mapRow(r)]));
  // DataLoader exige que la respuesta respete el orden exacto de `ids`
  return ids.map((id) => byId.get(id) || null);
}

async function batchCategoriesByIds(ids) {
  const { rows } = await pool.query(
    'SELECT * FROM categories WHERE id = ANY($1::uuid[])',
    [ids]
  );
  const byId = new Map(rows.map((r) => [r.id, { id: r.id, name: r.name }]));
  return ids.map((id) => byId.get(id) || null);
}

async function batchOrderItemsByOrderIds(orderIds) {
  const { rows } = await pool.query(
    `SELECT oi.*, o.id as parent_order_id
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE o.id = ANY($1::uuid[])`,
    [orderIds]
  );
  const grouped = new Map(orderIds.map((id) => [id, []]));
  for (const r of rows) {
    grouped.get(r.order_id).push({
      id: r.id,
      medicationId: r.medication_id,
      quantity: r.quantity,
      unitPrice: Number(r.unit_price),
    });
  }
  return orderIds.map((id) => grouped.get(id));
}

 //Crea un set de loaders NUEVO por cada request (ver context.js).
 //Esto evita fugas de caché entre distintos usuarios/peticiones.
function createLoaders() {
  return {
    medicationById: new DataLoader(batchMedicationsByIds),
    categoryById: new DataLoader(batchCategoriesByIds),
    orderItemsByOrderId: new DataLoader(batchOrderItemsByOrderIds),
  };
}

module.exports = { createLoaders, mapRow };
