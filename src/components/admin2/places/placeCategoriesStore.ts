import {
  EMPTY_CATEGORY_FORM,
  SEED_CATEGORIES,
  normalizeCategory,
  slugifyCategory,
  type AdminPlaceCategory,
  type PlaceCategoryForm,
} from './presentation';

const STORAGE_KEY = 'goquick.admin.place-categories.v1';

type Stored = { nextId: number; categories: AdminPlaceCategory[] };

function cloneSeed(): AdminPlaceCategory[] {
  return SEED_CATEGORIES.map((category) => ({ ...category }));
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nextId: 100, categories: cloneSeed() };
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed.categories) || typeof parsed.nextId !== 'number') {
      return { nextId: 100, categories: cloneSeed() };
    }
    return {
      nextId: parsed.nextId,
      categories: parsed.categories.map((category) => normalizeCategory(category)),
    };
  } catch {
    return { nextId: 100, categories: cloneSeed() };
  }
}

function write(data: Stored) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPlaceCategories(): AdminPlaceCategory[] {
  return read()
    .categories.slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function savePlaceCategory(form: PlaceCategoryForm, existingId?: number): AdminPlaceCategory {
  const data = read();
  const now = new Date().toISOString();
  const name = form.name.trim();
  const slug = (form.slug.trim() || slugifyCategory(name)).toLowerCase();
  const description = form.description.trim();
  const icon = form.icon.trim() || 'store';

  if (existingId != null) {
    const index = data.categories.findIndex((category) => category.id === existingId);
    if (index < 0) throw new Error('Category not found.');
    const current = data.categories[index];
    const slugTaken = data.categories.some((category) => category.slug === slug && category.id !== existingId);
    if (slugTaken) throw new Error('That category code is already used.');

    const updated: AdminPlaceCategory = {
      ...current,
      // Slug stays fixed after create so places keep a stable reference.
      name,
      description,
      icon,
      is_active: form.is_active,
      updated_at: now,
    };
    data.categories[index] = updated;
    write(data);
    return updated;
  }

  if (data.categories.some((category) => category.slug === slug)) {
    throw new Error('That category code is already used.');
  }

  const created: AdminPlaceCategory = {
    id: data.nextId,
    slug,
    name,
    description,
    icon,
    is_active: form.is_active,
    sort_order: data.categories.length + 1,
    created_at: now,
    updated_at: now,
  };
  data.nextId += 1;
  data.categories.push(created);
  write(data);
  return created;
}

export function setPlaceCategoryActive(id: number, isActive: boolean): AdminPlaceCategory {
  const data = read();
  const index = data.categories.findIndex((category) => category.id === id);
  if (index < 0) throw new Error('Category not found.');
  const updated: AdminPlaceCategory = {
    ...data.categories[index],
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };
  data.categories[index] = updated;
  write(data);
  return updated;
}

export function deletePlaceCategory(id: number): void {
  const data = read();
  data.categories = data.categories.filter((category) => category.id !== id);
  write(data);
}

export function reorderPlaceCategories(ids: number[]): AdminPlaceCategory[] {
  const data = read();
  const byId = new Map(data.categories.map((category) => [category.id, category]));
  const next: AdminPlaceCategory[] = [];
  ids.forEach((id, index) => {
    const category = byId.get(id);
    if (!category) return;
    next.push({ ...category, sort_order: index + 1, updated_at: new Date().toISOString() });
    byId.delete(id);
  });
  // Keep any missing ids at the end.
  byId.forEach((category) => next.push(category));
  data.categories = next;
  write(data);
  return loadPlaceCategories();
}

export function resetPlaceCategoriesToSeed(): AdminPlaceCategory[] {
  const data: Stored = { nextId: 100, categories: cloneSeed() };
  write(data);
  return loadPlaceCategories();
}

export function blankCategoryForm(defaults?: Partial<PlaceCategoryForm>): PlaceCategoryForm {
  return { ...EMPTY_CATEGORY_FORM, ...defaults };
}
