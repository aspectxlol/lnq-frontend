"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { formatIDR } from "@/lib/format";
import { styles } from "@/lib/styles";
import { useProducts, useCreateOrder } from "@/lib/queries";
import type { Product } from "@/lib/types";

type Item = { productId: number; amount: number; notes: string };

export default function NewOrderPage() {
  const router = useRouter();

  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const createMutation = useCreateOrder();

  const [customerName, setCustomerName] = React.useState("");
  const [pickupDate, setPickupDate] = React.useState("");
  const [orderNotes, setOrderNotes] = React.useState("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState<string>("");

  const byId = React.useMemo(() => {
    const m = new Map<number, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const productOptions = React.useMemo(
    () => products.map((p) => ({ value: String(p.id), label: `${p.name} — ${formatIDR(p.price)}` })),
    [products],
  );

  function addProduct(productId: number) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === productId);
      if (idx === -1) return [...prev, { productId, amount: 1, notes: "" }];
      const next = [...prev];
      next[idx] = { ...next[idx]!, amount: next[idx]!.amount + 1 };
      return next;
    });
  }

  function handleAddSelectedProduct() {
    if (selectedProduct) {
      addProduct(Number.parseInt(selectedProduct, 10));
      setSelectedProduct("");
    }
  }

  function setAmount(productId: number, amount: number) {
    setItems((prev) =>
      prev
        .map((it) => (it.productId === productId ? { ...it, amount } : it))
        .filter((it) => it.amount > 0),
    );
  }

  function setItemNotes(productId: number, notes: string) {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, notes } : it)),
    );
  }

  const total = items.reduce((sum, it) => {
    const p = byId.get(it.productId);
    return sum + (p ? p.price * it.amount : 0);
  }, 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    try {
      await createMutation.mutateAsync({
        customerName,
        pickupDate: pickupDate || null,
        notes: orderNotes || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          amount: it.amount,
          notes: it.notes || undefined,
        })),
      });
      toast.success("Order created");
      router.push("/orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>New order</h1>
          <p className={styles.subtitle}>Build an order from your product catalog.</p>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.inputRow}>
              <Label htmlFor="customer">Customer name</Label>
              <Input id="customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>

            <div className={styles.inputRow}>
              <Label htmlFor="pickupDate">Pickup date (optional)</Label>
              <Input
                id="pickupDate"
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>

            <div className={styles.inputRow}>
              <Label htmlFor="orderNotes">Order notes (optional)</Label>
              <Textarea
                id="orderNotes"
                placeholder="e.g., Call when ready, Rush order"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Combobox
                  options={productOptions}
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                  placeholder="Select a product..."
                  searchPlaceholder="Search products..."
                  emptyText="No products found."
                  disabled={loadingProducts}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddSelectedProduct}
                disabled={!selectedProduct || loadingProducts}
              >
                Add
              </Button>
            </div>

            <div className={styles.tableWrap}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No items yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it) => {
                      const p = byId.get(it.productId);
                      return (
                        <TableRow key={it.productId}>
                          <TableCell className="font-medium">{p ? p.name : `#${it.productId}`}</TableCell>
                          <TableCell>{p ? formatIDR(p.price) : "—"}</TableCell>
                          <TableCell className="w-[140px]">
                            <Input
                              inputMode="numeric"
                              value={String(it.amount)}
                              onChange={(e) =>
                                setAmount(
                                  it.productId,
                                  Number.parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="w-[200px]">
                            <Input
                              placeholder="e.g., Extra hot, No sugar"
                              value={it.notes}
                              onChange={(e) => setItemNotes(it.productId, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>{p ? formatIDR(p.price * it.amount) : "—"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-lg font-semibold">{formatIDR(total)}</div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Create order"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={createMutation.isPending}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
