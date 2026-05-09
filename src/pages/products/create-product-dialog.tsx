import { createSignal, Show } from "solid-js";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import type { CreateProduct, ProductResponse } from "./types";

export function CreateProductDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (product: ProductResponse) => void;
}) {
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [brand, setBrand] = createSignal("");
	const [ean, setEan] = createSignal("");
	const [allergenCodes, setAllergenCodes] = createSignal("");
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const reset = () => {
		setName("");
		setDescription("");
		setBrand("");
		setEan("");
		setAllergenCodes("");
		setError(null);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!name().trim()) {
			setError("Name is required.");
			return;
		}

		setSubmitting(true);
		setError(null);

		const codes = allergenCodes()
			.split(",")
			.map((c) => c.trim())
			.filter(Boolean);

		const body: CreateProduct = {
			name: name().trim(),
		};
		if (description().trim()) body.description = description().trim();
		if (brand().trim()) body.brand = brand().trim();
		if (ean().trim()) body.ean = ean().trim();
		if (codes.length > 0) body.allergen_codes = codes;

		const res = await apiFetch<{
			data: ProductResponse & { detail?: string };
			status: number;
		}>("/api/platform/products", {
			method: "POST",
			body: JSON.stringify(body),
		});

		setSubmitting(false);

		if (res.status === 201) {
			props.onCreated(res.data);
			reset();
			props.onOpenChange(false);
		} else {
			setError(res.data?.detail ?? "Failed to create product");
		}
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!open) reset();
				props.onOpenChange(open);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Product</DialogTitle>
					<DialogDescription>Add a new product to the catalog.</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} class="space-y-4">
					<TextField value={name()} onChange={(v) => setName(v)}>
						<TextFieldLabel>Name</TextFieldLabel>
						<TextFieldInput placeholder="Coca-Cola 0.33L" />
					</TextField>

					<TextField value={description()} onChange={(v) => setDescription(v)}>
						<TextFieldLabel>Description (optional)</TextFieldLabel>
						<TextFieldInput placeholder="Classic carbonated soft drink" />
					</TextField>

					<div class="grid grid-cols-2 gap-4">
						<TextField value={brand()} onChange={(v) => setBrand(v)}>
							<TextFieldLabel>Brand (optional)</TextFieldLabel>
							<TextFieldInput placeholder="Coca-Cola" />
						</TextField>

						<TextField value={ean()} onChange={(v) => setEan(v)}>
							<TextFieldLabel>EAN (optional)</TextFieldLabel>
							<TextFieldInput placeholder="5449000000996" />
						</TextField>
					</div>

					<TextField value={allergenCodes()} onChange={(v) => setAllergenCodes(v)}>
						<TextFieldLabel>Allergen codes (optional, comma-separated)</TextFieldLabel>
						<TextFieldInput placeholder="gluten, milk" />
					</TextField>

					<Show when={error()}>
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
					</Show>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting()}>
							{submitting() ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
