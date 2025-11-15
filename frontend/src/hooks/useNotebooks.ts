import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Helper to get user token for cache isolation
const getUserToken = () => localStorage.getItem('token');

export const useNotebooks = () => {
  const token = getUserToken();
  return useQuery({
    queryKey: ['notebooks', token],
    queryFn: () => api.getNotebooks(),
  });
};

export const useNotebook = (id: string) => {
  const token = getUserToken();
  return useQuery({
    queryKey: ['notebook', id, token],
    queryFn: async () => {
      console.log('Fetching notebook with ID:', id);
      const result = await api.getNotebook(id);
      console.log('API response:', result);
      return result;
    },
    enabled: !!id,
  });
};

export const useCreateNotebook = () => {
  const queryClient = useQueryClient();
  const token = getUserToken();
  
  return useMutation({
    mutationFn: (data: any) => api.createNotebook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks', token] });
    },
  });
};

export const useUpdateNotebook = () => {
  const queryClient = useQueryClient();
  const token = getUserToken();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.updateNotebook(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notebook', variables.id, token] });
      queryClient.invalidateQueries({ queryKey: ['notebooks', token] });
    },
  });
};

export const useDeleteNotebook = () => {
  const queryClient = useQueryClient();
  const token = getUserToken();
  
  return useMutation({
    mutationFn: (id: string) => api.deleteNotebook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks', token] });
    },
  });
};
