"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/format";
import { styles } from "@/lib/styles";
import { useProduct, useUpdateProduct, useDeleteProduct } from "@/lib/queries";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number.parseInt(params.id, 10);

  const { data: product, isLoading: loading } = useProduct(id);
  const updateMutation = useUpdateProduct(id);
  const deleteMutation = useDeleteProduct();

  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [image, setImage] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setPrice(String(product.price));
    }
  }, [product]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrice = Number.parseInt(price || "", 10);
    if (!Number.isInteger(parsedPrice)) {
      toast.error("Price must be an integer");
      return;
    }
    try {
      // If there's a new image, use FormData
      // Otherwise, use JSON
      if (image) {
        const form = new FormData();
        form.set("name", name);
        form.set("price", String(parsedPrice));
        if (description.trim()) form.set("description", description);
        form.set("image", image);
        await updateMutation.mutateAsync(form);
      } else {
        await updateMutation.mutateAsync({
          name,
          description: description.trim() ? description : "",
          price: parsedPrice,
        });
      }
      toast.success("Product saved");
      setImage(null); // Clear the image after save
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    }
  }

  async function onDelete() {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Product deleted");
      router.push("/products");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product");
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Product</h1>
          <p className={styles.subtitle}>
            {product ? `Current price: ${formatIDR(product.price)}` : "Edit product details"}
          </p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={loading}>
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className={styles.form}>
              <div className={styles.inputRow}>
                <Skeleton className="h-4 w-[40px] mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className={styles.inputRow}>
                <Skeleton className="h-4 w-[80px] mb-2" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className={styles.inputRow}>
                <Skeleton className="h-4 w-[70px] mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className={styles.inputRow}>
                <Skeleton className="h-4 w-[100px] mb-2" />
                <Skeleton className="h-40 w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-[80px]" />
                <Skeleton className="h-10 w-[80px]" />
              </div>
            </div>
          ) : (
            <form className={styles.form} onSubmit={onSave}>
              <div className={styles.inputRow}>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className={styles.inputRow}>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className={styles.inputRow}>
                <Label htmlFor="price">Price (IDR)</Label>
                <Input
                  id="price"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                />
              </div>

              <div className={styles.inputRow}>
                <Label>Update Image (optional)</Label>
                <ImageUpload
                  value={image}
                  onChange={setImage}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={updateMutation.isPending}>
                  Back
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete product?"
        description="This action cannot be undone."
        confirmText="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={onDelete}
      />
    </main>
  );
}
