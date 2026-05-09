import { createEffect, createSignal, Show } from "solid-js";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { ProductImageManager } from "./product-image-manager";
import type { ProductResponse, UpdateProduct } from "./types";

export function ProductDetailSheet(props: {
	product: ProductResponse | null;
	onClose: () => void;
	onUpdated: (product: ProductResponse) => void;
	onDeleted: (id: string) => void;
}) {
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [brand, setBrand] = createSignal("");
	const [ean, setEan] = createSignal("");
	const [allergenCodes, setAllergenCodes] = createSignal("");
	const [displayOrder, setDisplayOrder] = createSignal("0");
	const [isActive, setIsActive] = createSignal(true);
	const [saving, setSaving] = createSignal(false);
	const [deleting, setDeleting] = createSignal(false);
	const [confirmDelete, setConfirmDelete] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	createEffect(() => {
		const p = props.product;
		if (p) {
			setName(p.name);
			setDescription(p.description ?? "");
			setBrand(p.brand ?? "");
			setEan(p.ean ?? "");
			setAllergenCodes(p.allergen_codes.join(", "));
			setDisplayOrder(String(p.display_order));
			setIsActive(p.is_active);
			setError(null);
			setConfirmDelete(false);
		}
	});

	const handleSave = async () => {
		const product = props.product;
		if (!product) return;

		if (!name().trim()) {
			setError("Name is required.");
			return;
		}

		setError(null);
		setSaving(true);

		const codes = allergenCodes()
			.split(",")
			.map((c) => c.trim())
			.filter(Boolean);

		const body: UpdateProduct = {
			name: name().trim(),
			description: description().trim() || null,
			brand: brand().trim() || null,
			ean: ean().trim() || null,
			allergen_codes: codes,
			display_order: Number.parseInt(displayOrder(), 10) || 0,
			is_active: isActive(),
		};

		const res = await apiFetch<{
			data: ProductResponse & { detail?: string };
			status: number;
		}>(`/api/platform/products/${product.id}`, {
			method: "PUT",
			body: JSON.stringify(body),
		});

		setSaving(false);

		if (res.status === 200) {
			props.onUpdated(res.data);
		} else {
			setError(res.data?.detail ?? "Failed to update product");
		}
	};

	const handleDelete = async () => {
		const product = props.product;
		if (!product) return;

		setDeleting(true);
		const res = await apiFetch<{ status: number }>(`/api/platform/products/${product.id}`, {
			method: "DELETE",
		});
		setDeleting(false);

		if (res.status === 204) {
			props.onDeleted(product.id);
		} else {
			setError("Failed to delete product");
		}
	};

	return (
		<Sheet
			open={props.product !== null}
			onOpenChange={(open) => {
				if (!open) props.onClose();
			}}
		>
			<SheetContent class="flex flex-col overflow-y-auto sm:max-w-md">
				<Show when={props.product}>
					{(product) => (
						<>
							<SheetHeader>
								<SheetTitle>Edit Product</SheetTitle>
								<SheetDescription>{product().id}</SheetDescription>
							</SheetHeader>

							<div class="flex-1 space-y-4 py-4">
								<TextField value={name()} onChange={(v) => setName(v)}>
									<TextFieldLabel>Name</TextFieldLabel>
									<TextFieldInput />
								</TextField>

								<TextField value={description()} onChange={(v) => setDescription(v)}>
									<TextFieldLabel>Description</TextFieldLabel>
									<TextFieldInput />
								</TextField>

								<div class="grid grid-cols-2 gap-4">
									<TextField value={brand()} onChange={(v) => setBrand(v)}>
										<TextFieldLabel>Brand</TextFieldLabel>
										<TextFieldInput />
									</TextField>

									<TextField value={ean()} onChange={(v) => setEan(v)}>
										<TextFieldLabel>EAN</TextFieldLabel>
										<TextFieldInput />
									</TextField>
								</div>

								<TextField value={allergenCodes()} onChange={(v) => setAllergenCodes(v)}>
									<TextFieldLabel>Allergen codes (comma-separated)</TextFieldLabel>
									<TextFieldInput placeholder="gluten, milk" />
								</TextField>

								<TextField value={displayOrder()} onChange={(v) => setDisplayOrder(v)}>
									<TextFieldLabel>Display order</TextFieldLabel>
									<TextFieldInput type="number" />
								</TextField>

								<label class="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={isActive()}
										onChange={(e) => setIsActive(e.currentTarget.checked)}
										class="rounded border"
									/>
									Active
								</label>

								<ProductImageManager productId={product().id} />

								<Show when={error()}>
									<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
										{error()}
									</div>
								</Show>
							</div>

							<SheetFooter class="flex-row justify-between gap-2 border-t pt-4">
								<div>
									<Show
										when={confirmDelete()}
										fallback={
											<Button
												type="button"
												variant="destructive"
												size="sm"
												onClick={() => setConfirmDelete(true)}
											>
												Delete
											</Button>
										}
									>
										<div class="flex items-center gap-2">
											<Button
												type="button"
												variant="destructive"
												size="sm"
												disabled={deleting()}
												onClick={handleDelete}
											>
												{deleting() ? "Deleting..." : "Confirm Delete"}
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => setConfirmDelete(false)}
											>
												Cancel
											</Button>
										</div>
									</Show>
								</div>
								<div class="flex gap-2">
									<Button type="button" variant="outline" onClick={props.onClose}>
										Close
									</Button>
									<Button type="button" disabled={saving()} onClick={handleSave}>
										{saving() ? "Saving..." : "Save"}
									</Button>
								</div>
							</SheetFooter>
						</>
					)}
				</Show>
			</SheetContent>
		</Sheet>
	);
}
