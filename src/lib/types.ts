export type ClothingCategory =
  | 'top'
  | 'bottom'
  | 'jacket'
  | 'dress'
  | 'shoes'
  | 'accessory';

export interface Clothing {
  id: string;
  user_id: string;
  category: ClothingCategory;
  image_path: string;
  processed_image_path: string | null;
  primary_color: string | null;
  color_tags: string[];
  style_tags: string[];
  season_tags: string[];
  min_temp_c: number | null;
  max_temp_c: number | null;
  description: string | null;
  created_at: string;
}

export interface WearLog {
  id: string;
  user_id: string;
  clothing_ids: string[];
  worn_on: string;
  weather: WeatherSnapshot | null;
  note: string | null;
  created_at: string;
}

export interface WeatherSnapshot {
  temp_min_c: number;
  temp_max_c: number;
  condition: string;
  precipitation_mm: number;
  wind_mps: number;
}

export interface OutfitSuggestion {
  top_id: string | null;
  bottom_id: string | null;
  jacket_id: string | null;
  reason: string;
}

export interface RecommendResponse {
  weather: WeatherSnapshot;
  date: string;
  suggestions: OutfitSuggestion[];
}
