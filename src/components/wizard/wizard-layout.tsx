import type { JSX } from "solid-js";
import { useWizard } from "~/contexts/wizard-context";
import { ProgressBar } from "./progress-bar";

export function WizardLayout(props: {
	step: number;
	title: string;
	description: string;
	children: JSX.Element;
}) {
	const { reset } = useWizard();

	return (
		<div class="mx-auto max-w-2xl px-4 py-8">
			<div class="flex items-center justify-between">
				<ProgressBar currentStep={props.step} />
				<button
					type="button"
					class="text-xs text-muted-foreground hover:text-foreground"
					onClick={() => {
						reset();
						window.location.href = "/setup/business";
					}}
				>
					Start over
				</button>
			</div>
			<div class="mb-6">
				<h1 class="text-2xl font-bold tracking-tight">{props.title}</h1>
				<p class="mt-1 text-muted-foreground">{props.description}</p>
			</div>
			{props.children}
		</div>
	);
}
