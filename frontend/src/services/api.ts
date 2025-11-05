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
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          window.location.href = '/login';
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
