import React, { useState, useEffect } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography, 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle, 
  TextField,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  Alert,
  Checkbox
} from '@mui/material';
import { useProjects } from '../context/ProjectContext';

interface ProjectSelectorProps {
  label?: string;
  helperText?: string;
  fullWidth?: boolean;
  placeholder?: string;
  error?: string;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ label, helperText, fullWidth = false, placeholder, error }) => {
  const { 
    projects, 
    selectedProject, 
    loading, 
    error: projectError, 
    selectProject, 
    createProject, 
    deleteProject,
    fetchProjects
  } = useProjects();
  
  // Debug projects on mount and when they change
  useEffect(() => {
    console.log('ProjectSelector - projects state changed:', projects);
    console.log('ProjectSelector - projects array size:', Array.isArray(projects) ? projects.length : 'not an array');
    // No need to force refresh here since we already do it on component mount
  }, [projects, fetchProjects]);
  
  // Show success message when projects load
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  useEffect(() => {
    if (Array.isArray(projects) && projects.length > 0 && !loading) {
      setShowSuccessAlert(true);
      // Hide success message after 3 seconds
      const timer = setTimeout(() => setShowSuccessAlert(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [projects, loading]);
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [nameError, setNameError] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);
  const [deleteWithExports, setDeleteWithExports] = useState(false);
  
  const handleProjectChange = (event: any) => {
    console.log('handleProjectChange called with value:', event.target.value);
    const projectId = event.target.value;
    selectProject(projectId);
  };
  
  // Immediately fetch projects when component mounts
  useEffect(() => {
    console.log('ProjectSelector - Initial mount, fetching projects');
    fetchProjects();
    
    // Add event listener for opening project dialog
    const handleOpenProjectDialog = () => {
      console.log('ProjectSelector - Received open-project-dialog event');
      setOpenCreateDialog(true);
    };
    
    window.addEventListener('open-project-dialog', handleOpenProjectDialog);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('open-project-dialog', handleOpenProjectDialog);
    };
    // We're using empty deps to run only on mount - adding fetchProjects would cause
    // the effect to re-run when fetchProjects changes, which is not what we want
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleCreateProject = async () => {
    // Validate project name
    if (!newProjectName.trim()) {
      setNameError('Project name is required');
      return;
    }
    
    if (newProjectName.length < 3) {
      setNameError('Project name must be at least 3 characters');
      return;
    }
    
    // Perform a thorough check for existing project names
    const normalizedNewName = newProjectName.trim().toLowerCase();
    
    // First refresh the projects list to ensure we have the latest data
    try {
      await fetchProjects();
    } catch (err) {
      console.error('Error refreshing projects list:', err);
      // Continue with local validation even if refresh fails
    }
    
    // Now check against the refreshed projects list
    const existingProject = Array.isArray(projects) && 
      projects.find(p => p.name.toLowerCase() === normalizedNewName);
      
    if (existingProject) {
      setNameError(`A project with the name "${newProjectName.trim()}" already exists`);
      
      // If the project exists, we could offer to select it instead
      console.log('Project already exists, id:', existingProject.id);
      return;
    }
    
    setDialogLoading(true);
    setNameError(''); // Clear any previous errors
    
    try {
      const newProject = await createProject(newProjectName.trim());
      
      if (newProject) {
        // Select the newly created project
        selectProject(newProject.id);
        setOpenCreateDialog(false);
        setNewProjectName('');
      }
    } catch (err) {
      console.error('Project creation error:', err);
      
      // Handle server-side validation error
      if (err instanceof Error) {
        if (err.message.includes('already exists')) {
          // Refresh projects to get the duplicate project
          await fetchProjects();
          setNameError(`A project with the name "${newProjectName.trim()}" already exists`);
        } else {
          setNameError(err.message || 'Failed to create project');
        }
      } else {
        setNameError('Failed to create project');
      }
    } finally {
      setDialogLoading(false);
    }
  };
  
  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    
    setDialogLoading(true);
    
    try {
      // Pass the deleteWithExports flag to the deleteProject function
      const success = await deleteProject(selectedProject.id, deleteWithExports);
      
      if (success) {
        setOpenDeleteDialog(false);
        // Reset the deleteWithExports flag after successful deletion
        setDeleteWithExports(false);
      }
    } finally {
      setDialogLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Use a different approach for date formatting to avoid type issues
      return `${date.toLocaleDateString()} (${date.toLocaleTimeString()})`;
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  return (
    <Box>
      {showSuccessAlert && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Projects loaded successfully. {projects.length} project(s) available.
        </Alert>
      )}
      
      {projectError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {projectError}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FormControl fullWidth={fullWidth} error={!!error || !!projectError}>
          <InputLabel id="project-select-label">Project</InputLabel>
          <Select
            labelId="project-select-label"
            value={selectedProject?.id || ''}
            onChange={handleProjectChange as any}
            label="Project" 
            displayEmpty
            renderValue={(selected) => {
              console.log('renderValue called with selected:', selected);
              console.log('Available projects:', projects);
              
              if (!selected) {
                return <Typography component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>Select a project</Typography>;
              }
              
              const project = projects.find(p => p.id === selected);
              console.log('Found project:', project);
              return project ? project.name : 'Unknown Project';
            }}
            startAdornment={
              loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null
            }
          >
            <MenuItem disabled value="">
              <em>Select a project</em>
            </MenuItem>
            
            {Array.isArray(projects) && projects.length > 0 ? (
              projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled value="">
                <em>No projects available</em>
              </MenuItem>
            )}
          </Select>
        </FormControl>
        
        <Button 
          variant="outlined" 
          color="primary" 
          sx={{ ml: 2, whiteSpace: 'nowrap' }}
          onClick={() => setOpenCreateDialog(true)}
        >
          New Project
        </Button>
      </Box>
      
      {selectedProject && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle1">
              <strong>{selectedProject.name}</strong>
            </Typography>
            
            <Divider orientation="vertical" flexItem />
            
            <Chip 
              label={`${selectedProject.exportCount} exports`} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
            
            {selectedProject && selectedProject.created && (
              <Chip 
                label={`Created ${formatDate(selectedProject.created)}`} 
                size="small" 
                variant="outlined" 
              />
            )}
            
            <Button 
              variant="outlined" 
              color="error" 
              size="small"
              disabled={selectedProject.exportCount > 0}
              onClick={() => setOpenDeleteDialog(true)}
            >
              Delete
            </Button>
          </Stack>
          
          {selectedProject && selectedProject.exportCount && selectedProject.exportCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              This project has associated exports and cannot be deleted. Remove all exports first.
            </Typography>
          )}
        </Box>
      )}
      
      {/* Create Project Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for your new project. Projects help you organize your email exports.
          </DialogContentText>
          
          {nameError && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {nameError}
            </Alert>
          )}
          
          {/* Debugging info */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 1, mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                Available projects: {Array.isArray(projects) ? projects.length : 0}
              </Typography>
              {Array.isArray(projects) && projects.length > 0 && (
                <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                  Project names: {projects.map(p => p.name).join(', ')}
                </Typography>
              )}
            </Box>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            value={newProjectName}
            onChange={(e) => {
              setNewProjectName(e.target.value);
              setNameError('');
            }}
            error={!!nameError}
            helperText="Project name must be unique and at least 3 characters"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)} disabled={dialogLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained" 
            color="primary"
            disabled={dialogLoading}
            startIcon={dialogLoading ? <CircularProgress size={20} /> : null}
          >
            {dialogLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Project Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => {
        setOpenDeleteDialog(false);
        setDeleteWithExports(false); // Reset when dialog is closed
      }}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the project "{selectedProject?.name}"? 
            This action cannot be undone.
          </DialogContentText>
          {selectedProject && selectedProject.exportCount && selectedProject.exportCount > 0 && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                This project has {selectedProject.exportCount} associated export{selectedProject.exportCount > 1 ? 's' : ''}.
              </Alert>
              
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <Checkbox 
                  checked={deleteWithExports}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteWithExports(e.target.checked)}
                  disabled={dialogLoading}
                  color="error"
                />
                <Typography variant="body2" color={deleteWithExports ? "error" : "text.secondary"}>
                  Also delete all {selectedProject.exportCount} export file{selectedProject.exportCount > 1 ? 's' : ''} associated with this project
                </Typography>
              </Box>
              
              {deleteWithExports && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Warning: This will permanently delete all export files associated with this project. This action cannot be undone.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenDeleteDialog(false);
              setDeleteWithExports(false); // Reset when canceled
            }} 
            disabled={dialogLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteProject} 
            variant="contained" 
            color="error"
            disabled={!!(dialogLoading || (selectedProject && selectedProject.exportCount && selectedProject.exportCount > 0 && !deleteWithExports))}
            startIcon={dialogLoading ? <CircularProgress size={20} /> : null}
          >
            {dialogLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectSelector;
