import { createContext, createSignal, type JSX, onMount, useContext } from "solid-js";
import { customFetch, setAuthToken } from "~/api/client";

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
	signUp: (email: string, password: string, name: string) => Promise<string | null>;
	signIn: (email: string, password: string) => Promise<string | null>;
	signOut: () => Promise<void>;
	refreshMe: () => Promise<void>;
}

const AUTH_STORAGE_KEY = "smls_auth_token";

const AuthContext = createContext<AuthContextValue>();

export function AuthProvider(props: { children: JSX.Element }) {
	const [user, setUser] = createSignal<AuthUser | null>(null);
	const [tenants, setTenants] = createSignal<AuthTenant[]>([]);
	const [loading, setLoading] = createSignal(true);

	function saveToken(token: string | null) {
		setAuthToken(token);
		if (token) {
			localStorage.setItem(AUTH_STORAGE_KEY, token);
		} else {
			localStorage.removeItem(AUTH_STORAGE_KEY);
		}
	}

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
				saveToken(null);
			}
		} catch {
			setUser(null);
			setTenants([]);
			saveToken(null);
		}
	}

	onMount(async () => {
		const stored = localStorage.getItem(AUTH_STORAGE_KEY);
		if (stored) {
			setAuthToken(stored);
			await refreshMe();
		}
		setLoading(false);
	});

	async function signUp(email: string, password: string, name: string): Promise<string | null> {
		const res = await customFetch<{
			data: { token?: string; user?: AuthUser; error?: string; message?: string };
			status: number;
		}>("/api/auth/sign-up", {
			method: "POST",
			body: JSON.stringify({ email, password, name }),
		});

		if (res.status === 201 && res.data.token) {
			saveToken(res.data.token);
			if (res.data.user) setUser(res.data.user);
			return null;
		}

		return res.data?.error ?? res.data?.message ?? "Sign up failed";
	}

	async function signIn(email: string, password: string): Promise<string | null> {
		const res = await customFetch<{
			data: { token?: string; user?: AuthUser; error?: string; message?: string };
			status: number;
		}>("/api/auth/sign-in", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});

		if (res.status === 200 && res.data.token) {
			saveToken(res.data.token);
			if (res.data.user) setUser(res.data.user);
			return null;
		}

		return res.data?.error ?? res.data?.message ?? "Sign in failed";
	}

	async function signOut() {
		await customFetch("/api/auth/sign-out", { method: "POST" });
		saveToken(null);
		setUser(null);
		setTenants([]);
	}

	const ctx: AuthContextValue = {
		user,
		tenants,
		loading,
		signUp,
		signIn,
		signOut,
		refreshMe,
	};

	return <AuthContext.Provider value={ctx}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
