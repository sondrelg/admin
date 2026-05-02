import { ErrorBoundary, type JSX, Suspense } from "solid-js";
import { AppSidebar } from "~/components/app-sidebar";
import { ErrorFallback } from "~/components/ui/error-fallback";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";

export function DashboardLayout(props: { title: string; children: JSX.Element }) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header class="flex h-14 items-center gap-2 border-b px-6">
					<SidebarTrigger />
					<h1 class="text-lg font-semibold">{props.title}</h1>
				</header>
				<ErrorBoundary
					fallback={(err, reset) => (
						<div class="p-6">
							<ErrorFallback error={err} reset={reset} />
						</div>
					)}
				>
					<Suspense
						fallback={
							<div class="flex min-h-[200px] items-center justify-center p-6">
								<p class="text-muted-foreground">Loading...</p>
							</div>
						}
					>
						<div class="p-6">{props.children}</div>
					</Suspense>
				</ErrorBoundary>
			</SidebarInset>
		</SidebarProvider>
	);
}
