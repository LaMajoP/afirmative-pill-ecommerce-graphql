import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_MEDICATIONS, GET_CATEGORIES } from '../src/graphql/queries';
import { useCart } from '../src/context/CartContext';

export default function Catalogo() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { items: cartItems, addItem } = useCart();

  const { data: catData } = useQuery(GET_CATEGORIES);

  // Escenario A: vista condensada (nombre, precio, presentación) — sin
  // sobrecargar la conexión móvil con fichas clínicas completas.
  const { data, loading, error } = useQuery(GET_MEDICATIONS, {
    variables: {
      filter: { search: search || undefined, categoryId: categoryId || undefined },
      limit: 24,
      offset: 0,
    },
  });

  return (
    <div>
      <nav className="navbar">
        <strong>💊 Afirmative Pill</strong>
        <Link href="/carrito">Carrito ({cartItems.length})</Link>
      </nav>

      <div className="container">
        <h1>Catálogo de medicamentos</h1>

        <div className="filters">
          <input
            placeholder="Buscar por nombre comercial o principio activo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas las categorías</option>
            {catData?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loading && <p>Cargando catálogo...</p>}
        {error && <div className="error-box">Error al cargar el catálogo: {error.message}</div>}

        <div className="grid">
          {data?.medications.items.map((med) => (
            <div className="card" key={med.id}>
              <Link href={`/medicamento/${med.id}`}>
                <strong>{med.commercialName}</strong>
              </Link>
              <div>{med.presentation}</div>
              <div className="price">${med.price.toLocaleString('es-CO')}</div>
              <span className={`badge ${med.requiresPrescription ? 'badge-rx' : 'badge-otc'}`}>
                {med.requiresPrescription ? 'Requiere fórmula' : 'Venta libre'}
              </span>
              <div style={{ marginTop: 10 }}>
                <button disabled={!med.inStock} onClick={() => addItem(med, 1)}>
                  {med.inStock ? 'Agregar al carrito' : 'Agotado'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {data && data.medications.items.length === 0 && <p>No se encontraron medicamentos.</p>}
      </div>
    </div>
  );
}
