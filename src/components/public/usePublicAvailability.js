import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { getPublicAvailability } from '@/functions/getPublicAvailability';

export default function usePublicAvailability({ hasAccess, accessToken, isAuthenticated, currentDate, selectedSiteName, bedConfigId }) {
  const [catalog, setCatalog] = useState([]);
  const startDate = format(currentDate, 'yyyy-MM-dd');
  const query = useInfiniteQuery({
    queryKey: ['publicAvailability', isAuthenticated, accessToken, startDate, selectedSiteName, bedConfigId],
    enabled: hasAccess,
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await getPublicAvailability({ accessToken, startDate, siteName: selectedSiteName, bedConfigId, cursor: pageParam });
      return data;
    },
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
    retry: false,
  });
  const agencyQuery = useQuery({
    queryKey: ['publicBookingAgencies', isAuthenticated],
    enabled: hasAccess && isAuthenticated,
    queryFn: () => base44.entities.Agency.filter({}, { sort: 'name', limit: 50, fields: ['name', 'email', 'phone', 'contacts'] }),
  });
  const first = query.data?.pages[0];
  const visibleRooms = useMemo(() => {
    const pages = query.data?.pages || [];
    const sites = pages[0]?.sites || [];
    return pages.flatMap(page => page.rooms).sort((a, b) => {
      const siteA = sites.find(site => site.id === a.site_id)?.name || '';
      const siteB = sites.find(site => site.id === b.site_id)?.name || '';
      return siteA.localeCompare(siteB) || String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true });
    });
  }, [query.data]);
  useEffect(() => {
    setCatalog(previous => [...new Map([...previous, ...visibleRooms].map(room => [room.id, room])).values()]);
  }, [visibleRooms]);
  const rooms = useMemo(() => [...new Map([...catalog, ...visibleRooms].map(room => [room.id, room])).values()], [catalog, visibleRooms]);
  return {
    rooms, visibleRooms, sites: first?.sites || [], bedConfigurations: first?.bedConfigurations || [],
    reservations: query.data?.pages.flatMap(page => page.reservations) || [], agencies: agencyQuery.data?.items || [],
    confirmTitle: first?.confirmation?.title || 'Request received', confirmMessage: first?.confirmation?.message || 'We will get back to you shortly.',
    isLoading: hasAccess && query.isPending, error: query.error,
    hasNextPage: query.hasNextPage, isFetchingNextPage: query.isFetchingNextPage,
    loadMore: query.fetchNextPage, reload: () => query.refetch(),
  };
}