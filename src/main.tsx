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

initTelemetry();

function PageLoading() {
	return (
		<div class="flex min-h-[200px] items-center justify-center">
			<p class="text-muted-foreground">Loading...</p>
		</div>
	);
}

const rootRoute = createRootRoute({
	component: RootComponent,
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

function RootComponent() {
	return (
		<main class="min-h-screen bg-background">
			<Outlet />
		</main>
	);
}

function HomePage() {
	const { user, loading } = useAuth();
	const navigate = useNavigate();

	createEffect(() => {
		if (!loading() && !user()) {
			navigate({ to: "/login" });
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
				<AuthenticatedHome />
			</Show>
		</Show>
	);
}

function AuthenticatedHome() {
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
	getParentRoute: () => rootRoute,
	path: "/",
	component: HomePage,
});

const setupBusinessRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup/business",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupBusinessPage />
		</Suspense>
	),
});

const setupStaffRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup/staff",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupStaffPage />
		</Suspense>
	),
});

const setupTaxRatesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup/tax-rates",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupTaxRatesPage />
		</Suspense>
	),
});

const setupMenuRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup/menu",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupMenuPage />
		</Suspense>
	),
});

const setupSummaryRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup/summary",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SetupSummaryPage />
		</Suspense>
	),
});

function DashboardMenu() {
	return (
		<DashboardLayout title="Menu">
			<MenuPage />
		</DashboardLayout>
	);
}

const menuRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/menu",
	component: DashboardMenu,
});

function DashboardMenus() {
	return (
		<DashboardLayout title="Menus">
			<MenusPage />
		</DashboardLayout>
	);
}

const menusRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/menus",
	component: DashboardMenus,
});

function DashboardDevices() {
	return (
		<DashboardLayout title="Devices">
			<DevicesPage />
		</DashboardLayout>
	);
}

const devicesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/devices",
	component: DashboardDevices,
});

function DashboardStaff() {
	return (
		<DashboardLayout title="Staff">
			<StaffPage />
		</DashboardLayout>
	);
}

const staffRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/staff",
	component: DashboardStaff,
});

function DashboardLocations() {
	return (
		<DashboardLayout title="Locations">
			<LocationsPage />
		</DashboardLayout>
	);
}

const locationsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/locations",
	component: DashboardLocations,
});

function DashboardTaxRates() {
	return (
		<DashboardLayout title="Tax Rates">
			<TaxRatesPage />
		</DashboardLayout>
	);
}

const taxRatesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tax-rates",
	component: DashboardTaxRates,
});

function DashboardApiTokens() {
	return (
		<DashboardLayout title="API Tokens">
			<ApiTokensPage />
		</DashboardLayout>
	);
}

const apiTokensRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/api-tokens",
	component: DashboardApiTokens,
});

function DashboardProfile() {
	return (
		<DashboardLayout title="Profile">
			<ProfilePage />
		</DashboardLayout>
	);
}

const profileRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/profile",
	component: DashboardProfile,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<LoginPage />
		</Suspense>
	),
});

const signUpRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/sign-up",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<SignUpPage />
		</Suspense>
	),
});

const forgotPasswordRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/forgot-password",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<ForgotPasswordPage />
		</Suspense>
	),
});

const resetPasswordRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/reset-password",
	component: () => (
		<Suspense fallback={<PageLoading />}>
			<ResetPasswordPage />
		</Suspense>
	),
	validateSearch: (search: Record<string, unknown>) => ({
		token: (search.token as string) ?? "",
	}),
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	loginRoute,
	signUpRoute,
	forgotPasswordRoute,
	resetPasswordRoute,
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
				<AuthProvider>
					<WizardProvider>
						<RouterProvider router={router} />
					</WizardProvider>
				</AuthProvider>
			</ErrorBoundary>
		),
		rootElement,
	);
}
