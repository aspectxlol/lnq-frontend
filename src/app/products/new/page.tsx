"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";
import { styles } from "@/lib/styles";
import { useCreateProduct } from "@/lib/queries";
import { formatNumber, parseFormattedNumber } from "@/lib/format";

export default function NewProductPage() {
  const router = useRouter();
  const createMutation = useCreateProduct();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState<string>("");
  const [image, setImage] = React.useState<File | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrice = Number.parseInt(parseFormattedNumber(price) || "", 10);
    if (!Number.isInteger(parsedPrice)) {
      toast.error("Price must be an integer");
      return;
    }

    try {
      const created = await createMutation.mutateAsync(
        image
          ? (() => {
            const form = new FormData();
            form.set("name", name);
            form.set("price", String(parsedPrice));
            if (description.trim()) form.set("description", description);
            form.set("image", image);
            return form;
          })()
          : {
            name,
            description: description.trim() ? description : undefined,
            price: parsedPrice,
          },
      );
      toast.success("Product created");
      router.push(`/products/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create product");
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>New product</h1>
          <p className={styles.subtitle}>Add an item to your catalog.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className={styles.form} onSubmit={onSubmit}>
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
                onChange={(e) => setPrice(formatNumber(e.target.value))}
                required
              />
            </div>

            <div className={styles.inputRow}>
              <Label>Image (optional)</Label>
              <ImageUpload
                value={image}
                onChange={setImage}
                disabled={createMutation.isPending}
              />
              <div className="text-xs text-muted-foreground">Uses multipart/form-data when an image is selected.</div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Create"}
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
