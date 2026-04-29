import type { JSX } from "solid-js";
import { AppSidebar } from "~/components/app-sidebar";
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
				<div class="p-6">{props.children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
