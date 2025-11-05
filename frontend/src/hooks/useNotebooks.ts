import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useNotebooks = () => {
  return useQuery({
    queryKey: ['notebooks'],
    queryFn: () => api.getNotebooks(),
  });
};

export const useNotebook = (id: string) => {
  return useQuery({
    queryKey: ['notebook', id],
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
  
  return useMutation({
    mutationFn: (data: any) => api.createNotebook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
};

export const useUpdateNotebook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.updateNotebook(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notebook', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
};

export const useDeleteNotebook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.deleteNotebook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
};
