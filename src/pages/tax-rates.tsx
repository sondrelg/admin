import { createSignal, For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";

interface TaxRate {
	id: string;
	name: string;
	eat_in_rate_bps: number;
	take_away_rate_bps: number;
	is_default: boolean;
}

interface TaxRateRow {
	id: string | null;
	name: string;
	eatInRateBps: number;
	takeAwayRateBps: number;
	isDefault: boolean;
	dirty: boolean;
	isNew: boolean;
}

const rateToPercent = (bps: number) => (bps / 100).toFixed(bps % 100 === 0 ? 0 : 2);

const percentToBps = (pct: string) => {
	const num = Number.parseFloat(pct);
	if (Number.isNaN(num)) return 0;
	return Math.round(num * 100);
};

export default function TaxRatesPage() {
	const [rows, setRows] = createStore<TaxRateRow[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [saving, setSaving] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [success, setSuccess] = createSignal<string | null>(null);
	const [deletingId, setDeletingId] = createSignal<string | null>(null);

	const fetchRates = async () => {
		const res = await apiFetch<{ data: TaxRate[]; status: number }>("/api/tax-rates");
		if (res.status === 200) {
			setRows(
				res.data.map((r) => ({
					id: r.id,
					name: r.name,
					eatInRateBps: r.eat_in_rate_bps,
					takeAwayRateBps: r.take_away_rate_bps,
					isDefault: r.is_default,
					dirty: false,
					isNew: false,
				})),
			);
		}
		setLoading(false);
	};

	onMount(fetchRates);

	const addRow = () => {
		setRows(rows.length, {
			id: null,
			name: "",
			eatInRateBps: 2500,
			takeAwayRateBps: 2500,
			isDefault: false,
			dirty: true,
			isNew: true,
		});
	};

	const removeRow = async (index: number) => {
		const row = rows[index];
		setError(null);
		setSuccess(null);

		if (row.isNew) {
			setRows((prev) => prev.filter((_, i) => i !== index));
			return;
		}

		if (!row.id) return;

		setDeletingId(row.id);
		const res = await apiFetch<{ data: { error?: string; message?: string }; status: number }>(
			`/api/tax-rates/${row.id}`,
			{ method: "DELETE" },
		);
		setDeletingId(null);

		if (res.status === 204) {
			setRows((prev) => prev.filter((_, i) => i !== index));
			setSuccess("Tax rate deleted.");
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to delete tax rate");
		}
	};

	const saveRow = async (index: number) => {
		const row = rows[index];
		setError(null);
		setSuccess(null);

		if (!row.name.trim()) {
			setError("Name is required.");
			return;
		}

		setSaving(true);

		const body = {
			name: row.name,
			eat_in_rate_bps: row.eatInRateBps,
			take_away_rate_bps: row.takeAwayRateBps,
			is_default: row.isDefault,
		};

		if (row.isNew) {
			const res = await apiFetch<{
				data: TaxRate & { error?: string; message?: string };
				status: number;
			}>("/api/tax-rates", {
				method: "POST",
				body: JSON.stringify(body),
			});

			setSaving(false);

			if (res.status === 201) {
				setRows(index, {
					id: res.data.id,
					name: res.data.name,
					eatInRateBps: res.data.eat_in_rate_bps,
					takeAwayRateBps: res.data.take_away_rate_bps,
					isDefault: res.data.is_default,
					dirty: false,
					isNew: false,
				});
				setSuccess(`"${res.data.name}" created.`);
			} else {
				setError(res.data?.error ?? res.data?.message ?? "Failed to create tax rate");
			}
		} else {
			const res = await apiFetch<{
				data: TaxRate & { error?: string; message?: string };
				status: number;
			}>(`/api/tax-rates/${row.id}`, {
				method: "PUT",
				body: JSON.stringify(body),
			});

			setSaving(false);

			if (res.status === 200) {
				setRows(index, {
					id: res.data.id,
					name: res.data.name,
					eatInRateBps: res.data.eat_in_rate_bps,
					takeAwayRateBps: res.data.take_away_rate_bps,
					isDefault: res.data.is_default,
					dirty: false,
					isNew: false,
				});
				setSuccess(`"${res.data.name}" updated.`);
			} else {
				setError(res.data?.error ?? res.data?.message ?? "Failed to update tax rate");
			}
		}
	};

	return (
		<div class="mx-auto max-w-2xl space-y-6">
			<div>
				<h2 class="text-2xl font-bold tracking-tight">VAT Rates</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Manage the VAT rates applied to your menu items. Rates can differ for eat-in and
					take-away.
				</p>
			</div>

			<Show
				when={!loading()}
				fallback={
					<div class="space-y-3">
						<div class="h-20 animate-pulse rounded-xl border bg-card" />
						<div class="h-20 animate-pulse rounded-xl border bg-card" />
					</div>
				}
			>
				<div class="space-y-3">
					<For each={rows}>
						{(row, index) => (
							<div
								class="flex items-end gap-3 rounded-xl border bg-card p-4 shadow-sm"
								classList={{ "border-primary/30": row.dirty }}
							>
								<div class="flex-1">
									<TextField
										value={row.name}
										onChange={(v) => {
											setRows(index(), "name", v);
											setRows(index(), "dirty", true);
										}}
									>
										<TextFieldLabel>Name</TextFieldLabel>
										<TextFieldInput placeholder="VAT 25%" />
									</TextField>
								</div>
								<div class="w-28">
									<TextField
										value={rateToPercent(row.eatInRateBps)}
										onChange={(v) => {
											setRows(index(), "eatInRateBps", percentToBps(v));
											setRows(index(), "dirty", true);
										}}
									>
										<TextFieldLabel>Eat-in %</TextFieldLabel>
										<TextFieldInput type="number" min="0" max="100" step="0.01" />
									</TextField>
								</div>
								<div class="w-28">
									<TextField
										value={rateToPercent(row.takeAwayRateBps)}
										onChange={(v) => {
											setRows(index(), "takeAwayRateBps", percentToBps(v));
											setRows(index(), "dirty", true);
										}}
									>
										<TextFieldLabel>Take-away %</TextFieldLabel>
										<TextFieldInput type="number" min="0" max="100" step="0.01" />
									</TextField>
								</div>
								<div class="flex gap-1">
									<Show when={row.dirty}>
										<Button
											type="button"
											variant="default"
											size="sm"
											class="mb-0.5"
											disabled={saving()}
											onClick={() => saveRow(index())}
										>
											{saving() ? "..." : "Save"}
										</Button>
									</Show>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="mb-0.5 text-muted-foreground hover:text-destructive"
										disabled={deletingId() === row.id}
										onClick={() => removeRow(index())}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="size-4"
											aria-hidden="true"
										>
											<path d="M18 6 6 18" />
											<path d="m6 6 12 12" />
										</svg>
									</Button>
								</div>
							</div>
						)}
					</For>
				</div>

				<Show when={rows.length === 0}>
					<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
						No VAT rates configured. Add one to get started.
					</div>
				</Show>

				<Button type="button" variant="outline" size="sm" onClick={addRow}>
					+ Add VAT Rate
				</Button>

				<Show when={error()}>
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
				</Show>

				<Show when={success()}>
					<div class="rounded-md bg-primary/10 p-3 text-sm text-primary">{success()}</div>
				</Show>
			</Show>
		</div>
	);
}
