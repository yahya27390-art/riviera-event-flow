import { toast } from 'sonner';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
export const queryClientInstance = new QueryClient({
  queryCache: new QueryCache({ onError: error => toast.error('تعذر تحميل البيانات: ' + error.message) }),
  mutationCache: new MutationCache({ onError: error => toast.error(error.message || 'لم تكتمل العملية') }),
  defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 1 }, mutations: { retry: false } },
});
