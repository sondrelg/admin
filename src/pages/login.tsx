import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { passkeyLoginFinish, passkeyLoginStart, signIn } from "~/api/generated/sdk.gen";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { authenticatePasskey, isWebAuthnSupported } from "~/lib/webauthn";

type LoginStep = "email" | "auth";

export default function LoginPage() {
	const navigate = useNavigate();

	const [step, setStep] = createSignal<LoginStep>("email");
	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [isPasskeyLoading, setIsPasskeyLoading] = createSignal(false);
	const [passkeyDeclined, setPasskeyDeclined] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const isBusy = () => isSubmitting() || isPasskeyLoading();

	const tryDirectPasskeyLogin = async (): Promise<boolean> => {
		if (!isWebAuthnSupported() || passkeyDeclined()) return false;

		setIsPasskeyLoading(true);
		try {
			const { data: startData } = await passkeyLoginStart({
				body: { email: email().trim() },
			});
			if (!startData) return false;

			const credential = await authenticatePasskey(startData as unknown as Record<string, unknown>);
			const { data: finishData } = await passkeyLoginFinish({ body: credential });
			if (!finishData) return false;

			navigate({ to: "/" });
			return true;
		} catch (err) {
			if (err instanceof Error && err.name === "NotAllowedError") {
				setPasskeyDeclined(true);
			}
			return false;
		} finally {
			setIsPasskeyLoading(false);
		}
	};

	const handleContinue = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!email().trim()) {
			setError("Email is required.");
			return;
		}

		const didPasskeyLogin = await tryDirectPasskeyLogin();
		if (!didPasskeyLogin) {
			setStep("auth");
		}
	};

	const handlePasskeyLogin = async () => {
		setError(null);
		setIsPasskeyLoading(true);

		try {
			const { data: startData } = await passkeyLoginStart({
				body: { email: email().trim() },
			});

			if (!startData) {
				setError("Could not sign in. Check your details and try again.");
				return;
			}

			const credential = await authenticatePasskey(startData as unknown as Record<string, unknown>);

			const { data: finishData } = await passkeyLoginFinish({
				body: credential,
			});

			if (finishData) {
				navigate({ to: "/" });
			} else {
				setError("Could not sign in. Check your details and try again.");
			}
		} catch (err) {
			if (err instanceof Error && err.name === "NotAllowedError") {
				setError("Passkey authentication was cancelled.");
			} else {
				setError("Could not sign in. Check your details and try again.");
			}
		} finally {
			setIsPasskeyLoading(false);
		}
	};

	const handlePasswordSignIn = async () => {
		if (!password()) {
			setError("Password is required.");
			return;
		}

		setIsSubmitting(true);
		try {
			const { data } = await signIn({
				body: { email: email().trim(), password: password() },
			});

			if (data) {
				navigate({ to: "/" });
			} else {
				setError("Could not sign in. Check your details and try again.");
			}
		} catch {
			setError("Could not sign in. Check your details and try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleFormSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (step() === "email") {
			await handleContinue(e);
			return;
		}

		await handlePasswordSignIn();
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
					<form onSubmit={handleFormSubmit} class="space-y-4">
						<TextField value={email()} onChange={setEmail}>
							<TextFieldLabel>Email</TextFieldLabel>
							<TextFieldInput
								type="email"
								placeholder="ola@example.com"
								required
								autocomplete={step() === "email" ? "username webauthn" : "username"}
								disabled={step() === "auth"}
							/>
						</TextField>

						<Show when={step() === "auth"}>
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
						</Show>

						<Show when={error()}>
							<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
						</Show>

						<Show
							when={step() === "email"}
							fallback={
								<div class="space-y-3">
									<Button type="submit" class="w-full" disabled={isBusy()}>
										{isSubmitting() ? "Signing in..." : "Sign In"}
									</Button>
									<Button
										type="button"
										variant="ghost"
										class="w-full"
										disabled={isBusy()}
										onClick={() => {
											setStep("email");
											setPassword("");
											setError(null);
											setPasskeyDeclined(false);
										}}
									>
										Use a different email
									</Button>
								</div>
							}
						>
							<Button type="submit" class="w-full" disabled={isBusy()}>
								Continue
							</Button>
						</Show>
					</form>

					<Show when={step() === "auth" && isWebAuthnSupported()}>
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
							disabled={isBusy()}
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
