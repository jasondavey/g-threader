import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SubjectIcon from '@mui/icons-material/Subject';

interface Email {
  id: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  date: string;
  snippet?: string;
  body?: string;
  attachments?: any[];
}

interface ThreadDetailProps {
  open: boolean;
  onClose: () => void;
  filename: string;
  threadId: string | null;
  isSelected: boolean;
  onToggleSelect: (threadId: string) => void;
}

const ThreadDetailDialog: React.FC<ThreadDetailProps> = ({ 
  open, 
  onClose, 
  filename, 
  threadId,
  isSelected,
  onToggleSelect
}) => {
  const [thread, setThread] = useState<{
    threadId: string;
    subject: string;
    participants: string[];
    messageCount: number;
    dateRange: {
      start: string;
      end: string;
    };
    emails: Email[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !threadId || !filename) return;

    const fetchThreadDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/threads/${filename}/thread/${threadId}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching thread: ${response.statusText}`);
        }
        
        const data = await response.json();
        setThread(data);
      } catch (err) {
        console.error('Failed to fetch thread details:', err);
        setError('Could not load thread details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchThreadDetails();
  }, [open, threadId, filename]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleToggleSelect = () => {
    if (threadId) {
      onToggleSelect(threadId);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '80vh' }
      }}
    >
      {loading ? (
        <DialogContent sx={{ textAlign: 'center', py: 5 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading thread details...
          </Typography>
        </DialogContent>
      ) : error ? (
        <DialogContent>
          <Alert severity="error">{error}</Alert>
        </DialogContent>
      ) : thread ? (
        <>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SubjectIcon />
              <Typography variant="h6" component="span">
                {thread.subject || '(No subject)'}
              </Typography>
            </Box>
            <Button
              onClick={onClose}
              color="inherit"
              size="small"
              startIcon={<CloseIcon />}
            >
              Close
            </Button>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ px: 3, py: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  <strong>Participants:</strong> {thread.participants.join(', ')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DateRangeIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  <strong>Date Range:</strong> {formatDate(thread.dateRange.start)} - {formatDate(thread.dateRange.end)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  <strong>Messages:</strong> {thread.emails.length}
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Thread Content
            </Typography>
            
            <Box sx={{ maxHeight: '50vh', overflow: 'auto', mb: 2 }}>
              {thread.emails.map((email, index) => (
                <Paper key={email.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2">
                      <strong>From:</strong> {email.from}
                    </Typography>
                    <Chip 
                      label={`#${index + 1}`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>To:</strong> {email.to}
                  </Typography>
                  
                  {email.cc && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>CC:</strong> {email.cc}
                    </Typography>
                  )}
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Date:</strong> {formatDate(email.date)}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Subject:</strong> {email.subject || '(No subject)'}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {email.body || email.snippet || '(No content)'}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
            <Button
              variant={isSelected ? "contained" : "outlined"}
              color={isSelected ? "primary" : "inherit"}
              onClick={handleToggleSelect}
            >
              {isSelected ? 'Selected for Document' : 'Include in Document'}
            </Button>
            <Button onClick={onClose} color="primary">
              Close
            </Button>
          </DialogActions>
        </>
      ) : (
        <DialogContent>
          <Alert severity="info">No thread data available</Alert>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default ThreadDetailDialog;
