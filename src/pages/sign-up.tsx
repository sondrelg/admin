import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { signUp } from "~/api/generated/sdk.gen";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";

export default function SignUpPage() {
	const navigate = useNavigate();

	const [name, setName] = createSignal("");
	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [passwordConfirm, setPasswordConfirm] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const validate = (): string | null => {
		if (!name().trim()) return "Name is required.";
		if (!email().trim() || !email().includes("@")) return "A valid email is required.";
		if (password().length < 8) return "Password must be at least 8 characters.";
		if (password() !== passwordConfirm()) return "Passwords do not match.";
		return null;
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		const validationError = validate();
		if (validationError) {
			setError(validationError);
			return;
		}

		setIsSubmitting(true);
		try {
			const { data } = await signUp({
				body: { email: email(), password: password(), name: name() },
			});

			if (data) {
				navigate({ to: "/setup/business" });
			} else {
				setError("Sign up failed");
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
					<h1 class="text-2xl font-bold">Create your account</h1>
					<p class="text-muted-foreground">Get started with your POS system</p>
				</div>

				<div class="rounded-lg border bg-card p-6 shadow-sm">
					<form onSubmit={handleSubmit} class="space-y-4">
						<TextField value={name()} onChange={setName}>
							<TextFieldLabel>Full Name</TextFieldLabel>
							<TextFieldInput placeholder="Ola Nordmann" required autocomplete="name" />
						</TextField>

						<TextField value={email()} onChange={setEmail}>
							<TextFieldLabel>Email</TextFieldLabel>
							<TextFieldInput
								type="email"
								placeholder="ola@example.com"
								required
								autocomplete="email"
							/>
						</TextField>

						<TextField value={password()} onChange={setPassword}>
							<TextFieldLabel>Password</TextFieldLabel>
							<TextFieldInput
								type="password"
								placeholder="At least 8 characters"
								required
								autocomplete="new-password"
							/>
						</TextField>

						<TextField value={passwordConfirm()} onChange={setPasswordConfirm}>
							<TextFieldLabel>Confirm Password</TextFieldLabel>
							<TextFieldInput
								type="password"
								placeholder="Repeat password"
								required
								autocomplete="new-password"
							/>
							<Show when={passwordConfirm() && password() !== passwordConfirm()}>
								<p class="mt-1 text-xs text-destructive">Passwords do not match</p>
							</Show>
						</TextField>

						<Show when={error()}>
							<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
						</Show>

						<Button type="submit" class="w-full" disabled={isSubmitting()}>
							{isSubmitting() ? "Creating account..." : "Sign Up"}
						</Button>
					</form>
				</div>

				<p class="text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link to="/login" class="text-primary underline hover:text-primary/80">
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}
