import { createSignal, For, onMount, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { useAuth } from "~/contexts/auth-context";
import { formatDate } from "~/lib/datetime";
import { createPasskey, isWebAuthnSupported } from "~/lib/webauthn";

interface PasskeySummary {
	id: string;
	name: string;
	created_at: string;
}

export function ProfilePage() {
	const { user } = useAuth();

	// Change password
	const [currentPassword, setCurrentPassword] = createSignal("");
	const [newPassword, setNewPassword] = createSignal("");
	const [confirmPassword, setConfirmPassword] = createSignal("");
	const [changingPassword, setChangingPassword] = createSignal(false);
	const [passwordError, setPasswordError] = createSignal<string | null>(null);
	const [passwordSuccess, setPasswordSuccess] = createSignal(false);

	// Passkeys
	const [passkeys, setPasskeys] = createSignal<PasskeySummary[]>([]);
	const [loadingPasskeys, setLoadingPasskeys] = createSignal(true);
	const [passkeyName, setPasskeyName] = createSignal("");
	const [registering, setRegistering] = createSignal(false);
	const [passkeyError, setPasskeyError] = createSignal<string | null>(null);
	const [renamingId, setRenamingId] = createSignal<string | null>(null);
	const [renameValue, setRenameValue] = createSignal("");
	const [deletingId, setDeletingId] = createSignal<string | null>(null);

	const fetchPasskeys = async () => {
		const res = await customFetch<{ data: PasskeySummary[]; status: number }>("/api/auth/passkeys");
		if (res.status === 200) setPasskeys(res.data);
		setLoadingPasskeys(false);
	};

	onMount(() => {
		if (isWebAuthnSupported()) fetchPasskeys();
		else setLoadingPasskeys(false);
	});

	const handleRegisterPasskey = async () => {
		const name = passkeyName().trim() || "My passkey";
		setPasskeyError(null);
		setRegistering(true);

		try {
			const startRes = await customFetch<{
				data: Record<string, unknown>;
				status: number;
			}>("/api/auth/passkeys/register/start", {
				method: "POST",
				body: JSON.stringify({ name }),
			});

			if (startRes.status !== 200) {
				setPasskeyError("Failed to start passkey registration.");
				setRegistering(false);
				return;
			}

			const credential = await createPasskey(startRes.data);

			const finishRes = await customFetch<{
				data: PasskeySummary & { message?: string };
				status: number;
			}>("/api/auth/passkeys/register/finish", {
				method: "POST",
				body: JSON.stringify(credential),
			});

			if (finishRes.status === 201) {
				setPasskeys((prev) => [...prev, finishRes.data]);
				setPasskeyName("");
			} else {
				setPasskeyError(finishRes.data?.message ?? "Failed to register passkey.");
			}
		} catch (err) {
			if (err instanceof Error && err.name === "NotAllowedError") {
				setPasskeyError("Passkey registration was cancelled.");
			} else {
				setPasskeyError(err instanceof Error ? err.message : "Passkey registration failed.");
			}
		}

		setRegistering(false);
	};

	const handleRename = async (id: string) => {
		const name = renameValue().trim();
		if (!name) return;

		const res = await customFetch<{ status: number }>(`/api/auth/passkeys/${id}`, {
			method: "PUT",
			body: JSON.stringify({ name }),
		});

		if (res.status === 200) {
			setPasskeys((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
			setRenamingId(null);
		}
	};

	const handleDeletePasskey = async (id: string) => {
		setDeletingId(id);
		const res = await customFetch<{ status: number }>(`/api/auth/passkeys/${id}`, {
			method: "DELETE",
		});
		setDeletingId(null);

		if (res.status === 204) {
			setPasskeys((prev) => prev.filter((p) => p.id !== id));
		}
	};

	// Delete account
	const [showConfirm, setShowConfirm] = createSignal(false);
	const [password, setPassword] = createSignal("");
	const [deleting, setDeleting] = createSignal(false);
	const [deleteError, setDeleteError] = createSignal<string | null>(null);

	const handleChangePassword = async (e: Event) => {
		e.preventDefault();
		setPasswordError(null);
		setPasswordSuccess(false);

		if (!currentPassword()) {
			setPasswordError("Current password is required.");
			return;
		}
		if (!newPassword()) {
			setPasswordError("New password is required.");
			return;
		}
		if (newPassword() !== confirmPassword()) {
			setPasswordError("Passwords do not match.");
			return;
		}

		setChangingPassword(true);

		const res = await customFetch<{ data?: { message?: string }; status: number }>(
			"/api/auth/change-password",
			{
				method: "POST",
				body: JSON.stringify({
					current_password: currentPassword(),
					new_password: newPassword(),
				}),
			},
		);

		setChangingPassword(false);

		if (res.status === 200) {
			setPasswordSuccess(true);
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} else if (res.status === 401) {
			setPasswordError("Current password is incorrect.");
		} else if (res.status === 400) {
			setPasswordError(res.data?.message ?? "New password is too short.");
		} else {
			setPasswordError(res.data?.message ?? "Failed to change password.");
		}
	};

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

			{/* Change password */}
			<section class="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
				<h3 class="text-sm font-semibold">Change Password</h3>
				<form onSubmit={handleChangePassword} class="space-y-3">
					<TextField value={currentPassword()} onChange={setCurrentPassword}>
						<TextFieldLabel>Current password</TextFieldLabel>
						<TextFieldInput type="password" autocomplete="current-password" />
					</TextField>
					<TextField value={newPassword()} onChange={setNewPassword}>
						<TextFieldLabel>New password</TextFieldLabel>
						<TextFieldInput type="password" autocomplete="new-password" />
					</TextField>
					<TextField value={confirmPassword()} onChange={setConfirmPassword}>
						<TextFieldLabel>Confirm new password</TextFieldLabel>
						<TextFieldInput type="password" autocomplete="new-password" />
					</TextField>
					<Show when={passwordError()}>
						<p class="text-sm text-destructive">{passwordError()}</p>
					</Show>
					<Show when={passwordSuccess()}>
						<p class="text-sm text-green-700 dark:text-green-400">Password updated successfully.</p>
					</Show>
					<Button type="submit" disabled={changingPassword()}>
						{changingPassword() ? "Updating..." : "Update password"}
					</Button>
				</form>
			</section>

			{/* Passkeys */}
			<section class="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
				<h3 class="text-sm font-semibold">Passkeys</h3>
				<p class="text-sm text-muted-foreground">
					Passkeys let you sign in securely without a password using your device's biometrics or
					security key.
				</p>
				<Show
					when={isWebAuthnSupported()}
					fallback={
						<p class="text-xs text-muted-foreground">Your browser does not support passkeys.</p>
					}
				>
					{/* Registered passkeys list */}
					<Show
						when={!loadingPasskeys()}
						fallback={<div class="h-8 animate-pulse rounded bg-muted" />}
					>
						<Show when={passkeys().length > 0}>
							<div class="space-y-2">
								<For each={passkeys()}>
									{(pk) => (
										<div class="flex items-center justify-between rounded-lg border px-3 py-2">
											<Show
												when={renamingId() === pk.id}
												fallback={
													<div class="min-w-0 flex-1">
														<p class="truncate text-sm font-medium">{pk.name}</p>
														<p class="text-xs text-muted-foreground">
															Added {formatDate(pk.created_at)}
														</p>
													</div>
												}
											>
												<input
													type="text"
													class="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
													value={renameValue()}
													onInput={(e) => setRenameValue(e.currentTarget.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") handleRename(pk.id);
														if (e.key === "Escape") setRenamingId(null);
													}}
												/>
											</Show>
											<div class="ml-2 flex shrink-0 items-center gap-1">
												<Show
													when={renamingId() === pk.id}
													fallback={
														<button
															type="button"
															class="text-xs text-muted-foreground hover:text-foreground"
															onClick={() => {
																setRenamingId(pk.id);
																setRenameValue(pk.name);
															}}
														>
															Rename
														</button>
													}
												>
													<button
														type="button"
														class="text-xs text-primary hover:underline"
														onClick={() => handleRename(pk.id)}
													>
														Save
													</button>
													<button
														type="button"
														class="text-xs text-muted-foreground hover:underline"
														onClick={() => setRenamingId(null)}
													>
														Cancel
													</button>
												</Show>
												<button
													type="button"
													class="text-xs text-muted-foreground hover:text-destructive"
													disabled={deletingId() === pk.id}
													onClick={() => handleDeletePasskey(pk.id)}
												>
													{deletingId() === pk.id ? "..." : "Delete"}
												</button>
											</div>
										</div>
									)}
								</For>
							</div>
						</Show>
					</Show>

					<Show when={passkeyError()}>
						<p class="text-sm text-destructive">{passkeyError()}</p>
					</Show>

					{/* Register new passkey */}
					<div class="flex items-center gap-2">
						<input
							type="text"
							class="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
							placeholder="Passkey name (e.g. MacBook Pro)"
							value={passkeyName()}
							onInput={(e) => setPasskeyName(e.currentTarget.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleRegisterPasskey();
							}}
						/>
						<Button variant="outline" disabled={registering()} onClick={handleRegisterPasskey}>
							{registering() ? "Registering..." : "Register"}
						</Button>
					</div>
				</Show>
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
