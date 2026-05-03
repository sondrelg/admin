import {
	createRootRoute,
	createRoute,
	createRouter,
	Link,
	Outlet,
	RouterProvider,
	useNavigate,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import "solid-devtools";
import { createEffect, ErrorBoundary, lazy, Show, Suspense } from "solid-js";
import { setupApiClient } from "~/api/setup-client";
import { DashboardLayout } from "~/components/dashboard-layout";
import { PasskeyPrompt } from "~/components/passkey-prompt";
import { ErrorFallback } from "~/components/ui/error-fallback";
import { AuthProvider, useAuth } from "~/contexts/auth-context";
import { useWizard, WizardProvider } from "~/contexts/wizard-context";
import { initTelemetry } from "~/telemetry";
import "./styles.css";

// Lazy-loaded page components
const ApiTokensPage = lazy(() => import("~/pages/api-tokens"));
const DevicesPage = lazy(() => import("~/pages/devices"));
const ForgotPasswordPage = lazy(() => import("~/pages/forgot-password"));
const LocationsPage = lazy(() => import("~/pages/locations"));
const LoginPage = lazy(() => import("~/pages/login"));
const MenuPage = lazy(() => import("~/pages/menu"));
const MenusPage = lazy(() => import("~/pages/menus"));
const ProfilePage = lazy(() => import("~/pages/profile"));
const ResetPasswordPage = lazy(() => import("~/pages/reset-password"));
const SignUpPage = lazy(() => import("~/pages/sign-up"));
const StaffPage = lazy(() => import("~/pages/staff"));
const TaxRatesPage = lazy(() => import("~/pages/tax-rates"));
const SetupBusinessPage = lazy(() => import("~/pages/setup/business"));
const SetupStaffPage = lazy(() => import("~/pages/setup/staff"));
const SetupTaxRatesPage = lazy(() => import("~/pages/setup/tax-rates"));
const SetupMenuPage = lazy(() => import("~/pages/setup/menu"));
const SetupSummaryPage = lazy(() => import("~/pages/setup/summary"));

function PageLoading() {
	return (
		<div class="flex min-h-[200px] items-center justify-center">
			<p class="text-muted-foreground">Loading...</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const rootRoute = createRootRoute({
	component: () => (
		<main class="min-h-screen bg-background">
			<Outlet />
		</main>
	),
	errorComponent: (props) => <ErrorFallback error={props.error} reset={props.reset} fullPage />,
	notFoundComponent: () => (
		<div class="p-4">
			<p class="text-lg">Page not found</p>
			<Link to="/" class="text-primary underline">
				Go home
			</Link>
		</div>
	),
});

// ---------------------------------------------------------------------------
// Public layout — no auth check, renders immediately
// ---------------------------------------------------------------------------

const publicLayout = createRoute({
	getParentRoute: () => rootRoute,
	id: "public",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<Outlet />
		</Suspense>
	),
});

const loginRoute = createRoute({
	getParentRoute: () => publicLayout,
	path: "/login",
	component: () => <LoginPage />,
});

const signUpRoute = createRoute({
	getParentRoute: () => publicLayout,
	path: "/sign-up",
	component: () => <SignUpPage />,
});

const forgotPasswordRoute = createRoute({
	getParentRoute: () => publicLayout,
	path: "/forgot-password",
	component: () => <ForgotPasswordPage />,
});

const resetPasswordRoute = createRoute({
	getParentRoute: () => publicLayout,
	path: "/reset-password",
	component: () => <ResetPasswordPage />,
	validateSearch: (search: Record<string, unknown>) => ({
		token: (search.token as string) ?? "",
	}),
});

// ---------------------------------------------------------------------------
// Authed layout — guards routes, triggers auth check
// ---------------------------------------------------------------------------

function AuthedLayout() {
	setupApiClient();
	initTelemetry();

	return (
		<AuthProvider>
			<WizardProvider>
				<AuthGuard />
			</WizardProvider>
		</AuthProvider>
	);
}

function AuthGuard() {
	const { user, loading, checkAuth } = useAuth();
	const navigate = useNavigate();
	let redirectedToLogin = false;

	checkAuth();

	createEffect(() => {
		if (!loading() && !user() && !redirectedToLogin) {
			redirectedToLogin = true;
			navigate({ to: "/login", replace: true });
		}
	});

	return (
		<Show
			when={!loading()}
			fallback={
				<div class="flex min-h-screen items-center justify-center">
					<p class="text-muted-foreground">Loading...</p>
				</div>
			}
		>
			<Show when={user()}>
				<Outlet />
			</Show>
		</Show>
	);
}

const authedLayout = createRoute({
	getParentRoute: () => rootRoute,
	id: "authed",
	component: AuthedLayout,
});

// ---------------------------------------------------------------------------
// Home (authed)
// ---------------------------------------------------------------------------

function HomePage() {
	const { user } = useAuth();
	const { state, isComplete } = useWizard();

	return (
		<Show
			when={isComplete()}
			fallback={
				<div class="flex min-h-screen items-center justify-center p-4">
					<div class="w-full max-w-md space-y-8 text-center">
						<h1 class="text-2xl font-bold tracking-tight">Welcome, {user()?.name}</h1>
						<p class="text-muted-foreground">Set up your point-of-sale system in a few minutes.</p>
						<Link
							to="/setup/business"
							class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
						>
							{state.tenant ? "Continue Setup" : "Get Started"}
						</Link>
					</div>
				</div>
			}
		>
			<DashboardLayout title={state.tenant?.name ?? "Dashboard"}>
				<div class="space-y-6">
					<PasskeyPrompt />
					<p class="text-muted-foreground">Your POS system is set up and ready.</p>
				</div>
			</DashboardLayout>
		</Show>
	);
}

const indexRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/",
	component: HomePage,
});

