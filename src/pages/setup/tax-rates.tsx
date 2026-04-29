import { useNavigate } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { WizardLayout } from "~/components/wizard/wizard-layout";
import { useWizard } from "~/contexts/wizard-context";
import { restaurantCafe } from "~/templates/restaurant-cafe";

interface TaxRateRow {
	localId: string;
	name: string;
	rateBps: number;
	isDefault: boolean;
}

export function TaxRatesPage() {
	const navigate = useNavigate();
	const { state, setTaxRates } = useWizard();

	const initialRows: TaxRateRow[] =
		state.taxRates.length > 0
			? state.taxRates.map((r) => ({
					localId: r.id,
					name: r.name,
					rateBps: r.rateBps,
					isDefault: false,
				}))
			: restaurantCafe.taxRates.map((r, i) => ({
					localId: `template-${i}`,
					name: r.name,
					rateBps: r.rateBps,
					isDefault: r.isDefault,
				}));

	const [rows, setRows] = createStore<TaxRateRow[]>(initialRows);
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	let nextId = initialRows.length;

	const addRow = () => {
		setRows(rows.length, {
			localId: `new-${nextId++}`,
			name: "",
			rateBps: 2500,
			isDefault: false,
		});
	};

	const removeRow = (index: number) => {
		setRows((prev) => prev.filter((_, i) => i !== index));
	};

	const rateToPercent = (bps: number) => (bps / 100).toFixed(bps % 100 === 0 ? 0 : 2);

	const percentToBps = (pct: string) => {
		const num = Number.parseFloat(pct);
		if (Number.isNaN(num)) return 0;
		return Math.round(num * 100);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (rows.length === 0) {
			setError("Add at least one VAT rate");
			return;
		}

		for (const row of rows) {
			if (!row.name.trim()) {
				setError("All VAT rates must have a name");
				return;
			}
		}

		setIsSubmitting(true);

		try {
			// Skip if already created (check by count match)
			if (state.taxRates.length === rows.length && state.taxRates.length > 0) {
				navigate({ to: "/setup/menu" });
				return;
			}

			const created = [];
			for (const row of rows) {
				const res = await customFetch<{
					data: { id: string; name: string; rate_bps: number; message?: string };
					status: number;
				}>("/api/tax-rates", {
					method: "POST",
					body: JSON.stringify({
						name: row.name,
						rate_bps: row.rateBps,
						is_default: row.isDefault,
					}),
				});

				if (res.status !== 201) {
					setError(res.data?.message ?? `Failed to create VAT rate "${row.name}"`);
					// Save partial progress
					if (created.length > 0) {
						setTaxRates(created);
					}
					return;
				}

				created.push({
					id: res.data.id,
					name: res.data.name,
					rateBps: res.data.rate_bps,
				});
			}

			setTaxRates(created);
			navigate({ to: "/setup/menu" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "An unexpected error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<WizardLayout
			step={3}
			title="VAT Rates"
			description="Norwegian standard rates are pre-filled. Food is 15%, beverages and merchandise are 25%."
		>
			<form onSubmit={handleSubmit} class="space-y-6">
				<div class="space-y-3">
					<For each={rows}>
						{(row, index) => (
							<div class="flex items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
								<div class="flex-1">
									<TextField value={row.name} onChange={(v) => setRows(index(), "name", v)}>
										<TextFieldLabel>Name</TextFieldLabel>
										<TextFieldInput placeholder="VAT 25%" required />
									</TextField>
								</div>
								<div class="w-28">
									<TextField
										value={rateToPercent(row.rateBps)}
										onChange={(v) => setRows(index(), "rateBps", percentToBps(v))}
									>
										<TextFieldLabel>Rate %</TextFieldLabel>
										<TextFieldInput type="number" min="0" max="100" step="0.01" required />
									</TextField>
								</div>
								<Show when={rows.length > 1}>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="mb-0.5 text-muted-foreground hover:text-destructive"
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
								</Show>
							</div>
						)}
					</For>
				</div>

				<Button type="button" variant="outline" size="sm" onClick={addRow}>
					+ Add VAT Rate
				</Button>

				<Show when={error()}>
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
				</Show>

				<div class="flex justify-between">
					<Button type="button" variant="outline" onClick={() => navigate({ to: "/setup/staff" })}>
						Back
					</Button>
					<Button type="submit" disabled={isSubmitting()}>
						{isSubmitting() ? "Creating..." : "Next"}
					</Button>
				</div>
			</form>
		</WizardLayout>
	);
}
