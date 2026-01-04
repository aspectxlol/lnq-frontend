import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CreateOrderInput,
  CreateProductInput,
  UpdateOrderInput,
  UpdateProductInput,
} from "@/lib/types";

// Query keys
export const queryKeys = {
  products: {
    all: ["products"] as const,
    detail: (id: number) => ["products", id] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (id: number) => ["orders", id] as const,
  },
};

// Product queries
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: api.listProducts,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => api.getProduct(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductInput | FormData) => api.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useUpdateProduct(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProductInput | FormData) => api.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

// Order queries
export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: api.listOrders,
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => api.getOrder(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderInput) => api.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useUpdateOrder(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateOrderInput) => api.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function usePrintOrder() {
  return useMutation({
    mutationFn: (id: number) => api.printOrder(id),
  });
}
