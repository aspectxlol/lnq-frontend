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

export type OrderItem = {
  id: number;
  orderId: number;
  productId: number;
  amount: number;
  product: Product | null;
};

export type Order = {
  id: number;
  customerName: string;
  pickupDate: string | null;
  items: OrderItem[];
  createdAt: string;
};

export type CreateOrderInput = {
  customerName: string;
  pickupDate?: string | null;
  items: Array<{ productId: number; amount: number }>;
};

export type UpdateOrderInput = {
  customerName?: string;
  pickupDate?: string | null;
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
