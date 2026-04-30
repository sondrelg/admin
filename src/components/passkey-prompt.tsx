import { createSignal, onMount, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { createPasskey, isWebAuthnSupported } from "~/lib/webauthn";

const DISMISS_KEY = "passkey-prompt-dismissed";

export function PasskeyPrompt() {
	const [visible, setVisible] = createSignal(false);
	const [registering, setRegistering] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [success, setSuccess] = createSignal(false);

	onMount(async () => {
		if (!isWebAuthnSupported()) return;
		if (localStorage.getItem(DISMISS_KEY)) return;

		const res = await customFetch<{ data: unknown[]; status: number }>("/api/auth/passkeys");
		if (res.status === 200 && res.data.length === 0) {
			setVisible(true);
		}
	});

	const dismiss = () => {
		localStorage.setItem(DISMISS_KEY, "1");
		setVisible(false);
	};

	const handleRegister = async () => {
		setError(null);
		setRegistering(true);

		try {
			const startRes = await customFetch<{
				data: Record<string, unknown>;
				status: number;
			}>("/api/auth/passkeys/register/start", {
				method: "POST",
				body: JSON.stringify({ name: "My passkey" }),
			});

			if (startRes.status !== 200) {
				setError("Failed to start registration.");
				setRegistering(false);
				return;
			}

			const credential = await createPasskey(startRes.data);

			const finishRes = await customFetch<{ data?: { message?: string }; status: number }>(
				"/api/auth/passkeys/register/finish",
				{
					method: "POST",
					body: JSON.stringify(credential),
				},
			);

			if (finishRes.status === 201) {
				setSuccess(true);
				setTimeout(dismiss, 2000);
			} else {
				setError(finishRes.data?.message ?? "Registration failed.");
			}
		} catch (err) {
			if (err instanceof Error && err.name === "NotAllowedError") {
				// User cancelled — just dismiss, don't nag
				dismiss();
			} else {
				setError(err instanceof Error ? err.message : "Registration failed.");
			}
		}

		setRegistering(false);
	};

	return (
		<Show when={visible()}>
			<div class="rounded-lg border bg-card p-4 shadow-sm">
				<Show
					when={!success()}
					fallback={
						<p class="text-sm text-green-700 dark:text-green-400">
							Passkey registered! You can now sign in without a password.
						</p>
					}
				>
					<div class="flex items-start gap-3">
						<div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-4 text-primary"
								aria-hidden="true"
							>
								<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
								<circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
							</svg>
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium">Set up a passkey?</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Sign in faster next time using your fingerprint, face, or security key.
							</p>
							<Show when={error()}>
								<p class="mt-1 text-xs text-destructive">{error()}</p>
							</Show>
							<div class="mt-3 flex items-center gap-2">
								<Button size="sm" disabled={registering()} onClick={handleRegister}>
									{registering() ? "Setting up..." : "Set up"}
								</Button>
								<Button size="sm" variant="ghost" onClick={dismiss}>
									Not now
								</Button>
							</div>
						</div>
					</div>
				</Show>
			</div>
		</Show>
	);
}
