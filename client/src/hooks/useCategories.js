// The marketplace categories, from the database.
//
// These used to live in `constants/categories.js`, hardcoded — which meant
// the admin panel's Category manager wrote to a collection nothing on this
// side ever read. Two lists, free to disagree, and the one an admin could
// actually edit was the one students never saw.
//
// Returns an array, never undefined, so call sites can map straight over
// it. Categories are chrome rather than page content: an empty filter row
// for the first moment is fine, and there is no separate loading state to
// thread through four components for it.
import { useQuery } from '@tanstack/react-query';

import api from '../services/api';

export const useCategories = () => {
  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data.categories),
    // They change about once a term. No point refetching them on every
    // mount of every page that shows a filter row.
    staleTime: 1000 * 60 * 30,
  });

  return data || [];
};

export default useCategories;
