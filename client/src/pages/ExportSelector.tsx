import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Tabs,
  Tab,
  Paper,
  Chip,
  Menu,
  MenuItem,
  Badge,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StorageIcon from '@mui/icons-material/Storage';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSelection } from '../context/SelectionContext';
import { useProjects } from '../context/ProjectContext';
import { formatDistanceToNow } from 'date-fns';
import { ExportFile } from '../types/types';

interface ExportWithProject extends ExportFile {
  projectId?: string;
  projectName?: string;
}

const ExportSelector: React.FC = () => {
  const [exports, setExports] = useState<ExportWithProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [deleteProjectConfirmOpen, setDeleteProjectConfirmOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [projectNameToDelete, setProjectNameToDelete] = useState<string>('');
  const [deleteWithExports, setDeleteWithExports] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [tabValue, setTabValue] = useState<number>(0); // 0 for All Exports, 1 for By Project
  const [exportToAddToProject, setExportToAddToProject] = useState<string | null>(null);
  const [projectMenuAnchorEl, setProjectMenuAnchorEl] = useState<null | HTMLElement>(null);
  const { setSelectedExport, setSelectedThreads } = useSelection();
  const { 
    projects, 
    loading: projectsLoading, 
    addExportToProject, 
    removeExportFromProject, 
    getProjectForExport, 
    deleteProject 
  } = useProjects();
  const navigate = useNavigate();

  const fetchExports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/exports');
      
      if (!response.ok) {
        throw new Error(`Error fetching exports: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Enhance exports with project info
      const exportsWithProject: ExportWithProject[] = data.map((exp: ExportFile) => {
        const project = getProjectForExport(exp.filename);
        return {
          ...exp,
          projectId: project?.id,
          projectName: project?.name
        };
      });
      
      setExports(exportsWithProject);
    } catch (err) {
      console.error('Failed to fetch exports:', err);
      setError('Could not load export files. Please make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Refresh exports when projects change
  useEffect(() => {
    if (!projectsLoading) {
      fetchExports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsLoading]);

  const handleSelectExport = (filename: string) => {
    setSelectedExport(filename);
    setSelectedThreads([]); // Clear previously selected threads
    navigate(`/threads/${filename}`);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return new Date(dateString).toLocaleString();
    }
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleAddToProjectClick = (e: React.MouseEvent<HTMLElement>, filename: string) => {
    e.stopPropagation(); // Prevent triggering the parent list item click
    setExportToAddToProject(filename);
    setProjectMenuAnchorEl(e.currentTarget);
  };
  
  const handleProjectMenuClose = () => {
    setProjectMenuAnchorEl(null);
  };
  
  const handleAddToProject = async (projectId: string) => {
    if (!exportToAddToProject) return;
    
    try {
      const success = await addExportToProject(projectId, exportToAddToProject);
      
      if (success) {
        setSnackbarMessage(`Export added to project successfully`);
        setSnackbarOpen(true);
        fetchExports(); // Refresh the exports list
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error adding export to project';
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    } finally {
      setProjectMenuAnchorEl(null);
      setExportToAddToProject(null);
    }
  };
  
  const handleRemoveFromProject = async (projectId: string, filename: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent list item click
    
    try {
      const success = await removeExportFromProject(projectId, filename);
      
      if (success) {
        setSnackbarMessage(`Export removed from project successfully`);
        setSnackbarOpen(true);
        fetchExports(); // Refresh the exports list
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error removing export from project';
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation(); // Prevent triggering the parent list item click
    console.log('Delete button clicked for file:', { filename });
    setFileToDelete(filename);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      // Extract just the filename from the export files array to get all properties
      const fileInfo = exports.find(exp => exp.filename === fileToDelete);
      
      if (!fileInfo) {
        throw new Error(`File information not found for ${fileToDelete}`);
      }
      
      // Make sure we're using the exact filename as provided by the server
      console.log(`Attempting to delete file: ${fileInfo.filename}`);
      
      const response = await fetch(`/api/exports/${encodeURIComponent(fileInfo.filename)}`, {
        method: 'DELETE',
      });
      
      // Get more detailed error information from the response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete response error:', { 
          status: response.status, 
          statusText: response.statusText,
          errorData 
        });
        throw new Error(`Error deleting file (${response.status}): ${errorData.error || response.statusText}`);
      }
      
      // Parse success response
      const result = await response.json();
      console.log('Delete success response:', result);
      
      // Remove the deleted file from the state
      setExports(exports.filter(exp => exp.filename !== fileToDelete));
      setSnackbarMessage(result.message || `${fileToDelete} was deleted successfully`);
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to delete export file:', err);
      setSnackbarMessage(err instanceof Error ? err.message : 'Failed to delete export file');
      setSnackbarOpen(true);
    } finally {
      setDeleteConfirmOpen(false);
      setFileToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setFileToDelete(null);
  };
  
  const handleDeleteProjectClick = (projectId: string, projectName: string) => {
    setProjectToDelete(projectId);
    setProjectNameToDelete(projectName);
    setDeleteWithExports(false);
    setDeleteProjectConfirmOpen(true);
  };
  
  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      const success = await deleteProject(projectToDelete, deleteWithExports);
      
      if (success) {
        setSnackbarMessage(
          deleteWithExports 
            ? `Project "${projectNameToDelete}" and all its exports were deleted successfully` 
            : `Project "${projectNameToDelete}" was deleted successfully`
        );
        setSnackbarOpen(true);
        // Refresh exports list
        fetchExports();
      } else {
        setSnackbarMessage(`Failed to delete project "${projectNameToDelete}"`); 
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      setSnackbarMessage(`Error deleting project: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setDeleteProjectConfirmOpen(false);
      setProjectToDelete(null);
      setProjectNameToDelete('');
      setDeleteWithExports(false);
    }
  };
  
  const handleCancelDeleteProject = () => {
    setDeleteProjectConfirmOpen(false);
    setProjectToDelete(null);
    setProjectNameToDelete('');
    setDeleteWithExports(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Get orphaned exports (not in any project)
  const orphanedExports = exports.filter(exp => !exp.projectId);
  
  // Create a mapping of exports by project
  const exportsByProject = exports.reduce((acc, exp) => {
    if (exp.projectId) {
      if (!acc[exp.projectId]) {
        acc[exp.projectId] = [];
      }
      acc[exp.projectId].push(exp);
    }
    return acc;
  }, {} as Record<string, ExportWithProject[]>);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }
  
  const renderExportCard = (exportFile: ExportWithProject) => (
    <Card sx={{ mb: 2 }} key={exportFile.filename}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ mb: 1 }}>
            {exportFile.filename}
          </Typography>
          {exportFile.projectId && (
            <Chip 
              label={exportFile.projectName} 
              color="primary" 
              size="small" 
              icon={<FolderIcon />}
              onDelete={(e) => handleRemoveFromProject(exportFile.projectId!, exportFile.filename, e)}
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 1 }}>
          <Chip 
            icon={<CalendarTodayIcon />}
            label={`Created ${formatDate(exportFile.created)}`} 
            variant="outlined" 
            size="small"
          />
          
          <Chip 
            icon={<StorageIcon />}
            label={formatBytes(exportFile.size || 0)} 
            variant="outlined" 
            size="small"
          />
        </Box>
      </CardContent>
      <CardActions>
        <Button 
          size="small" 
          color="primary"
          onClick={() => handleSelectExport(exportFile.filename)}
        >
          View Threads
        </Button>
        
        {!exportFile.projectId && (
          <Button 
            size="small"
            startIcon={<AddIcon />}
            onClick={(e) => handleAddToProjectClick(e, exportFile.filename)}
          >
            Add to Project
          </Button>
        )}
        
        <Button 
          size="small" 
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(e, exportFile.filename);
          }}
        >
          Delete
        </Button>
      </CardActions>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Email Exports
          </Typography>
          
          <Typography variant="body1">
            Select an export to view its email threads or create a new export.
          </Typography>
        </Box>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/search')}
        >
          New Export
        </Button>
      </Box>
      
      {exports.length === 0 ? (
        <Alert severity="info" sx={{ my: 2 }}>
          No export files found. Click "New Export" to create your first email export.
        </Alert>
      ) : (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="Export view tabs">
              <Tab label="All Exports" id="tab-0" />
              <Tab 
                label={
                  <Badge 
                    badgeContent={projects.length} 
                    color="primary" 
                    sx={{ '& .MuiBadge-badge': { right: -3, top: 3 } }}
                  >
                    <Box sx={{ pr: 2.5 }}>By Project</Box>
                  </Badge>
                } 
                id="tab-1" 
                sx={{ minWidth: 120 }}
              />
            </Tabs>
          </Box>
          
          {tabValue === 0 && (
            <Box>
              {exports.map(renderExportCard)}
            </Box>
          )}
          
          {tabValue === 1 && (
            <Box>
              {projects.length === 0 ? (
                <Alert severity="info" sx={{ my: 2 }}>
                  No projects created yet. Create a project when creating a new export.
                </Alert>
              ) : (
                <Box>
                  {projects.map((project) => (
                    <Paper key={project.id} sx={{ mb: 4, p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h5" component="h2" gutterBottom>
                          {project.name}
                        </Typography>
                        
                        <Tooltip title="Delete Project">
                          <IconButton 
                            color="error" 
                            onClick={() => handleDeleteProjectClick(project.id, project.name)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Chip 
                          label={`${project.exportCount} exports`} 
                          color="primary" 
                          variant="outlined"
                        />
                        
                        <Chip 
                          label={`Created ${formatDate(project.created)}`} 
                          variant="outlined"
                        />
                      </Box>
                      
                      {exportsByProject[project.id] ? (
                        <Grid container spacing={2}>
                          {exportsByProject[project.id].map(renderExportCard)}
                        </Grid>
                      ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          No exports in this project yet.
                        </Alert>
                      )}
                    </Paper>
                  ))}
                  
                  {orphanedExports.length > 0 && (
                    <Paper sx={{ mb: 4, p: 3 }}>
                      <Typography variant="h5" component="h2" gutterBottom>
                        Exports Without Project
                      </Typography>
                      
                      <Alert severity="info" sx={{ mb: 2 }}>
                        These exports are not associated with any project. Add them to a project for better organization.
                      </Alert>
                      
                      <Grid container spacing={2}>
                        {orphanedExports.map(renderExportCard)}
                      </Grid>
                    </Paper>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Export Deletion Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Delete Export File
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete {fileToDelete}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Deletion Confirmation Dialog */}
      <Dialog
        open={deleteProjectConfirmOpen}
        onClose={handleCancelDeleteProject}
        aria-labelledby="delete-project-dialog-title"
        aria-describedby="delete-project-dialog-description"
      >
        <DialogTitle id="delete-project-dialog-title">
          Delete Project
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-project-dialog-description">
            Are you sure you want to delete the project "{projectNameToDelete}"? 
            This action cannot be undone.
          </DialogContentText>
          
          {projectToDelete && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <Checkbox 
                  checked={deleteWithExports}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteWithExports(e.target.checked)}
                  color="error"
                />
                <Typography variant="body2" color={deleteWithExports ? "error" : "text.secondary"}>
                  Also delete all export files associated with this project
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
          <Button onClick={handleCancelDeleteProject}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDeleteProject} 
            color="error" 
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Menu */}
      <Menu
        anchorEl={projectMenuAnchorEl}
        open={Boolean(projectMenuAnchorEl)}
        onClose={handleProjectMenuClose}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">Select a Project</Typography>
        </MenuItem>
        <Divider />
        {projects.map((project) => (
          <MenuItem 
            key={project.id} 
            onClick={() => handleAddToProject(project.id)}
          >
            {project.name}
          </MenuItem>
        ))}
        {projects.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No projects available
            </Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default ExportSelector;
