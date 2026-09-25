import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useMutation } from '@apollo/client';
import { CREATE_ORDER } from '../src/graphql/mutations';
import { useCart } from '../src/context/CartContext';

// En un sistema real, patientId vendría del contexto de autenticación.
const DEMO_PATIENT_ID = '11111111-1111-1111-1111-111111111111';

export default function Carrito() {
  const router = useRouter();
  const { items, removeItem, needsPrescription, total, clearCart } = useCart();
  const [documentUrl, setDocumentUrl] = useState('');
  const [createOrder, { loading }] = useMutation(CREATE_ORDER);
  const [formErrors, setFormErrors] = useState([]);

  const handleCheckout = async () => {
    setFormErrors([]);
    const { data } = await createOrder({
      variables: {
        input: {
          patientId: DEMO_PATIENT_ID,
          items: items.map((i) => ({ medicationId: i.medicationId, quantity: i.quantity })),
          prescription: needsPrescription && documentUrl ? { documentUrl } : null,
        },
      },
    });

    const payload = data.createOrder;
    if (!payload.success) {
      // Respuesta rica en errores de validación (no una excepción cruda)
      setFormErrors(payload.errors);
      return;
    }

    clearCart();
    router.push(`/pedido/${payload.order.id}`);
  };

  if (items.length === 0) {
    return (
      <div className="container">
        <Link href="/">&larr; Volver al catálogo</Link>
        <p>Tu carrito está vacío.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <Link href="/">&larr; Seguir comprando</Link>
      <h1>Tu carrito</h1>

      {items.map((i) => (
        <div className="card" key={i.medicationId} style={{ marginBottom: 10 }}>
          <strong>{i.commercialName}</strong> — x{i.quantity} — ${(i.price * i.quantity).toLocaleString('es-CO')}
          {i.requiresPrescription && <span className="badge badge-rx" style={{ marginLeft: 8 }}>Requiere fórmula</span>}
          <div>
            <button onClick={() => removeItem(i.medicationId)} style={{ background: '#b91c1c', marginTop: 8 }}>
              Quitar
            </button>
          </div>
        </div>
      ))}

      <h2>Total: ${total.toLocaleString('es-CO')}</h2>

      {needsPrescription && (
        <div className="card" style={{ background: '#fff7ed' }}>
          <p>
            ⚠️ Uno o más medicamentos de tu carrito requieren <strong>fórmula médica</strong>.
            Adjunta el soporte antes de continuar.
          </p>
          <input
            placeholder="URL del documento de la fórmula médica"
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {formErrors.length > 0 && (
        <div className="error-box">
          {formErrors.map((err, idx) => (
            <div key={idx}>• {err.message}</div>
          ))}
        </div>
      )}

      <button onClick={handleCheckout} disabled={loading} style={{ marginTop: 16 }}>
        {loading ? 'Procesando...' : 'Confirmar pedido'}
      </button>
    </div>
  );
}
