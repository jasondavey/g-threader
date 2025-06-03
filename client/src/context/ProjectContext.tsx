import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Project, ProjectWithStats } from '../types/types';

interface ProjectContextType {
  projects: ProjectWithStats[];
  selectedProject: ProjectWithStats | null;
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  selectProject: (projectId: string | null) => void;
  createProject: (name: string) => Promise<Project | null>;
  deleteProject: (id: string, deleteExports?: boolean) => Promise<boolean>;
  addExportToProject: (projectId: string, filename: string) => Promise<boolean>;
  removeExportFromProject: (projectId: string, filename: string) => Promise<boolean>;
  getProjectForExport: (filename: string) => ProjectWithStats | null;
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  selectedProject: null,
  loading: false,
  error: null,
  fetchProjects: async () => {},
  selectProject: () => {},
  createProject: async () => null,
  deleteProject: async () => false,
  addExportToProject: async () => false,
  removeExportFromProject: async () => false,
  getProjectForExport: () => null,
});

export const useProjects = () => useContext(ProjectContext);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    console.log('fetchProjects called');
    setLoading(true);
    setError(null);
    
    try {
      console.log('Making fetch request to /api/projects');
      const response = await fetch('/api/projects');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed data:', data);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      // The API returns an array directly (not an object with a projects property)
      // Ensure we handle the response correctly regardless of format
      const projectsArray = Array.isArray(data) ? data : 
                           (data && data.projects && Array.isArray(data.projects) ? data.projects : []);
      
      console.log('Projects array after processing:', projectsArray);
      
      // Add stats to each project
      const projectsWithStats: ProjectWithStats[] = projectsArray.map((project: Project) => {
        const withStats = {
          ...project,
          exportCount: Array.isArray(project.exportFiles) ? project.exportFiles.length : 0
        };
        console.log('Project with stats:', withStats);
        return withStats;
      });
      
      console.log('Setting projects state with:', projectsWithStats);
      setProjects(projectsWithStats);
      
      // If there was a selected project, update it with the new data
      if (selectedProject) {
        const updatedSelected = projectsWithStats.find(p => p.id === selectedProject.id) || null;
        console.log('Updating selected project:', updatedSelected);
        setSelectedProject(updatedSelected);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching projects';
      console.error('Error fetching projects:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  const selectProject = (projectId: string | null) => {
    if (!projectId) {
      setSelectedProject(null);
      return;
    }
    
    const project = projects.find(p => p.id === projectId) || null;
    setSelectedProject(project);
  };

  const createProject = async (name: string): Promise<Project | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create project: ${response.statusText}`);
      }
      
      const newProject = await response.json();
      
      // Add the stats property
      const projectWithStats: ProjectWithStats = {
        ...newProject,
        exportCount: 0
      };
      
      // Update projects list
      setProjects(prevProjects => [...prevProjects, projectWithStats]);
      
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error creating project';
      console.error('Error creating project:', errorMessage);
      setError(errorMessage);
      // Rethrow the error so it can be caught by the component
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string, deleteExports: boolean = false): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Add query parameter to delete exports if requested
      const url = deleteExports ? 
        `/api/projects/${id}?deleteExports=true` : 
        `/api/projects/${id}`;
      
      console.log(`Deleting project ${id}${deleteExports ? ' with exports' : ''}`);
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete project: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Delete project response:', result);
      
      // Update projects list
      setProjects(prevProjects => prevProjects.filter(p => p.id !== id));
      
      // If the deleted project was selected, deselect it
      if (selectedProject && selectedProject.id === id) {
        setSelectedProject(null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error deleting project';
      console.error('Error deleting project:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addExportToProject = async (projectId: string, filename: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/exports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add export to project: ${response.statusText}`);
      }
      
      // Update projects to reflect the change
      await fetchProjects();
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error adding export to project';
      console.error('Error adding export to project:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeExportFromProject = async (projectId: string, filename: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/exports/${filename}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to remove export from project: ${response.statusText}`);
      }
      
      // Update projects to reflect the change
      await fetchProjects();
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error removing export from project';
      console.error('Error removing export from project:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getProjectForExport = (filename: string): ProjectWithStats | null => {
    const project = projects.find(p => p.exportFiles.includes(filename));
    return project || null;
  };

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // We're disabling the eslint rule because fetchProjects is defined within this component
  // and adding it to the dependency array would cause an infinite loop

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        loading,
        error,
        fetchProjects,
        selectProject,
        createProject,
        deleteProject,
        addExportToProject,
        removeExportFromProject,
        getProjectForExport,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
