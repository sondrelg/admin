import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { setCompanyId, setTenantId } from "~/api/client";
import { searchAddresses } from "~/api/generated/sdk.gen";
import type { AddressSuggestionResponse } from "~/api/generated/types.gen";
import { apiFetch } from "~/api/request";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { WizardLayout } from "~/components/wizard/wizard-layout";
import { useWizard } from "~/contexts/wizard-context";
import { slugify } from "~/lib/slug";

export default function BusinessPage() {
	const navigate = useNavigate();
	const { state, setTenant, setCompany, setLocation, setSetupBusinessDraft, reset } = useWizard();

	const [businessName, setBusinessName] = createSignal(state.tenant?.name ?? "");
	const slug = createMemo(() => slugify(businessName()));
	const [locationName, setLocationName] = createSignal(
		state.location?.name ?? state.setupBusinessDraft.locationName,
	);
	const [locationNameTouched, setLocationNameTouched] = createSignal(!!state.location?.name);
	const [address, setAddress] = createSignal(state.setupBusinessDraft.address);
	const [city, setCity] = createSignal(state.setupBusinessDraft.city);
	const [postalCode, setPostalCode] = createSignal(state.setupBusinessDraft.postalCode);
	const [orgNumber, setOrgNumber] = createSignal(state.setupBusinessDraft.orgNumber);
	const [coordinates, setCoordinates] = createSignal<{
		latitude: number;
		longitude: number;
	} | null>(null);
	const [addressSuggestions, setAddressSuggestions] = createSignal<AddressSuggestionResponse[]>([]);
	const [isSearchingAddress, setIsSearchingAddress] = createSignal(false);
	const [isAddressInputFocused, setIsAddressInputFocused] = createSignal(false);
	let latestAddressSearchRequestId = 0;
	let addressBlurTimeoutId: ReturnType<typeof setTimeout> | undefined;

	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	let orgNumberInputRef: HTMLInputElement | undefined;

	const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

	const slugValid = () => {
		const s = slug();
		return s.length >= 2 && SLUG_RE.test(s);
	};

	// Auto-fill location name from business name until user edits it
	createEffect(() => {
		if (!state.location && !locationNameTouched()) {
			setLocationName(businessName());
		}
	});

	createEffect(() => {
		setSetupBusinessDraft({
			address: address(),
			city: city(),
			locationName: locationName(),
			orgNumber: orgNumber(),
			postalCode: postalCode(),
		});
	});

	createEffect(() => {
		const query = address().trim();
		if (!isAddressInputFocused() || query.length < 4) {
			setIsSearchingAddress(false);
			return;
		}

		const requestId = ++latestAddressSearchRequestId;
		setIsSearchingAddress(true);
		const timeoutId = setTimeout(async () => {
			try {
				const { data } = await searchAddresses({ query: { q: query, limit: 5 } });
				if (requestId !== latestAddressSearchRequestId) return;
				setAddressSuggestions(data?.addresses ?? []);
			} catch {
				if (requestId !== latestAddressSearchRequestId) return;
				setAddressSuggestions([]);
			} finally {
				if (requestId === latestAddressSearchRequestId) {
					setIsSearchingAddress(false);
				}
			}
		}, 450);

		return () => {
			clearTimeout(timeoutId);
		};
	});

	const locationFieldsStarted = createMemo(
		() =>
			!!locationName().trim() ||
			!!address().trim() ||
			!!postalCode().trim() ||
			!!city().trim() ||
			!!orgNumber().trim(),
	);

	const canContinue = createMemo(() => !!businessName().trim() && slugValid());

	const validate = (): string | null => {
		if (!businessName().trim() || !slugValid()) {
			return "Business name and valid slug are required.";
		}

		if (!locationFieldsStarted()) {
			return null;
		}

		if (!locationName().trim() || !address().trim()) {
			return "To create a location, fill in location name and address.";
		}
		if (!/^\d{4}$/.test(postalCode())) {
			return "Postal code must be exactly 4 digits.";
		}
		if (city().trim().length < 2) {
			return "City must be at least 2 characters.";
		}
		return null;
	};

	const applyAddressSuggestion = (suggestion: AddressSuggestionResponse) => {
		setAddress(suggestion.address_text);
		if (typeof suggestion.lat === "number" && typeof suggestion.lon === "number") {
			setCoordinates({ latitude: suggestion.lat, longitude: suggestion.lon });
		} else {
			setCoordinates(null);
		}
		if (suggestion.postal_code) {
			setPostalCode(suggestion.postal_code.replaceAll(/\D/g, "").slice(0, 4));
		}
		if (suggestion.postal_place) {
			setCity(suggestion.postal_place);
		}
		setAddressSuggestions([]);

		queueMicrotask(() => {
			orgNumberInputRef?.focus();
		});
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
				// Verify tenant still exists AND we have access by hitting a tenant-scoped endpoint
				setTenantId(tenantId);
				const checkRes = await apiFetch<{ status: number }>("/api/companies");
				if (checkRes.status === 401 || checkRes.status === 404) {
					// Tenant was deleted or access lost (e.g. DB reset) — clear stale state
					reset();
					tenantId = undefined;
				}
			}
			if (!tenantId) {
				const tenantRes = await apiFetch<{
					data: { id: string; name: string; error?: string; message?: string };
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
						setError(
							"A similar business identifier already exists. Try a slightly different business name.",
						);
					} else {
						setError(msg || "Failed to create tenant");
					}
					return;
				}

				tenantId = tenantRes.data.id;
				setTenant({ id: tenantId, name: tenantRes.data.name });
			}

			// Set tenant ID for subsequent API calls
			setTenantId(tenantId);

			// Step 2: Create company (skip if already created and still exists)
			let companyId = state.company?.id;
			if (companyId) {
				const checkRes = await apiFetch<{ status: number }>(`/api/companies/${companyId}`);
				if (checkRes.status === 404) {
					companyId = undefined;
				}
			}
			if (!companyId) {
				const companyRes = await apiFetch<{
					data: { id: string; name: string; error?: string; message?: string };
					status: number;
				}>("/api/companies", {
					method: "POST",
					body: JSON.stringify({
						name: businessName(),
						org_number: orgNumber() || undefined,
						country: "NO",
						currency: "NOK",
					}),
				});

				if (companyRes.status !== 201) {
					setError(
						companyRes.data?.error ?? companyRes.data?.message ?? "Failed to create company",
					);
					return;
				}

				companyId = companyRes.data.id;
				setCompany({ id: companyId, name: companyRes.data.name });
			}

			// Set company ID for subsequent API calls
			setCompanyId(companyId);

			// Step 3: Create location only when details are provided
			if (!state.location && locationFieldsStarted()) {
				const locRes = await apiFetch<{
					data: { id: string; name: string; error?: string; message?: string };
					status: number;
				}>("/api/locations", {
					method: "POST",
					body: JSON.stringify({
						name: locationName(),
						address: address(),
						city: city(),
						postal_code: postalCode(),
						coordinates: coordinates(),
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
			description="Tell us about your business. Keep it simple — you can refine details later."
		>
			<form onSubmit={handleSubmit} class="space-y-6">
				<div class="rounded-xl border bg-card p-6 shadow-sm">
					<h2 class="mb-4 text-lg font-semibold">Account</h2>
					<div class="space-y-4">
						<TextField value={businessName()} onChange={(v) => setBusinessName(v)}>
							<TextFieldLabel>Business Name</TextFieldLabel>
							<TextFieldInput placeholder="Oslo Kaffebrenneri" />
						</TextField>
					</div>
				</div>

				<div class="rounded-xl border bg-card p-6 shadow-sm">
					<h2 class="mb-4 text-lg font-semibold">First Location</h2>
					<div class="space-y-4">
						<TextField
							value={locationName()}
							onChange={(v) => {
								setLocationNameTouched(true);
								setLocationName(v);
							}}
						>
							<TextFieldLabel>Location Name</TextFieldLabel>
							<TextFieldInput placeholder="Hovedkontor" />
						</TextField>

						<div class="relative">
							<TextField
								value={address()}
								onChange={(v) => {
									setAddress(v);
									setCoordinates(null);
								}}
							>
								<TextFieldLabel>Address</TextFieldLabel>
								<TextFieldInput
									placeholder="Karl Johans gate 1"
									autocomplete="street-address"
									data-1p-ignore="true"
									data-lpignore="true"
									onFocus={() => {
										if (addressBlurTimeoutId) {
											clearTimeout(addressBlurTimeoutId);
										}
										setIsAddressInputFocused(true);
									}}
									onBlur={() => {
										addressBlurTimeoutId = setTimeout(() => {
											setIsAddressInputFocused(false);
										}, 120);
									}}
								/>
								<Show when={isSearchingAddress()}>
									<p class="mt-1 text-xs text-muted-foreground">Searching addresses…</p>
								</Show>
							</TextField>

							<Show when={isAddressInputFocused() && addressSuggestions().length > 0}>
								<div class="absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border bg-background shadow-md">
									<For each={addressSuggestions()}>
										{(suggestion) => (
											<button
												type="button"
												class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
												onClick={() => applyAddressSuggestion(suggestion)}
											>
												<span>{suggestion.address_text}</span>
												<span class="text-xs text-muted-foreground">
													{suggestion.postal_code ?? ""} {suggestion.postal_place ?? ""}
												</span>
											</button>
										)}
									</For>
								</div>
							</Show>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
							<TextFieldLabel>Org. Number (optional)</TextFieldLabel>
							<TextFieldInput
								ref={(el) => {
									orgNumberInputRef = el;
								}}
								placeholder="123456789"
								inputMode="numeric"
								maxLength={9}
							/>
						</TextField>
					</div>
				</div>

				<Show when={error()}>
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error()}</div>
				</Show>

				<div class="flex justify-end">
					<Button type="submit" disabled={isSubmitting() || !canContinue()}>
						{isSubmitting() ? "Creating..." : "Next"}
					</Button>
				</div>
			</form>
		</WizardLayout>
	);
}
