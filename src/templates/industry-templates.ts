import { restaurantCafe, type Template } from "./restaurant-cafe";

const quickService: Template = {
	name: "Quick Service",
	taxRates: restaurantCafe.taxRates,
	categories: [
		{
			name: "Burgers",
			color: "#F97316",
			items: [
				{ name: "Classic Burger", priceMinorUnit: 12900, taxRateIndex: 0 },
				{ name: "Cheeseburger", priceMinorUnit: 13900, taxRateIndex: 0 },
				{ name: "Double Burger", priceMinorUnit: 16900, taxRateIndex: 0 },
			],
		},
		{
			name: "Sides",
			color: "#EAB308",
			items: [
				{ name: "Fries", priceMinorUnit: 4900, taxRateIndex: 0 },
				{ name: "Onion Rings", priceMinorUnit: 5900, taxRateIndex: 0 },
			],
		},
		{
			name: "Drinks",
			color: "#0EA5E9",
			items: [
				{ name: "Soft Drink", priceMinorUnit: 3900, taxRateIndex: 0 },
				{ name: "Milkshake", priceMinorUnit: 5900, taxRateIndex: 0 },
			],
		},
	],
};

const retail: Template = {
	name: "Retail / Shop",
	taxRates: [{ name: "Standard", rateBps: 2500, takeAwayRateBps: 2500, isDefault: true }],
	categories: [
		{
			name: "Beverages",
			color: "#2563EB",
			items: [
				{ name: "Still Water", priceMinorUnit: 2900, taxRateIndex: 0 },
				{ name: "Sparkling Water", priceMinorUnit: 3200, taxRateIndex: 0 },
			],
		},
		{
			name: "Snacks",
			color: "#22C55E",
			items: [
				{ name: "Protein Bar", priceMinorUnit: 3500, taxRateIndex: 0 },
				{ name: "Nuts", priceMinorUnit: 4500, taxRateIndex: 0 },
			],
		},
	],
};

export const industryTemplates = [restaurantCafe, quickService, retail] as const;
