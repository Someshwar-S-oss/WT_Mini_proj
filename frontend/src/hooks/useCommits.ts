import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useCommits = (notebookId: string, branch?: string) => {
  return useQuery({
    queryKey: ['commits', notebookId, branch],
    queryFn: () => api.getCommits(notebookId, branch),
    enabled: !!notebookId,
  });
};

export const useCommit = (notebookId: string, hash: string) => {
  return useQuery({
    queryKey: ['commit', notebookId, hash],
    queryFn: () => api.getCommit(notebookId, hash),
    enabled: !!notebookId && !!hash,
  });
};

export const useCreateCommit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ notebookId, branch, message, files }: { 
      notebookId: string; 
      branch: string; 
      message: string; 
      files: Array<{ path: string; content: string }> 
    }) =>
      api.createCommit(notebookId, { branch, message, files }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commits', variables.notebookId] });
      queryClient.invalidateQueries({ queryKey: ['fileTree', variables.notebookId] });
    },
  });
};

export const useCommitDiff = (notebookId: string, hash: string) => {
  return useQuery({
    queryKey: ['commitDiff', notebookId, hash],
    queryFn: () => api.getCommitDiff(notebookId, hash),
    enabled: !!notebookId && !!hash,
  });
};

export const useFileTree = (notebookId: string, commit?: string) => {
  return useQuery({
    queryKey: ['fileTree', notebookId, commit],
    queryFn: () => api.getFileTree(notebookId, commit),
    enabled: !!notebookId,
  });
};

export const useFileContent = (notebookId: string, path: string, commit?: string) => {
  return useQuery({
    queryKey: ['fileContent', notebookId, path, commit],
    queryFn: () => api.getFileContent(notebookId, commit || 'main', path),
    enabled: !!notebookId && !!path,
  });
};
