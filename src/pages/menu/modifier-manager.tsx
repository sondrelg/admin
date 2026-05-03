import { createSignal, For, onMount, Show } from "solid-js";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import type { Modifier, ModifierGroup } from "./types";
import { formatPrice, parsePriceToMinor } from "./types";

export function ModifierGroupManager(props: {
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

		const res = await apiFetch<{
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

		const res = await apiFetch<{
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

		const res = await apiFetch<{ status: number }>(`/api/modifier-groups/${id}`, {
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

function ModifierList(props: { groupId: string }) {
	const [modifiers, setModifiers] = createSignal<Modifier[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [newName, setNewName] = createSignal("");
	const [newPrice, setNewPrice] = createSignal("");
	const [creating, setCreating] = createSignal(false);
	const [deletingId, setDeletingId] = createSignal<string | null>(null);

	const fetchModifiers = async () => {
		const res = await apiFetch<{ data: Modifier[]; status: number }>(
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

		const res = await apiFetch<{
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
		const res = await apiFetch<{ status: number }>(
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
