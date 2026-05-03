import { createSignal, For, onMount, Show } from "solid-js";
import { apiFetch } from "~/api/request";
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
import { formatDate, formatRelative } from "~/lib/datetime";

interface Device {
	id: string;
	name: string;
	is_active: boolean;
	activated_at: string | null;
	last_seen_at: string | null;
	register_id: string | null;
	created_at: string;
}

interface ActivationCode {
	code: string;
	expires_at: string;
	device_id: string;
}

export default function DevicesPage() {
	const [devices, setDevices] = createSignal<Device[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [pairOpen, setPairOpen] = createSignal(false);
	const [editDevice, setEditDevice] = createSignal<Device | null>(null);

	const fetchDevices = async () => {
		const res = await apiFetch<{
			data: Device[] & { error?: string; message?: string };
			status: number;
		}>("/api/devices");
		if (res.status === 200) {
			setDevices(res.data);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to load devices");
		}
		setLoading(false);
	};

	onMount(fetchDevices);

	const handlePaired = (device: Device) => {
		setDevices((prev) => [...prev, device]);
	};

	const handleUpdated = (updated: Device) => {
		setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
		setEditDevice(null);
	};

	const handleDeactivated = (id: string) => {
		setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, is_active: false } : d)));
		setEditDevice(null);
	};

	return (
		<div class="mx-auto max-w-2xl space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight">Devices</h2>
					<p class="mt-1 text-sm text-muted-foreground">Pair and manage POS devices.</p>
				</div>
				<Button type="button" onClick={() => setPairOpen(true)}>
					+ Pair Device
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
				<Show when={devices().length === 0}>
					<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
						No devices paired yet. Pair your first device to get started.
					</div>
				</Show>

				<div class="space-y-3">
					<For each={devices()}>
						{(device) => (
							<button
								type="button"
								class="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50"
								onClick={() => setEditDevice(device)}
							>
								<div class="flex items-center gap-3">
									<div
										class="flex size-10 shrink-0 items-center justify-center rounded-lg"
										classList={{
											"bg-primary/10 text-primary": device.is_active,
											"bg-muted text-muted-foreground": !device.is_active,
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="size-5"
											aria-hidden="true"
										>
											<rect width="20" height="14" x="2" y="3" rx="2" />
											<line x1="8" x2="16" y1="21" y2="21" />
											<line x1="12" x2="12" y1="17" y2="21" />
										</svg>
									</div>
									<div>
										<p class="font-semibold">{device.name}</p>
										<p class="text-sm text-muted-foreground">
											Last seen: {formatRelative(device.last_seen_at)}
										</p>
									</div>
								</div>
								<div class="flex items-center gap-3">
									<Show when={!device.activated_at && device.is_active}>
										<span class="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
											Pending
										</span>
									</Show>
									<Show when={device.activated_at}>
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium"
											classList={{
												"bg-primary/10 text-primary": device.is_active,
												"bg-muted text-muted-foreground": !device.is_active,
											}}
										>
											{device.is_active ? "Active" : "Deactivated"}
										</span>
									</Show>
								</div>
							</button>
						)}
					</For>
				</div>
			</Show>

			<PairDeviceDialog open={pairOpen()} onOpenChange={setPairOpen} onPaired={handlePaired} />

			<ManageDeviceDialog
				device={editDevice()}
				onClose={() => setEditDevice(null)}
				onUpdated={handleUpdated}
				onDeactivated={handleDeactivated}
			/>
		</div>
	);
}

function PairDeviceDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPaired: (device: Device) => void;
}) {
	const [deviceName, setDeviceName] = createSignal("");
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [activationCode, setActivationCode] = createSignal<ActivationCode | null>(null);

	const reset = () => {
		setDeviceName("");
		setError(null);
		setActivationCode(null);
	};

	const handleGenerate = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!deviceName().trim()) {
			setError("Device name is required.");
			return;
		}

		setSubmitting(true);

		const res = await apiFetch<{
			data: ActivationCode & { error?: string; message?: string };
			status: number;
		}>("/api/devices/activation-codes", {
			method: "POST",
			body: JSON.stringify({ device_name: deviceName() }),
		});

		setSubmitting(false);

		if (res.status === 201) {
			setActivationCode(res.data);
			// Add the pending device to the list
			props.onPaired({
				id: res.data.device_id,
				name: deviceName(),
				is_active: true,
				activated_at: null,
				last_seen_at: null,
				register_id: null,
				created_at: new Date().toISOString(),
			});
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to generate activation code");
		}
	};

	const expiresIn = () => {
		const code = activationCode();
		if (!code) return "";
		const exp = new Date(code.expires_at);
		const diffMin = Math.max(0, Math.round((exp.getTime() - Date.now()) / 60_000));
		return `${diffMin} minute${diffMin === 1 ? "" : "s"}`;
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!open) reset();
				props.onOpenChange(open);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Pair Device</DialogTitle>
					<DialogDescription>
						Generate an activation code to pair a new POS device.
					</DialogDescription>
				</DialogHeader>

				<Show
					when={!activationCode()}
					fallback={
						<div class="space-y-4">
							<div class="rounded-xl border bg-card p-6 text-center">
								<p class="mb-2 text-sm text-muted-foreground">Enter this code on the device</p>
								<p class="font-mono text-4xl font-bold tracking-widest">{activationCode()?.code}</p>
								<p class="mt-3 text-xs text-muted-foreground">Expires in {expiresIn()}</p>
							</div>
							<DialogFooter>
								<Button type="button" onClick={() => props.onOpenChange(false)}>
									Done
								</Button>
							</DialogFooter>
						</div>
					}
				>
					<form onSubmit={handleGenerate} class="space-y-4">
						<TextField value={deviceName()} onChange={(v) => setDeviceName(v)}>
							<TextFieldLabel>Device Name</TextFieldLabel>
							<TextFieldInput placeholder="POS-1" />
						</TextField>

						<Show when={error()}>
							<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
						</Show>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={submitting()}>
								{submitting() ? "Generating..." : "Generate Code"}
							</Button>
						</DialogFooter>
					</form>
				</Show>
			</DialogContent>
		</Dialog>
	);
}

