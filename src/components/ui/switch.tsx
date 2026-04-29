import * as SwitchPrimitive from "@kobalte/core/switch";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

type SwitchProps = SwitchPrimitive.SwitchRootProps & {
	class?: string;
	inputProps?: SwitchPrimitive.SwitchInputProps;
};

const Switch = (props: SwitchProps) => {
	const [local, others] = splitProps(props, ["class", "inputProps"]);
	return (
		<SwitchPrimitive.Root class={cn("inline-flex items-center", local.class)} {...others}>
			<SwitchPrimitive.Input {...local.inputProps} />
			<SwitchPrimitive.Control
				class={cn(
					"inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-[#F59E0B] transition-colors",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"data-[checked]:bg-green-500",
				)}
			>
				<SwitchPrimitive.Thumb
					class={cn(
						"pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
						"data-[checked]:translate-x-4",
					)}
				/>
			</SwitchPrimitive.Control>
		</SwitchPrimitive.Root>
	);
};

export { Switch };
export type { SwitchProps };
