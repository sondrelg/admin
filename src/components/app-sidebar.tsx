import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useAuth } from "~/contexts/auth-context";

function HomeIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			<polyline points="9 22 9 12 15 12 15 22" />
		</svg>
	);
}

function MenuIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<path d="M4 8h16" />
			<path d="M4 16h16" />
		</svg>
	);
}

function ClockIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}

function UsersIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</svg>
	);
}

function LocationIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
			<circle cx="12" cy="10" r="3" />
		</svg>
	);
}

function ReceiptIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
			<path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
			<path d="M12 17.5v-11" />
		</svg>
	);
}

function DeviceIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<rect width="20" height="14" x="2" y="3" rx="2" />
			<line x1="8" x2="16" y1="21" y2="21" />
			<line x1="12" x2="12" y1="17" y2="21" />
		</svg>
	);
}

function KeyIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
			<circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
		</svg>
	);
}

function BuildingIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
			<path d="M9 22v-4h6v4" />
			<path d="M8 6h.01" />
			<path d="M16 6h.01" />
			<path d="M12 6h.01" />
			<path d="M12 10h.01" />
			<path d="M12 14h.01" />
			<path d="M16 10h.01" />
			<path d="M16 14h.01" />
			<path d="M8 10h.01" />
			<path d="M8 14h.01" />
		</svg>
	);
}

function PackageIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<path d="m7.5 4.27 9 5.15" />
			<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
			<path d="m3.3 7 8.7 5 8.7-5" />
			<path d="M12 22V12" />
		</svg>
	);
}

function CreditCardIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<rect width="20" height="14" x="2" y="5" rx="2" />
			<line x1="2" x2="22" y1="10" y2="10" />
		</svg>
	);
}

function BarChartIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<line x1="12" x2="12" y1="20" y2="10" />
			<line x1="18" x2="18" y1="20" y2="4" />
			<line x1="6" x2="6" y1="20" y2="16" />
		</svg>
	);
}

function LogOutIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
			<polyline points="16 17 21 12 16 7" />
			<line x1="21" y1="12" x2="9" y2="12" />
		</svg>
	);
}

function POSIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-4"
			aria-hidden="true"
		>
			<rect width="20" height="14" x="2" y="5" rx="2" />
			<line x1="2" x2="22" y1="10" y2="10" />
		</svg>
	);
}

export function AppSidebar() {
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const [isLoggingOut, setIsLoggingOut] = createSignal(false);

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await signOut();
			await navigate({ to: "/login", replace: true });
		} finally {
			setIsLoggingOut(false);
		}
	};

	return (
		<Sidebar>
			<SidebarHeader class="border-b border-sidebar-border/50">
				<div class="flex items-center gap-3 px-2 py-2">
					<div class="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
						<POSIcon />
					</div>
					<div class="flex flex-col">
						<span class="font-semibold">SMLS</span>
						<span class="text-xs text-muted-foreground">Point of Sale</span>
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Overview</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<Link to="/">
									<SidebarMenuButton tooltip="Home">
										<HomeIcon />
										<span>Home</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel>Catalog</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<Link to="/menu">
									<SidebarMenuButton tooltip="Menu Items">
										<MenuIcon />
										<span>Menu Items</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<Link to="/menus">
									<SidebarMenuButton tooltip="Menus">
										<ClockIcon />
										<span>Menus</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel>Operations</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<Link to="/staff">
									<SidebarMenuButton tooltip="Staff">
										<UsersIcon />
										<span>Staff</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<Link to="/locations">
									<SidebarMenuButton tooltip="Locations">
										<LocationIcon />
										<span>Locations</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<Link to="/devices">
									<SidebarMenuButton tooltip="Devices">
										<DeviceIcon />
										<span>Devices</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<Link to="/tax-rates">
									<SidebarMenuButton tooltip="Tax Rates">
										<ReceiptIcon />
										<span>Tax Rates</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<Link to="/api-tokens">
									<SidebarMenuButton tooltip="API Tokens">
										<KeyIcon />
										<span>API Tokens</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel>Platform</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<Link to="/products">
									<SidebarMenuButton tooltip="Products">
										<PackageIcon />
										<span>Products</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<Link to="/plans">
									<SidebarMenuButton tooltip="Plans">
										<CreditCardIcon />
										<span>Plans</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<Link to="/resellers">
									<SidebarMenuButton tooltip="Resellers">
										<BuildingIcon />
										<span>Resellers</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<Link to="/settlements">
									<SidebarMenuButton tooltip="Settlements">
										<BarChartIcon />
										<span>Settlements</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter class="border-t border-sidebar-border/50">
				<Show when={user()}>
					{(u) => (
						<div class="flex items-center gap-2 p-2">
							<Link
								to="/profile"
								class="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent"
							>
								<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
									<span class="text-sm font-medium">{u().name.charAt(0).toUpperCase()}</span>
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">{u().name}</p>
									<p class="truncate text-xs text-muted-foreground">{u().email}</p>
								</div>
							</Link>
							<button
								type="button"
								onClick={handleLogout}
								disabled={isLoggingOut()}
								title={isLoggingOut() ? "Signing out..." : "Sign Out"}
								class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
							>
								<LogOutIcon />
							</button>
						</div>
					)}
				</Show>
			</SidebarFooter>
		</Sidebar>
	);
}
