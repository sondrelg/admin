import { Link, useNavigate } from "@tanstack/solid-router";
import { createMemo, createSignal, onMount, Show } from "solid-js";
import { signUp } from "~/api/generated/sdk.gen";
import { getProblemDetailMessage } from "~/api/problem";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";

export default function SignUpPage() {
	const navigate = useNavigate();

	const [name, setName] = createSignal("");
	const [email, setEmail] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	let nameInputRef: HTMLInputElement | undefined;

	onMount(() => {
		const isDesktop =
			typeof window !== "undefined" &&
			window.matchMedia("(pointer: fine) and (min-width: 768px)").matches;
		if (isDesktop) {
			nameInputRef?.focus();
		}
	});

	const canSubmit = createMemo(() => !!name().trim() && !!email().trim() && !!password());

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!canSubmit()) {
			setError("Please fill in name, email, and password.");
			return;
		}

		setIsSubmitting(true);
		try {
			const {
				data,
				error: apiError,
				response,
			} = await signUp({
				body: { email: email().trim(), password: password(), name: name().trim() },
			});

			if (data) {
				navigate({ to: "/setup/business" });
				return;
			}

			const problemMessage = getProblemDetailMessage(apiError);
			if (problemMessage) {
				setError(problemMessage);
			} else if (response?.status === 409) {
				setError("An account with this email already exists.");
			} else if (response?.status === 400) {
				setError("Please check your details and try again.");
			} else {
				setError("Sign up failed. Please try again.");
			}
		} catch (err) {
			setError(
				getProblemDetailMessage(err) ??
					(err instanceof Error ? err.message : "An unexpected error occurred"),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div class="flex min-h-dvh items-start justify-center p-4 pt-8 md:min-h-screen md:items-center">
			<div class="w-full max-w-sm space-y-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:space-y-6">
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
					<p class="text-muted-foreground">No verification is necessary to get started</p>
				</div>

				<div class="rounded-lg border bg-card p-4 shadow-sm md:p-6">
					<form onSubmit={handleSubmit} class="space-y-4">
						<TextField value={name()} onChange={setName}>
							<TextFieldLabel>Full Name</TextFieldLabel>
							<TextFieldInput
								ref={(el) => {
									nameInputRef = el;
								}}
								placeholder="Ola Nordmann"
								required
								autocomplete="name"
								enterkeyhint="next"
							/>
						</TextField>

						<TextField value={email()} onChange={setEmail}>
							<TextFieldLabel>Email</TextFieldLabel>
							<TextFieldInput
								type="email"
								placeholder="ola@example.com"
								required
								autocomplete="email"
								autocapitalize="none"
								autocorrect="off"
								inputMode="email"
								enterkeyhint="next"
							/>
						</TextField>

						<TextField value={password()} onChange={setPassword}>
							<TextFieldLabel>Password</TextFieldLabel>
							<TextFieldInput
								type="password"
								placeholder="Create a password"
								required
								autocomplete="new-password"
								enterkeyhint="go"
							/>
							<p class="mt-1 text-xs text-muted-foreground">
								The password must be at least 8 characters.
							</p>
						</TextField>

						<Show when={error()}>
							<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
						</Show>

						<Button type="submit" class="w-full" disabled={isSubmitting() || !canSubmit()}>
							{isSubmitting() ? "Creating account..." : "Continue"}
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
