import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Helper to get user token for cache isolation
const getUserToken = () => localStorage.getItem('token');

export const useCommits = (notebookId: string, branch?: string) => {
  const token = getUserToken();
  return useQuery({
    queryKey: ['commits', notebookId, branch, token],
    queryFn: () => api.getCommits(notebookId, branch),
    enabled: !!notebookId,
  });
};

export const useCommit = (notebookId: string, hash: string) => {
  const token = getUserToken();
  return useQuery({
    queryKey: ['commit', notebookId, hash, token],
    queryFn: () => api.getCommit(notebookId, hash),
    enabled: !!notebookId && !!hash,
  });
};

export const useCreateCommit = () => {
  const queryClient = useQueryClient();
  const token = getUserToken();
  
  return useMutation({
    mutationFn: ({ notebookId, branch, message, files }: { 
      notebookId: string; 
      branch: string; 
      message: string; 
      files: Array<{ path: string; content: string }> 
    }) =>
      api.createCommit(notebookId, { branch, message, files }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commits', variables.notebookId, token] });
      queryClient.invalidateQueries({ queryKey: ['fileTree', variables.notebookId, token] });
    },
  });
};

export const useCommitDiff = (notebookId: string, hash: string) => {
  const token = getUserToken();
  return useQuery({
    queryKey: ['commitDiff', notebookId, hash, token],
    queryFn: () => api.getCommitDiff(notebookId, hash),
    enabled: !!notebookId && !!hash,
  });
};

export const useFileTree = (notebookId: string, commit?: string) => {
  const token = getUserToken();
  return useQuery({
    queryKey: ['fileTree', notebookId, commit, token],
    queryFn: () => api.getFileTree(notebookId, commit),
    enabled: !!notebookId,
  });
};

export const useFileContent = (notebookId: string, path: string, commit?: string) => {
  const token = getUserToken();
  return useQuery({
    queryKey: ['fileContent', notebookId, path, commit, token],
    queryFn: () => api.getFileContent(notebookId, commit || 'main', path),
    enabled: !!notebookId && !!path,
  });
};
