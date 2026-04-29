import { createEffect, createSignal, For, Show } from "solid-js";
import { customFetch } from "~/api/client";
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
import { BundleSlotManager } from "./bundle-manager";
import { ImageManager } from "./image-manager";
import type {
	Allergen,
	Category,
	MenuItem,
	ModifierGroup,
	ModifierGroupAssignment,
	TaxRate,
} from "./types";
import { formatPrice, formatRateBps, parsePriceToMinor } from "./types";

export function ItemDetailSheet(props: {
	item: MenuItem | null;
	categories: Category[];
	modifierGroups: ModifierGroup[];
	allItems: MenuItem[];
	onClose: () => void;
	onUpdated: (item: MenuItem) => void;
	onDeleted: (id: string) => void;
}) {
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [price, setPrice] = createSignal("");
	const [sku, setSku] = createSignal("");
	const [categoryId, setCategoryId] = createSignal("");
	const [isEnabled, setIsEnabled] = createSignal(true);
	const [saving, setSaving] = createSignal(false);
	const [deleting, setDeleting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	// Allergens & tax rates
	const [allAllergens, setAllAllergens] = createSignal<Allergen[]>([]);
	const [itemAllergenIds, setItemAllergenIds] = createSignal<Set<string>>(new Set());
	const [allTaxRates, setAllTaxRates] = createSignal<TaxRate[]>([]);
	const [itemTaxRateIds, setItemTaxRateIds] = createSignal<Set<string>>(new Set());
	const [savingAllergens, setSavingAllergens] = createSignal(false);
	const [savingTaxRates, setSavingTaxRates] = createSignal(false);

	// Modifier groups
	const [itemModGroupIds, setItemModGroupIds] = createSignal<Set<string>>(new Set());
	const [savingModGroups, setSavingModGroups] = createSignal(false);

	// Load form fields when item changes
	createEffect(() => {
		const item = props.item;
		if (item) {
			setName(item.name);
			setDescription(item.description ?? "");
			setPrice(formatPrice(item.price_minor_unit));
			setSku(item.sku ?? "");
			setCategoryId(item.category_id ?? "");
			setIsEnabled(item.is_enabled);
			setError(null);
			fetchItemDetails(item.id);
		}
	});

	const fetchItemDetails = async (itemId: string) => {
		const [allergensRes, itemAllergensRes, taxRatesRes, itemTaxRatesRes, itemModGroupsRes] =
			await Promise.all([
				customFetch<{ data: Allergen[]; status: number }>("/api/allergens"),
				customFetch<{ data: Allergen[]; status: number }>(`/api/menu-items/${itemId}/allergens`),
				customFetch<{ data: TaxRate[]; status: number }>("/api/tax-rates"),
				customFetch<{ data: string[]; status: number }>(`/api/menu-items/${itemId}/tax-rates`),
				customFetch<{ data: ModifierGroupAssignment[]; status: number }>(
					`/api/menu-items/${itemId}/modifier-groups`,
				),
			]);
		if (allergensRes.status === 200) setAllAllergens(allergensRes.data);
		if (itemAllergensRes.status === 200)
			setItemAllergenIds(new Set(itemAllergensRes.data.map((a) => a.id)));
		if (taxRatesRes.status === 200) setAllTaxRates(taxRatesRes.data);
		if (itemTaxRatesRes.status === 200) setItemTaxRateIds(new Set(itemTaxRatesRes.data));
		if (itemModGroupsRes.status === 200)
			setItemModGroupIds(new Set(itemModGroupsRes.data.map((g) => g.modifier_group_id)));
	};

	const handleSave = async () => {
		const item = props.item;
		if (!item) return;

		if (!name().trim()) {
			setError("Name is required.");
			return;
		}
		const priceMinor = parsePriceToMinor(price());
		if (priceMinor <= 0) {
			setError("Price must be greater than zero.");
			return;
		}

		setError(null);
		setSaving(true);

		const body: Record<string, unknown> = {
			name: name(),
			price_minor_unit: priceMinor,
			is_enabled: isEnabled(),
		};
		if (description().trim()) body.description = description();
		else body.description = null;
		if (sku().trim()) body.sku = sku();
		else body.sku = null;
		body.category_id = categoryId() || null;

		const res = await customFetch<{
			data: MenuItem & { error?: string; message?: string };
			status: number;
		}>(`/api/menu-items/${item.id}`, {
			method: "PUT",
			body: JSON.stringify(body),
		});

		setSaving(false);

		if (res.status === 200) {
			props.onUpdated(res.data);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to update item");
		}
	};

	const handleDelete = async () => {
		const item = props.item;
		if (!item) return;

		setDeleting(true);
		const res = await customFetch<{ status: number }>(`/api/menu-items/${item.id}`, {
			method: "DELETE",
		});
		setDeleting(false);

		if (res.status === 204) {
			props.onDeleted(item.id);
		} else {
			setError("Failed to delete item");
		}
	};

	const toggleAllergen = async (allergenId: string) => {
		const item = props.item;
		if (!item) return;

		const current = new Set(itemAllergenIds());
		if (current.has(allergenId)) current.delete(allergenId);
		else current.add(allergenId);

		setSavingAllergens(true);
		const res = await customFetch<{ status: number }>(`/api/menu-items/${item.id}/allergens`, {
			method: "PUT",
			body: JSON.stringify({ allergen_ids: [...current] }),
		});
		setSavingAllergens(false);

		if (res.status === 200 || res.status === 204) {
			setItemAllergenIds(current);
		}
	};

	const toggleModGroup = async (groupId: string) => {
		const item = props.item;
		if (!item) return;

		const current = new Set(itemModGroupIds());
		if (current.has(groupId)) current.delete(groupId);
		else current.add(groupId);

		setSavingModGroups(true);
		const groups = [...current].map((id, i) => ({
			modifier_group_id: id,
			display_order: i,
		}));
		const res = await customFetch<{ status: number }>(
			`/api/menu-items/${item.id}/modifier-groups`,
			{
				method: "PUT",
				body: JSON.stringify({ groups }),
			},
		);
		setSavingModGroups(false);

		if (res.status === 200 || res.status === 204) {
			setItemModGroupIds(current);
		}
	};

	const toggleTaxRate = async (taxRateId: string) => {
		const item = props.item;
		if (!item) return;

		const current = new Set(itemTaxRateIds());
		if (current.has(taxRateId)) current.delete(taxRateId);
		else current.add(taxRateId);

		setSavingTaxRates(true);
		const res = await customFetch<{ status: number }>(`/api/menu-items/${item.id}/tax-rates`, {
			method: "PUT",
			body: JSON.stringify({ tax_rate_ids: [...current] }),
		});
		setSavingTaxRates(false);

		if (res.status === 200 || res.status === 204) {
			setItemTaxRateIds(current);
		}
	};

	return (
		<Sheet
			open={props.item !== null}
			onOpenChange={(open) => {
				if (!open) props.onClose();
			}}
		>
			<SheetContent class="flex flex-col sm:max-w-md">
				<SheetHeader>
					<SheetTitle>{props.item?.name ?? "Item"}</SheetTitle>
					<SheetDescription>Edit item details, allergens, and tax rates.</SheetDescription>
				</SheetHeader>

				<div class="flex-1 space-y-6 overflow-y-auto py-4">
					{/* Basic fields */}
					<div class="space-y-4">
						<TextField value={name()} onChange={(v) => setName(v)}>
							<TextFieldLabel>Name</TextFieldLabel>
							<TextFieldInput />
						</TextField>

						<TextField value={description()} onChange={(v) => setDescription(v)}>
							<TextFieldLabel>Description</TextFieldLabel>
							<TextFieldInput placeholder="Optional description" />
						</TextField>

						<div class="grid grid-cols-2 gap-4">
							<TextField value={price()} onChange={(v) => setPrice(v)}>
								<TextFieldLabel>Price (kr)</TextFieldLabel>
								<TextFieldInput inputMode="decimal" />
							</TextField>

							<TextField value={sku()} onChange={(v) => setSku(v)}>
								<TextFieldLabel>SKU</TextFieldLabel>
								<TextFieldInput placeholder="Optional" />
							</TextField>
						</div>

						<div class="space-y-1.5">
							<label class="text-sm font-medium" for="detail-category">
								Category
							</label>
							<select
								id="detail-category"
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

						<div class="flex items-center justify-between">
							<span class="text-sm font-medium">Enabled</span>
							<button
								type="button"
								class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
								classList={{
									"bg-primary": isEnabled(),
									"bg-input": !isEnabled(),
								}}
								onClick={() => setIsEnabled(!isEnabled())}
							>
								<span
									class="pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform"
									classList={{
										"translate-x-5": isEnabled(),
										"translate-x-0": !isEnabled(),
									}}
								/>
							</button>
						</div>
					</div>

					{/* Images */}
					<Show when={props.item}>{(item) => <ImageManager itemId={item().id} />}</Show>

					{/* Tax Rates */}
					<div class="space-y-2">
						<h4 class="text-sm font-medium">Tax Rates</h4>
						<Show
							when={allTaxRates().length > 0}
							fallback={<p class="text-xs text-muted-foreground">No tax rates configured.</p>}
						>
							<div class="flex flex-wrap gap-2">
								<For each={allTaxRates()}>
									{(rate) => {
										const active = () => itemTaxRateIds().has(rate.id);
										return (
											<button
												type="button"
												class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
												classList={{
													"border-primary bg-primary/10 text-primary": active(),
													"border-input bg-background text-muted-foreground hover:bg-accent":
														!active(),
												}}
												disabled={savingTaxRates()}
												onClick={() => toggleTaxRate(rate.id)}
											>
												{rate.name} ({formatRateBps(rate.rate_bps)})
											</button>
										);
									}}
								</For>
							</div>
						</Show>
					</div>

					{/* Modifier Groups */}
					<div class="space-y-2">
						<h4 class="text-sm font-medium">Modifier Groups</h4>
						<Show
							when={props.modifierGroups.length > 0}
							fallback={<p class="text-xs text-muted-foreground">No modifier groups created.</p>}
						>
							<div class="flex flex-wrap gap-2">
								<For each={props.modifierGroups.filter((g) => g.is_active)}>
									{(group) => {
										const active = () => itemModGroupIds().has(group.id);
										return (
											<button
												type="button"
												class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
												classList={{
													"border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400":
														active(),
													"border-input bg-background text-muted-foreground hover:bg-accent":
														!active(),
												}}
												disabled={savingModGroups()}
												onClick={() => toggleModGroup(group.id)}
											>
												{group.name}
												<Show when={group.max_selections > 0}>
													<span class="ml-1 opacity-60">
														({group.min_selections}–{group.max_selections})
													</span>
												</Show>
											</button>
										);
									}}
								</For>
							</div>
						</Show>
					</div>

					{/* Allergens */}
					<div class="space-y-2">
						<h4 class="text-sm font-medium">Allergens</h4>
						<Show
							when={allAllergens().length > 0}
							fallback={<p class="text-xs text-muted-foreground">No allergens available.</p>}
						>
							<div class="flex flex-wrap gap-2">
								<For each={allAllergens()}>
									{(allergen) => {
										const active = () => itemAllergenIds().has(allergen.id);
										return (
											<button
												type="button"
												class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
												classList={{
													"border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400":
														active(),
													"border-input bg-background text-muted-foreground hover:bg-accent":
														!active(),
												}}
												disabled={savingAllergens()}
												onClick={() => toggleAllergen(allergen.id)}
											>
												{allergen.name}
											</button>
										);
									}}
								</For>
							</div>
						</Show>
					</div>

					{/* Bundle Slots */}
					<Show when={props.item}>
						{(item) => <BundleSlotManager itemId={item().id} allItems={props.allItems} />}
					</Show>
				</div>

				<Show when={error()}>
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
				</Show>

				<SheetFooter class="flex-row items-center gap-2 border-t pt-4">
					<Button
						type="button"
						variant="destructive"
						size="sm"
						class="mr-auto"
						disabled={deleting()}
						onClick={handleDelete}
					>
						{deleting() ? "Deleting..." : "Delete"}
					</Button>
					<Button type="button" variant="outline" onClick={props.onClose}>
						Cancel
					</Button>
					<Button type="button" disabled={saving()} onClick={handleSave}>
						{saving() ? "Saving..." : "Save"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
