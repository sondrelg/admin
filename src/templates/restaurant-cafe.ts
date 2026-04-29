export interface TemplateTaxRate {
	name: string;
	rateBps: number;
	isDefault: boolean;
}

export interface TemplateItem {
	name: string;
	priceMinorUnit: number;
	taxRateIndex: number; // index into taxRates array
}

export interface TemplateCategory {
	name: string;
	color: string;
	items: TemplateItem[];
}

export interface Template {
	name: string;
	taxRates: TemplateTaxRate[];
	categories: TemplateCategory[];
}

export const restaurantCafe: Template = {
	name: "Restaurant / Cafe",
	taxRates: [
		{ name: "Mat", rateBps: 1500, isDefault: false },
		{ name: "Alkohol", rateBps: 2500, isDefault: false },
		{ name: "Generell", rateBps: 2500, isDefault: true },
	],
	categories: [
		{
			name: "Varm drikke",
			color: "#8B4513",
			items: [
				{ name: "Kaffe", priceMinorUnit: 3900, taxRateIndex: 2 },
				{ name: "Americano", priceMinorUnit: 4500, taxRateIndex: 2 },
				{ name: "Cafe latte", priceMinorUnit: 5200, taxRateIndex: 2 },
				{ name: "Cappuccino", priceMinorUnit: 5200, taxRateIndex: 2 },
				{ name: "Te", priceMinorUnit: 3500, taxRateIndex: 2 },
				{ name: "Varm sjokolade", priceMinorUnit: 4500, taxRateIndex: 2 },
			],
		},
		{
			name: "Kald drikke",
			color: "#1E90FF",
			items: [
				{ name: "Brus (liten)", priceMinorUnit: 3500, taxRateIndex: 2 },
				{ name: "Brus (stor)", priceMinorUnit: 4500, taxRateIndex: 2 },
				{ name: "Juice", priceMinorUnit: 4500, taxRateIndex: 2 },
				{ name: "Iste", priceMinorUnit: 4500, taxRateIndex: 2 },
				{ name: "Mineralvann", priceMinorUnit: 2900, taxRateIndex: 2 },
			],
		},
		{
			name: "Mat",
			color: "#228B22",
			items: [
				{ name: "Focaccia", priceMinorUnit: 8900, taxRateIndex: 0 },
				{ name: "Bagel m/laks", priceMinorUnit: 9900, taxRateIndex: 0 },
				{ name: "Salat", priceMinorUnit: 11900, taxRateIndex: 0 },
				{ name: "Toast", priceMinorUnit: 7900, taxRateIndex: 0 },
				{ name: "Wrap", priceMinorUnit: 10900, taxRateIndex: 0 },
			],
		},
		{
			name: "Snacks",
			color: "#FF8C00",
			items: [
				{ name: "Kanelbolle", priceMinorUnit: 4500, taxRateIndex: 2 },
				{ name: "Sjokoladekake", priceMinorUnit: 5500, taxRateIndex: 2 },
				{ name: "Croissant", priceMinorUnit: 3900, taxRateIndex: 2 },
				{ name: "Muffin", priceMinorUnit: 4500, taxRateIndex: 2 },
				{ name: "Cookie", priceMinorUnit: 3500, taxRateIndex: 2 },
			],
		},
	],
};
