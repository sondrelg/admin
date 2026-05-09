import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { CreateProductDialog } from "./create-product-dialog";
import { ProductDetailSheet } from "./product-detail-sheet";
import type { ProductResponse } from "./types";

export default function ProductsPage() {
	const [products, setProducts] = createSignal<ProductResponse[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [searchQuery, setSearchQuery] = createSignal("");
	const [createOpen, setCreateOpen] = createSignal(false);
	const [selectedProduct, setSelectedProduct] = createSignal<ProductResponse | null>(null);

	const fetchProducts = async (query?: string) => {
		const url = query
			? `/api/platform/products/search?q=${encodeURIComponent(query)}`
			: "/api/platform/products";

		const res = await apiFetch<{
			data: ProductResponse[];
			status: number;
		}>(url);

		if (res.status === 200) {
			setProducts(res.data);
			setError(null);
		} else {
			setError("Failed to load products");
		}
		setLoading(false);
	};

	onMount(() => fetchProducts());

	// Debounced search
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	createEffect(() => {
		const q = searchQuery();
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			fetchProducts(q || undefined);
		}, 300);
	});

	const handleCreated = (product: ProductResponse) => {
		setProducts((prev) => [...prev, product]);
	};

	const handleUpdated = (updated: ProductResponse) => {
		setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
		setSelectedProduct(null);
	};

	const handleDeleted = (id: string) => {
		setProducts((prev) => prev.filter((p) => p.id !== id));
		setSelectedProduct(null);
	};

	return (
		<div class="mx-auto max-w-3xl space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight">Product Catalog</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Manage the platform product catalog. Tenants can import these into their menus.
					</p>
				</div>
				<Button type="button" onClick={() => setCreateOpen(true)}>
					+ Create Product
				</Button>
			</div>

			<TextField value={searchQuery()} onChange={(v) => setSearchQuery(v)}>
				<TextFieldInput placeholder="Search by name, brand, or EAN..." />
			</TextField>

			<Show when={error()}>
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
			</Show>

			<Show
				when={!loading()}
				fallback={
					<div class="space-y-3">
						<div class="h-20 animate-pulse rounded-xl border bg-card" />
						<div class="h-20 animate-pulse rounded-xl border bg-card" />
						<div class="h-20 animate-pulse rounded-xl border bg-card" />
					</div>
				}
			>
				<Show when={products().length === 0}>
					<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
						{searchQuery()
							? "No products match your search."
							: "No products yet. Create your first product to get started."}
					</div>
				</Show>

				<div class="space-y-3">
					<For each={products()}>
						{(product) => (
							<button
								type="button"
								class="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50"
								onClick={() => setSelectedProduct(product)}
							>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<p class="font-semibold">{product.name}</p>
										<Show when={product.brand}>
											<span class="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
												{product.brand}
											</span>
										</Show>
									</div>
									<div class="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
										<Show when={product.ean}>
											<span>EAN: {product.ean}</span>
										</Show>
										<Show when={product.allergen_codes.length > 0}>
											<span>
												{product.allergen_codes.length} allergen
												{product.allergen_codes.length !== 1 ? "s" : ""}
											</span>
										</Show>
										<Show when={product.description}>
											<span class="truncate">{product.description}</span>
										</Show>
									</div>
								</div>
								<span
									class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
									classList={{
										"bg-primary/10 text-primary": product.is_active,
										"bg-muted text-muted-foreground": !product.is_active,
									}}
								>
									{product.is_active ? "Active" : "Inactive"}
								</span>
							</button>
						)}
					</For>
				</div>
			</Show>

			<CreateProductDialog
				open={createOpen()}
				onOpenChange={setCreateOpen}
				onCreated={handleCreated}
			/>
			<ProductDetailSheet
				product={selectedProduct()}
				onClose={() => setSelectedProduct(null)}
				onUpdated={handleUpdated}
				onDeleted={handleDeleted}
			/>
		</div>
	);
}
