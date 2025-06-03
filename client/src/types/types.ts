export interface ExportFile {
  filename: string;
  path: string;
  size: number;
  created: string;
}

export interface Project {
  id: string;
  name: string;
  created: string;
  exportFiles: string[];
}

export interface ProjectWithStats extends Project {
  exportCount: number;
}

export interface SearchParams {
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  subject?: string;
  hasAttachments?: boolean;
  includeLabels?: string[];
  customQuery?: string;
  maxResults?: number;
  exportFormat?: string;
  exportName: string;
  projectId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface ExportCreationResponse {
  success: boolean;
  filename: string;
  path: string;
  size: number;
  created: string;
}
