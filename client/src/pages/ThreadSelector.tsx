import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Grid,
  Divider,
  Paper,
  InputAdornment,
  Container,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PreviewIcon from '@mui/icons-material/Preview';

import { useSelection } from '../context/SelectionContext';
import ThreadCard from '../components/ThreadCard';
import ThreadDetailDialog from '../components/ThreadDetailDialog';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

interface ThreadSummary {
  threadId: string;
  subject: string;
  participants: string[];
  messageCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

const ThreadSelector: React.FC = () => {
  const { filename } = useParams<{ filename: string }>();
  const navigate = useNavigate();
  const { selectedThreads, toggleThread, selectAllThreads, clearAllThreads } = useSelection();
  
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);
  const [selectedDetailThreadId, setSelectedDetailThreadId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!filename) {
      navigate('/exports');
      return;
    }

    const fetchThreads = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/threads/${filename}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch threads: ${response.statusText}`);
        }
        
        const data = await response.json();
        setThreads(data);
      } catch (err) {
        console.error('Error fetching threads:', err);
        setError('Failed to load email threads. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [filename, navigate]);

  // Filter threads based on search term
  const filteredThreads = threads.filter(thread => {
    if (!searchTerm) return true;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Search in subject
    if (thread.subject && thread.subject.toLowerCase().includes(lowerSearchTerm)) {
      return true;
    }
    
    // Search in participants
    if (thread.participants && thread.participants.some(p => p.toLowerCase().includes(lowerSearchTerm))) {
      return true;
    }
    
    return false;
  });

  const handleToggleThread = (threadId: string) => {
    toggleThread(threadId);
    
    // Update selectAll state based on whether all visible threads are selected
    const allSelected = filteredThreads.every(thread => selectedThreads.includes(thread.threadId));
    setSelectAll(allSelected);
  };

  const handleToggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      // Select all visible threads
      selectAllThreads(filteredThreads.map(thread => thread.threadId));
    } else {
      // Deselect all visible threads
      clearAllThreads(filteredThreads.map(thread => thread.threadId));
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    
    // Update selectAll state when search changes
    if (event.target.value === '') {
      const allSelected = filteredThreads.every(thread => selectedThreads.includes(thread.threadId));
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  };

  const handleOpenDetailDialog = (threadId: string) => {
    setSelectedDetailThreadId(threadId);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
  };

  const handleNavigateToPreview = () => {
    if (selectedThreads.length > 0) {
      navigate('/preview');
    }
  };

  if (loading) {
    return <Spinner message="Loading email threads..." />;
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/exports')} 
          sx={{ mb: 2 }}
        >
          Back to Export Selection
        </Button>
        <ErrorMessage message="Error loading threads" details={error} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/exports')} 
          sx={{ mb: 2 }}
        >
          Back to Export Selection
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Select Email Threads 
          {filename && <Typography variant="subtitle1" component="span" sx={{ ml: 1 }}>
            from {filename}
          </Typography>}
        </Typography>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by subject or participant..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={selectAll} 
                  onChange={handleToggleSelectAll} 
                  disabled={filteredThreads.length === 0}
                />
              }
              label={selectAll ? 'Deselect All' : 'Select All'}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PreviewIcon />}
                onClick={handleNavigateToPreview}
                disabled={selectedThreads.length === 0}
              >
                Preview Selected ({selectedThreads.length})
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Divider sx={{ mb: 3 }} />
      
      {filteredThreads.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">
            {searchTerm ? 'No matching threads found.' : 'No email threads available.'}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {searchTerm && 'Try adjusting your search criteria.'}
          </Typography>
        </Paper>
      ) : (
        <Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Showing {filteredThreads.length} thread{filteredThreads.length !== 1 ? 's' : ''}
          </Typography>
          
          <Grid container spacing={2}>
            {filteredThreads.map(thread => (
              <Grid item xs={12} key={thread.threadId}>
                <ThreadCard
                  threadId={thread.threadId}
                  subject={thread.subject}
                  participants={thread.participants}
                  messageCount={thread.messageCount}
                  dateRange={thread.dateRange}
                  isSelected={selectedThreads.includes(thread.threadId)}
                  onToggleSelect={handleToggleThread}
                  onViewDetails={() => handleOpenDetailDialog(thread.threadId)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      {selectedThreads.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleNavigateToPreview}
            endIcon={<ArrowForwardIcon />}
          >
            Preview Selected ({selectedThreads.length})
          </Button>
        </Box>
      )}
      
      <ThreadDetailDialog
        open={detailDialogOpen}
        onClose={handleCloseDetailDialog}
        filename={filename || ''}
        threadId={selectedDetailThreadId}
        isSelected={selectedDetailThreadId ? selectedThreads.includes(selectedDetailThreadId) : false}
        onToggleSelect={handleToggleThread}
      />
    </Container>
  );
};

export default ThreadSelector;
