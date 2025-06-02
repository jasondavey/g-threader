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
  CircularProgress
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
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
              <ListItem disablePadding>
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
    </Box>
  );
};

export default ExportSelector;
