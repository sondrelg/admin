import { useNavigate } from "@tanstack/solid-router";
import { createSignal, onMount, Show } from "solid-js";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { WizardLayout } from "~/components/wizard/wizard-layout";
import { useWizard } from "~/contexts/wizard-context";

export default function StaffPage() {
	const navigate = useNavigate();
	const { state, setStaff } = useWizard();

	const [name, setName] = createSignal(state.staff?.name ?? "");
	const [pin, setPin] = createSignal("");
	const [showPin, setShowPin] = createSignal(false);

	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	let nameInputRef: HTMLInputElement | undefined;

	onMount(() => {
		nameInputRef?.focus();
	});

	const pinValid = () => pin().length === 4 && /^\d{4}$/.test(pin());

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!name().trim()) {
			setError("Name is required.");
			return;
		}
		if (pin().length > 0 && !pinValid()) {
			setError("PIN must be exactly 4 digits.");
			return;
		}

		setIsSubmitting(true);

		try {
			// Create staff (skip if already created)
			let staffId = state.staff?.id;
			if (!staffId) {
				const staffRes = await apiFetch<{
					data: { id: string; name: string; error?: string; message?: string };
					status: number;
				}>("/api/staff", {
					method: "POST",
					body: JSON.stringify({
						name: name(),
						role: "Manager",
					}),
				});

				if (staffRes.status !== 201) {
					setError(
						staffRes.data?.error ?? staffRes.data?.message ?? "Failed to create staff member",
					);
					return;
				}

				staffId = staffRes.data.id;
				setStaff({ id: staffId, name: staffRes.data.name });
			}

			if (pin()) {
				const credRes = await apiFetch<{
					data: { error?: string; message?: string };
					status: number;
				}>(`/api/staff/${staffId}/credentials`, {
					method: "POST",
					body: JSON.stringify({
						credential_type: "pin",
						secret: pin(),
					}),
				});

				if (credRes.status !== 200 && credRes.status !== 201 && credRes.status !== 204) {
					setError(credRes.data?.error ?? credRes.data?.message ?? "Failed to set PIN");
					return;
				}
			}

			navigate({ to: "/setup/tax-rates" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "An unexpected error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<WizardLayout
			step={2}
			title="Your First Manager"
			description="Create your first staff member with manager privileges."
		>
			<form onSubmit={handleSubmit} class="space-y-6">
				<div class="rounded-xl border bg-card p-6 shadow-sm">
					<div class="space-y-4">
						<TextField value={name()} onChange={(v) => setName(v)}>
							<TextFieldLabel>Full Name</TextFieldLabel>
							<TextFieldInput
								ref={(el) => {
									nameInputRef = el;
								}}
								placeholder="Ola Nordmann"
								required
								autocomplete="off"
								name="staff-name"
								data-1p-ignore="true"
								data-lpignore="true"
							/>
						</TextField>

						<TextField value={pin()} onChange={(v) => setPin(v.replaceAll(/\D/g, "").slice(0, 4))}>
							<div class="flex items-center justify-between">
								<TextFieldLabel>4-Digit PIN (optional)</TextFieldLabel>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									tabIndex={-1}
									onClick={() => setShowPin((v) => !v)}
								>
									{showPin() ? "Hide" : "Reveal"}
								</Button>
							</div>
							<TextFieldInput
								type={showPin() ? "text" : "password"}
								placeholder="****"
								inputMode="numeric"
								maxLength={4}
								autocomplete="off"
								data-1p-ignore="true"
								data-lpignore="true"
							/>
						</TextField>
					</div>
				</div>

				<Show when={error()}>
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
				</Show>

				<div class="flex justify-between">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/setup/business" })}
					>
						Back
					</Button>
					<div class="flex items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => navigate({ to: "/setup/tax-rates" })}
						>
							Skip
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting() || !name() || (pin().length > 0 && !pinValid())}
						>
							{isSubmitting() ? "Creating..." : "Next"}
						</Button>
					</div>
				</div>
			</form>
		</WizardLayout>
	);
}
