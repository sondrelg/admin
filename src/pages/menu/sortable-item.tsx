import { createSortable, transformStyle } from "@thisbeyond/solid-dnd";
import { Show } from "solid-js";
import type { MenuItem } from "./types";
import { formatPrice } from "./types";

export function SortableItem(props: {
	item: MenuItem;
	isActive: boolean;
	togglingId: string | null;
	onSelect: () => void;
	onToggle: (e: MouseEvent) => void;
	bulkMode: boolean;
	isSelected: boolean;
	onToggleSelect: () => void;
}) {
	const sortable = createSortable(props.item.id);

	const handleClick = (e: MouseEvent) => {
		// Don't open detail sheet if clicking the toggle button or drag handle
		const target = e.target as HTMLElement;
		if (target.closest("[data-toggle]") || target.closest("[data-drag-handle]")) return;
		if (props.bulkMode) {
			props.onToggleSelect();
			return;
		}
		props.onSelect();
	};

	return (
		<li
			ref={sortable.ref}
			class="cursor-pointer rounded-xl border bg-card shadow-sm transition-transform hover:bg-accent/50"
			classList={{
				"opacity-50": !props.item.is_enabled,
				"opacity-25": props.isActive,
				"ring-2 ring-primary": props.isSelected,
			}}
			style={transformStyle(sortable.transform)}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter") props.onSelect();
			}}
		>
			<div class="flex w-full items-center gap-2 p-4">
				<Show when={props.bulkMode}>
					<input
						type="checkbox"
						checked={props.isSelected}
						class="size-4 shrink-0 rounded border-input accent-primary"
						onClick={(e) => {
							e.stopPropagation();
							props.onToggleSelect();
						}}
					/>
				</Show>
				<div
					data-drag-handle
					class="flex shrink-0 cursor-grab items-center touch-none"
					{...sortable.dragActivators}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="size-4 text-muted-foreground"
						aria-hidden="true"
					>
						<circle cx="9" cy="5" r="1" />
						<circle cx="9" cy="12" r="1" />
						<circle cx="9" cy="19" r="1" />
						<circle cx="15" cy="5" r="1" />
						<circle cx="15" cy="12" r="1" />
						<circle cx="15" cy="19" r="1" />
					</svg>
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<p class="font-semibold">{props.item.name}</p>
						<Show when={props.item.sku}>
							<span class="text-xs text-muted-foreground">({props.item.sku})</span>
						</Show>
					</div>
					<Show when={props.item.description}>
						<p class="mt-0.5 truncate text-sm text-muted-foreground">{props.item.description}</p>
					</Show>
				</div>
				<div class="flex items-center gap-3">
					<span class="whitespace-nowrap font-mono text-sm">
						kr {formatPrice(props.item.price_minor_unit)}
					</span>
					<button
						data-toggle
						type="button"
						class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
						classList={{
							"bg-primary/10 text-primary hover:bg-primary/20": props.item.is_enabled,
							"bg-muted text-muted-foreground hover:bg-muted/80": !props.item.is_enabled,
						}}
						disabled={props.togglingId === props.item.id}
						onClick={(e) => {
							e.stopPropagation();
							props.onToggle(e);
						}}
					>
						{props.item.is_enabled ? "Enabled" : "Disabled"}
					</button>
				</div>
			</div>
		</li>
	);
}
