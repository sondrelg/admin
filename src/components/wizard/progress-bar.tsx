import { For } from "solid-js";
import { cn } from "~/lib/utils";

const STEPS = [
	{ label: "Business", path: "/setup/business" },
	{ label: "Staff", path: "/setup/staff" },
	{ label: "VAT", path: "/setup/tax-rates" },
	{ label: "Menu", path: "/setup/menu" },
	{ label: "Summary", path: "/setup/summary" },
];

export function ProgressBar(props: { currentStep: number }) {
	return (
		<nav aria-label="Setup progress" class="mb-8">
			<ol class="flex items-center gap-2">
				<For each={STEPS}>
					{(step, index) => {
						const stepNum = () => index() + 1;
						const isCurrent = () => stepNum() === props.currentStep;
						const isCompleted = () => stepNum() < props.currentStep;

						return (
							<li class="flex items-center gap-2">
								<div class="flex items-center gap-2">
									<div
										class={cn(
											"flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
											isCurrent() && "bg-primary text-primary-foreground",
											isCompleted() && "bg-primary/20 text-primary",
											!isCurrent() && !isCompleted() && "bg-muted text-muted-foreground",
										)}
									>
										{isCompleted() ? (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2.5"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="size-4"
												aria-hidden="true"
											>
												<polyline points="20 6 9 17 4 12" />
											</svg>
										) : (
											stepNum()
										)}
									</div>
									<span
										class={cn(
											"hidden text-sm font-medium sm:inline",
											isCurrent() && "text-foreground",
											!isCurrent() && "text-muted-foreground",
										)}
									>
										{step.label}
									</span>
								</div>
								{index() < STEPS.length - 1 && (
									<div
										class={cn("h-px w-8 sm:w-12", isCompleted() ? "bg-primary/40" : "bg-border")}
									/>
								)}
							</li>
						);
					}}
				</For>
			</ol>
		</nav>
	);
}

export { STEPS };
