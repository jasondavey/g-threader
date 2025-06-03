import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';
import ProjectSelector from './ProjectSelector';
import { useProjects } from '../context/ProjectContext';

const ProjectSelectorWrapper: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { selectedProject } = useProjects();

  useEffect(() => {
    // Add event listener for the custom event
    const handleOpenDialog = () => {
      setOpen(true);
    };

    window.addEventListener('open-project-dialog', handleOpenDialog);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('open-project-dialog', handleOpenDialog);
    };
  }, []);

  const handleSelectConfirm = () => {
    // Close the dialog when user confirms selection
    setOpen(false);
    
    // Optional: trigger a custom event to notify other components that a project was selected
    const event = new CustomEvent('project-selection-confirmed', { 
      detail: { projectId: selectedProject?.id }
    });
    window.dispatchEvent(event);
  };
  
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md">
      <DialogTitle>Select or Create Project</DialogTitle>
      <DialogContent>
        <ProjectSelector />
      </DialogContent>
      <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', px: 1 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSelectConfirm} 
            variant="contained" 
            color="primary"
            disabled={!selectedProject}
          >
            Select
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectSelectorWrapper;
