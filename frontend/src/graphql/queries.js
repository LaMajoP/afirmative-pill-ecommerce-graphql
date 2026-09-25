import { gql } from '@apollo/client';

/**
 * Vista de catálogo: pide SOLO los campos que se muestran en la tarjeta
 * (nombre, precio, presentación) — evita el over-fetching descrito en el
 * problema de REST. La ficha completa se pide aparte, sólo al abrir el
 * detalle (GET_MEDICATION_DETAIL).
 */
export const GET_MEDICATIONS = gql`
  query GetMedications($filter: MedicationFilterInput, $limit: Int, $offset: Int) {
    medications(filter: $filter, limit: $limit, offset: $offset) {
      totalCount
      items {
        id
        commercialName
        presentation
        price
        requiresPrescription
        inStock
        category {
          id
          name
        }
      }
    }
  }
`;

export const GET_MEDICATION_DETAIL = gql`
  query GetMedicationDetail($id: ID!) {
    medication(id: $id) {
      id
      commercialName
      activeIngredient
      laboratory
      presentation
      price
      stock
      inStock
      requiresPrescription
      indications
      contraindications
      category {
        name
      }
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
    }
  }
`;

/**
 * Proyección de la orden: un único request trae ítems + producto de cada
 * ítem + estado, en vez del "API waterfall" de REST (pedido -> items ->
 * producto por cada item).
 */
export const GET_ORDER = gql`
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      status
      total
      createdAt
      prescription {
        documentUrl
        verified
      }
      items {
        id
        quantity
        unitPrice
        subtotal
        medication {
          commercialName
          presentation
        }
      }
    }
  }
`;
