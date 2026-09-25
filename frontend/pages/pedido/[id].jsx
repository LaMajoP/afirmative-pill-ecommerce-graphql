import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_ORDER } from '../../src/graphql/queries';
import { ORDER_STATUS_CHANGED } from '../../src/graphql/subscriptions';

const STATUS_LABEL = {
  PENDING_APPROVAL: { label: 'Pendiente de aprobación', color: '#f59e0b' },
  APPROVED: { label: 'Aprobado', color: '#3b82f6' },
  DISPATCHED: { label: 'Despachado', color: '#16a34a' },
  CANCELLED: { label: 'Cancelado', color: '#dc2626' },
};

export default function SeguimientoPedido() {
  const router = useRouter();
  const { id } = router.query;

  const { data, loading, error, updateQuery } = useQuery(GET_ORDER, {
    variables: { id },
    skip: !id,
  });

  // Escenario C: consistencia eventual visible al cliente — el estado
  // proyectado se actualiza en tiempo real vía GraphQL Subscriptions sin
  // que el usuario tenga que refrescar la página.
  useSubscription(ORDER_STATUS_CHANGED, {
    variables: { orderId: id },
    skip: !id,
    onData: ({ data: subData }) => {
      const updated = subData.data?.orderStatusChanged;
      if (!updated) return;
      updateQuery((prev) => ({
        ...prev,
        order: { ...prev.order, status: updated.status },
      }));
    },
  });

  if (loading) return <div className="container">Cargando pedido...</div>;
  if (error) return <div className="container error-box">Error: {error.message}</div>;
  if (!data?.order) return <div className="container">Pedido no encontrado.</div>;

  const order = data.order;
  const statusInfo = STATUS_LABEL[order.status];

  return (
    <div className="container">
      <Link href="/">&larr; Volver al catálogo</Link>
      <h1>Pedido #{order.id.slice(0, 8)}</h1>

      <span className="status-pill" style={{ background: statusInfo.color, color: 'white' }}>
        {statusInfo.label}
      </span>

      {order.prescription && (
        <p style={{ marginTop: 10 }}>
          📄 Fórmula médica: {order.prescription.verified ? 'verificada' : 'en verificación'}
        </p>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        {order.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span>{item.medication.commercialName} x{item.quantity}</span>
            <span>${item.subtotal.toLocaleString('es-CO')}</span>
          </div>
        ))}
        <hr />
        <strong>Total: ${order.total.toLocaleString('es-CO')}</strong>
      </div>

      <p style={{ color: '#64748b', fontSize: 13, marginTop: 10 }}>
        Este estado se actualiza automáticamente en tiempo real (GraphQL Subscription) cuando el
        equipo de validación farmacéutica cambia el estado del pedido en el backend.
      </p>
    </div>
  );
}
