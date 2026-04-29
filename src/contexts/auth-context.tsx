import { createContext, createSignal, type JSX, onMount, useContext } from "solid-js";
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
	signUp: (email: string, password: string, name: string) => Promise<string | null>;
	signIn: (email: string, password: string) => Promise<string | null>;
	signOut: () => Promise<void>;
	refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>();

export function AuthProvider(props: { children: JSX.Element }) {
	const [user, setUser] = createSignal<AuthUser | null>(null);
	const [tenants, setTenants] = createSignal<AuthTenant[]>([]);
	const [loading, setLoading] = createSignal(true);

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

	onMount(async () => {
		await refreshMe();
		setLoading(false);
	});

	async function signUp(email: string, password: string, name: string): Promise<string | null> {
		const res = await customFetch<{
			data: { user?: AuthUser; error?: string; message?: string };
			status: number;
		}>("/api/auth/sign-up", {
			method: "POST",
			body: JSON.stringify({ email, password, name }),
		});

		if (res.status === 201) {
			if (res.data.user) setUser(res.data.user);
			return null;
		}

		return res.data?.error ?? res.data?.message ?? "Sign up failed";
	}

	async function signIn(email: string, password: string): Promise<string | null> {
		const res = await customFetch<{
			data: { user?: AuthUser; error?: string; message?: string };
			status: number;
		}>("/api/auth/sign-in", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});

		if (res.status === 200) {
			if (res.data.user) setUser(res.data.user);
			return null;
		}

		return res.data?.error ?? res.data?.message ?? "Sign in failed";
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
