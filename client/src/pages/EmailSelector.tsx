import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Button,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';
import { useProjects } from '../context/ProjectContext';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
}

const EmailSelector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProject } = useProjects();
  
  // State for email selection
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'sender' | 'subject'>('date');
  
  // Load email search results
  useEffect(() => {
    const searchParams = location.state?.searchParams;
    
    if (!searchParams) {
      setError('No search parameters provided. Please go back to the search page.');
      setLoading(false);
      return;
    }
    
    const fetchEmails = async () => {
      try {
        setLoading(true);
        
        // Call API to search for emails
        const response = await fetch('/api/search-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchParams),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to search emails');
        }
        
        const data = await response.json();
        setEmails(data.emails);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmails();
  }, [location.state]);
  
  // Handle email selection
  const handleToggleEmail = (emailId: string) => {
    setSelectedEmails(prev => {
      if (prev.includes(emailId)) {
        return prev.filter(id => id !== emailId);
      } else {
        return [...prev, emailId];
      }
    });
  };
  
  // Handle selecting all emails
  const handleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map(email => email.id));
    }
  };
  
  // Filter emails based on search query
  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from.toLowerCase().includes(query) ||
      email.to.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)
    );
  });
  
  // Sort emails based on sortBy value
  const sortedEmails = [...filteredEmails].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'sender':
        return a.from.localeCompare(b.from);
      case 'subject':
        return a.subject.localeCompare(b.subject);
      default:
        return 0;
    }
  });
  
  // Continue to the analysis step with selected emails
  const handleContinue = async () => {
    if (selectedEmails.length === 0) {
      setError('Please select at least one email to continue.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Save the selection to create an export file
      const response = await fetch('/api/create-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject?.id,
          emailIds: selectedEmails,
          exportName: `${selectedProject?.name || 'Export'}-${new Date().toISOString().slice(0, 10)}`
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create export');
      }
      
      const data = await response.json();
      
      // Navigate to analysis page with the export file info
      navigate('/analysis', { 
        state: { 
          filename: data.filename,
          emailCount: selectedEmails.length,
          projectId: selectedProject?.id,
          projectName: selectedProject?.name
        } 
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Select Emails for Analysis
      </Typography>
      
      <Typography variant="body1" paragraph>
        Review and select emails for inclusion in your analysis. You've found {emails.length} emails matching your search criteria.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {selectedProject && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="subtitle1">
            Project: <strong>{selectedProject.name}</strong>
          </Typography>
        </Paper>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <TextField
          label="Filter Emails"
          variant="outlined"
          size="small"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value as 'date' | 'sender' | 'subject')}
          >
            <MenuItem value="date">Date (newest first)</MenuItem>
            <MenuItem value="sender">Sender</MenuItem>
            <MenuItem value="subject">Subject</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button 
          variant="outlined" 
          onClick={handleSelectAll}
        >
          {selectedEmails.length === filteredEmails.length && filteredEmails.length > 0 ? 'Deselect All' : 'Select All'}
        </Button>
        
        <Chip 
          label={`${selectedEmails.length} selected`} 
          color="primary" 
          variant={selectedEmails.length > 0 ? 'filled' : 'outlined'} 
        />
      </Box>
      
      <Paper elevation={2} sx={{ mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {sortedEmails.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  No emails found matching your criteria.
                </Typography>
              </Box>
            ) : (
              <List>
                {sortedEmails.map((email, index) => (
                  <React.Fragment key={email.id}>
                    {index > 0 && <Divider />}
                    <ListItem 
                      button
                      onClick={() => handleToggleEmail(email.id)}
                      selected={selectedEmails.includes(email.id)}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedEmails.includes(email.id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemIcon>
                        <EmailIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: selectedEmails.includes(email.id) ? 'bold' : 'normal' }}>
                              {email.subject}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(email.date).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" component="span" color="text.primary">
                              From: {email.from}
                            </Typography>
                            <Typography variant="body2" component="div" color="text.secondary" sx={{ mt: 0.5 }}>
                              {email.snippet}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </>
        )}
      </Paper>
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/search')}
          disabled={loading}
        >
          Back to Search
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleContinue}
          disabled={loading || selectedEmails.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Processing...' : 'Continue to Analysis'}
        </Button>
      </Box>
    </Box>
  );
};

export default EmailSelector;
