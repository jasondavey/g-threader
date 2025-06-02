import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Checkbox,
  IconButton
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface ThreadCardProps {
  threadId: string;
  subject: string;
  participants: string[];
  messageCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  isSelected: boolean;
  onToggleSelect: (threadId: string) => void;
  onViewDetails?: (threadId: string) => void;
}

const ThreadCard: React.FC<ThreadCardProps> = ({
  threadId,
  subject,
  participants,
  messageCount,
  dateRange,
  isSelected,
  onToggleSelect,
  onViewDetails
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(threadId);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(threadId);
    }
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        border: isSelected ? '2px solid #1976d2' : '1px solid #ddd',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 2,
          borderColor: isSelected ? '#1976d2' : '#aaa'
        }
      }}
      onClick={handleToggle}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox 
              checked={isSelected} 
              onChange={() => onToggleSelect(threadId)} 
              onClick={(e) => e.stopPropagation()}
              color="primary" 
            />
            <Typography variant="h6" component="div" sx={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
              {subject || '(No subject)'}
            </Typography>
          </Box>
          <Chip 
            label={`${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`}
            size="small"
            color="primary"
            variant={isSelected ? "filled" : "outlined"}
          />
        </Box>
        
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {formatDate(dateRange.start)}
            {dateRange.start !== dateRange.end && ` - ${formatDate(dateRange.end)}`}
          </Typography>
        </Box>
        
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary" sx={{ 
            maxWidth: '80%', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {participants.join(', ')}
          </Typography>
        </Box>
      </CardContent>
      
      {onViewDetails && (
        <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
          <IconButton size="small" onClick={handleViewDetails}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </CardActions>
      )}
    </Card>
  );
};

export default ThreadCard;