function ManageDeviceDialog(props: {
	device: Device | null;
	onClose: () => void;
	onUpdated: (device: Device) => void;
	onDeactivated: (id: string) => void;
}) {
	const [name, setName] = createSignal("");
	const [saving, setSaving] = createSignal(false);
	const [deactivating, setDeactivating] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [dirty, setDirty] = createSignal(false);

	const open = () => props.device !== null;

	const handleOpen = (isOpen: boolean) => {
		if (!isOpen) {
			props.onClose();
			setError(null);
			setDirty(false);
		}
	};

	// Sync name when device changes
	const currentDevice = () => {
		const d = props.device;
		if (d) {
			setName(d.name);
			setDirty(false);
			setError(null);
		}
		return d;
	};

	const handleSave = async () => {
		const device = currentDevice();
		if (!device) return;
		if (!name().trim()) {
			setError("Name is required.");
			return;
		}

		setSaving(true);
		setError(null);

		const res = await apiFetch<{
			data: Device & { error?: string; message?: string };
			status: number;
		}>(`/api/devices/${device.id}`, {
			method: "PUT",
			body: JSON.stringify({ name: name() }),
		});

		setSaving(false);

		if (res.status === 200) {
			props.onUpdated(res.data);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to update device");
		}
	};

	const handleDeactivate = async () => {
		const device = currentDevice();
		if (!device) return;

		setDeactivating(true);
		setError(null);

		const res = await apiFetch<{
			data: { error?: string; message?: string };
			status: number;
		}>(`/api/devices/${device.id}`, { method: "DELETE" });

		setDeactivating(false);

		if (res.status === 204) {
			props.onDeactivated(device.id);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to deactivate device");
		}
	};

	return (
		<Dialog open={open()} onOpenChange={handleOpen}>
			<DialogContent>
				<Show when={currentDevice()}>
					{(device) => (
						<>
							<DialogHeader>
								<DialogTitle>Manage Device</DialogTitle>
								<DialogDescription>Update device settings or deactivate it.</DialogDescription>
							</DialogHeader>

							<div class="space-y-4">
								<TextField
									value={name()}
									onChange={(v) => {
										setName(v);
										setDirty(true);
									}}
								>
									<TextFieldLabel>Device Name</TextFieldLabel>
									<TextFieldInput placeholder="POS-1" />
								</TextField>

								<div class="grid grid-cols-2 gap-4 text-sm">
									<div>
										<p class="text-muted-foreground">Status</p>
										<p class="font-medium">
											{device().is_active
												? device().activated_at
													? "Active"
													: "Pending activation"
												: "Deactivated"}
										</p>
									</div>
									<div>
										<p class="text-muted-foreground">Last Seen</p>
										<p class="font-medium">{formatRelative(device().last_seen_at)}</p>
									</div>
									<Show when={device().activated_at}>
										<div>
											<p class="text-muted-foreground">Activated</p>
											<p class="font-medium">{formatDate(device().activated_at!)}</p>
										</div>
									</Show>
								</div>

								<Show when={error()}>
									<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
										{error()}
									</div>
								</Show>

								<DialogFooter class="gap-2">
									<Show when={device().is_active}>
										<Button
											type="button"
											variant="destructive"
											size="sm"
											disabled={deactivating()}
											onClick={handleDeactivate}
											class="mr-auto"
										>
											{deactivating() ? "Deactivating..." : "Deactivate"}
										</Button>
									</Show>
									<Button type="button" variant="outline" onClick={() => handleOpen(false)}>
										Cancel
									</Button>
									<Button type="button" disabled={saving() || !dirty()} onClick={handleSave}>
										{saving() ? "Saving..." : "Save"}
									</Button>
								</DialogFooter>
							</div>
						</>
					)}
				</Show>
			</DialogContent>
		</Dialog>
	);
}
