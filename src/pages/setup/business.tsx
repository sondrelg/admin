import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createSignal, Show } from "solid-js";
import { customFetch, setTenantId } from "~/api/client";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { WizardLayout } from "~/components/wizard/wizard-layout";
import { useWizard } from "~/contexts/wizard-context";
import { slugify } from "~/lib/slug";

export default function BusinessPage() {
	const navigate = useNavigate();
	const { state, setTenant, setLocation, reset } = useWizard();

	const [businessName, setBusinessName] = createSignal(state.tenant?.name ?? "");
	const [slug, setSlug] = createSignal(state.tenant?.slug ?? "");
	const [slugTouched, setSlugTouched] = createSignal(false);
	const [locationName, setLocationName] = createSignal(state.location?.name ?? "");
	const [address, setAddress] = createSignal("");
	const [city, setCity] = createSignal("");
	const [postalCode, setPostalCode] = createSignal("");
	const [orgNumber, setOrgNumber] = createSignal("");

	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
	const POSTAL_RE = /^\d{4}$/;

	const slugValid = () => {
		const s = slug();
		return s.length >= 2 && SLUG_RE.test(s);
	};

	// Auto-generate slug from business name
	createEffect(() => {
		if (!slugTouched()) {
			setSlug(slugify(businessName()));
		}
	});

	// Auto-fill location name from business name
	createEffect(() => {
		if (!state.location) {
			setLocationName(businessName());
		}
	});

	const validate = (): string | null => {
		if (!businessName().trim()) return "Business name is required.";
		if (!slugValid())
			return "Slug must be lowercase letters, digits, and hyphens (at least 2 characters, cannot start or end with a hyphen).";
		if (!locationName().trim()) return "Location name is required.";
		if (!address() || address().length < 2) return "Address is required (at least 2 characters).";
		if (!postalCode() || !POSTAL_RE.test(postalCode()))
			return "Postal code must be exactly 4 digits.";
		if (!city() || city().length < 2) return "City is required (at least 2 characters).";
		if (!orgNumber() || orgNumber().length !== 9) return "Org. number must be exactly 9 digits.";
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
			// Step 1: Create tenant (skip if already created and still exists)
			let tenantId = state.tenant?.id;
			if (tenantId) {
				const checkRes = await customFetch<{ status: number }>(`/api/tenants/${tenantId}`);
				if (checkRes.status === 404) {
					// Tenant was deleted (e.g. DB reset) — clear stale state
					reset();
					tenantId = undefined;
				}
			}
			if (!tenantId) {
				const tenantRes = await customFetch<{
					data: { id: string; name: string; slug: string; error?: string; message?: string };
					status: number;
				}>("/api/tenants", {
					method: "POST",
					body: JSON.stringify({
						name: businessName(),
						slug: slug(),
					}),
				});

				if (tenantRes.status !== 201) {
					const msg = tenantRes.data?.error ?? tenantRes.data?.message ?? "";
					if (tenantRes.status === 409 || msg.includes("slug")) {
						setError(`Slug "${slug()}" is already taken.`);
					} else {
						setError(msg || "Failed to create tenant");
					}
					return;
				}

				tenantId = tenantRes.data.id;
				setTenant({ id: tenantId, name: tenantRes.data.name, slug: tenantRes.data.slug });
			}

			// Set tenant ID for subsequent API calls
			setTenantId(tenantId);

			// Step 2: Create location (skip if already created)
			if (!state.location) {
				const locRes = await customFetch<{
					data: { id: string; name: string; error?: string; message?: string };
					status: number;
				}>("/api/locations", {
					method: "POST",
					body: JSON.stringify({
						name: locationName(),
						address: address(),
						city: city(),
						postal_code: postalCode(),
						org_number: orgNumber() || undefined,
					}),
				});

				if (locRes.status !== 201) {
					setError(locRes.data?.error ?? locRes.data?.message ?? "Failed to create location");
					return;
				}

				setLocation({ id: locRes.data.id, name: locRes.data.name });
			}

			navigate({ to: "/setup/staff" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "An unexpected error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<WizardLayout
			step={1}
			title="Your Business"
			description="Tell us about your business. We'll set up your account and first location."
		>
			<form onSubmit={handleSubmit} class="space-y-6">
				<div class="rounded-xl border bg-card p-6 shadow-sm">
					<h2 class="mb-4 text-lg font-semibold">Account</h2>
					<div class="space-y-4">
						<TextField value={businessName()} onChange={(v) => setBusinessName(v)}>
							<TextFieldLabel>Business Name</TextFieldLabel>
							<TextFieldInput placeholder="Oslo Kaffebrenneri" />
						</TextField>

						<TextField
							value={slug()}
							onChange={(v) => {
								setSlugTouched(true);
								setSlug(slugify(v));
							}}
						>
							<TextFieldLabel>URL Slug</TextFieldLabel>
							<TextFieldInput placeholder="oslo-kaffebrenneri" />
							<p class="mt-1 text-xs text-muted-foreground">
								Your unique identifier: <span class="font-mono">{slug() || "..."}</span>
							</p>
						</TextField>
					</div>
				</div>

				<div class="rounded-xl border bg-card p-6 shadow-sm">
					<h2 class="mb-4 text-lg font-semibold">First Location</h2>
					<div class="space-y-4">
						<TextField value={locationName()} onChange={(v) => setLocationName(v)}>
							<TextFieldLabel>Location Name</TextFieldLabel>
							<TextFieldInput placeholder="Hovedkontor" />
						</TextField>

						<TextField value={address()} onChange={(v) => setAddress(v)}>
							<TextFieldLabel>Address</TextFieldLabel>
							<TextFieldInput placeholder="Karl Johans gate 1" />
						</TextField>

						<div class="grid grid-cols-2 gap-4">
							<TextField
								value={postalCode()}
								onChange={(v) => setPostalCode(v.replaceAll(/\D/g, "").slice(0, 4))}
							>
								<TextFieldLabel>Postal Code</TextFieldLabel>
								<TextFieldInput placeholder="0154" inputMode="numeric" maxLength={4} />
							</TextField>

							<TextField value={city()} onChange={(v) => setCity(v)}>
								<TextFieldLabel>City</TextFieldLabel>
								<TextFieldInput placeholder="Oslo" />
							</TextField>
						</div>

						<TextField
							value={orgNumber()}
							onChange={(v) => setOrgNumber(v.replaceAll(/\D/g, "").slice(0, 9))}
						>
							<TextFieldLabel>Org. Number</TextFieldLabel>
							<TextFieldInput placeholder="123456789" inputMode="numeric" maxLength={9} />
						</TextField>
					</div>
				</div>

				<Show when={error()}>
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
				</Show>

				<div class="flex justify-end">
					<Button type="submit" disabled={isSubmitting()}>
						{isSubmitting() ? "Creating..." : "Next"}
					</Button>
				</div>
			</form>
		</WizardLayout>
	);
}
