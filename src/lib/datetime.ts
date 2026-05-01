/** Short date: "Jan 5, 2025" */
export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/** Date + time: "Jan 5, 2025, 3:42 PM" */
export function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

/** Relative time with fallback to date: "Just now", "5m ago", "3d ago", or "Jan 5, 2025" */
export function formatRelative(iso: string | null): string {
	if (!iso) return "Never";
	const d = new Date(iso);
	const diffMs = Date.now() - d.getTime();
	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 1) return "Just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHrs = Math.floor(diffMin / 60);
	if (diffHrs < 24) return `${diffHrs}h ago`;
	const diffDays = Math.floor(diffHrs / 24);
	if (diffDays < 30) return `${diffDays}d ago`;
	return formatDate(iso);
}
