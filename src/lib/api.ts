import type {
  CreateOrderInput,
  CreateProductInput,
  Order,
  Product,
  UpdateOrderInput,
  UpdateProductInput,
  ApiResponse,
  ApiDeleteResponse,
} from "@/lib/types";
import { buildBackendUrl } from "@/lib/backend";

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }

  const json = (await res.json()) as ApiResponse<T> | ApiDeleteResponse;

  // Unwrap the response according to swagger spec
  if ('data' in json) {
    return json.data as T;
  }

  // For delete responses, return success indicator
  return { ok: true } as T;
}

export const api = {
  listProducts: () => request<Product[]>(buildBackendUrl("/api/products")),
  getProduct: (id: number) => request<Product>(buildBackendUrl(`/api/products/${id}`)),
  createProduct: (data: CreateProductInput | FormData) => {
    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    return request<Product>(buildBackendUrl("/api/products"), {
      method: "POST",
      headers: isForm ? undefined : { "Content-Type": "application/json" },
      body: isForm ? data : JSON.stringify(data),
    });
  },
  updateProduct: (id: number, data: UpdateProductInput | FormData) => {
    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    return request<Product>(buildBackendUrl(`/api/products/${id}`), {
      method: "PUT",
      headers: isForm ? undefined : { "Content-Type": "application/json" },
      body: isForm ? data : JSON.stringify(data),
    });
  },
  deleteProduct: (id: number) =>
    request<{ ok: true }>(buildBackendUrl(`/api/products/${id}`), {
      method: "DELETE",
    }),

  listOrders: () => request<Order[]>(buildBackendUrl("/api/orders")),
  getOrder: (id: number) => request<Order>(buildBackendUrl(`/api/orders/${id}`)),
  createOrder: (data: CreateOrderInput) =>
    request<Order>(buildBackendUrl("/api/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateOrder: (id: number, data: UpdateOrderInput) =>
    request<Order>(buildBackendUrl(`/api/orders/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteOrder: (id: number) =>
    request<{ ok: true }>(buildBackendUrl(`/api/orders/${id}`), {
      method: "DELETE",
    }),
  printOrder: (id: number) =>
    request<{ printed: boolean; devicePath: string; orderId: number }>(
      buildBackendUrl(`/api/printer/orders/${id}/print`),
      {
        method: "POST",
      }
    ),
};
