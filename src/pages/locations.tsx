import { createMemo, createSignal, For, onMount, Show } from "solid-js";
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
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";

interface Location {
	id: string;
	name: string;
	address: string;
	city: string;
	postal_code: string;
	country: string;
	org_number: string | null;
	is_active: boolean;
	timezone: string;
}

interface MenuItem {
	id: string;
	name: string;
	price_minor_unit: number;
	is_enabled: boolean;
}

interface LocationMenuOverride {
	id: string;
	location_id: string;
	menu_item_id: string;
	price_minor_unit: number | null;
	is_available: boolean;
}

function formatPrice(minorUnit: number): string {
	const major = Math.floor(Math.abs(minorUnit) / 100);
	const minor = Math.abs(minorUnit) % 100;
	const sign = minorUnit < 0 ? "-" : "";
	return `${sign}${major},${minor.toString().padStart(2, "0")}`;
}

function parsePriceToMinor(input: string): number {
	const cleaned = input.replaceAll(/[^0-9.,-]/g, "").replace(",", ".");
	const num = Number.parseFloat(cleaned);
	if (Number.isNaN(num)) return 0;
	return Math.round(num * 100);
}

export default function LocationsPage() {
	const [locations, setLocations] = createSignal<Location[]>([]);
	const [menuItems, setMenuItems] = createSignal<MenuItem[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [dialogOpen, setDialogOpen] = createSignal(false);
	const [expandedId, setExpandedId] = createSignal<string | null>(null);

	const fetchLocations = async () => {
		const [locRes, itemsRes] = await Promise.all([
			customFetch<{
				data: Location[] & { error?: string; message?: string };
				status: number;
			}>("/api/locations"),
			customFetch<{ data: MenuItem[]; status: number }>("/api/menu-items"),
		]);
		if (locRes.status === 200) {
			setLocations(locRes.data);
		} else {
			setError(locRes.data?.error ?? locRes.data?.message ?? "Failed to load locations");
		}
		if (itemsRes.status === 200) setMenuItems(itemsRes.data);
		setLoading(false);
	};

	onMount(fetchLocations);

	const handleCreated = (loc: Location) => {
		setLocations((prev) => [...prev, loc]);
		setDialogOpen(false);
	};

	return (
		<div class="mx-auto max-w-2xl space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight">Locations</h2>
					<p class="mt-1 text-sm text-muted-foreground">Manage your business locations.</p>
				</div>
				<Button type="button" onClick={() => setDialogOpen(true)}>
					+ Create New
				</Button>
			</div>

			<Show when={error()}>
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
			</Show>

			<Show
				when={!loading()}
				fallback={
					<div class="space-y-3">
						<div class="h-24 animate-pulse rounded-xl border bg-card" />
						<div class="h-24 animate-pulse rounded-xl border bg-card" />
					</div>
				}
			>
				<Show when={locations().length === 0}>
					<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
						No locations yet. Create your first one to get started.
					</div>
				</Show>

				<div class="space-y-3">
					<For each={locations()}>
						{(loc) => (
							<div class="rounded-xl border bg-card shadow-sm">
								<div class="p-4">
									<div class="flex items-start justify-between">
										<div>
											<div class="flex items-center gap-2">
												<h3 class="font-semibold">{loc.name}</h3>
												<span
													class="rounded-full px-2 py-0.5 text-xs font-medium"
													classList={{
														"bg-primary/10 text-primary": loc.is_active,
														"bg-muted text-muted-foreground": !loc.is_active,
													}}
												>
													{loc.is_active ? "Active" : "Inactive"}
												</span>
											</div>
											<p class="mt-1 text-sm text-muted-foreground">
												{loc.address}, {loc.postal_code} {loc.city}
											</p>
										</div>
										<div class="text-right text-xs text-muted-foreground">
											<Show when={loc.org_number}>
												<p>Org: {loc.org_number}</p>
											</Show>
											<p>{loc.timezone}</p>
										</div>
									</div>
								</div>
								<div class="border-t">
									<button
										type="button"
										class="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
										onClick={() => setExpandedId(expandedId() === loc.id ? null : loc.id)}
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
											classList={{ "rotate-90": expandedId() === loc.id }}
											aria-hidden="true"
										>
											<path d="m9 18 6-6-6-6" />
										</svg>
										Menu Overrides
									</button>
									<Show when={expandedId() === loc.id}>
										<LocationOverrides locationId={loc.id} menuItems={menuItems()} />
									</Show>
								</div>
							</div>
						)}
					</For>
				</div>
			</Show>

			<CreateLocationDialog
				open={dialogOpen()}
				onOpenChange={setDialogOpen}
				onCreated={handleCreated}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Location Overrides
// ---------------------------------------------------------------------------

function LocationOverrides(props: { locationId: string; menuItems: MenuItem[] }) {
	const [overrides, setOverrides] = createSignal<LocationMenuOverride[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [search, setSearch] = createSignal("");
	const [savingItemId, setSavingItemId] = createSignal<string | null>(null);
	const [error, setError] = createSignal<string | null>(null);

	const fetchData = async () => {
		const overridesRes = await customFetch<{
			data: LocationMenuOverride[];
			status: number;
		}>(`/api/locations/${props.locationId}/menu-overrides`);
		if (overridesRes.status === 200) setOverrides(overridesRes.data);
		setLoading(false);
	};

	onMount(fetchData);

	const overrideMap = createMemo(() => {
		const map = new Map<string, LocationMenuOverride>();
		for (const o of overrides()) {
			map.set(o.menu_item_id, o);
		}
		return map;
	});

	const itemsWithOverrides = createMemo(() => {
		const oMap = overrideMap();
		return props.menuItems
			.filter((item) => oMap.has(item.id))
			.map((item) => ({ item, override: oMap.get(item.id)! }));
	});

	const filteredAvailableItems = createMemo(() => {
		const oMap = overrideMap();
		const q = search().toLowerCase().trim();
		return props.menuItems
			.filter((item) => !oMap.has(item.id))
			.filter((item) => !q || item.name.toLowerCase().includes(q));
	});

	const setOverride = async (
		menuItemId: string,
		priceMinorUnit: number | null,
		isAvailable: boolean,
	) => {
		setSavingItemId(menuItemId);
		setError(null);

		const body: Record<string, unknown> = {
			menu_item_id: menuItemId,
			is_available: isAvailable,
		};
		if (priceMinorUnit !== null) body.price_minor_unit = priceMinorUnit;

		const res = await customFetch<{
			data: LocationMenuOverride & { error?: string; message?: string };
			status: number;
		}>(`/api/locations/${props.locationId}/menu-overrides`, {
			method: "PUT",
			body: JSON.stringify(body),
		});

		setSavingItemId(null);

		if (res.status === 200) {
			setOverrides((prev) => {
				const filtered = prev.filter((o) => o.menu_item_id !== menuItemId);
				return [...filtered, res.data];
			});
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to set override");
		}
	};

	const removeOverride = async (menuItemId: string) => {
		setSavingItemId(menuItemId);
		setError(null);

		const res = await customFetch<{ status: number }>(
			`/api/locations/${props.locationId}/menu-overrides/${menuItemId}`,
			{ method: "DELETE" },
		);

		setSavingItemId(null);

		if (res.status === 204) {
			setOverrides((prev) => prev.filter((o) => o.menu_item_id !== menuItemId));
		} else {
			setError("Failed to remove override");
		}
	};

	const markUnavailable = (menuItemId: string) => {
		setOverride(menuItemId, null, false);
	};

	const markAvailable = (menuItemId: string) => {
		const existing = overrideMap().get(menuItemId);
		setOverride(menuItemId, existing?.price_minor_unit ?? null, true);
	};

	return (
		<div class="border-t px-4 pb-4">
			<Show
				when={!loading()}
				fallback={
					<div class="py-3">
						<div class="h-8 animate-pulse rounded bg-muted" />
					</div>
				}
			>
				<Show when={error()}>
					<div class="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
						{error()}
					</div>
				</Show>

				{/* Current overrides */}
				<Show when={itemsWithOverrides().length > 0}>
					<div class="mt-3 space-y-2">
						<p class="text-xs font-medium text-muted-foreground">Active Overrides</p>
						<For each={itemsWithOverrides()}>
							{({ item, override }) => (
								<OverrideRow
									item={item}
									override={override}
									saving={savingItemId() === item.id}
									onSetPrice={(price) => setOverride(item.id, price, override.is_available)}
									onToggleAvailable={() =>
										override.is_available ? markUnavailable(item.id) : markAvailable(item.id)
									}
									onRemove={() => removeOverride(item.id)}
								/>
							)}
						</For>
					</div>
				</Show>

				{/* Add override */}
				<div class="mt-3 space-y-2">
					<p class="text-xs font-medium text-muted-foreground">Add Override</p>
					<input
						type="text"
						class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						placeholder="Search items..."
						value={search()}
						onInput={(e) => setSearch(e.currentTarget.value)}
					/>
					<Show when={search().trim() || filteredAvailableItems().length <= 8}>
						<div class="max-h-40 space-y-1 overflow-y-auto">
							<For each={filteredAvailableItems().slice(0, 15)}>
								{(item) => (
									<div class="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent">
										<span>{item.name}</span>
										<div class="flex items-center gap-2">
											<span class="font-mono text-xs text-muted-foreground">
												kr {formatPrice(item.price_minor_unit)}
											</span>
											<button
												type="button"
												class="text-xs text-primary hover:underline"
												disabled={savingItemId() === item.id}
												onClick={() => markUnavailable(item.id)}
											>
												Unavailable
											</button>
											<button
												type="button"
												class="text-xs text-muted-foreground hover:underline"
												disabled={savingItemId() === item.id}
												onClick={() => setOverride(item.id, item.price_minor_unit, true)}
											>
												Custom price
											</button>
										</div>
									</div>
								)}
							</For>
							<Show when={filteredAvailableItems().length === 0}>
								<p class="py-2 text-center text-xs text-muted-foreground">
									{search().trim() ? "No matching items" : "All items already have overrides"}
								</p>
							</Show>
						</div>
					</Show>
				</div>
			</Show>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Override Row
// ---------------------------------------------------------------------------

function OverrideRow(props: {
	item: MenuItem;
	override: LocationMenuOverride;
	saving: boolean;
	onSetPrice: (price: number | null) => void;
	onToggleAvailable: () => void;
	onRemove: () => void;
}) {
	const [editingPrice, setEditingPrice] = createSignal(false);
	const [priceInput, setPriceInput] = createSignal("");

	const startEditPrice = () => {
		setPriceInput(
			props.override.price_minor_unit !== null
				? formatPrice(props.override.price_minor_unit)
				: formatPrice(props.item.price_minor_unit),
		);
		setEditingPrice(true);
	};

	const savePrice = () => {
		const minor = parsePriceToMinor(priceInput());
		if (minor > 0) {
			props.onSetPrice(minor);
		}
		setEditingPrice(false);
	};

	const clearPrice = () => {
		props.onSetPrice(null);
		setEditingPrice(false);
	};

	return (
		<div
			class="flex items-center gap-3 rounded-lg border px-3 py-2"
			classList={{ "opacity-60": !props.override.is_available }}
		>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium">{props.item.name}</p>
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<span class="font-mono">kr {formatPrice(props.item.price_minor_unit)}</span>
					<Show when={props.override.price_minor_unit !== null}>
						<span class="text-primary">→ kr {formatPrice(props.override.price_minor_unit!)}</span>
					</Show>
					<Show when={!props.override.is_available}>
						<span class="font-medium text-destructive">Unavailable</span>
					</Show>
				</div>
			</div>

			<Show
				when={!editingPrice()}
				fallback={
					<div class="flex items-center gap-1">
						<input
							type="text"
							class="h-7 w-20 rounded border border-input bg-background px-2 text-xs"
							value={priceInput()}
							onInput={(e) => setPriceInput(e.currentTarget.value)}
							inputMode="decimal"
							onKeyDown={(e) => {
								if (e.key === "Enter") savePrice();
								if (e.key === "Escape") setEditingPrice(false);
							}}
						/>
						<button
							type="button"
							class="h-7 rounded bg-primary px-2 text-xs text-primary-foreground"
							onClick={savePrice}
						>
							Set
						</button>
						<Show when={props.override.price_minor_unit !== null}>
							<button
								type="button"
								class="h-7 px-1 text-xs text-muted-foreground hover:underline"
								onClick={clearPrice}
							>
								Reset
							</button>
						</Show>
						<button
							type="button"
							class="h-7 px-1 text-xs text-muted-foreground hover:underline"
							onClick={() => setEditingPrice(false)}
						>
							Cancel
						</button>
					</div>
				}
			>
				<div class="flex items-center gap-1.5">
					<button
						type="button"
						class="text-xs text-muted-foreground hover:text-foreground"
						disabled={props.saving}
						onClick={startEditPrice}
					>
						Price
					</button>
					<button
						type="button"
						class="text-xs"
						classList={{
							"text-destructive hover:underline": props.override.is_available,
							"text-primary hover:underline": !props.override.is_available,
						}}
						disabled={props.saving}
						onClick={props.onToggleAvailable}
					>
						{props.override.is_available ? "Hide" : "Show"}
					</button>
					<button
						type="button"
						class="text-xs text-muted-foreground hover:text-destructive"
						disabled={props.saving}
						onClick={props.onRemove}
					>
						x
					</button>
				</div>
			</Show>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Create Location Dialog
// ---------------------------------------------------------------------------

function CreateLocationDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (loc: Location) => void;
}) {
	const [name, setName] = createSignal("");
	const [address, setAddress] = createSignal("");
	const [postalCode, setPostalCode] = createSignal("");
	const [city, setCity] = createSignal("");
	const [orgNumber, setOrgNumber] = createSignal("");
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const resetForm = () => {
		setName("");
		setAddress("");
		setPostalCode("");
		setCity("");
		setOrgNumber("");
		setError(null);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!name().trim()) {
			setError("Name is required.");
			return;
		}
		if (!address().trim() || address().length < 2) {
			setError("Address is required (at least 2 characters).");
			return;
		}
		if (!/^\d{4}$/.test(postalCode())) {
			setError("Postal code must be exactly 4 digits.");
			return;
		}
		if (!city().trim() || city().length < 2) {
			setError("City is required (at least 2 characters).");
			return;
		}

		setSubmitting(true);

		const res = await customFetch<{
			data: Location & { error?: string; message?: string };
			status: number;
		}>("/api/locations", {
			method: "POST",
			body: JSON.stringify({
				name: name(),
				address: address(),
				city: city(),
				postal_code: postalCode(),
				org_number: orgNumber() || undefined,
			}),
		});

		setSubmitting(false);

		if (res.status === 201) {
			resetForm();
			props.onCreated(res.data);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to create location");
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
					<DialogTitle>New Location</DialogTitle>
					<DialogDescription>Add a new business location.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} class="space-y-4">
					<TextField value={name()} onChange={(v) => setName(v)}>
						<TextFieldLabel>Location Name</TextFieldLabel>
						<TextFieldInput placeholder="Hovedkontor" />
					</TextField>

					<TextField value={address()} onChange={(v) => setAddress(v)}>
						<TextFieldLabel>Address</TextFieldLabel>
						<TextFieldInput placeholder="Karl Johans gate 1" />
					</TextField>

					<div class="grid grid-cols-2 gap-4">
						<TextField
							value={postalCode()}
							onChange={(v) => setPostalCode(v.replaceAll(/\D/g, "").slice(0, 4))}
						>
							<TextFieldLabel>Postal Code</TextFieldLabel>
							<TextFieldInput placeholder="0154" inputMode="numeric" maxLength={4} />
						</TextField>

						<TextField value={city()} onChange={(v) => setCity(v)}>
							<TextFieldLabel>City</TextFieldLabel>
							<TextFieldInput placeholder="Oslo" />
						</TextField>
					</div>

					<TextField
						value={orgNumber()}
						onChange={(v) => setOrgNumber(v.replaceAll(/\D/g, "").slice(0, 9))}
					>
						<TextFieldLabel>Org. Number (optional)</TextFieldLabel>
						<TextFieldInput placeholder="123456789" inputMode="numeric" maxLength={9} />
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
