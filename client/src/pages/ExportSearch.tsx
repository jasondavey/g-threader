import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  FormControlLabel, 
  Checkbox, 
  Paper, 
  Alert,
  FormHelperText,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useProjects } from '../context/ProjectContext';

const ExportSearch: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject } = useProjects();
  
  // Form state
  const [startDate, setStartDate] = useState<Date | null>(new Date('2024-02-08'));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [from, setFrom] = useState('jasonrdavey@gmail.com');
  const [to, setTo] = useState('gojodi99@gmail.com, theenglishwife@gmail.com');
  const [subject, setSubject] = useState('therapy');
  const [hasAttachments, setHasAttachments] = useState(false);
  const [includeLabels] = useState<string[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that a project is selected
    if (!selectedProject) {
      setProjectError('Please select a project before continuing');
      return;
    }
    
    // Validate that at least one search parameter is provided
    const hasSearchParams = !!(
      startDate || endDate || from.trim() || to.trim() || subject.trim() || hasAttachments
    );
    
    if (!hasSearchParams) {
      setError('Please provide at least one search parameter');
      return;
    }
    
    // Clear any previous errors
    setError(null);
    setProjectError(null);
    
    // Show loading state
    setIsSubmitting(true);
    
    try {
      // Prepare search parameters
      const searchParams = {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        from: from.trim() || undefined,
        to: to.trim() || undefined,
        subject: subject.trim() || undefined,
        hasAttachments,
        includeLabels
      };
      
      // Navigate to email selection page with search parameters
      navigate('/select-emails', { 
        state: { 
          searchParams,
          projectId: selectedProject.id
        } 
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsSubmitting(false);
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Step 1: Search for Emails
      </Typography>
      
      <Typography variant="body1" paragraph>
        Start by selecting a project and specifying your search criteria to find relevant emails.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Project
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {selectedProject ? (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1">
                Selected Project: <strong>{selectedProject.name}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created: {new Date(selectedProject.created).toLocaleString()}
              </Typography>
            </Paper>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Please select an existing project or create a new one.
            </Alert>
          )}
          
          {projectError && (
            <FormHelperText error sx={{ mb: 1 }}>{projectError}</FormHelperText>
          )}
          
          <Box sx={{ mt: 1 }}>
            <Button variant="contained" color="primary" onClick={() => {
              const event = new CustomEvent('open-project-dialog');
              window.dispatchEvent(event);
            }}>
              {selectedProject ? 'Change Project' : 'Select/Create Project'}
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <form onSubmit={handleSubmit}>
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Email Search Criteria
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue: Date | null) => setStartDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue: Date | null) => setEndDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="From"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="sender@example.com"
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="To"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject Contains"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="meeting, report, invoice, etc."
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={hasAttachments}
                    onChange={(e) => setHasAttachments(e.target.checked)}
                    name="hasAttachments"
                  />
                }
                label="Only include emails with attachments"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Custom Gmail Query"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Advanced Gmail search query"
                margin="normal"
                helperText="Advanced Gmail search operators (e.g., 'label:important has:attachment')"
              />
            </Grid>
          </Grid>
        </Paper>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Searching...' : 'Search & Continue'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default ExportSearch;

// This component is for step 1 of the workflow:
// 1. Create a Project
// 2. Do an email search
// 3. Select the emails for inclusion
// 4. Analysis and report
