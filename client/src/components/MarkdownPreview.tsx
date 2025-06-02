import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Paper, Typography } from '@mui/material';
import '../styles/MarkdownStyles.css';

interface MarkdownPreviewProps {
  content: string;
  maxHeight?: string | number;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, maxHeight = '600px' }) => {
  if (!content) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No content to preview
        </Typography>
      </Box>
    );
  }

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 3, 
        maxHeight, 
        overflow: 'auto',
        backgroundColor: '#fff',
        fontFamily: 'serif'
      }}
    >
      <div className="markdown-preview">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </Paper>
  );
};

export default MarkdownPreview;
