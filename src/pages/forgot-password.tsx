import { Link } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";

export function ForgotPasswordPage() {
	const [email, setEmail] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [sent, setSent] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!email().trim()) {
			setError("Email is required.");
			return;
		}

		setIsSubmitting(true);

		const res = await customFetch<{ data?: { message?: string }; status: number }>(
			"/api/auth/forgot-password",
			{
				method: "POST",
				body: JSON.stringify({ email: email() }),
			},
		);

		setIsSubmitting(false);

		if (res.status === 200) {
			setSent(true);
		} else {
			setError(res.data?.message ?? "Something went wrong. Please try again.");
		}
	};

	return (
		<div class="flex min-h-screen items-center justify-center p-4">
			<div class="w-full max-w-sm space-y-6">
				<div class="space-y-2 text-center">
					<h1 class="text-2xl font-bold">Reset your password</h1>
					<p class="text-muted-foreground">
						Enter your email and we'll send you a link to reset your password.
					</p>
				</div>

				<Show
					when={!sent()}
					fallback={
						<div class="rounded-lg border bg-card p-6 shadow-sm">
							<div class="space-y-3 text-center">
								<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-green-500/10">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-6 text-green-600 dark:text-green-400"
										aria-hidden="true"
									>
										<path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
										<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
										<path d="m16 19 2 2 4-4" />
									</svg>
								</div>
								<p class="text-sm font-medium">Check your email</p>
								<p class="text-sm text-muted-foreground">
									If an account exists for <span class="font-medium">{email()}</span>, you'll
									receive a password reset link shortly.
								</p>
							</div>
						</div>
					}
				>
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

							<Show when={error()}>
								<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
									{error()}
								</div>
							</Show>

							<Button type="submit" class="w-full" disabled={isSubmitting()}>
								{isSubmitting() ? "Sending..." : "Send reset link"}
							</Button>
						</form>
					</div>
				</Show>

				<p class="text-center text-sm text-muted-foreground">
					<Link to="/login" class="text-primary underline hover:text-primary/80">
						Back to sign in
					</Link>
				</p>
			</div>
		</div>
	);
}
