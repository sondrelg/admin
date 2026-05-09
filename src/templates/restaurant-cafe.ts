export interface TemplateTaxRate {
	name: string;
	rateBps: number;
	takeAwayRateBps: number;
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
		{
			name: "Mat og alkoholfri drikke",
			rateBps: 2500,
			takeAwayRateBps: 1500,
			isDefault: false,
		},
		{ name: "Alkohol", rateBps: 2500, takeAwayRateBps: 2500, isDefault: false },
		{ name: "Generell", rateBps: 2500, takeAwayRateBps: 2500, isDefault: true },
	],
	categories: [
		{
			name: "Frokost",
			color: "#F59E0B",
			items: [
				{ name: "Egg & bacon", priceMinorUnit: 12900, taxRateIndex: 0 },
				{ name: "Smoothie bowl", priceMinorUnit: 10900, taxRateIndex: 0 },
				{ name: "Granola m/yoghurt", priceMinorUnit: 8900, taxRateIndex: 0 },
				{ name: "Avokadotoast", priceMinorUnit: 11900, taxRateIndex: 0 },
				{ name: "Omelett", priceMinorUnit: 11900, taxRateIndex: 0 },
			],
		},
		{
			name: "Lunsj",
			color: "#10B981",
			items: [
				{ name: "Dagens suppe", priceMinorUnit: 10900, taxRateIndex: 0 },
				{ name: "Kyllingwrap", priceMinorUnit: 12900, taxRateIndex: 0 },
				{ name: "Club sandwich", priceMinorUnit: 14900, taxRateIndex: 0 },
				{ name: "Pasta m/pesto", priceMinorUnit: 13900, taxRateIndex: 0 },
				{ name: "Cæsarsalat", priceMinorUnit: 13900, taxRateIndex: 0 },
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
				{ name: "Panini", priceMinorUnit: 9900, taxRateIndex: 0 },
			],
		},
		{
			name: "Snacks",
			color: "#FF8C00",
			items: [
				{ name: "Kanelbolle", priceMinorUnit: 4500, taxRateIndex: 0 },
				{ name: "Sjokoladekake", priceMinorUnit: 5500, taxRateIndex: 0 },
				{ name: "Croissant", priceMinorUnit: 3900, taxRateIndex: 0 },
				{ name: "Muffin", priceMinorUnit: 4500, taxRateIndex: 0 },
				{ name: "Cookie", priceMinorUnit: 3500, taxRateIndex: 0 },
				{ name: "Frukt", priceMinorUnit: 2500, taxRateIndex: 0 },
			],
		},
		{
			name: "Dessert",
			color: "#EC4899",
			items: [
				{ name: "Brownie", priceMinorUnit: 5900, taxRateIndex: 0 },
				{ name: "Iskrem (2 kuler)", priceMinorUnit: 5500, taxRateIndex: 0 },
				{ name: "Panna cotta", priceMinorUnit: 7900, taxRateIndex: 0 },
				{ name: "Crème brûlée", priceMinorUnit: 8900, taxRateIndex: 0 },
				{ name: "Eplekake m/vaniljeis", priceMinorUnit: 6900, taxRateIndex: 0 },
			],
		},
		{
			name: "Varm drikke",
			color: "#8B4513",
			items: [
				{ name: "Kaffe", priceMinorUnit: 3900, taxRateIndex: 0 },
				{ name: "Americano", priceMinorUnit: 4500, taxRateIndex: 0 },
				{ name: "Cafe latte", priceMinorUnit: 5200, taxRateIndex: 0 },
				{ name: "Cappuccino", priceMinorUnit: 5200, taxRateIndex: 0 },
				{ name: "Flat white", priceMinorUnit: 5200, taxRateIndex: 0 },
				{ name: "Te", priceMinorUnit: 3500, taxRateIndex: 0 },
				{ name: "Varm sjokolade", priceMinorUnit: 4500, taxRateIndex: 0 },
				{ name: "Chai latte", priceMinorUnit: 5200, taxRateIndex: 0 },
			],
		},
		{
			name: "Kald drikke",
			color: "#1E90FF",
			items: [
				{ name: "Brus (liten)", priceMinorUnit: 3500, taxRateIndex: 0 },
				{ name: "Brus (stor)", priceMinorUnit: 4500, taxRateIndex: 0 },
				{ name: "Juice", priceMinorUnit: 4500, taxRateIndex: 0 },
				{ name: "Iste", priceMinorUnit: 4500, taxRateIndex: 0 },
				{ name: "Mineralvann", priceMinorUnit: 2900, taxRateIndex: 0 },
				{ name: "Smoothie", priceMinorUnit: 6500, taxRateIndex: 0 },
				{ name: "Iskaffe", priceMinorUnit: 5900, taxRateIndex: 0 },
			],
		},
		{
			name: "Alkohol",
			color: "#7C3AED",
			items: [
				{ name: "Fatøl (0,4l)", priceMinorUnit: 8900, taxRateIndex: 1 },
				{ name: "Fatøl (0,5l)", priceMinorUnit: 10900, taxRateIndex: 1 },
				{ name: "IPA", priceMinorUnit: 9900, taxRateIndex: 1 },
				{ name: "Hvitvin (glass)", priceMinorUnit: 11900, taxRateIndex: 1 },
				{ name: "Rødvin (glass)", priceMinorUnit: 11900, taxRateIndex: 1 },
				{ name: "Cider", priceMinorUnit: 8900, taxRateIndex: 1 },
				{ name: "Prosecco (glass)", priceMinorUnit: 12900, taxRateIndex: 1 },
			],
		},
	],
};
