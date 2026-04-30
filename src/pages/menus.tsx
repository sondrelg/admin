import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js";
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

interface Menu {
	id: string;
	name: string;
	active_from: string | null;
	active_until: string | null;
	active_days: number | null;
	display_order: number;
	is_active: boolean;
}

interface MenuItem {
	id: string;
	name: string;
	price_minor_unit: number;
	is_enabled: boolean;
	category_id: string | null;
}

interface MenuItemAssignment {
	id: string;
	menu_item_id: string;
	display_order: number;
	price_override_minor_unit: number | null;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_BITS = [1, 2, 4, 8, 16, 32, 64];

function isDayActive(bitmask: number | null, dayIndex: number): boolean {
	if (bitmask === null) return true;
	return (bitmask & DAY_BITS[dayIndex]) !== 0;
}

function toggleDay(bitmask: number | null, dayIndex: number): number {
	const current = bitmask ?? 127;
	return current ^ DAY_BITS[dayIndex];
}

function formatTime(time: string | null): string {
	if (!time) return "";
	return time.substring(0, 5);
}

function describeSchedule(menu: Menu): string {
	const parts: string[] = [];

	if (menu.active_from && menu.active_until) {
		parts.push(`${formatTime(menu.active_from)}–${formatTime(menu.active_until)}`);
	} else if (menu.active_from) {
		parts.push(`from ${formatTime(menu.active_from)}`);
	} else if (menu.active_until) {
		parts.push(`until ${formatTime(menu.active_until)}`);
	}

	if (menu.active_days !== null && menu.active_days !== 127) {
		const days = DAY_LABELS.filter((_, i) => isDayActive(menu.active_days, i));
		if (
			days.length === 5 &&
			!isDayActive(menu.active_days, 5) &&
			!isDayActive(menu.active_days, 6)
		) {
			parts.push("Weekdays");
		} else if (
			days.length === 2 &&
			isDayActive(menu.active_days, 5) &&
			isDayActive(menu.active_days, 6)
		) {
			parts.push("Weekends");
		} else {
			parts.push(days.join(", "));
		}
	}

	return parts.length > 0 ? parts.join(" · ") : "Always active";
}

function formatPrice(minorUnit: number): string {
	const major = Math.floor(Math.abs(minorUnit) / 100);
	const minor = Math.abs(minorUnit) % 100;
	const sign = minorUnit < 0 ? "-" : "";
	return `${sign}${major},${minor.toString().padStart(2, "0")}`;
}

export function MenusPage() {
	const [menus, setMenus] = createSignal<Menu[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [createOpen, setCreateOpen] = createSignal(false);
	const [selectedMenu, setSelectedMenu] = createSignal<Menu | null>(null);
	const [allMenuItems, setAllMenuItems] = createSignal<MenuItem[]>([]);

	const fetchMenus = async () => {
		const [menusRes, itemsRes] = await Promise.all([
			customFetch<{ data: Menu[]; status: number }>("/api/menus"),
			customFetch<{ data: MenuItem[]; status: number }>("/api/menu-items"),
		]);
		if (menusRes.status === 200) setMenus(menusRes.data);
		else {
			const d = menusRes.data as unknown as { error?: string; message?: string };
			setError(d?.error ?? d?.message ?? "Failed to load menus");
		}
		if (itemsRes.status === 200) setAllMenuItems(itemsRes.data);
		setLoading(false);
	};

	onMount(fetchMenus);

	const sorted = () => [...menus()].sort((a, b) => a.display_order - b.display_order);

	const handleCreated = (menu: Menu) => {
		setMenus((prev) => [...prev, menu]);
		setCreateOpen(false);
	};

	const handleUpdated = (menu: Menu) => {
		setMenus((prev) => prev.map((m) => (m.id === menu.id ? menu : m)));
		setSelectedMenu(null);
	};

	const handleDeleted = (id: string) => {
		setMenus((prev) => prev.filter((m) => m.id !== id));
		setSelectedMenu(null);
	};

	return (
		<div class="mx-auto max-w-2xl space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight">Menus</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Create menus with time and day scheduling. Assign items with optional price overrides.
					</p>
				</div>
				<Button type="button" onClick={() => setCreateOpen(true)}>
					+ New Menu
				</Button>
			</div>

			<Show when={error()}>
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
			</Show>

			<Show
				when={!loading()}
				fallback={
					<div class="space-y-3">
						<div class="h-20 animate-pulse rounded-xl border bg-card" />
						<div class="h-20 animate-pulse rounded-xl border bg-card" />
					</div>
				}
			>
				<Show when={menus().length === 0}>
					<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
						No menus yet. Create your first menu to organize items by time or occasion.
					</div>
				</Show>

				<div class="space-y-3">
					<For each={sorted()}>
						{(menu) => (
							<button
								type="button"
								class="flex w-full items-start justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50"
								classList={{ "opacity-50": !menu.is_active }}
								onClick={() => setSelectedMenu(menu)}
							>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<p class="font-semibold">{menu.name}</p>
										<Show when={!menu.is_active}>
											<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
												Inactive
											</span>
										</Show>
									</div>
									<p class="mt-1 text-sm text-muted-foreground">{describeSchedule(menu)}</p>
								</div>
								<div class="flex gap-1 pt-0.5">
									<For each={DAY_LABELS}>
										{(day, i) => (
											<span
												class="flex size-6 items-center justify-center rounded text-[10px] font-medium"
												classList={{
													"bg-primary/10 text-primary": isDayActive(menu.active_days, i()),
													"bg-muted/50 text-muted-foreground/40": !isDayActive(
														menu.active_days,
														i(),
													),
												}}
											>
												{day.charAt(0)}
											</span>
										)}
									</For>
								</div>
							</button>
						)}
					</For>
				</div>
			</Show>

			<CreateMenuDialog
				open={createOpen()}
				onOpenChange={setCreateOpen}
				onCreated={handleCreated}
			/>

			<MenuDetailSheet
				menu={selectedMenu()}
				allMenuItems={allMenuItems()}
				onClose={() => setSelectedMenu(null)}
				onUpdated={handleUpdated}
				onDeleted={handleDeleted}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Create Menu Dialog
// ---------------------------------------------------------------------------

function CreateMenuDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (menu: Menu) => void;
}) {
	const [name, setName] = createSignal("");
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const resetForm = () => {
		setName("");
		setError(null);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!name().trim()) {
			setError("Name is required.");
			return;
		}

		setSubmitting(true);
		setError(null);

		const res = await customFetch<{
			data: Menu & { error?: string; message?: string };
			status: number;
		}>("/api/menus", {
			method: "POST",
			body: JSON.stringify({ name: name() }),
		});

		setSubmitting(false);

		if (res.status === 201) {
			resetForm();
			props.onCreated(res.data);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to create menu");
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
					<DialogTitle>New Menu</DialogTitle>
					<DialogDescription>
						Create a named menu. You can set scheduling and assign items after creating.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} class="space-y-4">
					<TextField value={name()} onChange={(v) => setName(v)}>
						<TextFieldLabel>Name</TextFieldLabel>
						<TextFieldInput placeholder="Lunch Menu" />
					</TextField>

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

// ---------------------------------------------------------------------------
// Menu Detail Sheet
// ---------------------------------------------------------------------------

function MenuDetailSheet(props: {
	menu: Menu | null;
	allMenuItems: MenuItem[];
	onClose: () => void;
	onUpdated: (menu: Menu) => void;
	onDeleted: (id: string) => void;
}) {
	const [name, setName] = createSignal("");
	const [activeFrom, setActiveFrom] = createSignal("");
	const [activeUntil, setActiveUntil] = createSignal("");
	const [activeDays, setActiveDays] = createSignal<number>(127);
	const [isActive, setIsActive] = createSignal(true);
	const [saving, setSaving] = createSignal(false);
	const [deleting, setDeleting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	// Item assignments
	const [assignedIds, setAssignedIds] = createSignal<Set<string>>(new Set());
	const [savingItems, setSavingItems] = createSignal(false);
	const [itemSearch, setItemSearch] = createSignal("");

	createEffect(() => {
		const menu = props.menu;
		if (menu) {
			setName(menu.name);
			setActiveFrom(formatTime(menu.active_from));
			setActiveUntil(formatTime(menu.active_until));
			setActiveDays(menu.active_days ?? 127);
			setIsActive(menu.is_active);
			setError(null);
			setItemSearch("");
			fetchDetails(menu.id);
		}
	});

	const fetchDetails = async (menuId: string) => {
		const assignRes = await customFetch<{
			data: MenuItemAssignment[];
			status: number;
		}>(`/api/menus/${menuId}/items`);
		if (assignRes.status === 200) {
			setAssignedIds(new Set(assignRes.data.map((a) => a.menu_item_id)));
		}
	};

	const handleSave = async () => {
		const menu = props.menu;
		if (!menu) return;

		if (!name().trim()) {
			setError("Name is required.");
			return;
		}

		setError(null);
		setSaving(true);

		const body: Record<string, unknown> = {
			name: name(),
			is_active: isActive(),
		};
		body.active_from = activeFrom() || null;
		body.active_until = activeUntil() || null;
		body.active_days = activeDays();

		const res = await customFetch<{
			data: Menu & { error?: string; message?: string };
			status: number;
		}>(`/api/menus/${menu.id}`, {
			method: "PUT",
			body: JSON.stringify(body),
		});

		setSaving(false);

		if (res.status === 200) {
			props.onUpdated(res.data);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to update menu");
		}
	};

	const handleDelete = async () => {
		const menu = props.menu;
		if (!menu) return;

		setDeleting(true);
		const res = await customFetch<{ status: number }>(`/api/menus/${menu.id}`, {
			method: "DELETE",
		});
		setDeleting(false);

		if (res.status === 204) {
			props.onDeleted(menu.id);
		} else {
			setError("Failed to delete menu");
		}
	};

	const toggleItem = async (itemId: string) => {
		const menu = props.menu;
		if (!menu) return;

		const current = new Set(assignedIds());
		if (current.has(itemId)) current.delete(itemId);
		else current.add(itemId);

		setSavingItems(true);

		const items = [...current].map((id, i) => ({
			menu_item_id: id,
			display_order: i,
		}));

		const res = await customFetch<{ status: number }>(`/api/menus/${menu.id}/items`, {
			method: "PUT",
			body: JSON.stringify({ items }),
		});

		setSavingItems(false);

		if (res.status === 204 || res.status === 200) {
			setAssignedIds(current);
		}
	};

	const filteredUnassigned = createMemo(() => {
		const q = itemSearch().toLowerCase().trim();
		return props.allMenuItems
			.filter((item) => !assignedIds().has(item.id))
			.filter((item) => !q || item.name.toLowerCase().includes(q));
	});

	const assignedItems = createMemo(() =>
		props.allMenuItems.filter((item) => assignedIds().has(item.id)),
	);

	return (
		<Sheet
			open={props.menu !== null}
			onOpenChange={(open) => {
				if (!open) props.onClose();
			}}
		>
			<SheetContent class="flex flex-col sm:max-w-md">
				<SheetHeader>
					<SheetTitle>{props.menu?.name ?? "Menu"}</SheetTitle>
					<SheetDescription>Edit schedule, active days, and assigned items.</SheetDescription>
				</SheetHeader>

				<div class="flex-1 space-y-6 overflow-y-auto py-4">
					{/* Name */}
					<TextField value={name()} onChange={(v) => setName(v)}>
						<TextFieldLabel>Name</TextFieldLabel>
						<TextFieldInput />
					</TextField>

					{/* Schedule */}
					<div class="space-y-3">
						<h4 class="text-sm font-medium">Schedule</h4>
						<div class="grid grid-cols-2 gap-3">
							<div class="space-y-1.5">
								<label class="text-xs text-muted-foreground" for="menu-from">
									Active from
								</label>
								<input
									id="menu-from"
									type="time"
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									value={activeFrom()}
									onInput={(e) => setActiveFrom(e.currentTarget.value)}
								/>
							</div>
							<div class="space-y-1.5">
								<label class="text-xs text-muted-foreground" for="menu-until">
									Active until
								</label>
								<input
									id="menu-until"
									type="time"
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									value={activeUntil()}
									onInput={(e) => setActiveUntil(e.currentTarget.value)}
								/>
							</div>
						</div>
						<Show when={activeFrom() || activeUntil()}>
							<button
								type="button"
								class="text-xs text-muted-foreground hover:text-foreground"
								onClick={() => {
									setActiveFrom("");
									setActiveUntil("");
								}}
							>
								Clear time restriction
							</button>
						</Show>
					</div>

					{/* Active days */}
					<div class="space-y-3">
						<h4 class="text-sm font-medium">Active Days</h4>
						<div class="flex gap-1.5">
							<For each={DAY_LABELS}>
								{(day, i) => (
									<button
										type="button"
										class="flex size-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors"
										classList={{
											"border-primary bg-primary/10 text-primary": isDayActive(activeDays(), i()),
											"border-input text-muted-foreground hover:bg-accent": !isDayActive(
												activeDays(),
												i(),
											),
										}}
										onClick={() => setActiveDays(toggleDay(activeDays(), i()))}
									>
										{day}
									</button>
								)}
							</For>
						</div>
						<div class="flex gap-2">
							<button
								type="button"
								class="text-xs text-muted-foreground hover:text-foreground"
								onClick={() => setActiveDays(31)}
							>
								Weekdays
							</button>
							<button
								type="button"
								class="text-xs text-muted-foreground hover:text-foreground"
								onClick={() => setActiveDays(96)}
							>
								Weekends
							</button>
							<button
								type="button"
								class="text-xs text-muted-foreground hover:text-foreground"
								onClick={() => setActiveDays(127)}
							>
								Every day
							</button>
						</div>
					</div>

					{/* Active toggle */}
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">Active</span>
						<button
							type="button"
							class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
							classList={{
								"bg-primary": isActive(),
								"bg-input": !isActive(),
							}}
							onClick={() => setIsActive(!isActive())}
						>
							<span
								class="pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform"
								classList={{
									"translate-x-5": isActive(),
									"translate-x-0": !isActive(),
								}}
							/>
						</button>
					</div>

					{/* Assigned items */}
					<div class="space-y-3">
						<h4 class="text-sm font-medium">Assigned Items ({assignedIds().size})</h4>

						<Show when={assignedItems().length > 0}>
							<div class="space-y-1">
								<For each={assignedItems()}>
									{(item) => (
										<div class="flex items-center justify-between rounded-lg border px-3 py-2">
											<span class="text-sm">{item.name}</span>
											<div class="flex items-center gap-2">
												<span class="font-mono text-xs text-muted-foreground">
													kr {formatPrice(item.price_minor_unit)}
												</span>
												<button
													type="button"
													class="text-xs text-muted-foreground hover:text-destructive"
													disabled={savingItems()}
													onClick={() => toggleItem(item.id)}
												>
													Remove
												</button>
											</div>
										</div>
									)}
								</For>
							</div>
						</Show>

						{/* Add items */}
						<div class="space-y-2">
							<input
								type="text"
								class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								placeholder="Search items to add..."
								value={itemSearch()}
								onInput={(e) => setItemSearch(e.currentTarget.value)}
							/>
							<Show when={itemSearch().trim() || filteredUnassigned().length <= 10}>
								<div class="max-h-40 space-y-1 overflow-y-auto">
									<For each={filteredUnassigned().slice(0, 20)}>
										{(item) => (
											<button
												type="button"
												class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
												classList={{ "opacity-50": !item.is_enabled }}
												disabled={savingItems()}
												onClick={() => toggleItem(item.id)}
											>
												<span>{item.name}</span>
												<span class="font-mono text-xs text-muted-foreground">
													kr {formatPrice(item.price_minor_unit)}
												</span>
											</button>
										)}
									</For>
									<Show when={filteredUnassigned().length === 0}>
										<p class="py-2 text-center text-xs text-muted-foreground">
											{itemSearch().trim() ? "No matching items" : "All items assigned"}
										</p>
									</Show>
								</div>
							</Show>
						</div>
					</div>
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
