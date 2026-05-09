import { createSignal, For, onMount, Show } from "solid-js";
import type { CreatePlan, PlanResponse, UpdatePlan } from "~/api/generated/types.gen";
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
import { formatNOK } from "~/lib/currency";
import { formatDate } from "~/lib/datetime";

function formatBps(bps: number): string {
	return `${(bps / 100).toFixed(2)}%`;
}

export default function PlansPage() {
	const [plans, setPlans] = createSignal<PlanResponse[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [createOpen, setCreateOpen] = createSignal(false);
	const [editPlan, setEditPlan] = createSignal<PlanResponse | null>(null);

	const fetchPlans = async () => {
		const res = await apiFetch<{ data: PlanResponse[]; status: number }>("/api/plans");
		if (res.status === 200) {
			setPlans(res.data);
		} else {
			setError("Failed to load plans");
		}
		setLoading(false);
	};

	onMount(fetchPlans);

	const handleCreated = (plan: PlanResponse) => {
		setPlans((prev) => [...prev, plan]);
	};

	const handleUpdated = (updated: PlanResponse) => {
		setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
		setEditPlan(null);
	};

	return (
		<div class="mx-auto max-w-3xl space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight">Plans</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Manage subscription plans for tenants and resellers.
					</p>
				</div>
				<Button type="button" onClick={() => setCreateOpen(true)}>
					+ Create Plan
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
				<Show when={plans().length === 0}>
					<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
						No plans yet. Create your first plan to get started.
					</div>
				</Show>

				<div class="space-y-3">
					<For each={plans()}>
						{(plan) => (
							<button
								type="button"
								class="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50"
								onClick={() => setEditPlan(plan)}
							>
								<div>
									<div class="flex items-center gap-2">
										<p class="font-semibold">{plan.name}</p>
										<Show when={plan.is_public}>
											<span class="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
												Public
											</span>
										</Show>
									</div>
									<p class="mt-1 text-sm text-muted-foreground">
										{formatNOK(plan.device_price_minor_unit)}/device &middot;{" "}
										{formatNOK(plan.staff_price_minor_unit)}/staff &middot;{" "}
										{formatBps(plan.transaction_fee_bps)} per txn
									</p>
								</div>
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium"
									classList={{
										"bg-primary/10 text-primary": plan.is_active,
										"bg-muted text-muted-foreground": !plan.is_active,
									}}
								>
									{plan.is_active ? "Active" : "Inactive"}
								</span>
							</button>
						)}
					</For>
				</div>
			</Show>

			<CreatePlanDialog
				open={createOpen()}
				onOpenChange={setCreateOpen}
				onCreated={handleCreated}
			/>
			<EditPlanDialog
				plan={editPlan()}
				onClose={() => setEditPlan(null)}
				onUpdated={handleUpdated}
			/>
		</div>
	);
}

function CreatePlanDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (plan: PlanResponse) => void;
}) {
	const [name, setName] = createSignal("");
	const [slug, setSlug] = createSignal("");
	const [devicePrice, setDevicePrice] = createSignal("0");
	const [staffPrice, setStaffPrice] = createSignal("0");
	const [minimumSpend, setMinimumSpend] = createSignal("0");
	const [txnFeeBps, setTxnFeeBps] = createSignal("0");
	const [isPublic, setIsPublic] = createSignal(false);
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const reset = () => {
		setName("");
		setSlug("");
		setDevicePrice("0");
		setStaffPrice("0");
		setMinimumSpend("0");
		setTxnFeeBps("0");
		setIsPublic(false);
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

		const body: CreatePlan = {
			name: name().trim(),
			slug:
				slug().trim() ||
				name()
					.trim()
					.toLowerCase()
					.replaceAll(/[^a-z0-9]+/g, "-"),
			is_public: isPublic(),
			device_price_minor_unit: Number.parseInt(devicePrice(), 10) || 0,
			staff_price_minor_unit: Number.parseInt(staffPrice(), 10) || 0,
			minimum_spend_minor_unit: Number.parseInt(minimumSpend(), 10) || 0,
			transaction_fee_bps: Number.parseInt(txnFeeBps(), 10) || 0,
		};

		const res = await apiFetch<{
			data: PlanResponse & { detail?: string };
			status: number;
		}>("/api/plans", {
			method: "POST",
			body: JSON.stringify(body),
		});

		setSubmitting(false);

		if (res.status === 201) {
			props.onCreated(res.data);
			reset();
			props.onOpenChange(false);
		} else {
			setError(res.data?.detail ?? "Failed to create plan");
		}
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
					<DialogTitle>Create Plan</DialogTitle>
					<DialogDescription>Define pricing for a new subscription plan.</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} class="space-y-4">
					<TextField value={name()} onChange={(v) => setName(v)}>
						<TextFieldLabel>Name</TextFieldLabel>
						<TextFieldInput placeholder="Starter" />
					</TextField>

					<TextField value={slug()} onChange={(v) => setSlug(v)}>
						<TextFieldLabel>Slug (optional)</TextFieldLabel>
						<TextFieldInput placeholder="starter" />
					</TextField>

					<div class="grid grid-cols-2 gap-4">
						<TextField value={devicePrice()} onChange={(v) => setDevicePrice(v)}>
							<TextFieldLabel>Device price (minor unit)</TextFieldLabel>
							<TextFieldInput type="number" min="0" />
						</TextField>

						<TextField value={staffPrice()} onChange={(v) => setStaffPrice(v)}>
							<TextFieldLabel>Staff price (minor unit)</TextFieldLabel>
							<TextFieldInput type="number" min="0" />
						</TextField>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<TextField value={minimumSpend()} onChange={(v) => setMinimumSpend(v)}>
							<TextFieldLabel>Minimum spend (minor unit)</TextFieldLabel>
							<TextFieldInput type="number" min="0" />
						</TextField>

						<TextField value={txnFeeBps()} onChange={(v) => setTxnFeeBps(v)}>
							<TextFieldLabel>Transaction fee (bps)</TextFieldLabel>
							<TextFieldInput type="number" min="0" />
						</TextField>
					</div>

					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={isPublic()}
							onChange={(e) => setIsPublic(e.currentTarget.checked)}
							class="rounded border"
						/>
						Publicly visible
					</label>

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

function EditPlanDialog(props: {
	plan: PlanResponse | null;
	onClose: () => void;
	onUpdated: (plan: PlanResponse) => void;
}) {
	const [name, setName] = createSignal("");
	const [devicePrice, setDevicePrice] = createSignal("0");
	const [staffPrice, setStaffPrice] = createSignal("0");
	const [minimumSpend, setMinimumSpend] = createSignal("0");
	const [txnFeeBps, setTxnFeeBps] = createSignal("0");
	const [isActive, setIsActive] = createSignal(true);
	const [saving, setSaving] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const open = () => props.plan !== null;

	const currentPlan = () => {
		const p = props.plan;
		if (p) {
			setName(p.name);
			setDevicePrice(String(p.device_price_minor_unit));
			setStaffPrice(String(p.staff_price_minor_unit));
			setMinimumSpend(String(p.minimum_spend_minor_unit));
			setTxnFeeBps(String(p.transaction_fee_bps));
			setIsActive(p.is_active);
			setError(null);
		}
		return p;
	};

	const handleSave = async () => {
		const plan = currentPlan();
		if (!plan) return;

		setSaving(true);
		setError(null);

		const body: UpdatePlan = {
			name: name().trim() || undefined,
			is_active: isActive(),
			device_price_minor_unit: Number.parseInt(devicePrice(), 10),
			staff_price_minor_unit: Number.parseInt(staffPrice(), 10),
			minimum_spend_minor_unit: Number.parseInt(minimumSpend(), 10),
			transaction_fee_bps: Number.parseInt(txnFeeBps(), 10),
		};

		const res = await apiFetch<{
			data: PlanResponse & { detail?: string };
			status: number;
		}>(`/api/plans/${plan.id}`, {
			method: "PUT",
			body: JSON.stringify(body),
		});

		setSaving(false);

		if (res.status === 200) {
			props.onUpdated(res.data);
		} else {
			setError(res.data?.detail ?? "Failed to update plan");
		}
	};

	return (
		<Dialog
			open={open()}
			onOpenChange={(isOpen) => {
				if (!isOpen) props.onClose();
			}}
		>
			<DialogContent>
				<Show when={currentPlan()}>
					{(plan) => (
						<>
							<DialogHeader>
								<DialogTitle>Edit Plan</DialogTitle>
								<DialogDescription>
									{plan().slug} &middot; Created {formatDate(plan().created_at)}
								</DialogDescription>
							</DialogHeader>

							<div class="space-y-4">
								<TextField value={name()} onChange={(v) => setName(v)}>
									<TextFieldLabel>Name</TextFieldLabel>
									<TextFieldInput />
								</TextField>

								<div class="grid grid-cols-2 gap-4">
									<TextField value={devicePrice()} onChange={(v) => setDevicePrice(v)}>
										<TextFieldLabel>Device price (minor unit)</TextFieldLabel>
										<TextFieldInput type="number" min="0" />
									</TextField>

									<TextField value={staffPrice()} onChange={(v) => setStaffPrice(v)}>
										<TextFieldLabel>Staff price (minor unit)</TextFieldLabel>
										<TextFieldInput type="number" min="0" />
									</TextField>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<TextField value={minimumSpend()} onChange={(v) => setMinimumSpend(v)}>
										<TextFieldLabel>Minimum spend (minor unit)</TextFieldLabel>
										<TextFieldInput type="number" min="0" />
									</TextField>

									<TextField value={txnFeeBps()} onChange={(v) => setTxnFeeBps(v)}>
										<TextFieldLabel>Transaction fee (bps)</TextFieldLabel>
										<TextFieldInput type="number" min="0" />
									</TextField>
								</div>

								<label class="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={isActive()}
										onChange={(e) => setIsActive(e.currentTarget.checked)}
										class="rounded border"
									/>
									Active
								</label>

								<Show when={error()}>
									<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
										{error()}
									</div>
								</Show>

								<DialogFooter>
									<Button type="button" variant="outline" onClick={props.onClose}>
										Cancel
									</Button>
									<Button type="button" disabled={saving()} onClick={handleSave}>
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
