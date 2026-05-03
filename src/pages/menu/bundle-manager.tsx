import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import type { BundleSlot, BundleSlotOption, MenuItem } from "./types";
import { formatPrice } from "./types";

export function BundleSlotManager(props: { itemId: string; allItems: MenuItem[] }) {
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
		const res = await apiFetch<{ data: BundleSlot[]; status: number }>(
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

		const res = await apiFetch<{
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

		const res = await apiFetch<{
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

		const res = await apiFetch<{ status: number }>(
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

function BundleSlotOptions(props: { itemId: string; slotId: string; allItems: MenuItem[] }) {
	const [options, setOptions] = createSignal<BundleSlotOption[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [saving, setSaving] = createSignal(false);
	const [search, setSearch] = createSignal("");

	const fetchOptions = async () => {
		const res = await apiFetch<{ data: BundleSlotOption[]; status: number }>(
			`/api/menu-items/${props.itemId}/bundle-slots/${props.slotId}/options`,
		);
		if (res.status === 200) setOptions(res.data);
		setLoading(false);
	};

	onMount(fetchOptions);

	const optionItemIds = createMemo(() => new Set(options().map((o) => o.menu_item_id)));

	const availableItems = createMemo(() => {
		const assigned = optionItemIds();
		const q = search().toLowerCase().trim();
		return props.allItems
			.filter((item) => !assigned.has(item.id) && item.id !== props.itemId)
			.filter((item) => !q || item.name.toLowerCase().includes(q));
	});

	const saveOptions = async (newOptions: BundleSlotOption[]) => {
		setSaving(true);
		const payload = newOptions.map((o, i) => ({
			menu_item_id: o.menu_item_id,
			price_adjustment_minor_unit: o.price_adjustment_minor_unit,
			is_default: o.is_default,
			display_order: i,
		}));

		const res = await apiFetch<{ status: number }>(
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
