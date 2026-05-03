import { createSignal, For, Show } from "solid-js";
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
import type { Category, MenuItem } from "./types";
import { parsePriceToMinor } from "./types";

export function CreateItemDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	categories: Category[];
	onCreated: (item: MenuItem) => void;
}) {
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [price, setPrice] = createSignal("");
	const [sku, setSku] = createSignal("");
	const [categoryId, setCategoryId] = createSignal<string>("");
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const resetForm = () => {
		setName("");
		setDescription("");
		setPrice("");
		setSku("");
		setCategoryId("");
		setError(null);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!name().trim()) {
			setError("Name is required.");
			return;
		}
		const priceMinor = parsePriceToMinor(price());
		if (priceMinor <= 0) {
			setError("Price must be greater than zero.");
			return;
		}

		setSubmitting(true);

		const body: Record<string, unknown> = {
			name: name(),
			price_minor_unit: priceMinor,
		};
		if (description().trim()) body.description = description();
		if (sku().trim()) body.sku = sku();
		if (categoryId()) body.category_id = categoryId();

		const res = await apiFetch<{
			data: MenuItem & { error?: string; message?: string };
			status: number;
		}>("/api/menu-items", {
			method: "POST",
			body: JSON.stringify(body),
		});

		setSubmitting(false);

		if (res.status === 201) {
			resetForm();
			props.onCreated(res.data);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to create menu item");
		}
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!open) resetForm();
				props.onOpenChange(open);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Menu Item</DialogTitle>
					<DialogDescription>Add a new item to your menu.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} class="space-y-4">
					<TextField value={name()} onChange={(v) => setName(v)}>
						<TextFieldLabel>Name</TextFieldLabel>
						<TextFieldInput placeholder="Americano" />
					</TextField>

					<TextField value={description()} onChange={(v) => setDescription(v)}>
						<TextFieldLabel>Description (optional)</TextFieldLabel>
						<TextFieldInput placeholder="Classic black coffee" />
					</TextField>

					<div class="grid grid-cols-2 gap-4">
						<TextField value={price()} onChange={(v) => setPrice(v)}>
							<TextFieldLabel>Price (kr)</TextFieldLabel>
							<TextFieldInput placeholder="49,00" inputMode="decimal" />
						</TextField>

						<TextField value={sku()} onChange={(v) => setSku(v)}>
							<TextFieldLabel>SKU (optional)</TextFieldLabel>
							<TextFieldInput placeholder="COFFEE-001" />
						</TextField>
					</div>

					<div class="space-y-1.5">
						<label class="text-sm font-medium" for="category-select">
							Category (optional)
						</label>
						<select
							id="category-select"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							value={categoryId()}
							onChange={(e) => setCategoryId(e.currentTarget.value)}
						>
							<option value="">No category</option>
							<For each={props.categories.filter((c) => c.is_active)}>
								{(cat) => <option value={cat.id}>{cat.name}</option>}
							</For>
						</select>
					</div>

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
