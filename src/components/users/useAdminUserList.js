import { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listBookingUsers } from '@/functions/listBookingUsers';

export default function useAdminUserList(searchTerm, enabled) {
  const [search, setSearch] = useState(searchTerm);
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchTerm), 250);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const query = useInfiniteQuery({
    queryKey: ['booking-admin-users', search],
    queryFn: async ({ pageParam }) => {
      const response = await listBookingUsers({ search, offset: pageParam });
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (page) => page.next_offset ?? undefined,
    enabled,
    retry: false,
  });
  const pages = query.data?.pages || [];
  return {
    ...query,
    users: pages.flatMap((page) => page.users),
    displayedCount: pages[pages.length - 1]?.displayed_count || 0,
  };
}