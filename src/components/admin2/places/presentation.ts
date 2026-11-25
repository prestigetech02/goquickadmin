export type AdminPlace = {
  id: number;
  name: string;
  /** Category slug from Place Categories. */
  category: string;
  description: string;
  /** Street / building line only (not area/city/state). */
  address_line: string;
  area: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  notes: string | null;
  /** First image is the cover shown in the table and Explore cards. */
  images: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlaceForm = {
  name: string;
  category: string;
  description: string;
  address_line: string;
  area: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  phone: string;
  notes: string;
  images: string[];
  is_active: boolean;
};

export type AdminPlaceCategory = {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlaceCategoryForm = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  is_active: boolean;
};

export const MAX_PLACE_IMAGES = 6;
export const MAX_PLACE_IMAGE_BYTES = 1_500_000;

/** Common states for the place form select; admins can still type a custom value via “Other”. */
export const NIGERIA_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

export const EMPTY_PLACE_FORM: PlaceForm = {
  name: '',
  category: 'supermarket',
  description: '',
  address_line: '',
  area: '',
  city: '',
  state: 'Lagos',
  latitude: '',
  longitude: '',
  phone: '',
  notes: '',
  images: [],
  is_active: true,
};

export const EMPTY_CATEGORY_FORM: PlaceCategoryForm = {
  name: '',
  slug: '',
  description: '',
  icon: 'store',
  is_active: true,
};

/** Default pin when admin opens a new place (Lagos Island). */
export const DEFAULT_MAP_CENTER = { latitude: 6.4541, longitude: 3.3947 };

export function slugifyCategory(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export function categoryLabel(slug: string, categories: AdminPlaceCategory[]): string {
  const match = categories.find((item) => item.slug === slug);
  if (match) return match.name;
  if (!slug) return 'Uncategorized';
  return slug
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function placeToForm(place: AdminPlace): PlaceForm {
  return {
    name: place.name,
    category: place.category,
    description: place.description ?? '',
    address_line: place.address_line ?? '',
    area: place.area ?? '',
    city: place.city ?? '',
    state: place.state ?? '',
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    phone: place.phone ?? '',
    notes: place.notes ?? '',
    images: [...(place.images ?? [])],
    is_active: place.is_active,
  };
}

/** Area · City · State for filters and compact table cells. */
export function placeLocality(place: Pick<AdminPlace, 'area' | 'city' | 'state'>): string {
  return [place.area, place.city, place.state].map((part) => part?.trim()).filter(Boolean).join(', ');
}

/** Full display address: address line + locality. */
export function placeFullAddress(place: Pick<AdminPlace, 'address_line' | 'area' | 'city' | 'state'>): string {
  const locality = placeLocality(place);
  const line = place.address_line?.trim() ?? '';
  if (line && locality) return `${line}, ${locality}`;
  return line || locality || '—';
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function categoryToForm(category: AdminPlaceCategory): PlaceCategoryForm {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    icon: category.icon || 'store',
    is_active: category.is_active,
  };
}

export function formProblems(form: PlaceForm): Partial<Record<keyof PlaceForm, string>> {
  const problems: Partial<Record<keyof PlaceForm, string>> = {};
  if (!form.name.trim()) problems.name = 'Enter the place name.';
  if (!form.category.trim()) problems.category = 'Pick a category.';
  if (!form.address_line.trim()) problems.address_line = 'Enter the street or building address.';
  if (!form.area.trim()) problems.area = 'Enter the area (e.g. Yaba, Lekki Phase 1).';
  if (!form.city.trim()) problems.city = 'Enter the city or LGA.';
  if (!form.state.trim()) problems.state = 'Pick or enter the state.';
  if (!form.description.trim()) problems.description = 'Add a short description for requesters.';

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  if (!form.latitude.trim() || !Number.isFinite(lat)) problems.latitude = 'Pick a point on the map or enter latitude.';
  else if (lat < -90 || lat > 90) problems.latitude = 'Latitude must be between -90 and 90.';

  if (!form.longitude.trim() || !Number.isFinite(lng)) problems.longitude = 'Pick a point on the map or enter longitude.';
  else if (lng < -180 || lng > 180) problems.longitude = 'Longitude must be between -180 and 180.';

  if (form.images.length === 0) problems.images = 'Add at least one photo.';
  else if (form.images.length > MAX_PLACE_IMAGES) problems.images = `Up to ${MAX_PLACE_IMAGES} photos.`;

  return problems;
}

export function categoryFormProblems(
  form: PlaceCategoryForm,
  options: { existingSlugs: string[]; editingSlug?: string },
): Partial<Record<keyof PlaceCategoryForm, string>> {
  const problems: Partial<Record<keyof PlaceCategoryForm, string>> = {};
  if (!form.name.trim()) problems.name = 'Enter a category name.';

  const slug = form.slug.trim() || slugifyCategory(form.name);
  if (!slug) problems.slug = 'Enter a code or name so we can create one.';
  else if (!/^[a-z0-9_]+$/.test(slug)) problems.slug = 'Use lowercase letters, numbers, and underscores only.';
  else if (options.existingSlugs.includes(slug) && slug !== options.editingSlug) {
    problems.slug = 'That code is already used.';
  }

  if (!form.icon.trim()) problems.icon = 'Pick an icon.';
  return problems;
}

export function coordsLabel(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function coverImage(place: AdminPlace): string | null {
  return place.images?.[0] ?? null;
}

export function normalizePlace(
  raw: Partial<AdminPlace> &
    Pick<AdminPlace, 'id' | 'name' | 'category' | 'latitude' | 'longitude'> & {
      address?: string;
      address_line?: string;
    },
): AdminPlace {
  const legacyAddress = typeof raw.address === 'string' ? raw.address : '';
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category,
    description: typeof raw.description === 'string' ? raw.description : '',
    address_line: (raw.address_line ?? legacyAddress).trim(),
    area: typeof raw.area === 'string' ? raw.area.trim() : '',
    city: typeof raw.city === 'string' ? raw.city.trim() : '',
    state: typeof raw.state === 'string' ? raw.state.trim() : '',
    latitude: raw.latitude,
    longitude: raw.longitude,
    phone: raw.phone ?? null,
    notes: raw.notes ?? null,
    images: Array.isArray(raw.images) ? raw.images.filter((url): url is string => typeof url === 'string' && url.length > 0) : [],
    is_active: Boolean(raw.is_active),
    sort_order: typeof raw.sort_order === 'number' ? raw.sort_order : 0,
    created_at: raw.created_at ?? new Date().toISOString(),
    updated_at: raw.updated_at ?? new Date().toISOString(),
  };
}

export function normalizeCategory(raw: Partial<AdminPlaceCategory> & Pick<AdminPlaceCategory, 'id' | 'slug' | 'name'>): AdminPlaceCategory {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: typeof raw.description === 'string' ? raw.description : '',
    icon: raw.icon || 'store',
    is_active: Boolean(raw.is_active),
    sort_order: typeof raw.sort_order === 'number' ? raw.sort_order : 0,
    created_at: raw.created_at ?? new Date().toISOString(),
    updated_at: raw.updated_at ?? new Date().toISOString(),
  };
}

export const SEED_CATEGORIES: AdminPlaceCategory[] = [
  {
    id: 1,
    slug: 'supermarket',
    name: 'Supermarket',
    description: 'Grocery and household shopping',
    icon: 'shopping-cart',
    is_active: true,
    sort_order: 1,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 2,
    slug: 'pharmacy',
    name: 'Pharmacy',
    description: 'Medicine and personal care',
    icon: 'pill',
    is_active: true,
    sort_order: 2,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 3,
    slug: 'bank',
    name: 'Bank',
    description: 'Cash deposit, withdrawal, or account help',
    icon: 'landmark',
    is_active: true,
    sort_order: 3,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 4,
    slug: 'hospital',
    name: 'Hospital',
    description: 'Clinic or hospital pickup',
    icon: 'building-2',
    is_active: true,
    sort_order: 4,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 5,
    slug: 'filling_station',
    name: 'Filling station',
    description: 'Fuel or LPG',
    icon: 'fuel',
    is_active: true,
    sort_order: 5,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 6,
    slug: 'market',
    name: 'Market',
    description: 'Open market or plaza',
    icon: 'shopping-bag',
    is_active: true,
    sort_order: 6,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 7,
    slug: 'hotel',
    name: 'Hotel',
    description: 'Hotel or guest house',
    icon: 'hotel',
    is_active: true,
    sort_order: 7,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 8,
    slug: 'restaurant',
    name: 'Restaurant',
    description: 'Restaurant or eatery',
    icon: 'utensils',
    is_active: true,
    sort_order: 8,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 9,
    slug: 'lounge',
    name: 'Lounge',
    description: 'Bar, café, or lounge',
    icon: 'wine',
    is_active: true,
    sort_order: 9,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 10,
    slug: 'other',
    name: 'Other',
    description: 'Anything else runners can visit',
    icon: 'store',
    is_active: true,
    sort_order: 10,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
];

export const SEED_PLACES: AdminPlace[] = [
  {
    id: 1,
    name: 'Shoprite Ikeja City Mall',
    category: 'supermarket',
    description: 'Full-service supermarket inside Ikeja City Mall. Good for grocery lists and household restocks.',
    address_line: 'Ikeja City Mall, Obafemi Awolowo Way',
    area: 'Ikeja',
    city: 'Ikeja',
    state: 'Lagos',
    latitude: 6.6194,
    longitude: 3.3578,
    phone: null,
    notes: 'Main entrance near cinema',
    images: [
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=640&h=640&fit=crop',
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=640&h=640&fit=crop',
    ],
    is_active: true,
    sort_order: 1,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 2,
    name: 'HealthPlus Lekki',
    category: 'pharmacy',
    description: 'Pharmacy on Admiralty Way for prescriptions, OTC meds, and personal care.',
    address_line: 'Admiralty Way',
    area: 'Lekki Phase 1',
    city: 'Eti-Osa',
    state: 'Lagos',
    latitude: 6.4478,
    longitude: 3.4722,
    phone: '08090000001',
    notes: null,
    images: ['https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=640&h=640&fit=crop'],
    is_active: true,
    sort_order: 2,
    created_at: '2026-03-02T10:00:00Z',
    updated_at: '2026-03-02T10:00:00Z',
  },
  {
    id: 3,
    name: 'GTBank Victoria Island',
    category: 'bank',
    description: 'GTBank branch on Oyin Jolayemi for deposits, withdrawals, and account help.',
    address_line: 'Plot 1669, Oyin Jolayemi Street',
    area: 'Victoria Island',
    city: 'Lagos Island',
    state: 'Lagos',
    latitude: 6.4281,
    longitude: 3.4219,
    phone: null,
    notes: 'Ask for express teller when busy',
    images: ['https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=640&h=640&fit=crop'],
    is_active: true,
    sort_order: 3,
    created_at: '2026-03-03T10:00:00Z',
    updated_at: '2026-03-03T10:00:00Z',
  },
  {
    id: 4,
    name: 'ABC Supermarket Yaba',
    category: 'supermarket',
    description: 'Neighbourhood supermarket on Herbert Macaulay Way — sample place you can edit freely.',
    address_line: 'Herbert Macaulay Way',
    area: 'Yaba',
    city: 'Yaba',
    state: 'Lagos',
    latitude: 6.5095,
    longitude: 3.3715,
    phone: null,
    notes: 'Sample place — edit or delete freely',
    images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=640&h=640&fit=crop'],
    is_active: false,
    sort_order: 4,
    created_at: '2026-03-04T10:00:00Z',
    updated_at: '2026-03-04T10:00:00Z',
  },
];
