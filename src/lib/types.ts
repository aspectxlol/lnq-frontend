export type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageId: string | null;
  createdAt: string;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  price: number;
  imageId?: string;
};

export type UpdateProductInput = {
  name?: string;
  description?: string;
  price?: number;
  imageId?: string;
};

export type OrderItem =
  | {
    id: number;
    orderId: number;
    itemType: 'product';
    productId: number;
    amount: number;
    notes: string | null;
    priceAtSale?: number;
    product: Product | null;
  }
  | {
    id: number;
    orderId: number;
    itemType: 'custom';
    customName: string;
    customPrice: number;
    notes: string | null;
  };

export type Order = {
  id: number;
  customerName: string;
  pickupDate: string | null;
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
};

export type CreateOrderInput = {
  customerName: string;
  pickupDate?: string | null;
  notes?: string;
  items: Array<
    | {
      itemType: 'product';
      productId: number;
      amount: number;
      notes?: string;
      priceAtSale?: number;
    }
    | {
      itemType: 'custom';
      customName: string;
      customPrice: number;
      notes?: string;
    }
  >;
};

export type UpdateOrderInput = {
  customerName?: string;
  pickupDate?: string | null;
  notes?: string;
  items?: Array<
    | {
      itemType: 'product';
      productId: number;
      amount: number;
      notes?: string;
      priceAtSale?: number;
    }
    | {
      itemType: 'custom';
      customName: string;
      customPrice: number;
      notes?: string;
    }
  >;
};

// API Response wrapper types
export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type ApiErrorResponse = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

export type ApiDeleteResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};
