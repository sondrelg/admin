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
import { createEffect, ErrorBoundary, Show } from "solid-js";
import { DashboardLayout } from "~/components/dashboard-layout";
import { ErrorFallback } from "~/components/ui/error-fallback";
import { AuthProvider, useAuth } from "~/contexts/auth-context";
import { useWizard, WizardProvider } from "~/contexts/wizard-context";
import { DevicesPage } from "~/pages/devices";
import { LocationsPage } from "~/pages/locations";
import { LoginPage } from "~/pages/login";
import { MenuPage } from "~/pages/menu";
import { MenusPage } from "~/pages/menus";
import { BusinessPage } from "~/pages/setup/business";
import { MenuPage as SetupMenuPage } from "~/pages/setup/menu";
import { StaffPage as SetupStaffPage } from "~/pages/setup/staff";
import { SummaryPage } from "~/pages/setup/summary";
import { TaxRatesPage as SetupTaxRatesPage } from "~/pages/setup/tax-rates";
import { SignUpPage } from "~/pages/sign-up";
import { StaffPage } from "~/pages/staff";
import { TaxRatesPage } from "~/pages/tax-rates";
import "./styles.css";

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
				<p class="text-muted-foreground">Your POS system is set up and ready.</p>
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
	component: BusinessPage,
});

const setupStaffRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup/staff",
	component: SetupStaffPage,
});

const setupTaxRatesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup/tax-rates",
	component: SetupTaxRatesPage,
});

const setupMenuRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup/menu",
	component: SetupMenuPage,
});

const setupSummaryRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup/summary",
	component: SummaryPage,
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

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	component: LoginPage,
});

const signUpRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/sign-up",
	component: SignUpPage,
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	loginRoute,
	signUpRoute,
	menuRoute,
	menusRoute,
	devicesRoute,
	staffRoute,
	locationsRoute,
	taxRatesRoute,
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
