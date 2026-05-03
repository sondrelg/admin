// TODO: Make the wizard remember state when navigating back and forwards between steps
import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	type JSX,
	useContext,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { setTenantId } from "~/api/client";

export interface WizardTenant {
	id: string;
	name: string;
}

export interface WizardLocation {
	id: string;
	name: string;
}

export interface WizardStaff {
	id: string;
	name: string;
}

export interface WizardTaxRate {
	id: string;
	name: string;
	eatInRateBps: number;
	takeAwayRateBps: number;
}

export interface WizardCategory {
	id: string;
	name: string;
}

export interface SetupBusinessDraft {
	address: string;
	city: string;
	locationName: string;
	orgNumber: string;
	postalCode: string;
}

export interface WizardState {
	tenant: WizardTenant | null;
	location: WizardLocation | null;
	staff: WizardStaff | null;
	taxRates: WizardTaxRate[];
	categories: WizardCategory[];
	menuItemCount: number;
	registerId: string | null;
	setupBusinessDraft: SetupBusinessDraft;
}

const STORAGE_KEY = "smls_wizard_state";

function loadState(): WizardState {
	const fallback = defaultState();

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return fallback;

		const parsed = JSON.parse(raw) as Partial<WizardState>;
		return {
			...fallback,
			...parsed,
			setupBusinessDraft: {
				...fallback.setupBusinessDraft,
				...parsed.setupBusinessDraft,
			},
		};
	} catch {
		// ignore
	}
	return fallback;
}

function defaultState(): WizardState {
	return {
		tenant: null,
		location: null,
		staff: null,
		taxRates: [],
		categories: [],
		menuItemCount: 0,
		registerId: null,
		setupBusinessDraft: {
			address: "",
			city: "",
			locationName: "",
			orgNumber: "",
			postalCode: "",
		},
	};
}

interface WizardContextValue {
	state: WizardState;
	setTenant: (tenant: WizardTenant) => void;
	setLocation: (location: WizardLocation) => void;
	setStaff: (staff: WizardStaff) => void;
	setTaxRates: (rates: WizardTaxRate[]) => void;
	setCategories: (cats: WizardCategory[]) => void;
	setMenuItemCount: (count: number) => void;
	setRegisterId: (id: string) => void;
	setSetupBusinessDraft: (draft: SetupBusinessDraft) => void;
	reset: () => void;
	isComplete: Accessor<boolean>;
}

const WizardContext = createContext<WizardContextValue>();

export function WizardProvider(props: { children: JSX.Element }) {
	const initial = loadState();
	if (initial.tenant) {
		setTenantId(initial.tenant.id);
	}
	const [state, setState] = createStore<WizardState>(initial);
	const [isComplete, setIsComplete] = createSignal(false);

	createEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	});

	createEffect(() => {
		setIsComplete(state.registerId !== null);
	});

	const ctx: WizardContextValue = {
		get state() {
			return state;
		},
		setTenant: (tenant) => {
			setState("tenant", tenant);
			setTenantId(tenant.id);
		},
		setLocation: (location) => setState("location", location),
		setStaff: (staff) => setState("staff", staff),
		setTaxRates: (rates) => setState("taxRates", rates),
		setCategories: (cats) => setState("categories", cats),
		setMenuItemCount: (count) => setState("menuItemCount", count),
		setRegisterId: (id) => setState("registerId", id),
		setSetupBusinessDraft: (draft) => setState("setupBusinessDraft", draft),
		reset: () => {
			localStorage.removeItem(STORAGE_KEY);
			setState(reconcile(defaultState()));
			setTenantId(null);
		},
		isComplete,
	};

	return <WizardContext.Provider value={ctx}>{props.children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
	const ctx = useContext(WizardContext);
	if (!ctx) throw new Error("useWizard must be used within WizardProvider");
	return ctx;
}
