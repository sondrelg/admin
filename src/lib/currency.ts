export function formatNOK(minorUnit: number): string {
	const kr = Math.floor(minorUnit / 100);
	const ore = Math.abs(minorUnit % 100);
	return `${kr},${ore.toString().padStart(2, "0")} kr`;
}

export function parseNOK(display: string): number {
	const cleaned = display.replace(/[^0-9,]/g, "");
	const parts = cleaned.split(",");
	const kr = Number.parseInt(parts[0] || "0", 10);
	const ore = Number.parseInt((parts[1] || "0").padEnd(2, "0").slice(0, 2), 10);
	return kr * 100 + ore;
}
