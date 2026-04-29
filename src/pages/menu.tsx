import {
	closestCenter,
	createSortable,
	DragDropProvider,
	DragDropSensors,
	DragOverlay,
	SortableProvider,
	transformStyle,
} from "@thisbeyond/solid-dnd";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";

interface MenuItem {
	id: string;
	name: string;
	description: string | null;
	price_minor_unit: number;
	category_id: string | null;
	is_enabled: boolean;
	sku: string | null;
	display_order: number;
}

interface Category {
	id: string;
	name: string;
	display_order: number;
	is_active: boolean;
	color: string | null;
}

interface Allergen {
	id: string;
	name: string;
	code: string;
	display_order: number;
}

interface TaxRate {
	id: string;
	name: string;
	rate_bps: number;
	is_default: boolean;
}

interface ModifierGroup {
	id: string;
	name: string;
	min_selections: number;
	max_selections: number;
	display_order: number;
	is_active: boolean;
}

interface Modifier {
	id: string;
	name: string;
	price_minor_unit: number;
	display_order: number;
	is_active: boolean;
	modifier_group_id: string;
}

interface ModifierGroupAssignment {
	id: string;
	modifier_group_id: string;
	display_order: number;
}

interface MenuItemImage {
	id: string;
	menu_item_id: string;
	content_type: string;
	size_bytes: number;
	display_order: number;
	width: number | null;
	height: number | null;
	blurhash: string | null;
	url: string;
	thumbnail_url: string | null;
	created_at: string;
}

interface BundleSlot {
	id: string;
	name: string;
	min_selections: number;
	max_selections: number;
	display_order: number;
	bundle_item_id: string;
}

interface BundleSlotOption {
	id: string;
	bundle_slot_id: string;
	menu_item_id: string;
	price_adjustment_minor_unit: number;
	is_default: boolean;
	display_order: number;
}

function formatPrice(minorUnit: number): string {
	const major = Math.floor(Math.abs(minorUnit) / 100);
	const minor = Math.abs(minorUnit) % 100;
	const sign = minorUnit < 0 ? "-" : "";
	return `${sign}${major},${minor.toString().padStart(2, "0")}`;
}

function parsePriceToMinor(input: string): number {
	const cleaned = input.replace(/[^0-9.,-]/g, "").replace(",", ".");
	const num = Number.parseFloat(cleaned);
	if (Number.isNaN(num)) return 0;
	return Math.round(num * 100);
}

function SortableItem(props: {
	item: MenuItem;
	isActive: boolean;
	togglingId: string | null;
	onSelect: () => void;
	onToggle: (e: MouseEvent) => void;
	bulkMode: boolean;
	isSelected: boolean;
	onToggleSelect: () => void;
}) {
	const sortable = createSortable(props.item.id);

	const handleClick = (e: MouseEvent) => {
		// Don't open detail sheet if clicking the toggle button or drag handle
		const target = e.target as HTMLElement;
		if (target.closest("[data-toggle]") || target.closest("[data-drag-handle]")) return;
		if (props.bulkMode) {
			props.onToggleSelect();
			return;
		}
		props.onSelect();
	};

	return (
		<li
			ref={sortable.ref}
			class="cursor-pointer rounded-xl border bg-card shadow-sm transition-transform hover:bg-accent/50"
			classList={{
				"opacity-50": !props.item.is_enabled,
				"opacity-25": props.isActive,
				"ring-2 ring-primary": props.isSelected,
			}}
			style={transformStyle(sortable.transform)}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter") props.onSelect();
			}}
		>
			<div class="flex w-full items-center gap-2 p-4">
				<Show when={props.bulkMode}>
					<input
						type="checkbox"
						checked={props.isSelected}
						class="size-4 shrink-0 rounded border-input accent-primary"
						onClick={(e) => {
							e.stopPropagation();
							props.onToggleSelect();
						}}
					/>
				</Show>
				<div
					data-drag-handle
					class="flex shrink-0 cursor-grab items-center touch-none"
					{...sortable.dragActivators}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="size-4 text-muted-foreground"
						aria-hidden="true"
					>
						<circle cx="9" cy="5" r="1" />
						<circle cx="9" cy="12" r="1" />
						<circle cx="9" cy="19" r="1" />
						<circle cx="15" cy="5" r="1" />
						<circle cx="15" cy="12" r="1" />
						<circle cx="15" cy="19" r="1" />
					</svg>
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<p class="font-semibold">{props.item.name}</p>
						<Show when={props.item.sku}>
							<span class="text-xs text-muted-foreground">({props.item.sku})</span>
						</Show>
					</div>
					<Show when={props.item.description}>
						<p class="mt-0.5 truncate text-sm text-muted-foreground">{props.item.description}</p>
					</Show>
				</div>
				<div class="flex items-center gap-3">
					<span class="whitespace-nowrap font-mono text-sm">
						kr {formatPrice(props.item.price_minor_unit)}
					</span>
					<button
						data-toggle
						type="button"
						class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
						classList={{
							"bg-primary/10 text-primary hover:bg-primary/20": props.item.is_enabled,
							"bg-muted text-muted-foreground hover:bg-muted/80": !props.item.is_enabled,
						}}
						disabled={props.togglingId === props.item.id}
						onClick={(e) => {
							e.stopPropagation();
							props.onToggle(e);
						}}
					>
						{props.item.is_enabled ? "Enabled" : "Disabled"}
					</button>
				</div>
			</div>
		</li>
	);
}

