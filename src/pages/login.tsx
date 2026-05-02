import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { useAuth } from "~/contexts/auth-context";
import { authenticatePasskey, isWebAuthnSupported } from "~/lib/webauthn";

export default function LoginPage() {
	const navigate = useNavigate();
	const { signIn, refreshMe } = useAuth();

	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [isPasskeyLoading, setIsPasskeyLoading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const handlePasskeyLogin = async () => {
		setError(null);

		if (!email().trim()) {
			setError("Enter your email first, then use passkey sign-in.");
			return;
		}

		setIsPasskeyLoading(true);

		try {
			const startRes = await customFetch<{
				data: Record<string, unknown>;
				status: number;
			}>("/api/auth/passkeys/login/start", {
				method: "POST",
				body: JSON.stringify({ email: email() }),
			});

			if (startRes.status === 404) {
				setError("No passkeys registered for this account.");
				setIsPasskeyLoading(false);
				return;
			}

			if (startRes.status !== 200) {
				setError("Failed to start passkey authentication.");
				setIsPasskeyLoading(false);
				return;
			}

			const credential = await authenticatePasskey(startRes.data);

			const finishRes = await customFetch<{ data?: { message?: string }; status: number }>(
				"/api/auth/passkeys/login/finish",
				{
					method: "POST",
					body: JSON.stringify(credential),
				},
			);

			if (finishRes.status === 200) {
				await refreshMe();
				navigate({ to: "/" });
			} else {
				setError(finishRes.data?.message ?? "Passkey authentication failed.");
			}
		} catch (err) {
			if (err instanceof Error && err.name === "NotAllowedError") {
				setError("Passkey authentication was cancelled.");
			} else {
				setError(err instanceof Error ? err.message : "Passkey authentication failed.");
			}
		}

		setIsPasskeyLoading(false);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!email().trim()) {
			setError("Email is required.");
			return;
		}
		if (!password()) {
			setError("Password is required.");
			return;
		}

		setIsSubmitting(true);
		try {
			const err = await signIn(email(), password());
			if (err) {
				setError(err);
			} else {
				navigate({ to: "/" });
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An unexpected error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div class="flex min-h-screen items-center justify-center p-4">
			<div class="w-full max-w-sm space-y-6">
				<div class="space-y-2 text-center">
					<div class="mx-auto flex size-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-6"
							aria-hidden="true"
						>
							<rect width="20" height="14" x="2" y="5" rx="2" />
							<line x1="2" x2="22" y1="10" y2="10" />
						</svg>
					</div>
					<h1 class="text-2xl font-bold">Welcome to SMLS</h1>
					<p class="text-muted-foreground">Sign in to manage your POS system</p>
				</div>

				<div class="rounded-lg border bg-card p-6 shadow-sm">
					<form onSubmit={handleSubmit} class="space-y-4">
						<TextField value={email()} onChange={setEmail}>
							<TextFieldLabel>Email</TextFieldLabel>
							<TextFieldInput
								type="email"
								placeholder="ola@example.com"
								required
								autocomplete="username"
							/>
						</TextField>

						<div class="space-y-1.5">
							<TextField value={password()} onChange={setPassword}>
								<TextFieldLabel>Password</TextFieldLabel>
								<TextFieldInput
									type="password"
									placeholder="Enter your password"
									autocomplete="current-password"
								/>
							</TextField>
							<div class="text-right">
								<Link
									to="/forgot-password"
									class="text-xs text-muted-foreground hover:text-primary"
								>
									Forgot password?
								</Link>
							</div>
						</div>

						<Show when={error()}>
							<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
						</Show>

						<Button type="submit" class="w-full" disabled={isSubmitting() || isPasskeyLoading()}>
							{isSubmitting() ? "Signing in..." : "Sign In"}
						</Button>
					</form>

					<Show when={isWebAuthnSupported()}>
						<div class="relative my-4">
							<div class="absolute inset-0 flex items-center">
								<span class="w-full border-t" />
							</div>
							<div class="relative flex justify-center text-xs uppercase">
								<span class="bg-card px-2 text-muted-foreground">or</span>
							</div>
						</div>
						<Button
							type="button"
							variant="outline"
							class="w-full"
							disabled={isPasskeyLoading() || isSubmitting()}
							onClick={handlePasskeyLogin}
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
								<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
								<circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
							</svg>
							{isPasskeyLoading() ? "Authenticating..." : "Sign in with passkey"}
						</Button>
					</Show>
				</div>

				<p class="text-center text-sm text-muted-foreground">
					Don't have an account?{" "}
					<Link to="/sign-up" class="text-primary underline hover:text-primary/80">
						Sign up
					</Link>
				</p>
			</div>
		</div>
	);
}
