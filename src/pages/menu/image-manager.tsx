import { createSignal, For, onMount, Show } from "solid-js";
import { apiFetch } from "~/api/request";
import type { MenuItemImage } from "./types";

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageManager(props: { itemId: string }) {
	const [images, setImages] = createSignal<MenuItemImage[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [uploading, setUploading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	// eslint-disable-next-line no-unassigned-vars -- SolidJS ref assigned via JSX
	let fileInput!: HTMLInputElement;

	const fetchImages = async () => {
		const res = await apiFetch<{
			data: MenuItemImage[];
			status: number;
		}>(`/api/menu-items/${props.itemId}/images`);
		if (res.status === 200) setImages(res.data);
		setLoading(false);
	};

	onMount(fetchImages);

	const sorted = () => [...images()].sort((a, b) => a.display_order - b.display_order);

	const handleFileSelect = async (e: Event) => {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			setError("Please select an image file.");
			input.value = "";
			return;
		}

		// Validate file size (max 10MB, server also enforces)
		if (file.size > 10 * 1024 * 1024) {
			setError("Image must be under 10 MB.");
			input.value = "";
			return;
		}

		setError(null);
		setUploading(true);

		try {
			const formData = new FormData();
			formData.append("file", file);

			const res = await apiFetch<{
				data: MenuItemImage & { error?: string };
				status: number;
			}>(`/api/menu-items/${props.itemId}/images`, {
				method: "POST",
				body: formData,
			});

			if (res.status === 201) {
				setImages((prev) => [...prev, res.data]);
			} else {
				setError(res.data?.error ?? "Failed to upload image.");
			}
		} catch {
			setError("Failed to upload image.");
		} finally {
			setUploading(false);
			input.value = "";
		}
	};

	const handleDelete = async (imageId: string) => {
		const res = await apiFetch<{ status: number }>(
			`/api/menu-items/${props.itemId}/images/${imageId}`,
			{ method: "DELETE" },
		);
		if (res.status === 204) {
			setImages((prev) => prev.filter((img) => img.id !== imageId));
		}
	};

	return (
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<h4 class="text-sm font-medium">Images</h4>
				<button
					type="button"
					class="text-xs text-primary hover:underline"
					disabled={uploading()}
					onClick={() => fileInput.click()}
				>
					{uploading() ? "Uploading..." : "+ Add"}
				</button>
				<input
					ref={fileInput}
					type="file"
					accept="image/*"
					class="hidden"
					onChange={handleFileSelect}
				/>
			</div>

			<Show when={error()}>
				<div class="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error()}</div>
			</Show>

			<Show when={!loading()} fallback={<div class="h-16 animate-pulse rounded-lg bg-muted" />}>
				<Show
					when={sorted().length > 0}
					fallback={<p class="text-xs text-muted-foreground">No images yet.</p>}
				>
					<div class="grid grid-cols-3 gap-2">
						<For each={sorted()}>
							{(img) => (
								<div class="group relative overflow-hidden rounded-lg border bg-muted">
									<img
										src={img.thumbnail_url ?? img.url}
										alt=""
										class="aspect-square w-full object-cover"
										loading="lazy"
										onError={(e) => {
											const el = e.currentTarget;
											el.style.display = "none";
											el.parentElement?.classList.add(
												"flex",
												"items-center",
												"justify-center",
												"aspect-square",
											);
											const span = document.createElement("span");
											span.className = "text-xs text-muted-foreground";
											span.textContent = img.content_type.split("/")[1]?.toUpperCase() ?? "IMG";
											el.parentElement?.appendChild(span);
										}}
									/>
									<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
										<div class="flex items-center justify-between">
											<span class="text-[10px] text-white">{formatSize(img.size_bytes)}</span>
											<button
												type="button"
												class="rounded px-1 text-[10px] text-white hover:bg-white/20"
												onClick={() => handleDelete(img.id)}
											>
												Remove
											</button>
										</div>
									</div>
								</div>
							)}
						</For>
					</div>
				</Show>
			</Show>
		</div>
	);
}
