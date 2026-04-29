import {
	closestCenter,
	DragDropProvider,
	DragDropSensors,
	DragOverlay,
	SortableProvider,
} from "@thisbeyond/solid-dnd";
import { createSignal, For, onMount, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { CategoryManager } from "./category-manager";
import { CreateItemDialog } from "./create-item-dialog";
import { ItemDetailSheet } from "./item-detail-sheet";
import { ModifierGroupManager } from "./modifier-manager";
import { SortableItem } from "./sortable-item";
import type { Category, MenuItem, ModifierGroup } from "./types";
import { formatPrice } from "./types";

export function MenuPage() {
	const [items, setItems] = createSignal<MenuItem[]>([]);
	const [categories, setCategories] = createSignal<Category[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [createOpen, setCreateOpen] = createSignal(false);
	const [togglingId, setTogglingId] = createSignal<string | null>(null);
	const [selectedItem, setSelectedItem] = createSignal<MenuItem | null>(null);
	const [categoriesExpanded, setCategoriesExpanded] = createSignal(false);
	const [modifierGroups, setModifierGroups] = createSignal<ModifierGroup[]>([]);
	const [modifiersExpanded, setModifiersExpanded] = createSignal(false);

	// Drag-and-drop reordering
	const [activeItemId, setActiveItemId] = createSignal<string | null>(null);

	// Bulk actions
	const [bulkMode, setBulkMode] = createSignal(false);
	const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
	const [bulkActionRunning, setBulkActionRunning] = createSignal(false);
	const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = createSignal(false);

	// Filters
	const [searchQuery, setSearchQuery] = createSignal("");
	const [filterCategory, setFilterCategory] = createSignal<string>("all");
	const [filterStatus, setFilterStatus] = createSignal<"all" | "enabled" | "disabled">("all");

	const fetchData = async () => {
		const [itemsRes, catsRes, modGroupsRes] = await Promise.all([
			customFetch<{ data: MenuItem[]; status: number }>("/api/menu-items"),
			customFetch<{ data: Category[]; status: number }>("/api/categories"),
			customFetch<{ data: ModifierGroup[]; status: number }>("/api/modifier-groups"),
		]);
		if (itemsRes.status === 200) setItems(itemsRes.data);
		if (catsRes.status === 200) setCategories(catsRes.data);
		if (modGroupsRes.status === 200) setModifierGroups(modGroupsRes.data);
		if (itemsRes.status !== 200) {
			const d = itemsRes.data as unknown as {
				error?: string;
				message?: string;
			};
			setError(d?.error ?? d?.message ?? "Failed to load menu items");
		}
		setLoading(false);
	};

	onMount(fetchData);

	const handleCreated = (item: MenuItem) => {
		setItems((prev) => [...prev, item]);
		setCreateOpen(false);
	};

	const handleUpdated = (updated: MenuItem) => {
		setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
		setSelectedItem(null);
	};

	const handleDeleted = (id: string) => {
		setItems((prev) => prev.filter((i) => i.id !== id));
		setSelectedItem(null);
	};

	const handleCategoryCreated = (cat: Category) => {
		setCategories((prev) => [...prev, cat]);
	};

	const handleCategoryUpdated = (cat: Category) => {
		setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
	};

	const handleCategoryDeleted = (id: string) => {
		setCategories((prev) => prev.filter((c) => c.id !== id));
	};

	const toggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectAllVisible = () => {
		setSelectedIds(new Set(filteredItems().map((i) => i.id)));
	};

	const deselectAll = () => {
		setSelectedIds(new Set<string>());
	};

	const exitBulkMode = () => {
		setBulkMode(false);
		setSelectedIds(new Set<string>());
	};

	const bulkSetEnabled = async (enabled: boolean) => {
		const ids = [...selectedIds()];
		if (ids.length === 0) return;
		setBulkActionRunning(true);
		const results = await Promise.all(
			ids.map((id) =>
				customFetch<{ data: MenuItem; status: number }>(`/api/menu-items/${id}`, {
					method: "PUT",
					body: JSON.stringify({ is_enabled: enabled }),
				}),
			),
		);
		setItems((prev) =>
			prev.map((item) => {
				const res = results.find((r) => r.status === 200 && r.data.id === item.id);
				return res ? res.data : item;
			}),
		);
		setBulkActionRunning(false);
		exitBulkMode();
	};

	const bulkSetCategory = async (categoryId: string | null) => {
		const ids = [...selectedIds()];
		if (ids.length === 0) return;
		setBulkActionRunning(true);
		const results = await Promise.all(
			ids.map((id) =>
				customFetch<{ data: MenuItem; status: number }>(`/api/menu-items/${id}`, {
					method: "PUT",
					body: JSON.stringify({ category_id: categoryId }),
				}),
			),
		);
		setItems((prev) =>
			prev.map((item) => {
				const res = results.find((r) => r.status === 200 && r.data.id === item.id);
				return res ? res.data : item;
			}),
		);
		setBulkActionRunning(false);
		exitBulkMode();
	};

	const bulkDelete = async () => {
		const ids = [...selectedIds()];
		if (ids.length === 0) return;
		setBulkActionRunning(true);
		await Promise.all(ids.map((id) => customFetch(`/api/menu-items/${id}`, { method: "DELETE" })));
		setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
		setBulkActionRunning(false);
		setBulkDeleteConfirmOpen(false);
		exitBulkMode();
	};

	const toggleEnabled = async (e: MouseEvent, item: MenuItem) => {
		e.stopPropagation();
		setTogglingId(item.id);
		const res = await customFetch<{
			data: MenuItem & { error?: string; message?: string };
			status: number;
		}>(`/api/menu-items/${item.id}`, {
			method: "PUT",
			body: JSON.stringify({ is_enabled: !item.is_enabled }),
		});
		setTogglingId(null);
		if (res.status === 200) {
			setItems((prev) => prev.map((i) => (i.id === item.id ? res.data : i)));
		}
	};

	const onDragEnd = async ({
		draggable,
		droppable,
	}: {
		draggable: { id: string | number };
		droppable?: { id: string | number } | null;
	}) => {
		setActiveItemId(null);
		if (!droppable || draggable.id === droppable.id) return;

		const sourceId = String(draggable.id);
		const targetId = String(droppable.id);

		const sourceItem = items().find((i) => i.id === sourceId);
		const targetItem = items().find((i) => i.id === targetId);
		if (!sourceItem || !targetItem) return;
		if (sourceItem.category_id !== targetItem.category_id) return;

		// Get items in same category, sorted by display_order
		const catItems = items()
			.filter((i) => i.category_id === sourceItem.category_id)
			.sort((a, b) => a.display_order - b.display_order);

		const fromIdx = catItems.findIndex((i) => i.id === sourceId);
		const toIdx = catItems.findIndex((i) => i.id === targetId);
		if (fromIdx === -1 || toIdx === -1) return;

		// Reorder
		const reordered = [...catItems];
		const [moved] = reordered.splice(fromIdx, 1);
		reordered.splice(toIdx, 0, moved);

		// Optimistic update
		const updates = reordered.map((item, i) => ({
			...item,
			display_order: i,
		}));
		setItems((prev) =>
			prev.map((item) => {
				const updated = updates.find((u) => u.id === item.id);
				return updated ?? item;
			}),
		);

		// Persist — fire all PUTs in parallel
		await Promise.all(
			updates.map((item) =>
				customFetch(`/api/menu-items/${item.id}`, {
					method: "PUT",
					body: JSON.stringify({ display_order: item.display_order }),
				}),
			),
		);
	};

	const categoryMap = () => {
		const map = new Map<string, Category>();
		for (const cat of categories()) {
			map.set(cat.id, cat);
		}
		return map;
	};

	const filteredItems = () => {
		let result = items();
		const q = searchQuery().toLowerCase().trim();
		if (q) {
			result = result.filter(
				(item) =>
					item.name.toLowerCase().includes(q) ||
					(item.description?.toLowerCase().includes(q) ?? false) ||
					(item.sku?.toLowerCase().includes(q) ?? false),
			);
		}
		if (filterCategory() !== "all") {
			const catId = filterCategory() === "none" ? null : filterCategory();
			result = result.filter((item) => item.category_id === catId);
		}
		if (filterStatus() === "enabled") {
			result = result.filter((item) => item.is_enabled);
		} else if (filterStatus() === "disabled") {
			result = result.filter((item) => !item.is_enabled);
		}
		return result;
	};

	const hasActiveFilters = () =>
		searchQuery().trim() !== "" || filterCategory() !== "all" || filterStatus() !== "all";

	const groupedItems = () => {
		const groups = new Map<string | null, MenuItem[]>();
		for (const item of filteredItems()) {
			const key = item.category_id;
			const list = groups.get(key) ?? [];
			list.push(item);
			groups.set(key, list);
		}
		for (const list of groups.values()) {
			list.sort((a, b) => a.display_order - b.display_order);
		}
		return groups;
	};

	const sortedGroupKeys = () => {
		const cats = categories()
			.filter((c) => c.is_active)
			.sort((a, b) => a.display_order - b.display_order);
		const keys: (string | null)[] = [];
		for (const cat of cats) {
			if (groupedItems().has(cat.id)) keys.push(cat.id);
		}
		if (groupedItems().has(null)) keys.push(null);
		return keys;
	};

	return (
		<div class="mx-auto max-w-2xl space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight">Menu</h2>
					<p class="mt-1 text-sm text-muted-foreground">Manage your menu items and categories.</p>
				</div>
				<Button type="button" onClick={() => setCreateOpen(true)}>
					+ Add Item
				</Button>
			</div>

			{/* Categories management */}
			<Show when={!loading()}>
				<div class="rounded-xl border bg-card shadow-sm">
					<button
						type="button"
						class="flex w-full items-center justify-between p-4 text-left"
						onClick={() => setCategoriesExpanded(!categoriesExpanded())}
					>
						<div class="flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-4 transition-transform"
								classList={{ "rotate-90": categoriesExpanded() }}
								aria-hidden="true"
							>
								<path d="m9 18 6-6-6-6" />
							</svg>
							<span class="text-sm font-medium">Categories ({categories().length})</span>
						</div>
						<span class="text-xs text-muted-foreground">
							{categoriesExpanded() ? "Collapse" : "Expand"}
						</span>
					</button>
					<Show when={categoriesExpanded()}>
						<CategoryManager
							categories={categories()}
							onCreated={handleCategoryCreated}
							onUpdated={handleCategoryUpdated}
							onDeleted={handleCategoryDeleted}
						/>
					</Show>
				</div>

				{/* Modifier Groups */}
				<div class="rounded-xl border bg-card shadow-sm">
					<button
						type="button"
						class="flex w-full items-center justify-between p-4 text-left"
						onClick={() => setModifiersExpanded(!modifiersExpanded())}
					>
						<div class="flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-4 transition-transform"
								classList={{ "rotate-90": modifiersExpanded() }}
								aria-hidden="true"
							>
								<path d="m9 18 6-6-6-6" />
							</svg>
							<span class="text-sm font-medium">Modifier Groups ({modifierGroups().length})</span>
						</div>
						<span class="text-xs text-muted-foreground">
							{modifiersExpanded() ? "Collapse" : "Expand"}
						</span>
					</button>
					<Show when={modifiersExpanded()}>
						<ModifierGroupManager
							groups={modifierGroups()}
							onCreated={(g) => setModifierGroups((prev) => [...prev, g])}
							onUpdated={(g) =>
								setModifierGroups((prev) => prev.map((x) => (x.id === g.id ? g : x)))
							}
							onDeleted={(id) => setModifierGroups((prev) => prev.filter((x) => x.id !== id))}
						/>
					</Show>
				</div>
			</Show>

			<Show when={error()}>
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
			</Show>

			<Show
				when={!loading()}
				fallback={
					<div class="space-y-3">
						<div class="h-16 animate-pulse rounded-xl border bg-card" />
						<div class="h-16 animate-pulse rounded-xl border bg-card" />
						<div class="h-16 animate-pulse rounded-xl border bg-card" />
					</div>
				}
			>
				<Show when={items().length === 0}>
					<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
						No menu items yet. Add your first item to get started.
					</div>
				</Show>

				<Show when={items().length > 0}>
					<div class="flex flex-wrap items-center gap-2">
						<div class="relative flex-1">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="absolute left-2.5 top-2.5 size-4 text-muted-foreground"
								aria-hidden="true"
							>
								<circle cx="11" cy="11" r="8" />
								<path d="m21 21-4.3-4.3" />
							</svg>
							<input
								type="text"
								class="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								placeholder="Search items..."
								value={searchQuery()}
								onInput={(e) => setSearchQuery(e.currentTarget.value)}
							/>
						</div>
						<select
							class="flex h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							value={filterCategory()}
							onChange={(e) => setFilterCategory(e.currentTarget.value)}
						>
							<option value="all">All categories</option>
							<option value="none">Uncategorized</option>
							<For each={categories().filter((c) => c.is_active)}>
								{(cat) => <option value={cat.id}>{cat.name}</option>}
							</For>
						</select>
						<select
							class="flex h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							value={filterStatus()}
							onChange={(e) =>
								setFilterStatus(e.currentTarget.value as "all" | "enabled" | "disabled")
							}
						>
							<option value="all">All status</option>
							<option value="enabled">Enabled</option>
							<option value="disabled">Disabled</option>
						</select>
						<Show when={hasActiveFilters()}>
							<button
								type="button"
								class="h-9 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
								onClick={() => {
									setSearchQuery("");
									setFilterCategory("all");
									setFilterStatus("all");
								}}
							>
								Clear
							</button>
						</Show>
						<button
							type="button"
							class="h-9 rounded-md border border-input px-3 text-xs transition-colors"
							classList={{
								"bg-primary text-primary-foreground": bulkMode(),
								"bg-background text-muted-foreground hover:text-foreground": !bulkMode(),
							}}
							onClick={() => {
								if (bulkMode()) exitBulkMode();
								else setBulkMode(true);
							}}
						>
							Select
						</button>
					</div>
					<Show when={hasActiveFilters()}>
						<p class="text-xs text-muted-foreground">
							{filteredItems().length} of {items().length} items
						</p>
					</Show>

					{/* Bulk action bar */}
					<Show when={bulkMode()}>
						<div class="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-2">
							<button
								type="button"
								class="text-xs text-primary hover:underline"
								onClick={() => {
									if (selectedIds().size === filteredItems().length) deselectAll();
									else selectAllVisible();
								}}
							>
								{selectedIds().size === filteredItems().length ? "Deselect all" : "Select all"}
							</button>
							<span class="text-xs text-muted-foreground">{selectedIds().size} selected</span>
							<div class="ml-auto flex flex-wrap items-center gap-1.5">
								<Button
									variant="outline"
									size="sm"
									disabled={selectedIds().size === 0 || bulkActionRunning()}
									onClick={() => bulkSetEnabled(true)}
								>
									Enable
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={selectedIds().size === 0 || bulkActionRunning()}
									onClick={() => bulkSetEnabled(false)}
								>
									Disable
								</Button>
								<select
									class="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									disabled={selectedIds().size === 0 || bulkActionRunning()}
									value=""
									onChange={(e) => {
										const val = e.currentTarget.value;
										if (!val) return;
										bulkSetCategory(val === "none" ? null : val);
										e.currentTarget.value = "";
									}}
								>
									<option value="">Move to...</option>
									<option value="none">Uncategorized</option>
									<For each={categories().filter((c) => c.is_active)}>
										{(cat) => <option value={cat.id}>{cat.name}</option>}
									</For>
								</select>
								<Button
									variant="destructive"
									size="sm"
									disabled={selectedIds().size === 0 || bulkActionRunning()}
									onClick={() => setBulkDeleteConfirmOpen(true)}
								>
									Delete
								</Button>
							</div>
						</div>
					</Show>
				</Show>

				<DragDropProvider
					onDragStart={({ draggable }) => setActiveItemId(String(draggable.id))}
					onDragEnd={onDragEnd}
					collisionDetector={closestCenter}
				>
					<DragDropSensors />
					<For each={sortedGroupKeys()}>
						{(groupKey) => {
							const groupItems = () => groupedItems().get(groupKey) ?? [];
							const groupCat = () => (groupKey ? categoryMap().get(groupKey) : null);
							const groupName = () =>
								groupKey === null ? "Uncategorized" : (groupCat()?.name ?? "Unknown");
							const ids = () => groupItems().map((i) => i.id);

							return (
								<div class="space-y-2">
									<h3 class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
										<Show when={groupCat()?.color}>
											<span
												class="size-3 rounded-full"
												style={{ "background-color": groupCat()!.color! }}
											/>
										</Show>
										{groupName()}
									</h3>
									<SortableProvider ids={ids()}>
										<ul class="space-y-2">
											<For each={groupItems()}>
												{(item) => (
													<SortableItem
														item={item}
														isActive={activeItemId() === item.id}
														togglingId={togglingId()}
														onSelect={() => setSelectedItem(item)}
														onToggle={(e) => toggleEnabled(e, item)}
														bulkMode={bulkMode()}
														isSelected={selectedIds().has(item.id)}
														onToggleSelect={() => toggleSelect(item.id)}
													/>
												)}
											</For>
										</ul>
									</SortableProvider>
								</div>
							);
						}}
					</For>
					<DragOverlay>
						{(draggable) => {
							const item = () =>
								draggable ? items().find((i) => i.id === String(draggable.id)) : null;
							return (
								<Show when={item()}>
									{(i) => (
										<div class="rounded-xl border bg-card p-4 shadow-lg">
											<p class="font-semibold">{i().name}</p>
											<span class="font-mono text-sm">kr {formatPrice(i().price_minor_unit)}</span>
										</div>
									)}
								</Show>
							);
						}}
					</DragOverlay>
				</DragDropProvider>
			</Show>

			<CreateItemDialog
				open={createOpen()}
				onOpenChange={setCreateOpen}
				categories={categories()}
				onCreated={handleCreated}
			/>

			<ItemDetailSheet
				item={selectedItem()}
				categories={categories()}
				modifierGroups={modifierGroups()}
				allItems={items()}
				onClose={() => setSelectedItem(null)}
				onUpdated={handleUpdated}
				onDeleted={handleDeleted}
			/>

			<Dialog open={bulkDeleteConfirmOpen()} onOpenChange={setBulkDeleteConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete {selectedIds().size} items?</DialogTitle>
						<DialogDescription>
							This will permanently delete the selected menu items. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setBulkDeleteConfirmOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" disabled={bulkActionRunning()} onClick={bulkDelete}>
							{bulkActionRunning() ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