function formatRateBps(bps: number): string {
	const pct = bps / 100;
	return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`;
}

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

// ---------------------------------------------------------------------------
// Category Manager
// ---------------------------------------------------------------------------

const PRESET_COLORS = [
	"#8B4513",
	"#1E90FF",
	"#228B22",
	"#FF8C00",
	"#9333EA",
	"#DC2626",
	"#0891B2",
	"#CA8A04",
	"#64748B",
	"#EC4899",
];

function CategoryManager(props: {
	categories: Category[];
	onCreated: (cat: Category) => void;
	onUpdated: (cat: Category) => void;
	onDeleted: (id: string) => void;
}) {
	const [newName, setNewName] = createSignal("");
	const [newColor, setNewColor] = createSignal(PRESET_COLORS[0]);
	const [creating, setCreating] = createSignal(false);
	const [editingId, setEditingId] = createSignal<string | null>(null);
	const [editName, setEditName] = createSignal("");
	const [editColor, setEditColor] = createSignal("");
	const [editActive, setEditActive] = createSignal(true);
	const [savingId, setSavingId] = createSignal<string | null>(null);
	const [deletingId, setDeletingId] = createSignal<string | null>(null);
	const [error, setError] = createSignal<string | null>(null);

	const sorted = () => [...props.categories].sort((a, b) => a.display_order - b.display_order);

	const startEdit = (cat: Category) => {
		setEditingId(cat.id);
		setEditName(cat.name);
		setEditColor(cat.color ?? PRESET_COLORS[0]);
		setEditActive(cat.is_active);
		setError(null);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setError(null);
	};

	const handleCreate = async () => {
		if (!newName().trim()) return;
		setCreating(true);
		setError(null);

		const res = await customFetch<{
			data: Category & { error?: string; message?: string };
			status: number;
		}>("/api/categories", {
			method: "POST",
			body: JSON.stringify({ name: newName(), color: newColor() }),
		});

		setCreating(false);
		if (res.status === 201) {
			props.onCreated(res.data);
			setNewName("");
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to create category");
		}
	};

	const handleSave = async (id: string) => {
		if (!editName().trim()) return;
		setSavingId(id);
		setError(null);

		const res = await customFetch<{
			data: Category & { error?: string; message?: string };
			status: number;
		}>(`/api/categories/${id}`, {
			method: "PUT",
			body: JSON.stringify({
				name: editName(),
				color: editColor(),
				is_active: editActive(),
			}),
		});

		setSavingId(null);
		if (res.status === 200) {
			props.onUpdated(res.data);
			setEditingId(null);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to update category");
		}
	};

	const handleDelete = async (id: string) => {
		setDeletingId(id);
		setError(null);

		const res = await customFetch<{ status: number }>(`/api/categories/${id}`, {
			method: "DELETE",
		});

		setDeletingId(null);
		if (res.status === 204) {
			props.onDeleted(id);
			if (editingId() === id) setEditingId(null);
		} else {
			setError("Failed to delete category. It may still have items assigned.");
		}
	};

	return (
		<div class="border-t px-4 pb-4">
			<Show when={error()}>
				<div class="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error()}</div>
			</Show>

			{/* Existing categories */}
			<div class="mt-3 space-y-2">
				<For each={sorted()}>
					{(cat) => (
						<Show
							when={editingId() === cat.id}
							fallback={
								<div
									class="flex items-center gap-3 rounded-lg border px-3 py-2"
									classList={{ "opacity-50": !cat.is_active }}
								>
									<span
										class="size-4 shrink-0 rounded-full border"
										style={{ "background-color": cat.color ?? "#64748B" }}
									/>
									<span class="flex-1 text-sm font-medium">{cat.name}</span>
									<Show when={!cat.is_active}>
										<span class="text-xs text-muted-foreground">Inactive</span>
									</Show>
									<button
										type="button"
										class="text-xs text-muted-foreground hover:text-foreground"
										onClick={() => startEdit(cat)}
									>
										Edit
									</button>
								</div>
							}
						>
							{/* Editing mode */}
							<div class="space-y-3 rounded-lg border border-primary/30 bg-accent/30 p-3">
								<div class="flex items-center gap-2">
									<input
										type="text"
										class="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
										value={editName()}
										onInput={(e) => setEditName(e.currentTarget.value)}
									/>
								</div>
								<div class="flex flex-wrap gap-1.5">
									<For each={PRESET_COLORS}>
										{(color) => (
											<button
												type="button"
												class="size-6 rounded-full border-2 transition-transform hover:scale-110"
												classList={{
													"border-foreground scale-110": editColor() === color,
													"border-transparent": editColor() !== color,
												}}
												style={{ "background-color": color }}
												onClick={() => setEditColor(color)}
											/>
										)}
									</For>
								</div>
								<div class="flex items-center justify-between">
									<label class="flex items-center gap-2 text-xs">
										<button
											type="button"
											class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
											classList={{
												"bg-primary": editActive(),
												"bg-input": !editActive(),
											}}
											onClick={() => setEditActive(!editActive())}
										>
											<span
												class="pointer-events-none inline-block size-4 rounded-full bg-background shadow ring-0 transition-transform"
												classList={{
													"translate-x-4": editActive(),
													"translate-x-0": !editActive(),
												}}
											/>
										</button>
										Active
									</label>
									<div class="flex items-center gap-2">
										<button
											type="button"
											class="text-xs text-destructive hover:underline"
											disabled={deletingId() === cat.id}
											onClick={() => handleDelete(cat.id)}
										>
											{deletingId() === cat.id ? "..." : "Delete"}
										</button>
										<button
											type="button"
											class="text-xs text-muted-foreground hover:underline"
											onClick={cancelEdit}
										>
											Cancel
										</button>
										<Button
											type="button"
											size="sm"
											class="h-7 px-3 text-xs"
											disabled={savingId() === cat.id}
											onClick={() => handleSave(cat.id)}
										>
											{savingId() === cat.id ? "..." : "Save"}
										</Button>
									</div>
								</div>
							</div>
						</Show>
					)}
				</For>
			</div>

			{/* Create new category */}
			<div class="mt-3 flex items-center gap-2">
				<div class="relative">
					<button
						type="button"
						class="size-8 rounded-full border-2 border-dashed border-input"
						style={{ "background-color": newColor() }}
						onClick={() => {
							const idx = PRESET_COLORS.indexOf(newColor());
							setNewColor(PRESET_COLORS[(idx + 1) % PRESET_COLORS.length]);
						}}
						title="Click to cycle color"
					/>
				</div>
				<input
					type="text"
					class="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
					placeholder="New category name..."
					value={newName()}
					onInput={(e) => setNewName(e.currentTarget.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleCreate();
					}}
				/>
				<Button
					type="button"
					size="sm"
					class="h-8 px-3 text-xs"
					disabled={creating() || !newName().trim()}
					onClick={handleCreate}
				>
					{creating() ? "..." : "Add"}
				</Button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Modifier Group Manager
// ---------------------------------------------------------------------------

function ModifierGroupManager(props: {
	groups: ModifierGroup[];
	onCreated: (g: ModifierGroup) => void;
	onUpdated: (g: ModifierGroup) => void;
	onDeleted: (id: string) => void;
}) {
	const [newName, setNewName] = createSignal("");
	const [creating, setCreating] = createSignal(false);
	const [expandedGroupId, setExpandedGroupId] = createSignal<string | null>(null);
	const [editingId, setEditingId] = createSignal<string | null>(null);
	const [editName, setEditName] = createSignal("");
	const [editMin, setEditMin] = createSignal("0");
	const [editMax, setEditMax] = createSignal("0");
	const [editActive, setEditActive] = createSignal(true);
	const [savingId, setSavingId] = createSignal<string | null>(null);
	const [deletingId, setDeletingId] = createSignal<string | null>(null);
	const [error, setError] = createSignal<string | null>(null);

	const sorted = () => [...props.groups].sort((a, b) => a.display_order - b.display_order);

	const handleCreate = async () => {
		if (!newName().trim()) return;
		setCreating(true);
		setError(null);

		const res = await customFetch<{
			data: ModifierGroup & { error?: string; message?: string };
			status: number;
		}>("/api/modifier-groups", {
			method: "POST",
			body: JSON.stringify({ name: newName() }),
		});

		setCreating(false);
		if (res.status === 201) {
			props.onCreated(res.data);
			setNewName("");
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to create group");
		}
	};

	const startEdit = (g: ModifierGroup) => {
		setEditingId(g.id);
		setEditName(g.name);
		setEditMin(String(g.min_selections));
		setEditMax(String(g.max_selections));
		setEditActive(g.is_active);
		setError(null);
	};

	const handleSave = async (id: string) => {
		if (!editName().trim()) return;
		setSavingId(id);
		setError(null);

		const res = await customFetch<{
			data: ModifierGroup & { error?: string; message?: string };
			status: number;
		}>(`/api/modifier-groups/${id}`, {
			method: "PUT",
			body: JSON.stringify({
				name: editName(),
				min_selections: Number.parseInt(editMin(), 10) || 0,
				max_selections: Number.parseInt(editMax(), 10) || 0,
				is_active: editActive(),
			}),
		});

		setSavingId(null);
		if (res.status === 200) {
			props.onUpdated(res.data);
			setEditingId(null);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to update group");
		}
	};

	const handleDelete = async (id: string) => {
		setDeletingId(id);
		setError(null);

		const res = await customFetch<{ status: number }>(`/api/modifier-groups/${id}`, {
			method: "DELETE",
		});

		setDeletingId(null);
		if (res.status === 204) {
			props.onDeleted(id);
			if (editingId() === id) setEditingId(null);
			if (expandedGroupId() === id) setExpandedGroupId(null);
		} else {
			setError("Failed to delete group. It may be assigned to items.");
		}
	};

	return (
		<div class="border-t px-4 pb-4">
			<Show when={error()}>
				<div class="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error()}</div>
			</Show>

			<div class="mt-3 space-y-2">
				<For each={sorted()}>
					{(group) => (
						<Show
							when={editingId() === group.id}
							fallback={
								<div class="rounded-lg border" classList={{ "opacity-50": !group.is_active }}>
									<div class="flex items-center gap-3 px-3 py-2">
										<button
											type="button"
											class="flex flex-1 items-center gap-2 text-left"
											onClick={() =>
												setExpandedGroupId(expandedGroupId() === group.id ? null : group.id)
											}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="size-3 transition-transform"
												classList={{
													"rotate-90": expandedGroupId() === group.id,
												}}
												aria-hidden="true"
											>
												<path d="m9 18 6-6-6-6" />
											</svg>
											<span class="text-sm font-medium">{group.name}</span>
											<span class="text-xs text-muted-foreground">
												({group.min_selections}–{group.max_selections} selections)
											</span>
										</button>
										<button
											type="button"
											class="text-xs text-muted-foreground hover:text-foreground"
											onClick={() => startEdit(group)}
										>
											Edit
										</button>
									</div>
									<Show when={expandedGroupId() === group.id}>
										<ModifierList groupId={group.id} />
									</Show>
								</div>
							}
						>
							{/* Editing mode */}
							<div class="space-y-3 rounded-lg border border-primary/30 bg-accent/30 p-3">
								<input
									type="text"
									class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
									value={editName()}
									onInput={(e) => setEditName(e.currentTarget.value)}
								/>
								<div class="flex items-center gap-4">
									<label class="flex items-center gap-1.5 text-xs">
										Min
										<input
											type="number"
											min="0"
											class="h-7 w-14 rounded-md border border-input bg-background px-2 text-xs"
											value={editMin()}
											onInput={(e) => setEditMin(e.currentTarget.value)}
										/>
									</label>
									<label class="flex items-center gap-1.5 text-xs">
										Max
										<input
											type="number"
											min="0"
											class="h-7 w-14 rounded-md border border-input bg-background px-2 text-xs"
											value={editMax()}
											onInput={(e) => setEditMax(e.currentTarget.value)}
										/>
									</label>
									<label class="flex items-center gap-2 text-xs">
										<button
											type="button"
											class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
											classList={{
												"bg-primary": editActive(),
												"bg-input": !editActive(),
											}}
											onClick={() => setEditActive(!editActive())}
										>
											<span
												class="pointer-events-none inline-block size-4 rounded-full bg-background shadow ring-0 transition-transform"
												classList={{
													"translate-x-4": editActive(),
													"translate-x-0": !editActive(),
												}}
											/>
										</button>
										Active
									</label>
								</div>
								<div class="flex items-center justify-end gap-2">
									<button
										type="button"
										class="text-xs text-destructive hover:underline"
										disabled={deletingId() === group.id}
										onClick={() => handleDelete(group.id)}
									>
										{deletingId() === group.id ? "..." : "Delete"}
									</button>
									<button
										type="button"
										class="text-xs text-muted-foreground hover:underline"
										onClick={() => setEditingId(null)}
									>
										Cancel
									</button>
									<Button
										type="button"
										size="sm"
										class="h-7 px-3 text-xs"
										disabled={savingId() === group.id}
										onClick={() => handleSave(group.id)}
									>
										{savingId() === group.id ? "..." : "Save"}
									</Button>
								</div>
							</div>
						</Show>
					)}
				</For>
			</div>

			{/* Create new group */}
			<div class="mt-3 flex items-center gap-2">
				<input
					type="text"
					class="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
					placeholder="New modifier group..."
					value={newName()}
					onInput={(e) => setNewName(e.currentTarget.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleCreate();
					}}
				/>
				<Button
					type="button"
					size="sm"
					class="h-8 px-3 text-xs"
					disabled={creating() || !newName().trim()}
					onClick={handleCreate}
				>
					{creating() ? "..." : "Add"}
				</Button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Modifier List (within a group)
// ---------------------------------------------------------------------------

function ModifierList(props: { groupId: string }) {
	const [modifiers, setModifiers] = createSignal<Modifier[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [newName, setNewName] = createSignal("");
	const [newPrice, setNewPrice] = createSignal("");
	const [creating, setCreating] = createSignal(false);
	const [deletingId, setDeletingId] = createSignal<string | null>(null);

	const fetchModifiers = async () => {
		const res = await customFetch<{ data: Modifier[]; status: number }>(
			`/api/modifier-groups/${props.groupId}/modifiers`,
		);
		if (res.status === 200) setModifiers(res.data);
		setLoading(false);
	};

	onMount(fetchModifiers);

	const handleCreate = async () => {
		if (!newName().trim()) return;
		setCreating(true);

		const body: Record<string, unknown> = { name: newName() };
		const priceMinor = parsePriceToMinor(newPrice());
		if (priceMinor !== 0) body.price_minor_unit = priceMinor;

		const res = await customFetch<{
			data: Modifier & { error?: string; message?: string };
			status: number;
		}>(`/api/modifier-groups/${props.groupId}/modifiers`, {
			method: "POST",
			body: JSON.stringify(body),
		});

		setCreating(false);
		if (res.status === 201) {
			setModifiers((prev) => [...prev, res.data]);
			setNewName("");
			setNewPrice("");
		}
	};

	const handleDelete = async (modId: string) => {
		setDeletingId(modId);
		const res = await customFetch<{ status: number }>(
			`/api/modifier-groups/${props.groupId}/modifiers/${modId}`,
			{ method: "DELETE" },
		);
		setDeletingId(null);
		if (res.status === 204) {
			setModifiers((prev) => prev.filter((m) => m.id !== modId));
		}
	};

	const sorted = () => [...modifiers()].sort((a, b) => a.display_order - b.display_order);

	return (
		<div class="border-t px-3 pb-3">
			<Show
				when={!loading()}
				fallback={
					<div class="py-2">
						<div class="h-6 animate-pulse rounded bg-muted" />
					</div>
				}
			>
				<Show when={modifiers().length === 0 && !creating()}>
					<p class="py-2 text-xs text-muted-foreground">No modifiers yet.</p>
				</Show>

				<div class="mt-2 space-y-1">
					<For each={sorted()}>
						{(mod) => (
							<div
								class="flex items-center justify-between rounded px-2 py-1 text-sm"
								classList={{ "opacity-50": !mod.is_active }}
							>
								<span>{mod.name}</span>
								<div class="flex items-center gap-2">
									<Show when={mod.price_minor_unit !== 0}>
										<span class="font-mono text-xs text-muted-foreground">
											{mod.price_minor_unit > 0 ? "+" : ""}
											{formatPrice(mod.price_minor_unit)} kr
										</span>
									</Show>
									<button
										type="button"
										class="text-xs text-muted-foreground hover:text-destructive"
										disabled={deletingId() === mod.id}
										onClick={() => handleDelete(mod.id)}
									>
										{deletingId() === mod.id ? "..." : "x"}
									</button>
								</div>
							</div>
						)}
					</For>
				</div>

				{/* Add modifier */}
				<div class="mt-2 flex items-center gap-2">
					<input
						type="text"
						class="flex h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs"
						placeholder="Modifier name..."
						value={newName()}
						onInput={(e) => setNewName(e.currentTarget.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleCreate();
						}}
					/>
					<input
						type="text"
						class="flex h-7 w-20 rounded-md border border-input bg-background px-2 text-xs"
						placeholder="+kr"
						value={newPrice()}
						onInput={(e) => setNewPrice(e.currentTarget.value)}
						inputMode="decimal"
					/>
					<button
						type="button"
						class="h-7 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
						disabled={creating() || !newName().trim()}
						onClick={handleCreate}
					>
						{creating() ? "..." : "+"}
					</button>
				</div>
			</Show>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Image Manager
// ---------------------------------------------------------------------------

function ImageManager(props: { itemId: string }) {
	const [images, setImages] = createSignal<MenuItemImage[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [uploading, setUploading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	let fileInput!: HTMLInputElement;

	const fetchImages = async () => {
		const res = await customFetch<{
			data: MenuItemImage[];
			status: number;
		}>(`/api/menu-items/${props.itemId}/images`);
		if (res.status === 200) setImages(res.data);
		setLoading(false);
	};

	onMount(fetchImages);

	const sorted = () => [...images()].sort((a, b) => a.display_order - b.display_order);

	const handleFileSelect = async (e: Event) => {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			setError("Please select an image file.");
			input.value = "";
			return;
		}

		// Validate file size (max 10MB, server also enforces)
		if (file.size > 10 * 1024 * 1024) {
			setError("Image must be under 10 MB.");
			input.value = "";
			return;
		}

		setError(null);
		setUploading(true);

		try {
			const formData = new FormData();
			formData.append("file", file);

			const res = await customFetch<{
				data: MenuItemImage & { error?: string };
				status: number;
			}>(`/api/menu-items/${props.itemId}/images`, {
				method: "POST",
				body: formData,
			});

			if (res.status === 201) {
				setImages((prev) => [...prev, res.data]);
			} else {
				setError(res.data?.error ?? "Failed to upload image.");
			}
		} catch {
			setError("Failed to upload image.");
		} finally {
			setUploading(false);
			input.value = "";
		}
	};

	const handleDelete = async (imageId: string) => {
		const res = await customFetch<{ status: number }>(
			`/api/menu-items/${props.itemId}/images/${imageId}`,
			{ method: "DELETE" },
		);
		if (res.status === 204) {
			setImages((prev) => prev.filter((img) => img.id !== imageId));
		}
	};

	const formatSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<h4 class="text-sm font-medium">Images</h4>
				<button
					type="button"
					class="text-xs text-primary hover:underline"
					disabled={uploading()}
					onClick={() => fileInput.click()}
				>
					{uploading() ? "Uploading..." : "+ Add"}
				</button>
				<input
					ref={fileInput}
					type="file"
					accept="image/*"
					class="hidden"
					onChange={handleFileSelect}
				/>
			</div>

			<Show when={error()}>
				<div class="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error()}</div>
			</Show>

			<Show when={!loading()} fallback={<div class="h-16 animate-pulse rounded-lg bg-muted" />}>
				<Show
					when={sorted().length > 0}
					fallback={<p class="text-xs text-muted-foreground">No images yet.</p>}
				>
					<div class="grid grid-cols-3 gap-2">
						<For each={sorted()}>
							{(img) => (
								<div class="group relative overflow-hidden rounded-lg border bg-muted">
									<img
										src={img.thumbnail_url ?? img.url}
										alt=""
										class="aspect-square w-full object-cover"
										loading="lazy"
										onError={(e) => {
											const el = e.currentTarget;
											el.style.display = "none";
											el.parentElement?.classList.add(
												"flex",
												"items-center",
												"justify-center",
												"aspect-square",
											);
											const span = document.createElement("span");
											span.className = "text-xs text-muted-foreground";
											span.textContent = img.content_type.split("/")[1]?.toUpperCase() ?? "IMG";
											el.parentElement?.appendChild(span);
										}}
									/>
									<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
										<div class="flex items-center justify-between">
											<span class="text-[10px] text-white">{formatSize(img.size_bytes)}</span>
											<button
												type="button"
												class="rounded px-1 text-[10px] text-white hover:bg-white/20"
												onClick={() => handleDelete(img.id)}
											>
												Remove
											</button>
										</div>
									</div>
								</div>
							)}
						</For>
					</div>
				</Show>
			</Show>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Bundle Slot Manager
// ---------------------------------------------------------------------------

function BundleSlotManager(props: { itemId: string; allItems: MenuItem[] }) {
	const [slots, setSlots] = createSignal<BundleSlot[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [expandedSlotId, setExpandedSlotId] = createSignal<string | null>(null);
	const [newName, setNewName] = createSignal("");
	const [creating, setCreating] = createSignal(false);
	const [editingId, setEditingId] = createSignal<string | null>(null);
	const [editName, setEditName] = createSignal("");
	const [editMin, setEditMin] = createSignal("1");
	const [editMax, setEditMax] = createSignal("1");
	const [savingId, setSavingId] = createSignal<string | null>(null);
	const [deletingId, setDeletingId] = createSignal<string | null>(null);

	const fetchSlots = async () => {
		const res = await customFetch<{ data: BundleSlot[]; status: number }>(
			`/api/menu-items/${props.itemId}/bundle-slots`,
		);
		if (res.status === 200) setSlots(res.data);
		setLoading(false);
	};

	onMount(fetchSlots);

	const sorted = () => [...slots()].sort((a, b) => a.display_order - b.display_order);

	const handleCreate = async () => {
		if (!newName().trim()) return;
		setCreating(true);

		const res = await customFetch<{
			data: BundleSlot & { error?: string; message?: string };
			status: number;
		}>(`/api/menu-items/${props.itemId}/bundle-slots`, {
			method: "POST",
			body: JSON.stringify({ name: newName() }),
		});

		setCreating(false);
		if (res.status === 201) {
			setSlots((prev) => [...prev, res.data]);
			setNewName("");
		}
	};

	const startEdit = (slot: BundleSlot) => {
		setEditingId(slot.id);
		setEditName(slot.name);
		setEditMin(String(slot.min_selections));
		setEditMax(String(slot.max_selections));
	};

	const handleSave = async (slotId: string) => {
		if (!editName().trim()) return;
		setSavingId(slotId);

		const res = await customFetch<{
			data: BundleSlot & { error?: string; message?: string };
			status: number;
		}>(`/api/menu-items/${props.itemId}/bundle-slots/${slotId}`, {
			method: "PUT",
			body: JSON.stringify({
				name: editName(),
				min_selections: Number.parseInt(editMin(), 10) || 0,
				max_selections: Number.parseInt(editMax(), 10) || 1,
			}),
		});

		setSavingId(null);
		if (res.status === 200) {
			setSlots((prev) => prev.map((s) => (s.id === slotId ? res.data : s)));
			setEditingId(null);
		}
	};

	const handleDelete = async (slotId: string) => {
		setDeletingId(slotId);

		const res = await customFetch<{ status: number }>(
			`/api/menu-items/${props.itemId}/bundle-slots/${slotId}`,
			{ method: "DELETE" },
		);

		setDeletingId(null);
		if (res.status === 204) {
			setSlots((prev) => prev.filter((s) => s.id !== slotId));
			if (expandedSlotId() === slotId) setExpandedSlotId(null);
		}
	};

	return (
		<div class="space-y-3">
			<Show when={!loading()} fallback={<div class="h-8 animate-pulse rounded bg-muted" />}>
				<For each={sorted()}>
					{(slot) => (
						<Show
							when={editingId() === slot.id}
							fallback={
								<div class="rounded-lg border">
									<div class="flex items-center gap-2 px-3 py-2">
										<button
											type="button"
											class="flex flex-1 items-center gap-2 text-left"
											onClick={() =>
												setExpandedSlotId(expandedSlotId() === slot.id ? null : slot.id)
											}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="size-3 transition-transform"
												classList={{
													"rotate-90": expandedSlotId() === slot.id,
												}}
												aria-hidden="true"
											>
												<path d="m9 18 6-6-6-6" />
											</svg>
											<span class="text-sm font-medium">{slot.name}</span>
											<span class="text-xs text-muted-foreground">
												({slot.min_selections}–{slot.max_selections})
											</span>
										</button>
										<button
											type="button"
											class="text-xs text-muted-foreground hover:text-foreground"
											onClick={() => startEdit(slot)}
										>
											Edit
										</button>
									</div>
									<Show when={expandedSlotId() === slot.id}>
										<BundleSlotOptions
											itemId={props.itemId}
											slotId={slot.id}
											allItems={props.allItems}
										/>
									</Show>
								</div>
							}
						>
							<div class="space-y-2 rounded-lg border border-primary/30 bg-accent/30 p-3">
								<input
									type="text"
									class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
									value={editName()}
									onInput={(e) => setEditName(e.currentTarget.value)}
								/>
								<div class="flex items-center gap-4">
									<label class="flex items-center gap-1.5 text-xs">
										Min
										<input
											type="number"
											min="0"
											class="h-7 w-14 rounded-md border border-input bg-background px-2 text-xs"
											value={editMin()}
											onInput={(e) => setEditMin(e.currentTarget.value)}
										/>
									</label>
									<label class="flex items-center gap-1.5 text-xs">
										Max
										<input
											type="number"
											min="0"
											class="h-7 w-14 rounded-md border border-input bg-background px-2 text-xs"
											value={editMax()}
											onInput={(e) => setEditMax(e.currentTarget.value)}
										/>
									</label>
								</div>
								<div class="flex items-center justify-end gap-2">
									<button
										type="button"
										class="text-xs text-destructive hover:underline"
										disabled={deletingId() === slot.id}
										onClick={() => handleDelete(slot.id)}
									>
										{deletingId() === slot.id ? "..." : "Delete"}
									</button>
									<button
										type="button"
										class="text-xs text-muted-foreground hover:underline"
										onClick={() => setEditingId(null)}
									>
										Cancel
									</button>
									<Button
										type="button"
										size="sm"
										class="h-7 px-3 text-xs"
										disabled={savingId() === slot.id}
										onClick={() => handleSave(slot.id)}
									>
										{savingId() === slot.id ? "..." : "Save"}
									</Button>
								</div>
							</div>
						</Show>
					)}
				</For>

				<Show when={slots().length === 0}>
					<p class="text-xs text-muted-foreground">
						No bundle slots. Add slots to make this item a bundle.
					</p>
				</Show>

				<div class="flex items-center gap-2">
					<input
						type="text"
						class="flex h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs"
						placeholder="New slot name..."
						value={newName()}
						onInput={(e) => setNewName(e.currentTarget.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleCreate();
						}}
					/>
					<button
						type="button"
						class="h-7 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
						disabled={creating() || !newName().trim()}
						onClick={handleCreate}
					>
						{creating() ? "..." : "+ Slot"}
					</button>
				</div>
			</Show>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Bundle Slot Options
// ---------------------------------------------------------------------------

function BundleSlotOptions(props: { itemId: string; slotId: string; allItems: MenuItem[] }) {
	const [options, setOptions] = createSignal<BundleSlotOption[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [saving, setSaving] = createSignal(false);
	const [search, setSearch] = createSignal("");

	const fetchOptions = async () => {
		const res = await customFetch<{ data: BundleSlotOption[]; status: number }>(
			`/api/menu-items/${props.itemId}/bundle-slots/${props.slotId}/options`,
		);
		if (res.status === 200) setOptions(res.data);
		setLoading(false);
	};

	onMount(fetchOptions);

	const optionItemIds = () => new Set(options().map((o) => o.menu_item_id));

	const availableItems = () => {
		const assigned = optionItemIds();
		const q = search().toLowerCase().trim();
		return props.allItems
			.filter((item) => !assigned.has(item.id) && item.id !== props.itemId)
			.filter((item) => !q || item.name.toLowerCase().includes(q));
	};

	const saveOptions = async (newOptions: BundleSlotOption[]) => {
		setSaving(true);
		const payload = newOptions.map((o, i) => ({
			menu_item_id: o.menu_item_id,
			price_adjustment_minor_unit: o.price_adjustment_minor_unit,
			is_default: o.is_default,
			display_order: i,
		}));

		const res = await customFetch<{ status: number }>(
			`/api/menu-items/${props.itemId}/bundle-slots/${props.slotId}/options`,
			{
				method: "PUT",
				body: JSON.stringify({ options: payload }),
			},
		);

		setSaving(false);
		if (res.status === 200 || res.status === 204) {
			setOptions(newOptions);
		}
	};

	const addOption = (itemId: string) => {
		const newOpt: BundleSlotOption = {
			id: crypto.randomUUID(),
			bundle_slot_id: props.slotId,
			menu_item_id: itemId,
			price_adjustment_minor_unit: 0,
			is_default: false,
			display_order: options().length,
		};
		saveOptions([...options(), newOpt]);
	};

	const removeOption = (itemId: string) => {
		saveOptions(options().filter((o) => o.menu_item_id !== itemId));
	};

	const toggleDefault = (itemId: string) => {
		saveOptions(
			options().map((o) => (o.menu_item_id === itemId ? { ...o, is_default: !o.is_default } : o)),
		);
	};

	const itemName = (itemId: string) =>
		props.allItems.find((i) => i.id === itemId)?.name ?? "Unknown";

	return (
		<div class="border-t px-3 pb-3">
			<Show
				when={!loading()}
				fallback={
					<div class="py-2">
						<div class="h-6 animate-pulse rounded bg-muted" />
					</div>
				}
			>
				<Show when={options().length === 0}>
					<p class="mt-2 text-xs text-muted-foreground">No options yet.</p>
				</Show>

				<div class="mt-2 space-y-1">
					<For each={options()}>
						{(opt) => (
							<div class="flex items-center justify-between rounded px-2 py-1 text-sm">
								<div class="flex items-center gap-2">
									<span>{itemName(opt.menu_item_id)}</span>
									<Show when={opt.is_default}>
										<span class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
											Default
										</span>
									</Show>
								</div>
								<div class="flex items-center gap-2">
									<Show when={opt.price_adjustment_minor_unit !== 0}>
										<span class="font-mono text-xs text-muted-foreground">
											{opt.price_adjustment_minor_unit > 0 ? "+" : ""}
											{formatPrice(opt.price_adjustment_minor_unit)} kr
										</span>
									</Show>
									<button
										type="button"
										class="text-xs text-muted-foreground hover:text-foreground"
										disabled={saving()}
										onClick={() => toggleDefault(opt.menu_item_id)}
									>
										{opt.is_default ? "Unset" : "Default"}
									</button>
									<button
										type="button"
										class="text-xs text-muted-foreground hover:text-destructive"
										disabled={saving()}
										onClick={() => removeOption(opt.menu_item_id)}
									>
										x
									</button>
								</div>
							</div>
						)}
					</For>
				</div>

				<div class="mt-2 space-y-1">
					<input
						type="text"
						class="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
						placeholder="Search items to add..."
						value={search()}
						onInput={(e) => setSearch(e.currentTarget.value)}
					/>
					<Show when={search().trim() || availableItems().length <= 8}>
						<div class="max-h-32 space-y-0.5 overflow-y-auto">
							<For each={availableItems().slice(0, 10)}>
								{(item) => (
									<button
										type="button"
										class="flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-accent"
										disabled={saving()}
										onClick={() => addOption(item.id)}
									>
										<span>{item.name}</span>
										<span class="font-mono text-muted-foreground">
											kr {formatPrice(item.price_minor_unit)}
										</span>
									</button>
								)}
							</For>
						</div>
					</Show>
				</div>
			</Show>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Item Detail Sheet
// ---------------------------------------------------------------------------

function ItemDetailSheet(props: {
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
				customFetch<{ data: TaxRate[]; status: number }>(`/api/menu-items/${itemId}/tax-rates`),
				customFetch<{ data: ModifierGroupAssignment[]; status: number }>(
					`/api/menu-items/${itemId}/modifier-groups`,
				),
			]);
		if (allergensRes.status === 200) setAllAllergens(allergensRes.data);
		if (itemAllergensRes.status === 200)
			setItemAllergenIds(new Set(itemAllergensRes.data.map((a) => a.id)));
		if (taxRatesRes.status === 200) setAllTaxRates(taxRatesRes.data);
		if (itemTaxRatesRes.status === 200)
			setItemTaxRateIds(new Set(itemTaxRatesRes.data.map((t) => t.id)));
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

// ---------------------------------------------------------------------------
// Create Item Dialog
// ---------------------------------------------------------------------------

function CreateItemDialog(props: {
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

		const res = await customFetch<{
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