// ---------------------------------------------------------------------------
// Setup routes (authed)
// ---------------------------------------------------------------------------

const setupBusinessRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/setup/business",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupBusinessPage />
		</Suspense>
	),
});

const setupStaffRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/setup/staff",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupStaffPage />
		</Suspense>
	),
});

const setupTaxRatesRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/setup/tax-rates",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupTaxRatesPage />
		</Suspense>
	),
});

const setupMenuRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/setup/menu",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupMenuPage />
		</Suspense>
	),
});

const setupSummaryRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/setup/summary",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupSummaryPage />
		</Suspense>
	),
});

// ---------------------------------------------------------------------------
// Dashboard routes (authed)
// ---------------------------------------------------------------------------

const menuRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/menu",
	component: () => (
		<DashboardLayout title="Menu">
			<MenuPage />
		</DashboardLayout>
	),
});

const menusRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/menus",
	component: () => (
		<DashboardLayout title="Menus">
			<MenusPage />
		</DashboardLayout>
	),
});

const devicesRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/devices",
	component: () => (
		<DashboardLayout title="Devices">
			<DevicesPage />
		</DashboardLayout>
	),
});

const staffRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/staff",
	component: () => (
		<DashboardLayout title="Staff">
			<StaffPage />
		</DashboardLayout>
	),
});

const locationsRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/locations",
	component: () => (
		<DashboardLayout title="Locations">
			<LocationsPage />
		</DashboardLayout>
	),
});

const taxRatesRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/tax-rates",
	component: () => (
		<DashboardLayout title="Tax Rates">
			<TaxRatesPage />
		</DashboardLayout>
	),
});

const apiTokensRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/api-tokens",
	component: () => (
		<DashboardLayout title="API Tokens">
			<ApiTokensPage />
		</DashboardLayout>
	),
});

const profileRoute = createRoute({
	getParentRoute: () => authedLayout,
	path: "/profile",
	component: () => (
		<DashboardLayout title="Profile">
			<ProfilePage />
		</DashboardLayout>
	),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const routeTree = rootRoute.addChildren([
	publicLayout.addChildren([loginRoute, signUpRoute, forgotPasswordRoute, resetPasswordRoute]),
	authedLayout.addChildren([
		indexRoute,
		menuRoute,
		menusRoute,
		devicesRoute,
		staffRoute,
		locationsRoute,
		taxRatesRoute,
		apiTokensRoute,
		profileRoute,
		setupBusinessRoute,
		setupStaffRoute,
		setupTaxRatesRoute,
		setupMenuRoute,
		setupSummaryRoute,
	]),
]);

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
});

declare module "@tanstack/solid-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
	render(
		() => (
			<ErrorBoundary
				fallback={(err, reset) => <ErrorFallback error={err} reset={reset} fullPage />}
			>
				<RouterProvider router={router} />
			</ErrorBoundary>
		),
		rootElement,
	);
}
