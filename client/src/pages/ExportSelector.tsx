import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  ListItemIcon, 
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSelection } from '../context/SelectionContext';

interface ExportFile {
  filename: string;
  path: string;
  created: string;
}

const ExportSelector: React.FC = () => {
  const [exports, setExports] = useState<ExportFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const { setSelectedExport, setSelectedThreads } = useSelection();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExports = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/exports');
        
        if (!response.ok) {
          throw new Error(`Error fetching exports: ${response.statusText}`);
        }
        
        const data = await response.json();
        setExports(data);
      } catch (err) {
        console.error('Failed to fetch exports:', err);
        setError('Could not load export files. Please make sure the server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchExports();
  }, []);

  const handleSelectExport = (filename: string) => {
    setSelectedExport(filename);
    setSelectedThreads([]); // Clear previously selected threads
    navigate(`/threads/${filename}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
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

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

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

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Select an Email Export
      </Typography>
      
      <Typography variant="body1" paragraph>
        Select a JSON export file to generate a court-ready document from.
      </Typography>
      
      {exports.length === 0 ? (
        <Alert severity="info" sx={{ my: 2 }}>
          No export files found. Please generate an export first using the Gmail export feature.
        </Alert>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {exports.map((exportFile, index) => (
            <React.Fragment key={exportFile.filename}>
              {index > 0 && <Divider />}
              <ListItem 
                disablePadding
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={(e) => handleDeleteClick(e, exportFile.filename)}
                    sx={{ mr: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemButton onClick={() => handleSelectExport(exportFile.filename)}>
                  <ListItemIcon>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={exportFile.filename} 
                    secondary={`Created: ${formatDate(exportFile.created)}`}
                  />
                </ListItemButton>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Confirmation Dialog */}
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
