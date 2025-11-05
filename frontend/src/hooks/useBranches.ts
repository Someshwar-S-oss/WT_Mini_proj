import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useBranches = (notebookId: string) => {
  return useQuery({
    queryKey: ['branches', notebookId],
    queryFn: () => api.getBranches(notebookId),
    enabled: !!notebookId,
  });
};

export const useCreateBranch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ notebookId, branchName, sourceBranch }: { notebookId: string; branchName: string; sourceBranch?: string }) =>
      api.createBranch(notebookId, { branchName, sourceBranch }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches', variables.notebookId] });
    },
  });
};

export const useDeleteBranch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ notebookId, branchName }: { notebookId: string; branchName: string }) =>
      api.deleteBranch(notebookId, branchName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches', variables.notebookId] });
    },
  });
};

export const useCheckoutBranch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ notebookId, branchName }: { notebookId: string; branchName: string }) =>
      api.checkoutBranch(notebookId, branchName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches', variables.notebookId] });
      queryClient.invalidateQueries({ queryKey: ['commits', variables.notebookId] });
      queryClient.invalidateQueries({ queryKey: ['fileTree', variables.notebookId] });
    },
  });
};
