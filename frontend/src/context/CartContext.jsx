import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // [{ medicationId, commercialName, price, quantity, requiresPrescription }]

  const addItem = (medication, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.medicationId === medication.id);
      if (existing) {
        return prev.map((i) =>
          i.medicationId === medication.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          medicationId: medication.id,
          commercialName: medication.commercialName,
          price: medication.price,
          requiresPrescription: medication.requiresPrescription,
          quantity,
        },
      ];
    });
  };

  const removeItem = (medicationId) => {
    setItems((prev) => prev.filter((i) => i.medicationId !== medicationId));
  };

  const clearCart = () => setItems([]);

  const needsPrescription = useMemo(() => items.some((i) => i.requiresPrescription), [items]);
  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);

  const value = { items, addItem, removeItem, clearCart, needsPrescription, total };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
