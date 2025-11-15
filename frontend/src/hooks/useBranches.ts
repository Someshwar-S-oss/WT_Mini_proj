import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Helper to get user token for cache isolation
const getUserToken = () => localStorage.getItem('token');

export const useBranches = (notebookId: string) => {
  const token = getUserToken();
  return useQuery({
    queryKey: ['branches', notebookId, token],
    queryFn: () => api.getBranches(notebookId),
    enabled: !!notebookId,
  });
};

export const useCreateBranch = () => {
  const queryClient = useQueryClient();
  const token = getUserToken();
  
  return useMutation({
    mutationFn: ({ notebookId, branchName, sourceBranch }: { notebookId: string; branchName: string; sourceBranch?: string }) =>
      api.createBranch(notebookId, { branchName, sourceBranch }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches', variables.notebookId, token] });
    },
  });
};

export const useDeleteBranch = () => {
  const queryClient = useQueryClient();
  const token = getUserToken();
  
  return useMutation({
    mutationFn: ({ notebookId, branchName }: { notebookId: string; branchName: string }) =>
      api.deleteBranch(notebookId, branchName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches', variables.notebookId, token] });
    },
  });
};

export const useCheckoutBranch = () => {
  const queryClient = useQueryClient();
  const token = getUserToken();
  
  return useMutation({
    mutationFn: ({ notebookId, branchName }: { notebookId: string; branchName: string }) =>
      api.checkoutBranch(notebookId, branchName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches', variables.notebookId, token] });
      queryClient.invalidateQueries({ queryKey: ['commits', variables.notebookId, token] });
      queryClient.invalidateQueries({ queryKey: ['fileTree', variables.notebookId, token] });
    },
  });
};
