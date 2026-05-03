import { createSignal, For, Show } from "solid-js";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import type { Category } from "./types";

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

export function CategoryManager(props: {
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

		const res = await apiFetch<{
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

		const res = await apiFetch<{
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

		const res = await apiFetch<{ status: number }>(`/api/categories/${id}`, {
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
