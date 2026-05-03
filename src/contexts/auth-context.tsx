import { createContext, createSignal, type JSX, useContext } from "solid-js";
import { signOut as apiSignOut, me } from "~/api/generated/sdk.gen";
import type { UserSummary, UserTenant } from "~/api/generated/types.gen";

export type { UserSummary as AuthUser, UserTenant as AuthTenant };

interface AuthContextValue {
	user: () => UserSummary | null;
	tenants: () => UserTenant[];
	loading: () => boolean;
	signOut: () => Promise<void>;
	refreshMe: () => Promise<void>;
	/** Fetch /api/auth/me once. No-ops on subsequent calls. Used by AuthGuard. */
	checkAuth: () => void;
}

const AuthContext = createContext<AuthContextValue>();

export function AuthProvider(props: { children: JSX.Element }) {
	const [user, setUser] = createSignal<UserSummary | null>(null);
	const [tenants, setTenants] = createSignal<UserTenant[]>([]);
	const [loading, setLoading] = createSignal(true);
	let checked = false;

	async function refreshMe() {
		try {
			const { data } = await me();

			if (data) {
				setUser(data.user);
				setTenants(data.tenants);
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

	function signOut(): Promise<void> {
		setUser(null);
		setTenants([]);

		void apiSignOut().catch(() => {
			// ignore network/server errors during sign-out; user is already signed out locally
		});

		return Promise.resolve();
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
