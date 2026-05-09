export interface ProductResponse {
	id: string;
	name: string;
	description: string | null;
	brand: string | null;
	ean: string | null;
	allergen_codes: string[];
	display_order: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface ProductImageResponse {
	id: string;
	product_id: string;
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

export interface ProductDetailResponse extends ProductResponse {
	images: ProductImageResponse[];
}

export interface CreateProduct {
	name: string;
	description?: string;
	brand?: string;
	ean?: string;
	allergen_codes?: string[];
	display_order?: number;
}

export interface UpdateProduct {
	name?: string;
	description?: string | null;
	brand?: string | null;
	ean?: string | null;
	allergen_codes?: string[];
	display_order?: number;
	is_active?: boolean;
}
