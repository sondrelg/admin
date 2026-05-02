import { createContext, createSignal, type JSX, useContext } from "solid-js";
import { customFetch } from "~/api/client";

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	email_verified: boolean;
}

export interface AuthTenant {
	tenant_id: string;
	role: string;
}

interface AuthContextValue {
	user: () => AuthUser | null;
	tenants: () => AuthTenant[];
	loading: () => boolean;
	signOut: () => Promise<void>;
	refreshMe: () => Promise<void>;
	/** Fetch /api/auth/me once. No-ops on subsequent calls. Used by AuthGuard. */
	checkAuth: () => void;
}

const AuthContext = createContext<AuthContextValue>();

export function AuthProvider(props: { children: JSX.Element }) {
	const [user, setUser] = createSignal<AuthUser | null>(null);
	const [tenants, setTenants] = createSignal<AuthTenant[]>([]);
	const [loading, setLoading] = createSignal(true);
	let checked = false;

	async function refreshMe() {
		try {
			const res = await customFetch<{
				data: { user: AuthUser; tenants: AuthTenant[] };
				status: number;
			}>("/api/auth/me");

			if (res.status === 200) {
				setUser(res.data.user);
				setTenants(res.data.tenants);
			} else {
				setUser(null);
				setTenants([]);
			}
		} catch {
			setUser(null);
			setTenants([]);
		}
	}

	function checkAuth() {
		if (checked) return;
		checked = true;
		refreshMe().then(() => setLoading(false));
	}

	async function signOut() {
		await customFetch("/api/auth/sign-out", { method: "POST" });
		setUser(null);
		setTenants([]);
	}

	const ctx: AuthContextValue = {
		user,
		tenants,
		loading,
		signOut,
		refreshMe,
		checkAuth,
	};

	return <AuthContext.Provider value={ctx}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
