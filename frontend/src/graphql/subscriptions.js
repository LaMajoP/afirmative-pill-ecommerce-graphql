import { gql } from '@apollo/client';

export const ORDER_STATUS_CHANGED = gql`
  subscription OnOrderStatusChanged($orderId: ID!) {
    orderStatusChanged(orderId: $orderId) {
      id
      status
      updatedAt
    }
  }
`;
