import { useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { WizardLayout } from "~/components/wizard/wizard-layout";
import { useWizard } from "~/contexts/wizard-context";

export function StaffPage() {
	const navigate = useNavigate();
	const { state, setStaff } = useWizard();

	const [name, setName] = createSignal(state.staff?.name ?? "");
	const [pin, setPin] = createSignal("");
	const [pinConfirm, setPinConfirm] = createSignal("");

	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const pinValid = () => pin().length === 4 && /^\d{4}$/.test(pin());
	const pinsMatch = () => pin() === pinConfirm();

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!name().trim()) {
			setError("Name is required.");
			return;
		}
		if (!pinValid()) {
			setError("PIN must be exactly 4 digits.");
			return;
		}
		if (!pinsMatch()) {
			setError("PINs do not match.");
			return;
		}

		setIsSubmitting(true);

		try {
			// Create staff (skip if already created)
			let staffId = state.staff?.id;
			if (!staffId) {
				const staffRes = await customFetch<{
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
					setError(staffRes.data?.error ?? staffRes.data?.message ?? "Failed to create staff member");
					return;
				}

				staffId = staffRes.data.id;
				setStaff({ id: staffId, name: staffRes.data.name });
			}

			// Set PIN credential
			const credRes = await customFetch<{
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
							<TextFieldInput placeholder="Ola Nordmann" required />
						</TextField>

						<TextField value={pin()} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))}>
							<TextFieldLabel>4-Digit PIN</TextFieldLabel>
							<TextFieldInput
								type="password"
								placeholder="****"
								inputMode="numeric"
								maxLength={4}
								required
							/>
						</TextField>

						<TextField
							value={pinConfirm()}
							onChange={(v) => setPinConfirm(v.replace(/\D/g, "").slice(0, 4))}
						>
							<TextFieldLabel>Confirm PIN</TextFieldLabel>
							<TextFieldInput
								type="password"
								placeholder="****"
								inputMode="numeric"
								maxLength={4}
								required
							/>
							<Show when={pinConfirm() && !pinsMatch()}>
								<p class="mt-1 text-xs text-destructive">PINs do not match</p>
							</Show>
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
					<Button type="submit" disabled={isSubmitting() || !name() || !pinValid() || !pinsMatch()}>
						{isSubmitting() ? "Creating..." : "Next"}
					</Button>
				</div>
			</form>
		</WizardLayout>
	);
}
