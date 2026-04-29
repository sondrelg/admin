export interface MenuItem {
	id: string;
	name: string;
	description: string | null;
	price_minor_unit: number;
	category_id: string | null;
	is_enabled: boolean;
	sku: string | null;
	display_order: number;
}

export interface Category {
	id: string;
	name: string;
	display_order: number;
	is_active: boolean;
	color: string | null;
}

export interface Allergen {
	id: string;
	name: string;
	code: string;
	display_order: number;
}

export interface TaxRate {
	id: string;
	name: string;
	rate_bps: number;
	is_default: boolean;
}

export interface ModifierGroup {
	id: string;
	name: string;
	min_selections: number;
	max_selections: number;
	display_order: number;
	is_active: boolean;
}

export interface Modifier {
	id: string;
	name: string;
	price_minor_unit: number;
	display_order: number;
	is_active: boolean;
	modifier_group_id: string;
}

export interface ModifierGroupAssignment {
	id: string;
	modifier_group_id: string;
	display_order: number;
}

export interface MenuItemImage {
	id: string;
	menu_item_id: string;
	content_type: string;
	size_bytes: number;
	display_order: number;
	width: number | null;
	height: number | null;
	blurhash: string | null;
	url: string;
	thumbnail_url: string | null;
	created_at: string;
}

export interface BundleSlot {
	id: string;
	name: string;
	min_selections: number;
	max_selections: number;
	display_order: number;
	bundle_item_id: string;
}

export interface BundleSlotOption {
	id: string;
	bundle_slot_id: string;
	menu_item_id: string;
	price_adjustment_minor_unit: number;
	is_default: boolean;
	display_order: number;
}

export function formatPrice(minorUnit: number): string {
	const major = Math.floor(Math.abs(minorUnit) / 100);
	const minor = Math.abs(minorUnit) % 100;
	const sign = minorUnit < 0 ? "-" : "";
	return `${sign}${major},${minor.toString().padStart(2, "0")}`;
}

export function parsePriceToMinor(input: string): number {
	const cleaned = input.replace(/[^0-9.,-]/g, "").replace(",", ".");
	const num = Number.parseFloat(cleaned);
	if (Number.isNaN(num)) return 0;
	return Math.round(num * 100);
}

export function formatRateBps(bps: number): string {
	const pct = bps / 100;
	return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`;
}
