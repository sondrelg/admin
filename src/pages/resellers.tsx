import { createSignal, For, onMount, Show } from "solid-js";
import type {
	AgreementResponse,
	PlanResponse,
	ResellerResponse,
	ResellerTenantResponse,
	ResellerUserResponse,
} from "~/api/generated/types.gen";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { formatDate } from "~/lib/datetime";

function formatBps(bps: number): string {
	return `${(bps / 100).toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ResellersPage() {
	const [resellers, setResellers] = createSignal<ResellerResponse[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [createOpen, setCreateOpen] = createSignal(false);
	const [selected, setSelected] = createSignal<ResellerResponse | null>(null);

	const fetchResellers = async () => {
		const res = await apiFetch<{ data: ResellerResponse[]; status: number }>(
			"/api/admin/resellers",
		);
		if (res.status === 200) {
			setResellers(res.data);
		} else {
			setError("Failed to load resellers");
		}
		setLoading(false);
	};

	onMount(fetchResellers);

	const handleCreated = (reseller: ResellerResponse) => {
		setResellers((prev) => [...prev, reseller]);
	};

	return (
		<div class="mx-auto max-w-3xl space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight">Resellers</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Manage white-label partners, their tenants, and agreements.
					</p>
				</div>
				<Button type="button" onClick={() => setCreateOpen(true)}>
					+ Add Reseller
				</Button>
			</div>

			<Show when={error()}>
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
			</Show>

			<Show
				when={!loading()}
				fallback={
					<div class="space-y-3">
						<div class="h-20 animate-pulse rounded-xl border bg-card" />
						<div class="h-20 animate-pulse rounded-xl border bg-card" />
					</div>
				}
			>
				<Show when={resellers().length === 0}>
					<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
						No resellers yet. Add your first partner to get started.
					</div>
				</Show>

				<div class="space-y-3">
					<For each={resellers()}>
						{(reseller) => (
							<button
								type="button"
								class="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50"
								onClick={() => setSelected(reseller)}
							>
								<div>
									<p class="font-semibold">{reseller.name}</p>
									<p class="mt-0.5 text-sm text-muted-foreground">
										{reseller.custom_domain ?? reseller.slug}
									</p>
								</div>
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium"
									classList={{
										"bg-primary/10 text-primary": reseller.is_active,
										"bg-muted text-muted-foreground": !reseller.is_active,
									}}
								>
									{reseller.is_active ? "Active" : "Inactive"}
								</span>
							</button>
						)}
					</For>
				</div>
			</Show>

			<CreateResellerDialog
				open={createOpen()}
				onOpenChange={setCreateOpen}
				onCreated={handleCreated}
			/>

			<ResellerDetailSheet reseller={selected()} onClose={() => setSelected(null)} />
		</div>
	);
}

// ---------------------------------------------------------------------------
// Create dialog
// ---------------------------------------------------------------------------

function CreateResellerDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (reseller: ResellerResponse) => void;
}) {
	const [name, setName] = createSignal("");
	const [slug, setSlug] = createSignal("");
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const reset = () => {
		setName("");
		setSlug("");
		setError(null);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!name().trim()) {
			setError("Name is required.");
			return;
		}

		setSubmitting(true);
		setError(null);

		const res = await apiFetch<{
			data: ResellerResponse & { detail?: string };
			status: number;
		}>("/api/admin/resellers", {
			method: "POST",
			body: JSON.stringify({
				name: name().trim(),
				slug: slug().trim() || undefined,
			}),
		});

		setSubmitting(false);

		if (res.status === 201) {
			props.onCreated(res.data);
			reset();
			props.onOpenChange(false);
		} else {
			setError(res.data?.detail ?? "Failed to create reseller");
		}
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!open) reset();
				props.onOpenChange(open);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Reseller</DialogTitle>
					<DialogDescription>Create a new white-label partner.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} class="space-y-4">
					<TextField value={name()} onChange={(v) => setName(v)}>
						<TextFieldLabel>Name</TextFieldLabel>
						<TextFieldInput placeholder="Acme POS" />
					</TextField>
					<TextField value={slug()} onChange={(v) => setSlug(v)}>
						<TextFieldLabel>Slug (optional)</TextFieldLabel>
						<TextFieldInput placeholder="acme-pos" />
					</TextField>

					<Show when={error()}>
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
					</Show>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting()}>
							{submitting() ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Detail sheet with tabs
// ---------------------------------------------------------------------------

type Tab = "branding" | "tenants" | "users" | "agreements";

function ResellerDetailSheet(props: { reseller: ResellerResponse | null; onClose: () => void }) {
	const [tab, setTab] = createSignal<Tab>("tenants");
	const open = () => props.reseller !== null;

	return (
		<Sheet
			open={open()}
			onOpenChange={(isOpen) => {
				if (!isOpen) props.onClose();
			}}
		>
			<SheetContent class="sm:max-w-lg overflow-y-auto">
				<Show when={props.reseller}>
					{(reseller) => (
						<>
							<SheetHeader>
								<SheetTitle>{reseller().name}</SheetTitle>
								<SheetDescription>{reseller().custom_domain ?? reseller().slug}</SheetDescription>
							</SheetHeader>

							<div class="mt-4 flex gap-1 rounded-lg bg-muted p-1">
								<TabButton label="Tenants" value="tenants" current={tab()} onClick={setTab} />
								<TabButton label="Users" value="users" current={tab()} onClick={setTab} />
								<TabButton label="Branding" value="branding" current={tab()} onClick={setTab} />
								<TabButton label="Agreements" value="agreements" current={tab()} onClick={setTab} />
							</div>

							<div class="mt-4">
								<Show when={tab() === "tenants"}>
									<TenantsTab resellerId={reseller().id} />
								</Show>
								<Show when={tab() === "users"}>
									<UsersTab resellerId={reseller().id} />
								</Show>
								<Show when={tab() === "branding"}>
									<BrandingTab reseller={reseller()} />
								</Show>
								<Show when={tab() === "agreements"}>
									<AgreementsTab resellerId={reseller().id} />
								</Show>
							</div>
						</>
					)}
				</Show>
			</SheetContent>
		</Sheet>
	);
}

function TabButton(props: { label: string; value: Tab; current: Tab; onClick: (v: Tab) => void }) {
	return (
		<button
			type="button"
			class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
			classList={{
				"bg-background shadow-sm": props.current === props.value,
				"text-muted-foreground hover:text-foreground": props.current !== props.value,
			}}
			onClick={() => props.onClick(props.value)}
		>
			{props.label}
		</button>
	);
}

// ---------------------------------------------------------------------------
// Tenants tab
// ---------------------------------------------------------------------------

function TenantsTab(props: { resellerId: string }) {
	const [tenants, setTenants] = createSignal<ResellerTenantResponse[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [provisionOpen, setProvisionOpen] = createSignal(false);
	const [plans, setPlans] = createSignal<PlanResponse[]>([]);

	const fetchData = async () => {
		const [tenantsRes, plansRes] = await Promise.all([
			apiFetch<{ data: ResellerTenantResponse[]; status: number }>(
				`/api/admin/resellers/${props.resellerId}/tenants`,
			),
			apiFetch<{ data: PlanResponse[]; status: number }>(
				`/api/admin/resellers/${props.resellerId}/plans`,
			),
		]);
		if (tenantsRes.status === 200) setTenants(tenantsRes.data);
		if (plansRes.status === 200) setPlans(plansRes.data);
		setLoading(false);
	};

	onMount(fetchData);

	const handleProvisioned = (tenant: ResellerTenantResponse) => {
		setTenants((prev) => [...prev, tenant]);
	};

	return (
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium">{tenants().length} tenant(s)</p>
				<Button type="button" size="sm" onClick={() => setProvisionOpen(true)}>
					+ Provision
				</Button>
			</div>

			<Show when={!loading()} fallback={<div class="h-16 animate-pulse rounded-lg border" />}>
				<div class="space-y-2">
					<For each={tenants()}>
						{(tenant) => (
							<div class="flex items-center justify-between rounded-lg border p-3 text-sm">
								<div>
									<p class="font-medium">{tenant.name}</p>
									<p class="text-muted-foreground">{tenant.plan_name ?? "No plan"}</p>
								</div>
								<div class="flex items-center gap-2">
									<Show when={tenant.is_test}>
										<span class="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
											Test
										</span>
									</Show>
									<span
										class="rounded-full px-2 py-0.5 text-xs font-medium"
										classList={{
											"bg-primary/10 text-primary": tenant.is_active,
											"bg-muted text-muted-foreground": !tenant.is_active,
										}}
									>
										{tenant.is_active ? "Active" : "Inactive"}
									</span>
								</div>
							</div>
						)}
					</For>
				</div>
			</Show>

			<ProvisionTenantDialog
				open={provisionOpen()}
				onOpenChange={setProvisionOpen}
				resellerId={props.resellerId}
				plans={plans()}
				onProvisioned={handleProvisioned}
			/>
		</div>
	);
}

function ProvisionTenantDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	resellerId: string;
	plans: PlanResponse[];
	onProvisioned: (tenant: ResellerTenantResponse) => void;
}) {
	const [name, setName] = createSignal("");
	const [planId, setPlanId] = createSignal("");
	const [isTest, setIsTest] = createSignal(false);
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const reset = () => {
		setName("");
		setPlanId("");
		setIsTest(false);
		setError(null);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!name().trim()) {
			setError("Tenant name is required.");
			return;
		}

		setSubmitting(true);
		setError(null);

		const res = await apiFetch<{
			data: ResellerTenantResponse & { detail?: string };
			status: number;
		}>(`/api/admin/resellers/${props.resellerId}/tenants`, {
			method: "POST",
			body: JSON.stringify({
				name: name().trim(),
				plan_id: planId() || undefined,
				is_test: isTest(),
			}),
		});

		setSubmitting(false);

		if (res.status === 201) {
			props.onProvisioned(res.data);
			reset();
			props.onOpenChange(false);
		} else {
			setError(res.data?.detail ?? "Failed to provision tenant");
		}
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!open) reset();
				props.onOpenChange(open);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Provision Tenant</DialogTitle>
					<DialogDescription>Create a new tenant under this reseller.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} class="space-y-4">
					<TextField value={name()} onChange={(v) => setName(v)}>
						<TextFieldLabel>Tenant Name</TextFieldLabel>
						<TextFieldInput placeholder="Coffee Bar Oslo" />
					</TextField>

					<div>
						<label class="mb-1.5 block text-sm font-medium" for="plan-select">
							Plan
						</label>
						<select
							id="plan-select"
							value={planId()}
							onChange={(e) => setPlanId(e.currentTarget.value)}
							class="w-full rounded-md border bg-background px-3 py-2 text-sm"
						>
							<option value="">No plan</option>
							<For each={props.plans}>{(plan) => <option value={plan.id}>{plan.name}</option>}</For>
						</select>
					</div>

					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={isTest()}
							onChange={(e) => setIsTest(e.currentTarget.checked)}
							class="rounded border"
						/>
						Test tenant
					</label>

					<Show when={error()}>
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
					</Show>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting()}>
							{submitting() ? "Provisioning..." : "Provision"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersTab(props: { resellerId: string }) {
	const [users, setUsers] = createSignal<ResellerUserResponse[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [addOpen, setAddOpen] = createSignal(false);

	const fetchUsers = async () => {
		const res = await apiFetch<{ data: ResellerUserResponse[]; status: number }>(
			`/api/admin/resellers/${props.resellerId}/users`,
		);
		if (res.status === 200) setUsers(res.data);
		setLoading(false);
	};

	onMount(fetchUsers);

	const handleRemove = async (userId: string) => {
		const res = await apiFetch<{ status: number }>(
			`/api/admin/resellers/${props.resellerId}/users/${userId}`,
			{ method: "DELETE" },
		);
		if (res.status === 204) {
			setUsers((prev) => prev.filter((u) => u.user_id !== userId));
		}
	};

	const handleAdded = (user: ResellerUserResponse) => {
		setUsers((prev) => [...prev, user]);
	};

	return (
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium">{users().length} user(s)</p>
				<Button type="button" size="sm" onClick={() => setAddOpen(true)}>
					+ Add User
				</Button>
			</div>

			<Show when={!loading()} fallback={<div class="h-16 animate-pulse rounded-lg border" />}>
				<div class="space-y-2">
					<For each={users()}>
						{(user) => (
							<div class="flex items-center justify-between rounded-lg border p-3 text-sm">
								<div>
									<p class="font-medium">{user.user_id}</p>
									<p class="text-muted-foreground">
										{user.role} &middot; {formatDate(user.created_at)}
									</p>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => handleRemove(user.user_id)}
								>
									Remove
								</Button>
							</div>
						)}
					</For>
				</div>
			</Show>

			<AddUserDialog
				open={addOpen()}
				onOpenChange={setAddOpen}
				resellerId={props.resellerId}
				onAdded={handleAdded}
			/>
		</div>
	);
}

function AddUserDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	resellerId: string;
	onAdded: (user: ResellerUserResponse) => void;
}) {
	const [userId, setUserId] = createSignal("");
	const [role, setRole] = createSignal("admin");
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const reset = () => {
		setUserId("");
		setRole("admin");
		setError(null);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!userId().trim()) {
			setError("User ID is required.");
			return;
		}

		setSubmitting(true);
		setError(null);

		const res = await apiFetch<{
			data: ResellerUserResponse & { detail?: string };
			status: number;
		}>(`/api/admin/resellers/${props.resellerId}/users`, {
			method: "POST",
			body: JSON.stringify({ user_id: userId().trim(), role: role() }),
		});

		setSubmitting(false);

		if (res.status === 201) {
			props.onAdded(res.data);
			reset();
			props.onOpenChange(false);
		} else {
			setError(res.data?.detail ?? "Failed to add user");
		}
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!open) reset();
				props.onOpenChange(open);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add User</DialogTitle>
					<DialogDescription>Add a user to this reseller account.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} class="space-y-4">
					<TextField value={userId()} onChange={(v) => setUserId(v)}>
						<TextFieldLabel>User ID</TextFieldLabel>
						<TextFieldInput placeholder="UUID of the user" />
					</TextField>

					<div>
						<label class="mb-1.5 block text-sm font-medium" for="role-select">
							Role
						</label>
						<select
							id="role-select"
							value={role()}
							onChange={(e) => setRole(e.currentTarget.value)}
							class="w-full rounded-md border bg-background px-3 py-2 text-sm"
						>
							<option value="admin">Admin</option>
							<option value="viewer">Viewer</option>
						</select>
					</div>

					<Show when={error()}>
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
					</Show>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting()}>
							{submitting() ? "Adding..." : "Add"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Branding tab
// ---------------------------------------------------------------------------

function BrandingTab(props: { reseller: ResellerResponse }) {
	const [appName, setAppName] = createSignal(props.reseller.app_name ?? "");
	const [logoUrl, setLogoUrl] = createSignal(props.reseller.logo_url ?? "");
	const [primaryColor, setPrimaryColor] = createSignal(props.reseller.primary_color ?? "");
	const [customDomain, setCustomDomain] = createSignal(props.reseller.custom_domain ?? "");
	const [supportEmail, setSupportEmail] = createSignal(props.reseller.support_email ?? "");
	const [supportUrl, setSupportUrl] = createSignal(props.reseller.support_url ?? "");
	const [saving, setSaving] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [success, setSuccess] = createSignal(false);

	const handleSave = async () => {
		setSaving(true);
		setError(null);
		setSuccess(false);

		const res = await apiFetch<{
			data: ResellerResponse & { detail?: string };
			status: number;
		}>(`/api/admin/resellers/${props.reseller.id}/branding`, {
			method: "PUT",
			body: JSON.stringify({
				app_name: appName() || null,
				logo_url: logoUrl() || null,
				primary_color: primaryColor() || null,
				custom_domain: customDomain() || null,
				support_email: supportEmail() || null,
				support_url: supportUrl() || null,
			}),
		});

		setSaving(false);

		if (res.status === 200) {
			setSuccess(true);
		} else {
			setError(res.data?.detail ?? "Failed to update branding");
		}
	};

	return (
		<div class="space-y-4">
			<TextField value={appName()} onChange={(v) => setAppName(v)}>
				<TextFieldLabel>App Name</TextFieldLabel>
				<TextFieldInput placeholder="My POS" />
			</TextField>

			<TextField value={logoUrl()} onChange={(v) => setLogoUrl(v)}>
				<TextFieldLabel>Logo URL</TextFieldLabel>
				<TextFieldInput placeholder="https://..." />
			</TextField>

			<TextField value={primaryColor()} onChange={(v) => setPrimaryColor(v)}>
				<TextFieldLabel>Primary Color</TextFieldLabel>
				<TextFieldInput placeholder="#3b82f6" />
			</TextField>

			<TextField value={customDomain()} onChange={(v) => setCustomDomain(v)}>
				<TextFieldLabel>Custom Domain</TextFieldLabel>
				<TextFieldInput placeholder="pos.acme.com" />
			</TextField>

			<div class="grid grid-cols-2 gap-4">
				<TextField value={supportEmail()} onChange={(v) => setSupportEmail(v)}>
					<TextFieldLabel>Support Email</TextFieldLabel>
					<TextFieldInput placeholder="support@acme.com" />
				</TextField>

				<TextField value={supportUrl()} onChange={(v) => setSupportUrl(v)}>
					<TextFieldLabel>Support URL</TextFieldLabel>
					<TextFieldInput placeholder="https://help.acme.com" />
				</TextField>
			</div>

			<Show when={error()}>
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
			</Show>

			<Show when={success()}>
				<div class="rounded-md bg-primary/10 p-3 text-sm text-primary">Branding updated.</div>
			</Show>

			<Button type="button" disabled={saving()} onClick={handleSave}>
				{saving() ? "Saving..." : "Save Branding"}
			</Button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Agreements tab
// ---------------------------------------------------------------------------

function AgreementsTab(props: { resellerId: string }) {
	const [agreements, setAgreements] = createSignal<AgreementResponse[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [createOpen, setCreateOpen] = createSignal(false);

	const fetchAgreements = async () => {
		const res = await apiFetch<{ data: AgreementResponse[]; status: number }>(
			`/api/admin/resellers/${props.resellerId}/agreements`,
		);
		if (res.status === 200) setAgreements(res.data);
		setLoading(false);
	};

	onMount(fetchAgreements);

	const handleCreated = (agreement: AgreementResponse) => {
		setAgreements((prev) => [...prev, agreement]);
	};

	return (
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium">{agreements().length} agreement(s)</p>
				<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
					+ Create
				</Button>
			</div>

			<Show when={!loading()} fallback={<div class="h-16 animate-pulse rounded-lg border" />}>
				<div class="space-y-2">
					<For each={agreements()}>
						{(agreement) => (
							<div class="rounded-lg border p-3 text-sm">
								<div class="flex items-center justify-between">
									<p class="font-medium">
										{agreement.effective_from} &mdash; {agreement.effective_until ?? "ongoing"}
									</p>
									<span class="text-muted-foreground">
										Rev {formatBps(agreement.revenue_share_bps)} / Sub{" "}
										{formatBps(agreement.subscription_share_bps)}
									</span>
								</div>
								<p class="mt-1 text-muted-foreground">Created {formatDate(agreement.created_at)}</p>
							</div>
						)}
					</For>
				</div>
			</Show>

			<CreateAgreementDialog
				open={createOpen()}
				onOpenChange={setCreateOpen}
				resellerId={props.resellerId}
				onCreated={handleCreated}
			/>
		</div>
	);
}

function CreateAgreementDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	resellerId: string;
	onCreated: (agreement: AgreementResponse) => void;
}) {
	const [effectiveFrom, setEffectiveFrom] = createSignal("");
	const [effectiveUntil, setEffectiveUntil] = createSignal("");
	const [revenueShareBps, setRevenueShareBps] = createSignal("1000");
	const [subscriptionShareBps, setSubscriptionShareBps] = createSignal("2000");
	const [minimumSpend, setMinimumSpend] = createSignal("0");
	const [submitting, setSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const reset = () => {
		setEffectiveFrom("");
		setEffectiveUntil("");
		setRevenueShareBps("1000");
		setSubscriptionShareBps("2000");
		setMinimumSpend("0");
		setError(null);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!effectiveFrom()) {
			setError("Effective from date is required.");
			return;
		}

		setSubmitting(true);
		setError(null);

		const res = await apiFetch<{
			data: AgreementResponse & { detail?: string };
			status: number;
		}>("/api/admin/reseller-agreements", {
			method: "POST",
			body: JSON.stringify({
				reseller_id: props.resellerId,
				effective_from: effectiveFrom(),
				effective_until: effectiveUntil() || null,
				revenue_share_bps: Number.parseInt(revenueShareBps(), 10) || 0,
				subscription_share_bps: Number.parseInt(subscriptionShareBps(), 10) || 0,
				minimum_spend_minor_unit: Number.parseInt(minimumSpend(), 10) || 0,
			}),
		});

		setSubmitting(false);

		if (res.status === 201) {
			props.onCreated(res.data);
			reset();
			props.onOpenChange(false);
		} else {
			setError(res.data?.detail ?? "Failed to create agreement");
		}
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!open) reset();
				props.onOpenChange(open);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Agreement</DialogTitle>
					<DialogDescription>Define revenue share terms for this reseller.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<TextField value={effectiveFrom()} onChange={(v) => setEffectiveFrom(v)}>
							<TextFieldLabel>Effective From</TextFieldLabel>
							<TextFieldInput type="date" />
						</TextField>
						<TextField value={effectiveUntil()} onChange={(v) => setEffectiveUntil(v)}>
							<TextFieldLabel>Effective Until (optional)</TextFieldLabel>
							<TextFieldInput type="date" />
						</TextField>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<TextField value={revenueShareBps()} onChange={(v) => setRevenueShareBps(v)}>
							<TextFieldLabel>Revenue share (bps)</TextFieldLabel>
							<TextFieldInput type="number" min="0" />
						</TextField>
						<TextField value={subscriptionShareBps()} onChange={(v) => setSubscriptionShareBps(v)}>
							<TextFieldLabel>Subscription share (bps)</TextFieldLabel>
							<TextFieldInput type="number" min="0" />
						</TextField>
					</div>

					<TextField value={minimumSpend()} onChange={(v) => setMinimumSpend(v)}>
						<TextFieldLabel>Minimum spend (minor unit)</TextFieldLabel>
						<TextFieldInput type="number" min="0" />
					</TextField>

					<Show when={error()}>
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
					</Show>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting()}>
							{submitting() ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
