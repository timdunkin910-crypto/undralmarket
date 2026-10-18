export type Settings = {
  building_name: string;
  district: string;
  entrances: number;
  floors: number;
  apts_per_floor: number;
  open_time: string; // "08:00:00"
  close_time: string;
  min_order: number;
  delivery_enabled: boolean;
  shop_phone: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
};

export type Category = { id: number; slug: string; name: string; emoji: string; sort: number };

export type Product = {
  id: string;
  category_id: number | null;
  name: string;
  unit: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  is_mongolian: boolean;
  is_deal: boolean;
  fresh_today: boolean;
  sold_out: boolean;
  active: boolean;
  sort: number;
};

export const RECIPE_CATEGORIES = ["Үндэсний хоол", "Шөл", "Хуурга", "Өглөөний цай", "Салат"] as const;
export const RECIPE_DIFFICULTIES = ["Амархан", "Дунд", "Хэцүү"] as const;
export type RecipeDifficulty = (typeof RECIPE_DIFFICULTIES)[number];

export type RecipeItem = {
  id: number;
  recipe_id: number;
  product_id: string | null;
  label: string;
  amount: string;
  qty: number;
  optional: boolean;
  sort: number;
  product: Product | null; // null → not sold here (or hidden by the shop)
};

export type Recipe = {
  id: number;
  slug: string;
  name: string;
  emoji: string;
  image_url: string | null;
  category: string;
  time_min: number;
  servings: number;
  difficulty: RecipeDifficulty;
  for_kids: boolean;
  steps: string[];
  active: boolean;
  sort: number;
  items: RecipeItem[];
};

export type Apartment = {
  id: string;
  entrance: number;
  floor: number;
  number: number;
  tab_enabled: boolean;
  tab_limit: number;
};

export type ResidentStatus = "pending" | "approved" | "blocked";
export type Role = "resident" | "staff" | "owner";

export type Resident = {
  id: string;
  apartment_id: string | null;
  name: string;
  phone: string;
  status: ResidentStatus;
  role: Role;
  notify_push: boolean;
  apartment: Apartment | null;
};

export type OrderStatus = "received" | "preparing" | "delivering" | "delivered" | "cancelled";
export type Fulfilment = "delivery" | "pickup";
export type PaymentMethod = "qpay" | "socialpay" | "transfer" | "cash_card" | "tab";

export type OrderItem = { id: number; product_id: string | null; name: string; unit: string; price: number; qty: number };

export type Order = {
  id: number;
  apartment_id: string;
  resident_id: string | null;
  status: OrderStatus;
  fulfilment: Fulfilment;
  scheduled_for: string | null;
  payment: PaymentMethod;
  paid: boolean;
  note: string | null;
  bottle_return: number;
  total: number;
  staff_name: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  apartment?: Pick<Apartment, "entrance" | "floor" | "number"> | null;
  resident?: { name: string; phone: string } | null;
};
