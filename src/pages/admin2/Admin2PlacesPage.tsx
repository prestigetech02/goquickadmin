import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Plus, Store } from 'lucide-react';
import {
  deleteAdminPlace,
  fetchAdminPlaceCategories,
  fetchAdminPlaces,
  setAdminPlaceActive,
} from '@/api/adminPlacesApi';
import { PlaceCategoriesCard } from '@/components/admin2/places/PlaceCategoriesCard';
import { PlaceFormDrawer, type PlaceFormMode } from '@/components/admin2/places/PlaceFormDrawer';
import { PlaceListCard, type PlaceHandlers } from '@/components/admin2/places/PlaceListCard';
import { PlaceViewDrawer } from '@/components/admin2/places/PlaceViewDrawer';
import {
  categoryLabel,
  placeFullAddress,
  uniqueSorted,
  type AdminPlace,
} from '@/components/admin2/places/presentation';
import { MetricCard, MetricGrid } from '@/components/admin2/shared/MetricCard';
import { MinimalToast } from '@/components/admin2/shared/MinimalToast';
import { PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { CardTabs, SearchField, type Notice } from '@/components/admin2/shared/TableControls';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';

type PageTab = 'places' | 'categories';
type StatusFilter = 'all' | 'active' | 'paused';

const FILTER_SELECT =
  'h-[36px] rounded-[8px] border border-[#e2e8e3] bg-white px-[10px] text-[11px] font-semibold text-[#17211b] outline-none focus:border-[#167d35]';

export function Admin2PlacesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PageTab>('places');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [formMode, setFormMode] = useState<PlaceFormMode | null>(null);
  const [viewing, setViewing] = useState<AdminPlace | null>(null);
  const [deleting, setDeleting] = useState<AdminPlace | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const showOk = useCallback((text: string) => setNotice({ tone: 'ok', text }), []);

  const placesQuery = useQuery({
    queryKey: queryKeys.places.list({ per_page: 100 }),
    queryFn: () => fetchAdminPlaces({ per_page: 100 }),
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.places.categories,
    queryFn: fetchAdminPlaceCategories,
  });

  const places = placesQuery.data?.places ?? [];
  const categories = categoriesQuery.data?.categories ?? [];
  const loading = placesQuery.isLoading || categoriesQuery.isLoading;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.places.categories });
  };

  const mutation = useMutation({
    mutationFn: async (input: { action: 'toggle' | 'delete'; place: AdminPlace }) => {
      if (input.action === 'delete') {
        await deleteAdminPlace(input.place.id);
        return null;
      }
      return setAdminPlaceActive(input.place.id, !input.place.is_active);
    },
    onSuccess: (result, input) => {
      if (input.action === 'delete') {
        setDeleting(null);
        showOk(`“${input.place.name}” is deleted.`);
      } else if (result) {
        showOk(result.is_active ? `“${result.name}” is active in Explore.` : `“${result.name}” is paused.`);
      }
      invalidate();
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'That action failed.') }),
  });

  const busy = mutation.isPending;

  const stateOptions = useMemo(() => uniqueSorted(places.map((place) => place.state)), [places]);
  const cityOptions = useMemo(
    () =>
      uniqueSorted(
        places
          .filter((place) => stateFilter === 'all' || place.state === stateFilter)
          .map((place) => place.city),
      ),
    [places, stateFilter],
  );
  const areaOptions = useMemo(
    () =>
      uniqueSorted(
        places
          .filter(
            (place) =>
              (stateFilter === 'all' || place.state === stateFilter) &&
              (cityFilter === 'all' || place.city === cityFilter),
          )
          .map((place) => place.area),
      ),
    [places, stateFilter, cityFilter],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return places.filter((place) => {
      if (status === 'active' && !place.is_active) return false;
      if (status === 'paused' && place.is_active) return false;
      if (category !== 'all' && place.category !== category) return false;
      if (stateFilter !== 'all' && place.state !== stateFilter) return false;
      if (cityFilter !== 'all' && place.city !== cityFilter) return false;
      if (areaFilter !== 'all' && place.area !== areaFilter) return false;
      if (!q) return true;
      const label = categoryLabel(place.category, categories).toLowerCase();
      const haystack = [
        place.name,
        place.address_line,
        place.area,
        place.city,
        place.state,
        placeFullAddress(place),
        label,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [places, search, status, category, stateFilter, cityFilter, areaFilter, categories]);

  const activeCount = places.filter((p) => p.is_active).length;
  const pausedCount = places.length - activeCount;
  const activeCategories = categories.filter((item) => item.is_active).length;

  const handlers: PlaceHandlers = {
    view: (place) => setViewing(place),
    edit: (place) => {
      setViewing(null);
      setFormMode({ kind: 'edit', place });
    },
    toggle: (place) => mutation.mutate({ action: 'toggle', place }),
    remove: (place) => setDeleting(place),
  };

  const onSaved = (place: AdminPlace, mode: PlaceFormMode) => {
    setFormMode(null);
    invalidate();
    showOk(mode.kind === 'edit' ? `“${place.name}” is updated.` : `“${place.name}” is added.`);
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Operations · Explore"
        title="Places Mgt"
        actionsBesideTitle
        subtitle="Curate shops and stops with an address and map pin. Requesters use these to start errands from Explore."
        actions={
          tab === 'places' ? (
            <button type="button" onClick={() => setFormMode({ kind: 'create' })} className={PRIMARY_BUTTON}>
              <Plus className="size-[15px]" strokeWidth={2} />
              Add place
            </button>
          ) : null
        }
      />

      <MinimalToast notice={notice} onDismiss={dismissNotice} />

      {(placesQuery.isError || categoriesQuery.isError) && (
        <p className="rounded-[10px] border border-[#e5a5a5] bg-[#fdeded] px-3 py-2 text-[12px] text-[#b84545]">
          {getApiErrorMessage(placesQuery.error ?? categoriesQuery.error, 'Could not load places.')}
        </p>
      )}

      <MetricGrid columns={4}>
        <MetricCard
          label="Places"
          icon={Store}
          iconColor="#167d35"
          iconBg="#eaf6ed"
          value={loading ? '…' : String(places.length)}
          context={`${activeCount} active · ${pausedCount} paused`}
        />
        <MetricCard
          label="Categories"
          icon={FolderTree}
          iconColor="#735ca8"
          iconBg="#f3f0fa"
          value={loading ? '…' : String(categories.length)}
          context={`${activeCategories} active in Explore`}
        />
        <MetricCard
          label="Active places"
          icon={Store}
          iconColor="#0d5e27"
          iconBg="#eaf6ed"
          value={loading ? '…' : String(activeCount)}
          context="Visible to requesters in Explore"
        />
        <MetricCard
          label="Paused places"
          icon={Store}
          iconColor="#7c857f"
          iconBg="#f1f4f2"
          value={loading ? '…' : String(pausedCount)}
          context="Hidden from requesters"
        />
      </MetricGrid>

      <div className="overflow-hidden rounded-[14px] border border-[#e2e8e3] bg-white">
        <CardTabs
          tabs={[
            { value: 'places', label: 'Places', count: places.length },
            { value: 'categories', label: 'Categories', count: categories.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'places' ? (
        <>
          <div className="flex flex-col gap-[12px] rounded-[14px] border border-[#e2e8e3] bg-white p-[14px] font-inter">
            <div className="flex flex-wrap items-center gap-[10px]">
              <SearchField value={search} onChange={setSearch} placeholder="Search name, area, city, or address" />
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={FILTER_SELECT}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={FILTER_SELECT}>
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                    {item.is_active ? '' : ' (paused)'}
                  </option>
                ))}
              </select>
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setCityFilter('all');
                  setAreaFilter('all');
                }}
                className={FILTER_SELECT}
              >
                <option value="all">All states</option>
                {stateOptions.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setAreaFilter('all');
                }}
                className={FILTER_SELECT}
              >
                <option value="all">All cities</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className={FILTER_SELECT}>
                <option value="all">All areas</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <PlaceListCard
            places={filtered}
            categories={categories}
            busy={busy || loading}
            handlers={handlers}
            onCreate={() => setFormMode({ kind: 'create' })}
            filterKey={`${search}|${status}|${category}|${stateFilter}|${cityFilter}|${areaFilter}`}
          />
        </>
      ) : (
        <PlaceCategoriesCard
          categories={categories}
          places={places}
          busy={busy || loading}
          onChange={() => invalidate()}
          onNotice={showOk}
          onError={(text) => setNotice({ tone: 'error', text })}
        />
      )}

      {viewing ? (
        <PlaceViewDrawer
          key={`view-${viewing.id}`}
          place={viewing}
          categories={categories}
          onClose={() => setViewing(null)}
          onEdit={handlers.edit}
        />
      ) : null}

      {formMode ? (
        <PlaceFormDrawer
          key={formMode.kind === 'create' ? 'create' : `edit-${formMode.place.id}`}
          mode={formMode}
          categories={categories}
          onClose={() => setFormMode(null)}
          onSaved={onSaved}
        />
      ) : null}

      <Modal open={deleting != null} onClose={() => (busy ? undefined : setDeleting(null))} title="Delete place?" size="sm">
        {deleting ? (
          <div className="flex flex-col gap-[14px] font-inter">
            <p className="text-[12px] leading-relaxed text-[#45514a]">
              “{deleting.name}” will be removed from Explore for requesters. Prefer pausing so history stays intact.
            </p>
            <div className="flex justify-end gap-[8px]">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={busy}
                className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
              >
                Keep it
              </button>
              {deleting.is_active ? (
                <button
                  type="button"
                  onClick={() => {
                    mutation.mutate({ action: 'toggle', place: deleting });
                    setDeleting(null);
                  }}
                  disabled={busy}
                  className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
                >
                  Pause instead
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => mutation.mutate({ action: 'delete', place: deleting })}
                disabled={busy}
                className="h-[36px] rounded-[8px] bg-[#b84545] px-[14px] text-[11px] font-semibold text-white hover:bg-[#9a3434] disabled:opacity-60"
              >
                {busy ? 'Deleting…' : 'Delete place'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
