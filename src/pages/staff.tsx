import { createSignal, For, onMount, Show } from "solid-js";
import { customFetch } from "~/api/client";

interface StaffMember {
	id: string;
	name: string;
	role: string;
	is_active: boolean;
	created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
	Cashier: "Cashier",
	ShiftLead: "Shift Lead",
	Manager: "Manager",
	Admin: "Admin",
};

export function StaffPage() {
	const [staff, setStaff] = createSignal<StaffMember[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);

	onMount(async () => {
		const res = await customFetch<{
			data: StaffMember[] & { error?: string; message?: string };
			status: number;
		}>("/api/staff");
		if (res.status === 200) {
			setStaff(res.data);
		} else {
			setError(res.data?.error ?? res.data?.message ?? "Failed to load staff");
		}
		setLoading(false);
	});

	return (
		<div class="mx-auto max-w-2xl space-y-6">
			<div>
				<h2 class="text-2xl font-bold tracking-tight">Staff</h2>
				<p class="mt-1 text-sm text-muted-foreground">Your team members and their roles.</p>
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
				<Show when={staff().length === 0}>
					<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
						No staff members yet.
					</div>
				</Show>

				<div class="space-y-3">
					<For each={staff()}>
						{(member) => (
							<div class="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
								<div class="flex items-center gap-3">
									<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
										<span class="text-sm font-medium">{member.name.charAt(0).toUpperCase()}</span>
									</div>
									<div>
										<p class="font-semibold">{member.name}</p>
										<p class="text-sm text-muted-foreground">
											{ROLE_LABELS[member.role] ?? member.role}
										</p>
									</div>
								</div>
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium"
									classList={{
										"bg-primary/10 text-primary": member.is_active,
										"bg-muted text-muted-foreground": !member.is_active,
									}}
								>
									{member.is_active ? "Active" : "Inactive"}
								</span>
							</div>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}
