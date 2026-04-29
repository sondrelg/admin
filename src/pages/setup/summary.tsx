import { createSignal, onMount, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { WizardLayout } from "~/components/wizard/wizard-layout";
import { useWizard } from "~/contexts/wizard-context";

export function SummaryPage() {
	const { state, setRegisterId } = useWizard();
	const [error, setError] = createSignal<string | null>(null);
	const [isCreatingRegister, setIsCreatingRegister] = createSignal(false);

	onMount(async () => {
		if (state.registerId) return;
		if (!state.location) return;

		setIsCreatingRegister(true);
		try {
			const res = await customFetch<{
				data: { id: string; message?: string };
				status: number;
			}>("/api/registers", {
				method: "POST",
				body: JSON.stringify({
					register_id: "POS-1",
					name: "POS-1",
					location_id: state.location.id,
				}),
			});

			if (res.status === 201) {
				setRegisterId(res.data.id);
			} else {
				setError(res.data?.message ?? "Failed to create register");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create register");
		} finally {
			setIsCreatingRegister(false);
		}
	});

	return (
		<WizardLayout
			step={5}
			title="You're All Set!"
			description="Your POS system is ready. Here's a summary of what was created."
		>
			<div class="space-y-4">
				<div class="rounded-xl border bg-card p-6 shadow-sm">
					<div class="space-y-4">
						<SummaryRow
							label="Business"
							value={state.tenant?.name ?? ""}
							detail={state.tenant?.slug ?? ""}
						/>
						<SummaryRow label="Location" value={state.location?.name ?? ""} />
						<SummaryRow label="Manager" value={state.staff?.name ?? ""} />
						<SummaryRow
							label="VAT Rates"
							value={`${state.taxRates.length} configured`}
							detail={state.taxRates
								.map((r) =>
									r.eatInRateBps === r.takeAwayRateBps
										? `${r.name} (${r.eatInRateBps / 100}%)`
										: `${r.name} (${r.eatInRateBps / 100}% / ${r.takeAwayRateBps / 100}%)`,
								)
								.join(", ")}
						/>
						<SummaryRow
							label="Menu"
							value={`${state.categories.length} categories, ${state.menuItemCount} items`}
						/>
						<SummaryRow
							label="Register"
							value={state.registerId ? "POS-1" : isCreatingRegister() ? "Creating..." : "Pending"}
						/>
					</div>
				</div>

				<Show when={error()}>
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
				</Show>

				<div class="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
					<div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/20">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-6 text-primary"
							aria-hidden="true"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</div>
					<h2 class="text-lg font-semibold">Setup Complete</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Connect your POS app to start taking orders.
					</p>
				</div>

				<div class="flex justify-center">
					<Button
						onClick={() => {
							window.location.href = "/";
						}}
					>
						Go to Dashboard
					</Button>
				</div>
			</div>
		</WizardLayout>
	);
}

function SummaryRow(props: { label: string; value: string; detail?: string }) {
	return (
		<div class="flex items-start justify-between">
			<span class="text-sm font-medium text-muted-foreground">{props.label}</span>
			<div class="text-right">
				<span class="text-sm font-medium">{props.value}</span>
				<Show when={props.detail}>
					<p class="text-xs text-muted-foreground">{props.detail}</p>
				</Show>
			</div>
		</div>
	);
}
