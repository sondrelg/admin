import { Show } from "solid-js";
import { Button } from "~/components/ui/button";

export function ErrorFallback(props: { error: unknown; reset: () => void; fullPage?: boolean }) {
	const message = () => {
		const err = props.error;
		if (err instanceof Error) return err.message;
		if (typeof err === "string") return err;
		return "An unexpected error occurred";
	};

	return (
		<div
			class={
				props.fullPage
					? "flex min-h-screen items-center justify-center p-4"
					: "flex items-center justify-center p-8"
			}
		>
			<div class="w-full max-w-md space-y-4 text-center">
				<h2 class="text-lg font-semibold">Something went wrong</h2>
				<Show when={message()}>
					<p class="text-sm text-muted-foreground">{message()}</p>
				</Show>
				<Button variant="outline" onClick={() => props.reset()}>
					Try again
				</Button>
			</div>
		</div>
	);
}
