 //CatalogProjection — lado READ del CQRS.
 // Consulta optimizada para el escenario de alta lectura del catálogo
 // (búsqueda facetada por nombre, principio activo o categoría) sin pasar
 // por la capa de comandos ni bloquear filas.
 
const { pool } = require('../../db/pool');
const { mapRow } = require('../../dataloaders');

async function findMedications({ search, categoryId, requiresPrescription }, limit = 20, offset = 0) {
  const clauses = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(commercial_name ILIKE $${params.length} OR active_ingredient ILIKE $${params.length})`);
  }
  if (categoryId) {
    params.push(categoryId);
    clauses.push(`category_id = $${params.length}`);
  }
  if (typeof requiresPrescription === 'boolean') {
    params.push(requiresPrescription);
    clauses.push(`requires_prescription = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countResult = await pool.query(`SELECT count(*) FROM medications ${where}`, params);
  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT * FROM medications ${where} ORDER BY commercial_name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    items: rows.map(mapRow),
    totalCount: Number(countResult.rows[0].count),
  };
}

async function findMedicationById(id) {
  const { rows } = await pool.query('SELECT * FROM medications WHERE id = $1', [id]);
  return mapRow(rows[0]);
}

async function findCategories() {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY name ASC');
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

module.exports = { findMedications, findMedicationById, findCategories };
