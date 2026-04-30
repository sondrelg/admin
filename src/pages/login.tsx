import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { useAuth } from "~/contexts/auth-context";

export function LoginPage() {
	const navigate = useNavigate();
	const { signIn } = useAuth();

	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

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

						<Button type="submit" class="w-full" disabled={isSubmitting()}>
							{isSubmitting() ? "Signing in..." : "Sign In"}
						</Button>
					</form>
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
