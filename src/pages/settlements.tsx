import { createSignal, For, onMount, Show } from "solid-js";
import type {
	ResellerResponse,
	SettlementLineResponse,
	SettlementResponse,
} from "~/api/generated/types.gen";
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { formatNOK } from "~/lib/currency";

function formatBps(bps: number): string {
	return `${(bps / 100).toFixed(2)}%`;
}

const STATUS_STYLES: Record<string, string> = {
	draft: "bg-amber-500/10 text-amber-600",
	confirmed: "bg-blue-500/10 text-blue-600",
	paid: "bg-primary/10 text-primary",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettlementsPage() {
	const [resellers, setResellers] = createSignal<ResellerResponse[]>([]);
	const [selectedResellerId, setSelectedResellerId] = createSignal("");
	const [settlements, setSettlements] = createSignal<SettlementResponse[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [loadingSettlements, setLoadingSettlements] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [computeOpen, setComputeOpen] = createSignal(false);
	const [selected, setSelected] = createSignal<SettlementResponse | null>(null);

	const fetchResellers = async () => {
		const res = await apiFetch<{ data: ResellerResponse[]; status: number }>(
			"/api/admin/resellers",
		);
		if (res.status === 200) {
			setResellers(res.data);
			if (res.data.length > 0) {
				setSelectedResellerId(res.data[0].id);
				await fetchSettlements(res.data[0].id);
			}
		} else {
			setError("Failed to load resellers");
		}
		setLoading(false);
	};

	const fetchSettlements = async (resellerId: string) => {
		setLoadingSettlements(true);
		const res = await apiFetch<{ data: SettlementResponse[]; status: number }>(
			`/api/admin/resellers/${resellerId}/settlements`,
		);
		if (res.status === 200) {
			setSettlements(res.data);
		}
		setLoadingSettlements(false);
	};

	const handleResellerChange = async (id: string) => {
		setSelectedResellerId(id);
		await fetchSettlements(id);
	};

	onMount(fetchResellers);

	const handleComputed = (settlement: SettlementResponse) => {
		setSettlements((prev) => [settlement, ...prev]);
	};

	const handleStatusUpdated = (updated: SettlementResponse) => {
		setSettlements((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
		setSelected(updated);
	};

	return (
		<div class="mx-auto max-w-3xl space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight">Settlements</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Compute and manage reseller revenue settlements.
					</p>
				</div>
				<Show when={selectedResellerId()}>
					<Button type="button" onClick={() => setComputeOpen(true)}>
						+ Compute Settlement
					</Button>
				</Show>
			</div>

			<Show when={error()}>
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
			</Show>

			<Show when={!loading()}>
				<Show when={resellers().length > 0}>
					<div>
						<label class="mb-1.5 block text-sm font-medium" for="reseller-filter">
							Reseller
						</label>
						<select
							id="reseller-filter"
							value={selectedResellerId()}
							onChange={(e) => handleResellerChange(e.currentTarget.value)}
							class="w-full rounded-md border bg-background px-3 py-2 text-sm"
						>
							<For each={resellers()}>{(r) => <option value={r.id}>{r.name}</option>}</For>
						</select>
					</div>
				</Show>

				<Show
					when={!loadingSettlements()}
					fallback={
						<div class="space-y-3">
							<div class="h-20 animate-pulse rounded-xl border bg-card" />
						</div>
					}
				>
					<Show when={settlements().length === 0}>
						<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
							No settlements yet for this reseller.
						</div>
					</Show>

					<div class="space-y-3">
						<For each={settlements()}>
							{(settlement) => (
								<button
									type="button"
									class="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50"
									onClick={() => setSelected(settlement)}
								>
									<div>
										<p class="font-semibold">
											{settlement.period_start} &mdash; {settlement.period_end}
										</p>
										<p class="mt-1 text-sm text-muted-foreground">
											{settlement.tenant_count} tenant(s) &middot; {settlement.transaction_count}{" "}
											txns &middot; Earned {formatNOK(settlement.reseller_total_earned)}
										</p>
									</div>
									<span
										class={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[settlement.status] ?? "bg-muted text-muted-foreground"}`}
									>
										{settlement.status}
									</span>
								</button>
							)}
						</For>
					</div>
				</Show>
			</Show>

			<ComputeSettlementDialog
				open={computeOpen()}
				onOpenChange={setComputeOpen}
				resellerId={selectedResellerId()}
				onComputed={handleComputed}
			/>

			<SettlementDetailSheet
				settlement={selected()}
				resellerId={selectedResellerId()}
				onClose={() => setSelected(null)}
				onStatusUpdated={handleStatusUpdated}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Compute dialog
// ---------------------------------------------------------------------------

function ComputeSettlementDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	resellerId: string;
	onComputed: (settlement: SettlementResponse) => void;
}) {
	const today = new Date();
	const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
	const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
	const firstOfLastMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;

	const [periodStart, setPeriodStart] = createSignal(firstOfLastMonth);
	const [periodEnd, setPeriodEnd] = createSignal(firstOfMonth);
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const reset = () => {
		setPeriodStart(firstOfLastMonth);
		setPeriodEnd(firstOfMonth);
		setError(null);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!periodStart() || !periodEnd()) {
			setError("Both dates are required.");
			return;
		}

		setSubmitting(true);
		setError(null);

		const res = await apiFetch<{
			data: SettlementResponse & { detail?: string };
			status: number;
		}>("/api/admin/settlements/compute", {
			method: "POST",
			body: JSON.stringify({
				reseller_id: props.resellerId,
				period_start: periodStart(),
				period_end: periodEnd(),
			}),
		});

		setSubmitting(false);

		if (res.status === 201) {
			props.onComputed(res.data);
			reset();
			props.onOpenChange(false);
		} else {
			setError(res.data?.detail ?? "Failed to compute settlement");
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
					<DialogTitle>Compute Settlement</DialogTitle>
					<DialogDescription>Generate a settlement for the selected period.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<TextField value={periodStart()} onChange={(v) => setPeriodStart(v)}>
							<TextFieldLabel>Period Start</TextFieldLabel>
							<TextFieldInput type="date" />
						</TextField>
						<TextField value={periodEnd()} onChange={(v) => setPeriodEnd(v)}>
							<TextFieldLabel>Period End</TextFieldLabel>
							<TextFieldInput type="date" />
						</TextField>
					</div>

					<Show when={error()}>
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
					</Show>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting()}>
							{submitting() ? "Computing..." : "Compute"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function nextStatus(current: string): string | null {
	if (current === "draft") return "confirmed";
	if (current === "confirmed") return "paid";
	return null;
}

// ---------------------------------------------------------------------------
// Detail sheet
// ---------------------------------------------------------------------------

function SettlementDetailSheet(props: {
	settlement: SettlementResponse | null;
	resellerId: string;
	onClose: () => void;
	onStatusUpdated: (settlement: SettlementResponse) => void;
}) {
	const [lines, setLines] = createSignal<SettlementLineResponse[]>([]);
	const [loadingLines, setLoadingLines] = createSignal(false);
	const [updating, setUpdating] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const open = () => props.settlement !== null;

	const fetchLines = async (settlementId: string) => {
		setLoadingLines(true);
		const res = await apiFetch<{ data: SettlementLineResponse[]; status: number }>(
			`/api/admin/resellers/${props.resellerId}/settlements/${settlementId}/lines`,
		);
		if (res.status === 200) setLines(res.data);
		setLoadingLines(false);
	};

	const handleOpen = (isOpen: boolean) => {
		if (!isOpen) {
			props.onClose();
			setLines([]);
			setError(null);
		}
	};

	const currentSettlement = () => {
		const s = props.settlement;
		if (s) {
			fetchLines(s.id);
			setError(null);
		}
		return s;
	};

	const handleAdvanceStatus = async () => {
		const settlement = props.settlement;
		if (!settlement) return;

		const next = nextStatus(settlement.status);
		if (!next) return;

		setUpdating(true);
		setError(null);

		const res = await apiFetch<{
			data: SettlementResponse & { detail?: string };
			status: number;
		}>(`/api/admin/settlements/${settlement.id}/status`, {
			method: "PUT",
			body: JSON.stringify({ status: next }),
		});

		setUpdating(false);

		if (res.status === 200) {
			props.onStatusUpdated(res.data);
		} else {
			setError(res.data?.detail ?? "Failed to update status");
		}
	};

	return (
		<Sheet open={open()} onOpenChange={handleOpen}>
			<SheetContent class="sm:max-w-xl overflow-y-auto">
				<Show when={currentSettlement()}>
					{(settlement) => (
						<>
							<SheetHeader>
								<SheetTitle>
									{settlement().period_start} &mdash; {settlement().period_end}
								</SheetTitle>
								<SheetDescription>
									<span
										class={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[settlement().status] ?? "bg-muted text-muted-foreground"}`}
									>
										{settlement().status}
									</span>
								</SheetDescription>
							</SheetHeader>

							<div class="mt-6 grid grid-cols-2 gap-4 text-sm">
								<SummaryCard
									label="Transaction Volume"
									value={formatNOK(settlement().total_transaction_volume)}
								/>
								<SummaryCard label="Transactions" value={String(settlement().transaction_count)} />
								<SummaryCard
									label="Platform Fees"
									value={formatNOK(settlement().total_platform_fees)}
								/>
								<SummaryCard
									label="Subscription Fees"
									value={formatNOK(settlement().total_subscription_fees)}
								/>
								<SummaryCard
									label="Revenue Share"
									value={`${formatNOK(settlement().reseller_transaction_share)} (${formatBps(settlement().revenue_share_bps)})`}
								/>
								<SummaryCard
									label="Subscription Share"
									value={`${formatNOK(settlement().reseller_subscription_share)} (${formatBps(settlement().subscription_share_bps)})`}
								/>
							</div>

							<div class="mt-4 rounded-lg border bg-primary/5 p-4 text-center">
								<p class="text-sm text-muted-foreground">Total Earned</p>
								<p class="text-2xl font-bold">{formatNOK(settlement().reseller_total_earned)}</p>
							</div>

							<div class="mt-6">
								<h3 class="mb-3 text-sm font-medium">
									Per-tenant breakdown ({settlement().tenant_count} tenants)
								</h3>
								<Show
									when={!loadingLines()}
									fallback={<div class="h-16 animate-pulse rounded-lg border" />}
								>
									<div class="space-y-2">
										<For each={lines()}>
											{(line) => (
												<div class="rounded-lg border p-3 text-sm">
													<div class="flex items-center justify-between">
														<p class="font-mono text-xs text-muted-foreground">
															{line.tenant_id.slice(0, 8)}...
														</p>
														<p class="font-medium">
															{formatNOK(line.reseller_share + line.reseller_subscription_share)}
														</p>
													</div>
													<p class="mt-1 text-muted-foreground">
														{formatNOK(line.transaction_volume)} vol &middot;{" "}
														{line.transaction_count} txns &middot;{" "}
														{formatNOK(line.subscription_fee)} sub
													</p>
												</div>
											)}
										</For>
									</div>
								</Show>
							</div>

							<Show when={error()}>
								<div class="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
									{error()}
								</div>
							</Show>

							<Show when={nextStatus(settlement().status)}>
								{(next) => (
									<div class="mt-6">
										<Button
											type="button"
											class="w-full"
											disabled={updating()}
											onClick={handleAdvanceStatus}
										>
											{updating()
												? "Updating..."
												: `Mark as ${next().charAt(0).toUpperCase() + next().slice(1)}`}
										</Button>
									</div>
								)}
							</Show>
						</>
					)}
				</Show>
			</SheetContent>
		</Sheet>
	);
}

function SummaryCard(props: { label: string; value: string }) {
	return (
		<div class="rounded-lg border p-3">
			<p class="text-muted-foreground">{props.label}</p>
			<p class="mt-0.5 font-semibold">{props.value}</p>
		</div>
	);
}
