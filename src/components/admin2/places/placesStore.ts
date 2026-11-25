import { SEED_PLACES, normalizePlace, type AdminPlace, type PlaceForm } from './presentation';

const STORAGE_KEY = 'goquick.admin.places.v3';

type Stored = { nextId: number; places: AdminPlace[] };

function cloneSeed(): AdminPlace[] {
  return SEED_PLACES.map((place) => ({ ...place, images: [...place.images] }));
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nextId: 100, places: cloneSeed() };
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed.places) || typeof parsed.nextId !== 'number') {
      return { nextId: 100, places: cloneSeed() };
    }
    return {
      nextId: parsed.nextId,
      places: parsed.places.map((place) => normalizePlace(place)),
    };
  } catch {
    return { nextId: 100, places: cloneSeed() };
  }
}

function write(data: Stored) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function fromForm(form: PlaceForm) {
  return {
    name: form.name.trim(),
    category: form.category,
    description: form.description.trim(),
    address_line: form.address_line.trim(),
    area: form.area.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    phone: form.phone.trim() || null,
    notes: form.notes.trim() || null,
    images: form.images.filter(Boolean),
    is_active: form.is_active,
  };
}

export function loadPlaces(): AdminPlace[] {
  return read().places.slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function savePlace(form: PlaceForm, existingId?: number): AdminPlace {
  const data = read();
  const now = new Date().toISOString();
  const fields = fromForm(form);

  if (existingId != null) {
    const index = data.places.findIndex((place) => place.id === existingId);
    if (index < 0) throw new Error('Place not found.');
    const updated: AdminPlace = {
      ...data.places[index],
      ...fields,
      updated_at: now,
    };
    data.places[index] = updated;
    write(data);
    return updated;
  }

  const created: AdminPlace = {
    id: data.nextId,
    ...fields,
    sort_order: data.places.length + 1,
    created_at: now,
    updated_at: now,
  };
  data.nextId += 1;
  data.places.push(created);
  write(data);
  return created;
}

export function setPlaceActive(id: number, isActive: boolean): AdminPlace {
  const data = read();
  const index = data.places.findIndex((place) => place.id === id);
  if (index < 0) throw new Error('Place not found.');
  const updated: AdminPlace = {
    ...data.places[index],
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };
  data.places[index] = updated;
  write(data);
  return updated;
}

export function deletePlace(id: number): void {
  const data = read();
  data.places = data.places.filter((place) => place.id !== id);
  write(data);
}

export function resetPlacesToSeed(): AdminPlace[] {
  const data: Stored = { nextId: 100, places: cloneSeed() };
  write(data);
  return loadPlaces();
}
