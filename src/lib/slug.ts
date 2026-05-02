export function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-+|-+$/g, "")
		.slice(0, 63);
}
