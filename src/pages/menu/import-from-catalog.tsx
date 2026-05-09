import { createEffect, createSignal, For, Show } from "solid-js";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import type { ProductDetailResponse, ProductResponse } from "~/pages/products/types";
import type { Category, MenuItem, TaxRate } from "./types";
import { formatTaxRateLabel, parsePriceToMinor } from "./types";

export function ImportFromCatalog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	categories: Category[];
	taxRates: TaxRate[];
	onImported: (item: MenuItem) => void;
}) {
	const [catalogProducts, setCatalogProducts] = createSignal<ProductResponse[]>([]);
	const [searchQuery, setSearchQuery] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	const [selectedProduct, setSelectedProduct] = createSignal<ProductDetailResponse | null>(null);
	const [loadingDetail, setLoadingDetail] = createSignal(false);

	// Import form
	const [price, setPrice] = createSignal("");
	const [categoryId, setCategoryId] = createSignal("");
	const [taxRateId, setTaxRateId] = createSignal("");
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const fetchCatalog = async (query?: string) => {
		setLoading(true);
		const url = query ? `/api/products?q=${encodeURIComponent(query)}` : "/api/products";

		const res = await apiFetch<{
			data: ProductResponse[];
			status: number;
		}>(url);

		if (res.status === 200) {
			setCatalogProducts(res.data);
		}
		setLoading(false);
	};

	// Fetch catalog when sheet opens
	createEffect(() => {
		if (props.open) {
			fetchCatalog();
			setSelectedProduct(null);
			setPrice("");
			setCategoryId("");
			setTaxRateId("");
			setError(null);
			setSearchQuery("");
		}
	});

	// Debounced search
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	createEffect(() => {
		const q = searchQuery();
		if (!props.open) return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			fetchCatalog(q || undefined);
		}, 300);
	});

	const selectProduct = async (product: ProductResponse) => {
		setLoadingDetail(true);
		setError(null);
		setPrice("");
		setCategoryId("");
		setTaxRateId("");

		const res = await apiFetch<{
			data: ProductDetailResponse;
			status: number;
		}>(`/api/products/${product.id}`);

		if (res.status === 200) {
			setSelectedProduct(res.data);
		}
		setLoadingDetail(false);
	};

	const handleImport = async () => {
		const product = selectedProduct();
		if (!product) return;

		const priceMinor = parsePriceToMinor(price());
		if (priceMinor <= 0) {
			setError("Price must be greater than zero.");
			return;
		}

		setSubmitting(true);
		setError(null);

		const body: Record<string, unknown> = {
			product_id: product.id,
			price_inc_vat_minor_unit: priceMinor,
		};
		if (categoryId()) body.category_id = categoryId();
		if (taxRateId()) body.tax_rate_id = taxRateId();

		const res = await apiFetch<{
			data: MenuItem & { error?: string; message?: string };
			status: number;
		}>("/api/menu-items/import", {
			method: "POST",
			body: JSON.stringify(body),
		});

		setSubmitting(false);

		if (res.status === 201) {
			props.onImported(res.data);
			props.onOpenChange(false);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to import product");
		}
	};

	return (
		<Sheet open={props.open} onOpenChange={props.onOpenChange}>
			<SheetContent class="flex flex-col overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Import from Catalog</SheetTitle>
					<SheetDescription>Browse the product catalog and import into your menu.</SheetDescription>
				</SheetHeader>

				<div class="flex-1 space-y-4 py-4">
					<Show when={error()}>
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
					</Show>

					{/* Search */}
					<TextField value={searchQuery()} onChange={(v) => setSearchQuery(v)}>
						<TextFieldInput placeholder="Search products..." />
					</TextField>

					<Show
						when={!selectedProduct()}
						fallback={
							/* Phase 2: Configure import */
							<Show when={selectedProduct()}>
								{(product) => (
									<div class="space-y-4">
										<div class="rounded-xl border bg-card p-4">
											<div class="flex items-start gap-3">
												<Show when={product().images.length > 0}>
													<img
														src={product().images[0].thumbnail_url ?? product().images[0].url}
														alt=""
														class="size-16 shrink-0 rounded-lg object-cover"
													/>
												</Show>
												<div class="min-w-0 flex-1">
													<p class="font-semibold">{product().name}</p>
													<Show when={product().brand}>
														<p class="text-sm text-muted-foreground">{product().brand}</p>
													</Show>
													<Show when={product().description}>
														<p class="mt-1 text-sm text-muted-foreground">
															{product().description}
														</p>
													</Show>
													<Show when={product().allergen_codes.length > 0}>
														<div class="mt-2 flex flex-wrap gap-1">
															<For each={product().allergen_codes}>
																{(code) => (
																	<span class="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
																		{code}
																	</span>
																)}
															</For>
														</div>
													</Show>
												</div>
											</div>
										</div>

										<button
											type="button"
											class="text-xs text-primary hover:underline"
											onClick={() => setSelectedProduct(null)}
										>
											Choose a different product
										</button>

										<TextField value={price()} onChange={(v) => setPrice(v)}>
											<TextFieldLabel>Price (kr)</TextFieldLabel>
											<TextFieldInput placeholder="49,00" inputMode="decimal" />
										</TextField>

										<div class="space-y-1.5">
											<label class="text-sm font-medium" for="import-category">
												Category (optional)
											</label>
											<select
												id="import-category"
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

										<div class="space-y-1.5">
											<label class="text-sm font-medium" for="import-tax-rate">
												Tax rate (optional)
											</label>
											<select
												id="import-tax-rate"
												class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
												value={taxRateId()}
												onChange={(e) => setTaxRateId(e.currentTarget.value)}
											>
												<option value="">No tax rate</option>
												<For each={props.taxRates}>
													{(rate) => <option value={rate.id}>{formatTaxRateLabel(rate)}</option>}
												</For>
											</select>
										</div>

										<Button
											type="button"
											class="w-full"
											disabled={submitting()}
											onClick={handleImport}
										>
											{submitting() ? "Importing..." : "Import to Menu"}
										</Button>
									</div>
								)}
							</Show>
						}
					>
						{/* Phase 1: Browse catalog */}
						<Show
							when={!loading() && !loadingDetail()}
							fallback={
								<div class="space-y-3">
									<div class="h-16 animate-pulse rounded-xl border bg-card" />
									<div class="h-16 animate-pulse rounded-xl border bg-card" />
								</div>
							}
						>
							<Show when={catalogProducts().length === 0}>
								<div class="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
									{searchQuery()
										? "No products match your search."
										: "No products available in the catalog."}
								</div>
							</Show>

							<div class="space-y-2">
								<For each={catalogProducts()}>
									{(product) => (
										<button
											type="button"
											class="flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent/50"
											onClick={() => selectProduct(product)}
										>
											<div class="min-w-0 flex-1">
												<div class="flex items-center gap-2">
													<p class="font-medium text-sm">{product.name}</p>
													<Show when={product.brand}>
														<span class="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
															{product.brand}
														</span>
													</Show>
												</div>
												<Show when={product.description}>
													<p class="mt-0.5 truncate text-xs text-muted-foreground">
														{product.description}
													</p>
												</Show>
												<Show when={product.allergen_codes.length > 0}>
													<div class="mt-1 flex flex-wrap gap-1">
														<For each={product.allergen_codes}>
															{(code) => (
																<span class="rounded bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-700">
																	{code}
																</span>
															)}
														</For>
													</div>
												</Show>
											</div>
										</button>
									)}
								</For>
							</div>
						</Show>
					</Show>
				</div>
			</SheetContent>
		</Sheet>
	);
}
