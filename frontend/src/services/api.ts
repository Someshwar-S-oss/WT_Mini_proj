import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token expiration
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only redirect to login for 401 (Unauthorized - invalid/expired token)
        // Don't redirect for 403 (Forbidden - valid token but no permission)
        if (error.response?.status === 401) {
          // Check if it's actually an auth issue (not just a missing token for public endpoint)
          const isAuthEndpoint = error.config?.url?.includes('/auth/');
          const hasToken = localStorage.getItem('token');
          
          // Only clear token and redirect if we had a token that was rejected
          // or if it's an auth endpoint that failed
          if (hasToken || isAuthEndpoint) {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: any) {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async login(data: any) {
    const response = await this.api.post('/auth/login', data);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Notebook endpoints
  async getNotebooks() {
    const response = await this.api.get('/notebooks');
    return response.data;
  }

  async createNotebook(data: any) {
    const response = await this.api.post('/notebooks', data);
    return response.data;
  }

  async getNotebook(id: string) {
    const response = await this.api.get(`/notebooks/${id}`);
    return response.data;
  }

  async updateNotebook(id: string, data: any) {
    const response = await this.api.put(`/notebooks/${id}`, data);
    return response.data;
  }

  async deleteNotebook(id: string) {
    const response = await this.api.delete(`/notebooks/${id}`);
    return response.data;
  }

  async searchPublicNotebooks(query?: string, courseName?: string) {
    const response = await this.api.get('/notebooks/public', {
      params: { query, courseName },
    });
    return response.data;
  }

  // Branch endpoints
  async getBranches(notebookId: string) {
    const response = await this.api.get(`/notebooks/${notebookId}/branches`);
    return response.data;
  }

  async createBranch(notebookId: string, data: any) {
    const response = await this.api.post(`/notebooks/${notebookId}/branches`, data);
    return response.data;
  }

  async deleteBranch(notebookId: string, branchName: string) {
    const response = await this.api.delete(`/notebooks/${notebookId}/branches/${branchName}`);
    return response.data;
  }

  async checkoutBranch(notebookId: string, branchName: string) {
    const response = await this.api.post(`/notebooks/${notebookId}/branches/${branchName}/checkout`);
    return response.data;
  }

  // Commit endpoints
  async getCommits(notebookId: string, branch?: string, limit?: number) {
    const response = await this.api.get(`/notebooks/${notebookId}/commits`, {
      params: { branch, limit },
    });
    return response.data;
  }

  async createCommit(notebookId: string, data: any) {
    const response = await this.api.post(`/notebooks/${notebookId}/commits`, data);
    return response.data;
  }

  async getCommit(notebookId: string, hash: string) {
    const response = await this.api.get(`/notebooks/${notebookId}/commits/${hash}`);
    return response.data;
  }

  async getCommitDiff(notebookId: string, hash: string) {
    const response = await this.api.get(`/notebooks/${notebookId}/commits/${hash}/diff`);
    return response.data;
  }

  async getFileTree(notebookId: string, commit?: string) {
    const response = await this.api.get(`/notebooks/${notebookId}/commits/files`, {
      params: { commit },
    });
    return response.data;
  }

  async getFileContent(notebookId: string, branch: string, path: string) {
    const response = await this.api.get(`/notebooks/${notebookId}/commits/file-content`, {
      params: { path, commit: branch },
    });
    return response.data;
  }

  // File operations
  async saveFile(notebookId: string, data: { branch: string; filePath: string; content: string }) {
    const response = await this.api.post(`/notebooks/${notebookId}/files`, data);
    return response.data;
  }

  async getStatus(notebookId: string) {
    const response = await this.api.get(`/notebooks/${notebookId}/status`);
    return response.data;
  }

  // File upload endpoints
  async uploadFile(notebookId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.api.post(`/notebooks/${notebookId}/uploads`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async uploadFiles(notebookId: string, files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const response = await this.api.post(`/notebooks/${notebookId}/uploads/batch`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // Star/Favorite endpoints
  async starNotebook(notebookId: string) {
    const response = await this.api.post(`/notebooks/${notebookId}/star`);
    return response.data;
  }

  async unstarNotebook(notebookId: string) {
    const response = await this.api.delete(`/notebooks/${notebookId}/star`);
    return response.data;
  }

  async getStarredNotebooks() {
    const response = await this.api.get('/notebooks/starred');
    return response.data;
  }

  async getStarStatus(notebookId: string) {
    const response = await this.api.get(`/notebooks/${notebookId}/star/status`);
    return response.data;
  }

  // Fork endpoint
  async forkNotebook(notebookId: string) {
    const response = await this.api.post(`/notebooks/${notebookId}/fork`);
    return response.data;
  }

  // Activity endpoints
  async getNotebookActivity(notebookId: string, limit?: number) {
    const response = await this.api.get(`/notebooks/${notebookId}/activity`, {
      params: { limit },
    });
    return response.data;
  }

  async getUserActivity(limit?: number) {
    const response = await this.api.get('/notebooks/activity/me', {
      params: { limit },
    });
    return response.data;
  }

  // Search endpoint
  async searchNotebooks(query?: string, course?: string, sort?: string) {
    const response = await this.api.get('/notebooks/search', {
      params: { q: query, course, sort },
    });
    return response.data;
  }

  // Notification endpoints
  async getNotifications(unreadOnly: boolean = false, limit?: number) {
    const response = await this.api.get('/notifications', {
      params: { unreadOnly, limit },
    });
    return response.data;
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.api.patch('/notifications/read-all');
    return response.data;
  }

  async deleteNotification(notificationId: string) {
    const response = await this.api.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  // Comment endpoints
  async getComments(notebookId: string, commitId?: string, filePath?: string) {
    const response = await this.api.get(`/notebooks/${notebookId}/comments`, {
      params: { commitId, filePath },
    });
    return response.data;
  }

  async createComment(notebookId: string, data: any) {
    const response = await this.api.post(`/notebooks/${notebookId}/comments`, data);
    return response.data;
  }

  async updateComment(notebookId: string, commentId: string, content: string) {
    const response = await this.api.put(`/notebooks/${notebookId}/comments/${commentId}`, { content });
    return response.data;
  }

  async deleteComment(notebookId: string, commentId: string) {
    const response = await this.api.delete(`/notebooks/${notebookId}/comments/${commentId}`);
    return response.data;
  }

  // Generic post method for flexibility
  async post(url: string, data: any) {
    const response = await this.api.post(url, data);
    return response.data;
  }

  // Generic get method for flexibility
  async get(url: string, params?: any) {
    const response = await this.api.get(url, { params });
    return response.data;
  }
}

export default new ApiService();
