import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_MEDICATION_DETAIL } from '../../src/graphql/queries';
import { useCart } from '../../src/context/CartContext';

export default function FichaMedicamento() {
  const router = useRouter();
  const { id } = router.query;
  const { addItem } = useCart();

  const { data, loading, error } = useQuery(GET_MEDICATION_DETAIL, {
    variables: { id },
    skip: !id,
  });

  if (loading) return <div className="container">Cargando ficha técnica...</div>;
  if (error) return <div className="container error-box">Error: {error.message}</div>;
  if (!data?.medication) return <div className="container">Medicamento no encontrado.</div>;

  const med = data.medication;

  return (
    <div className="container">
      <Link href="/">&larr; Volver al catálogo</Link>
      <div className="card" style={{ marginTop: 16 }}>
        <h1>{med.commercialName}</h1>
        <p><strong>Principio activo:</strong> {med.activeIngredient}</p>
        <p><strong>Laboratorio:</strong> {med.laboratory}</p>
        <p><strong>Presentación:</strong> {med.presentation}</p>
        <p><strong>Categoría:</strong> {med.category?.name}</p>
        <p><strong>Indicaciones:</strong> {med.indications || 'No especificadas'}</p>
        {med.contraindications && <p><strong>Contraindicaciones:</strong> {med.contraindications}</p>}
        <p className="price">${med.price.toLocaleString('es-CO')}</p>
        <span className={`badge ${med.requiresPrescription ? 'badge-rx' : 'badge-otc'}`}>
          {med.requiresPrescription ? 'Requiere fórmula médica' : 'Venta libre'}
        </span>
        <p>Stock disponible: {med.stock}</p>
        <button disabled={!med.inStock} onClick={() => addItem(med, 1)}>
          {med.inStock ? 'Agregar al carrito' : 'Agotado'}
        </button>
      </div>
    </div>
  );
}
