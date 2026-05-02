import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { customFetch } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { formatDate, formatDateTime } from "~/lib/datetime";

interface ApiToken {
	id: string;
	tenant_id: string;
	created_by: string;
	name: string;
	token_prefix: string;
	is_active: boolean;
	created_at: string;
	last_used_at: string | null;
	expires_at: string | null;
}

type TokenStatus = "active" | "revoked" | "expired";

function deriveStatus(token: ApiToken): TokenStatus {
	if (!token.is_active) return "revoked";
	if (token.expires_at && new Date(token.expires_at) < new Date()) return "expired";
	return "active";
}

function StatusBadge(props: { status: TokenStatus }) {
	return (
		<span
			class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
			classList={{
				"bg-green-500/10 text-green-700 dark:text-green-400": props.status === "active",
				"bg-muted text-muted-foreground": props.status === "revoked",
				"bg-amber-500/10 text-amber-700 dark:text-amber-400": props.status === "expired",
			}}
		>
			{props.status === "active" ? "Active" : props.status === "revoked" ? "Revoked" : "Expired"}
		</span>
	);
}

export default function ApiTokensPage() {
	const [tokens, setTokens] = createSignal<ApiToken[]>([]);
	const [loading, setLoading] = createSignal(true);

	// Create form
	const [name, setName] = createSignal("");
	const [expiresAt, setExpiresAt] = createSignal("");
	const [creating, setCreating] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	// Newly created secret (shown once)
	const [newSecret, setNewSecret] = createSignal<string | null>(null);
	const [copied, setCopied] = createSignal(false);

	// Revoke confirmation
	const [confirmRevokeId, setConfirmRevokeId] = createSignal<string | null>(null);
	const [revoking, setRevoking] = createSignal(false);

	const sortedTokens = createMemo(() =>
		[...tokens()].sort(
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		),
	);

	const fetchTokens = async () => {
		const res = await customFetch<{ data: ApiToken[]; status: number }>("/api/api-tokens");
		if (res.status === 200) setTokens(res.data);
		setLoading(false);
	};

	onMount(fetchTokens);

	const handleCreate = async (e: Event) => {
		e.preventDefault();
		setError(null);

		if (!name().trim()) {
			setError("Name is required.");
			return;
		}

		setCreating(true);

		const body: Record<string, unknown> = { name: name() };
		if (expiresAt()) {
			body.expires_at = new Date(expiresAt()).toISOString();
		}

		const res = await customFetch<{
			data: ApiToken & { secret: string; message?: string };
			status: number;
		}>("/api/api-tokens", {
			method: "POST",
			body: JSON.stringify(body),
		});

		setCreating(false);

		if (res.status === 201) {
			setNewSecret(res.data.secret);
			setCopied(false);
			const { secret: _, message: __, ...token } = res.data;
			setTokens((prev) => [...prev, token]);
			setName("");
			setExpiresAt("");
		} else {
			setError(res.data?.message ?? "Failed to create token.");
		}
	};

	const handleCopy = async () => {
		const secret = newSecret();
		if (!secret) return;
		await navigator.clipboard.writeText(secret);
		setCopied(true);
	};

	const handleRevoke = async (id: string) => {
		setRevoking(true);
		const res = await customFetch<{ status: number }>(`/api/api-tokens/${id}/revoke`, {
			method: "POST",
		});
		setRevoking(false);
		setConfirmRevokeId(null);

		if (res.status === 204) {
			setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: false } : t)));
		}
	};

	return (
		<div class="space-y-8">
			<div>
				<h2 class="text-2xl font-bold tracking-tight">API Tokens</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Create and manage API tokens for programmatic access to your tenant.
				</p>
			</div>

			{/* Create token */}
			<section class="rounded-xl border bg-card p-6 shadow-sm">
				<h3 class="text-sm font-semibold">Create a token</h3>
				<form onSubmit={handleCreate} class="mt-4 space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<TextField value={name()} onChange={setName}>
							<TextFieldLabel>Name</TextFieldLabel>
							<TextFieldInput placeholder="e.g. Accounting sync" />
						</TextField>
						<div class="space-y-1.5">
							<label class="text-sm font-medium" for="expires-at">
								Expires at
							</label>
							<input
								id="expires-at"
								type="date"
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								value={expiresAt()}
								min={new Date().toISOString().split("T")[0]}
								onInput={(e) => setExpiresAt(e.currentTarget.value)}
							/>
							<p class="text-xs text-muted-foreground">Leave empty for no expiry.</p>
						</div>
					</div>
					<Show when={error()}>
						<p class="text-sm text-destructive">{error()}</p>
					</Show>
					<Button type="submit" disabled={creating()}>
						{creating() ? "Creating..." : "Create token"}
					</Button>
				</form>
			</section>

			{/* Newly created secret (shown once) */}
			<Show when={newSecret()}>
				<section class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
					<h3 class="text-sm font-semibold text-amber-700 dark:text-amber-400">Copy your token</h3>
					<p class="mt-1 text-xs text-muted-foreground">
						Copy this token now — it won't be shown again.
					</p>
					<div class="mt-3 flex items-center gap-2">
						<code class="flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">
							{newSecret()}
						</code>
						<Button variant="outline" size="sm" onClick={handleCopy}>
							{copied() ? "Copied" : "Copy"}
						</Button>
					</div>
					<div class="mt-2 text-right">
						<button
							type="button"
							class="text-xs text-muted-foreground hover:text-foreground"
							onClick={() => setNewSecret(null)}
						>
							Dismiss
						</button>
					</div>
				</section>
			</Show>

			{/* Token list */}
			<section class="space-y-4">
				<h3 class="text-sm font-semibold">Tokens</h3>
				<Show when={!loading()} fallback={<div class="h-20 animate-pulse rounded-xl bg-muted" />}>
					<Show
						when={sortedTokens().length > 0}
						fallback={<p class="text-sm text-muted-foreground">No API tokens yet.</p>}
					>
						{/* Table header */}
						<div class="hidden rounded-t-lg border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto]  sm:gap-4">
							<span>Name</span>
							<span class="w-16">Prefix</span>
							<span class="w-16">Status</span>
							<span class="w-24">Created</span>
							<span class="w-24">Last used</span>
							<span class="w-20" />
						</div>

						<div class="space-y-2 sm:space-y-0">
							<For each={sortedTokens()}>
								{(token) => {
									const status = () => deriveStatus(token);
									return (
										<div class="rounded-lg border bg-card px-4 py-3 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:items-center sm:gap-4 sm:rounded-none sm:border-x sm:border-b sm:border-t-0 sm:first:rounded-t-lg sm:first:border-t sm:last:rounded-b-lg">
											{/* Name + prefix (mobile: stacked) */}
											<div class="flex items-center gap-2">
												<p class="truncate text-sm font-medium">{token.name}</p>
												<code class="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:hidden">
													...{token.token_prefix}
												</code>
											</div>
											<code class="hidden w-16 font-mono text-xs text-muted-foreground sm:block">
												...{token.token_prefix}
											</code>
											<div class="mt-1 sm:mt-0 sm:w-16">
												<StatusBadge status={status()} />
											</div>
											<span class="hidden text-xs text-muted-foreground sm:block sm:w-24">
												{formatDate(token.created_at)}
											</span>
											<span class="hidden text-xs text-muted-foreground sm:block sm:w-24">
												{token.last_used_at ? formatDateTime(token.last_used_at) : "Never"}
											</span>
											<div class="mt-2 sm:mt-0 sm:w-20 sm:text-right">
												<Show
													when={confirmRevokeId() === token.id}
													fallback={
														<Button
															variant="outline"
															size="sm"
															class="text-destructive hover:bg-destructive hover:text-destructive-foreground"
															disabled={status() !== "active"}
															onClick={() => setConfirmRevokeId(token.id)}
														>
															Revoke
														</Button>
													}
												>
													<div class="flex items-center gap-1">
														<Button
															variant="destructive"
															size="sm"
															disabled={revoking()}
															onClick={() => handleRevoke(token.id)}
														>
															{revoking() ? "..." : "Confirm"}
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => setConfirmRevokeId(null)}
														>
															Cancel
														</Button>
													</div>
												</Show>
											</div>

											{/* Mobile-only metadata */}
											<div class="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground sm:hidden">
												<span>Created {formatDate(token.created_at)}</span>
												<span>
													{token.last_used_at
														? `Used ${formatDateTime(token.last_used_at)}`
														: "Never used"}
												</span>
												<Show when={token.expires_at}>
													<span>Expires {formatDate(token.expires_at!)}</span>
												</Show>
											</div>
										</div>
									);
								}}
							</For>
						</div>
					</Show>
				</Show>
			</section>
		</div>
	);
}
