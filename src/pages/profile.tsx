import { createSignal, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { useAuth } from "~/contexts/auth-context";

export function ProfilePage() {
	const { user } = useAuth();
	const [showConfirm, setShowConfirm] = createSignal(false);
	const [password, setPassword] = createSignal("");
	const [deleting, setDeleting] = createSignal(false);
	const [deleteError, setDeleteError] = createSignal<string | null>(null);

	const handleDeleteAccount = async () => {
		if (!password().trim()) {
			setDeleteError("Password is required.");
			return;
		}

		setDeleteError(null);
		setDeleting(true);

		const res = await customFetch<{ data?: { message?: string }; status: number }>("/api/auth/me", {
			method: "DELETE",
			body: JSON.stringify({ password: password() }),
		});

		setDeleting(false);

		if (res.status === 204) {
			window.location.href = "/login";
		} else if (res.status === 401) {
			setDeleteError("Incorrect password.");
		} else {
			setDeleteError(res.data?.message ?? "Failed to delete account.");
		}
	};

	return (
		<div class="mx-auto max-w-xl space-y-8">
			<div>
				<h2 class="text-2xl font-bold tracking-tight">Profile</h2>
				<p class="mt-1 text-sm text-muted-foreground">Manage your account settings.</p>
			</div>

			{/* Account info */}
			<Show when={user()}>
				{(u) => (
					<section class="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
						<h3 class="text-sm font-semibold">Account</h3>
						<div class="grid gap-4 sm:grid-cols-2">
							<div>
								<p class="text-xs text-muted-foreground">Name</p>
								<p class="text-sm font-medium">{u().name}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Email</p>
								<p class="text-sm font-medium">{u().email}</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<span
								class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
								classList={{
									"bg-green-500/10 text-green-700 dark:text-green-400": u().email_verified,
									"bg-amber-500/10 text-amber-700 dark:text-amber-400": !u().email_verified,
								}}
							>
								{u().email_verified ? "Email verified" : "Email not verified"}
							</span>
						</div>
					</section>
				)}
			</Show>

			{/* Change password — stub */}
			<section class="space-y-4 rounded-xl border bg-card p-6 opacity-60 shadow-sm">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-semibold">Change Password</h3>
					<span class="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
						Coming soon
					</span>
				</div>
				<div class="space-y-3">
					<TextField disabled>
						<TextFieldLabel>Current password</TextFieldLabel>
						<TextFieldInput type="password" />
					</TextField>
					<TextField disabled>
						<TextFieldLabel>New password</TextFieldLabel>
						<TextFieldInput type="password" />
					</TextField>
					<TextField disabled>
						<TextFieldLabel>Confirm new password</TextFieldLabel>
						<TextFieldInput type="password" />
					</TextField>
				</div>
				<Button disabled>Update password</Button>
			</section>

			{/* Passkeys — stub */}
			<section class="space-y-4 rounded-xl border bg-card p-6 opacity-60 shadow-sm">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-semibold">Passkeys</h3>
					<span class="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
						Coming soon
					</span>
				</div>
				<p class="text-sm text-muted-foreground">
					Passkeys let you sign in securely without a password using your device's biometrics or
					security key.
				</p>
				<Button variant="outline" disabled>
					Register a passkey
				</Button>
			</section>

			{/* Danger zone */}
			<section class="space-y-4 rounded-xl border border-destructive/30 bg-card p-6 shadow-sm">
				<h3 class="text-sm font-semibold text-destructive">Danger Zone</h3>
				<p class="text-sm text-muted-foreground">
					Permanently delete your account and all associated data. This action cannot be undone.
				</p>

				<Show
					when={showConfirm()}
					fallback={
						<Button variant="destructive" onClick={() => setShowConfirm(true)}>
							Delete account
						</Button>
					}
				>
					<div class="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
						<p class="text-sm font-medium">Enter your password to confirm deletion.</p>
						<TextField value={password()} onChange={(v) => setPassword(v)}>
							<TextFieldLabel>Password</TextFieldLabel>
							<TextFieldInput type="password" placeholder="Your current password" />
						</TextField>
						<Show when={deleteError()}>
							<p class="text-sm text-destructive">{deleteError()}</p>
						</Show>
						<div class="flex items-center gap-2">
							<Button variant="destructive" disabled={deleting()} onClick={handleDeleteAccount}>
								{deleting() ? "Deleting..." : "Permanently delete my account"}
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									setShowConfirm(false);
									setPassword("");
									setDeleteError(null);
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				</Show>
			</section>
		</div>
	);
}
