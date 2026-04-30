import { Link, useSearch } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";

export function ResetPasswordPage() {
	const search = useSearch({ from: "/reset-password" });
	const token = () => search().token;

	const [newPassword, setNewPassword] = createSignal("");
	const [confirmPassword, setConfirmPassword] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [success, setSuccess] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!token()) {
			setError("Invalid or missing reset token.");
			return;
		}

		if (!newPassword()) {
			setError("Password is required.");
			return;
		}

		if (newPassword() !== confirmPassword()) {
			setError("Passwords do not match.");
			return;
		}

		setIsSubmitting(true);

		const res = await customFetch<{ data?: { message?: string }; status: number }>(
			"/api/auth/reset-password",
			{
				method: "POST",
				body: JSON.stringify({ token: token(), new_password: newPassword() }),
			},
		);

		setIsSubmitting(false);

		if (res.status === 200) {
			setSuccess(true);
		} else if (res.status === 404) {
			setError("This reset link is invalid or has expired. Please request a new one.");
		} else if (res.status === 400) {
			setError(res.data?.message ?? "Password is too short.");
		} else {
			setError(res.data?.message ?? "Something went wrong. Please try again.");
		}
	};

	return (
		<div class="flex min-h-screen items-center justify-center p-4">
			<div class="w-full max-w-sm space-y-6">
				<div class="space-y-2 text-center">
					<h1 class="text-2xl font-bold">Set a new password</h1>
					<p class="text-muted-foreground">Enter your new password below.</p>
				</div>

				<Show
					when={!success()}
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
										<path d="M20 6 9 17l-5-5" />
									</svg>
								</div>
								<p class="text-sm font-medium">Password updated</p>
								<p class="text-sm text-muted-foreground">
									Your password has been reset. You can now sign in with your new password.
								</p>
								<Link
									to="/login"
									class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
								>
									Sign in
								</Link>
							</div>
						</div>
					}
				>
					<Show
						when={token()}
						fallback={
							<div class="rounded-lg border bg-card p-6 shadow-sm">
								<div class="space-y-3 text-center">
									<p class="text-sm text-destructive">
										Invalid or missing reset token. Please request a new password reset.
									</p>
									<Link
										to="/forgot-password"
										class="text-sm text-primary underline hover:text-primary/80"
									>
										Request a new link
									</Link>
								</div>
							</div>
						}
					>
						<div class="rounded-lg border bg-card p-6 shadow-sm">
							<form onSubmit={handleSubmit} class="space-y-4">
								<TextField value={newPassword()} onChange={setNewPassword}>
									<TextFieldLabel>New password</TextFieldLabel>
									<TextFieldInput
										type="password"
										placeholder="Enter new password"
										autocomplete="new-password"
									/>
								</TextField>

								<TextField value={confirmPassword()} onChange={setConfirmPassword}>
									<TextFieldLabel>Confirm password</TextFieldLabel>
									<TextFieldInput
										type="password"
										placeholder="Confirm new password"
										autocomplete="new-password"
									/>
								</TextField>

								<Show when={error()}>
									<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
										{error()}
									</div>
								</Show>

								<Button type="submit" class="w-full" disabled={isSubmitting()}>
									{isSubmitting() ? "Resetting..." : "Reset password"}
								</Button>
							</form>
						</div>
					</Show>
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
