import { useNavigate } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { WizardLayout } from "~/components/wizard/wizard-layout";
import { useWizard } from "~/contexts/wizard-context";
import { restaurantCafe } from "~/templates/restaurant-cafe";

interface MenuItem {
	name: string;
	priceMinorUnit: number;
	taxRateIndex: number;
}

interface Category {
	name: string;
	color: string;
	items: MenuItem[];
	collapsed: boolean;
}

export function MenuPage() {
	const navigate = useNavigate();
	const { state, setCategories, setMenuItemCount } = useWizard();

	const initialCategories: Category[] = restaurantCafe.categories.map((c) => ({
		name: c.name,
		color: c.color,
		items: c.items.map((item) => ({ ...item })),
		collapsed: false,
	}));

	const [categories, setStore] = createStore<Category[]>(initialCategories);
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [progress, setProgress] = createSignal("");

	const taxRates = () => state.taxRates;

	const totalItems = () => categories.reduce((sum, c) => sum + c.items.length, 0);

	const updateItem = (
		catIdx: number,
		itemIdx: number,
		field: keyof MenuItem,
		value: string | number,
	) => {
		setStore(
			produce((cats) => {
				const item = cats[catIdx].items[itemIdx];
				if (field === "priceMinorUnit") {
					item.priceMinorUnit = value as number;
				} else if (field === "taxRateIndex") {
					item.taxRateIndex = value as number;
				} else {
					item.name = value as string;
				}
			}),
		);
	};

	const removeItem = (catIdx: number, itemIdx: number) => {
		setStore(
			produce((cats) => {
				cats[catIdx].items.splice(itemIdx, 1);
			}),
		);
	};

	const addItem = (catIdx: number) => {
		setStore(
			produce((cats) => {
				cats[catIdx].items.push({
					name: "",
					priceMinorUnit: 0,
					taxRateIndex: 0,
				});
			}),
		);
	};

	const removeCategory = (catIdx: number) => {
		setStore((prev) => prev.filter((_, i) => i !== catIdx));
	};

	const addCategory = () => {
		setStore(categories.length, {
			name: "",
			color: "#6B7280",
			items: [],
			collapsed: false,
		});
	};

	const toggleCollapse = (catIdx: number) => {
		setStore(catIdx, "collapsed", (prev) => !prev);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		// Skip if already created
		if (state.categories.length > 0) {
			navigate({ to: "/setup/summary" });
			return;
		}

		const validCats = categories.filter((c) => c.name.trim());
		if (validCats.length === 0) {
			setError("Add at least one category");
			return;
		}

		setIsSubmitting(true);

		try {
			const createdCats = [];
			let itemCount = 0;

			for (let catIdx = 0; catIdx < validCats.length; catIdx++) {
				const cat = validCats[catIdx];
				setProgress(`Creating category "${cat.name}"...`);

				const catRes = await customFetch<{
					data: { id: string; name: string; message?: string };
					status: number;
				}>("/api/categories", {
					method: "POST",
					body: JSON.stringify({
						name: cat.name,
						color: cat.color,
						display_order: catIdx,
					}),
				});

				if (catRes.status !== 201) {
					setError(catRes.data?.message ?? `Failed to create category "${cat.name}"`);
					return;
				}

				createdCats.push({ id: catRes.data.id, name: catRes.data.name });

				// Create items for this category
				const validItems = cat.items.filter((item) => item.name.trim());
				for (let itemIdx = 0; itemIdx < validItems.length; itemIdx++) {
					const item = validItems[itemIdx];
					setProgress(`Creating "${item.name}"...`);

					const taxRate = taxRates()[item.taxRateIndex];
					const itemRes = await customFetch<{
						data: { id: string; message?: string };
						status: number;
					}>("/api/menu-items", {
						method: "POST",
						body: JSON.stringify({
							name: item.name,
							price_minor_unit: item.priceMinorUnit,
							category_id: catRes.data.id,
							display_order: itemIdx,
							tax_rate_id: taxRate?.id ?? null,
						}),
					});

					if (itemRes.status !== 201) {
						setError(itemRes.data?.message ?? `Failed to create item "${item.name}"`);
						return;
					}

					itemCount++;
				}
			}

			setCategories(createdCats);
			setMenuItemCount(itemCount);
			navigate({ to: "/setup/summary" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "An unexpected error occurred");
		} finally {
			setIsSubmitting(false);
			setProgress("");
		}
	};

	return (
		<WizardLayout
			step={4}
			title="Your Menu"
			description="Pre-filled with a typical cafe menu. Edit names, prices, and categories to match your business."
		>
			<form onSubmit={handleSubmit} class="space-y-4">
				<For each={categories}>
					{(cat, catIdx) => (
						<div class="rounded-xl border bg-card shadow-sm">
							<div class="flex items-center gap-3 border-b p-4">
								<button
									type="button"
									class="text-muted-foreground hover:text-foreground"
									onClick={() => toggleCollapse(catIdx())}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-4 transition-transform"
										classList={{ "-rotate-90": cat.collapsed }}
										aria-hidden="true"
									>
										<path d="m6 9 6 6 6-6" />
									</svg>
								</button>
								<div class="size-4 rounded-full" style={{ "background-color": cat.color }} />
								<input
									type="text"
									value={cat.name}
									onInput={(e) => setStore(catIdx(), "name", e.currentTarget.value)}
									class="flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
									placeholder="Category name"
								/>
								<span class="text-sm text-muted-foreground">{cat.items.length} items</span>
								<Show when={categories.length > 1}>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="text-muted-foreground hover:text-destructive"
										onClick={() => removeCategory(catIdx())}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="size-4"
											aria-hidden="true"
										>
											<path d="M18 6 6 18" />
											<path d="m6 6 12 12" />
										</svg>
									</Button>
								</Show>
							</div>

							<Show when={!cat.collapsed}>
								<div class="divide-y">
									<For each={cat.items}>
										{(item, itemIdx) => (
											<div class="flex items-center gap-3 px-4 py-2">
												<input
													type="text"
													value={item.name}
													onInput={(e) =>
														updateItem(catIdx(), itemIdx(), "name", e.currentTarget.value)
													}
													class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
													placeholder="Item name"
												/>
												<div class="w-20">
													<input
														type="number"
														value={Math.round(item.priceMinorUnit / 100)}
														onInput={(e) =>
															updateItem(
																catIdx(),
																itemIdx(),
																"priceMinorUnit",
																Number.parseInt(e.currentTarget.value || "0", 10) * 100,
															)
														}
														class="w-full rounded-md border bg-transparent px-2 py-1 text-right text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
														min="0"
													/>
												</div>
												<span class="w-8 text-xs text-muted-foreground">kr</span>
												<select
													value={item.taxRateIndex}
													onChange={(e) =>
														updateItem(
															catIdx(),
															itemIdx(),
															"taxRateIndex",
															Number.parseInt(e.currentTarget.value, 10),
														)
													}
													class="rounded-md border bg-transparent px-2 py-1 text-sm"
												>
													<For each={taxRates()}>
														{(rate, rateIdx) => (
															<option value={rateIdx()}>
																{rate.name} ({rate.eatInRateBps / 100}%
																{rate.eatInRateBps !== rate.takeAwayRateBps
																	? ` / ${rate.takeAwayRateBps / 100}%`
																	: ""}
																)
															</option>
														)}
													</For>
												</select>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													class="text-muted-foreground hover:text-destructive"
													onClick={() => removeItem(catIdx(), itemIdx())}
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														class="size-3.5"
														aria-hidden="true"
													>
														<path d="M18 6 6 18" />
														<path d="m6 6 12 12" />
													</svg>
												</Button>
											</div>
										)}
									</For>
									<div class="p-2">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											class="w-full text-muted-foreground"
											onClick={() => addItem(catIdx())}
										>
											+ Add Item
										</Button>
									</div>
								</div>
							</Show>
						</div>
					)}
				</For>

				<Button type="button" variant="outline" size="sm" onClick={addCategory}>
					+ Add Category
				</Button>

				<Show when={error()}>
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
				</Show>

				<Show when={isSubmitting() && progress()}>
					<div class="rounded-md bg-primary/10 p-3 text-sm text-primary">{progress()}</div>
				</Show>

				<div class="flex justify-between">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/setup/tax-rates" })}
					>
						Back
					</Button>
					<Button type="submit" disabled={isSubmitting()}>
						{isSubmitting() ? `Creating ${totalItems()} items...` : `Next (${totalItems()} items)`}
					</Button>
				</div>
			</form>
		</WizardLayout>
	);
}
