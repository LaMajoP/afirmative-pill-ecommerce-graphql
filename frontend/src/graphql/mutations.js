import { gql } from '@apollo/client';

export const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      success
      errors {
        field
        message
      }
      order {
        id
        status
        total
      }
    }
  }
`;

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($orderId: ID!, $status: OrderStatus!) {
    updateOrderStatus(orderId: $orderId, status: $status) {
      success
      errors {
        field
        message
      }
      order {
        id
        status
      }
    }
  }
`;
