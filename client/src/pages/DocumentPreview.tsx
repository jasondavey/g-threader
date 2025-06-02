import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Tabs,
  Tab,
  FormControlLabel,
  Radio,
  RadioGroup,
  Snackbar,
  Divider,
  Link
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import { useSelection } from '../context/SelectionContext';
import ReactMarkdown from 'react-markdown';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preview-tabpanel-${index}`}
      aria-labelledby={`preview-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const DocumentPreview: React.FC = () => {
  const { selectedExport, selectedThreads, documentFormat, setDocumentFormat, generatedDocumentPath, setGeneratedDocumentPath } = useSelection();
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedExport || selectedThreads.length === 0) {
      navigate('/exports');
      return;
    }

    const fetchPreview = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: selectedExport,
            selectedThreads
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to generate preview: ${response.statusText}`);
        }
        
        const data = await response.json();
        setPreviewContent(data.preview);
      } catch (err) {
        console.error('Error generating preview:', err);
        setError('Failed to generate document preview. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [selectedExport, selectedThreads, navigate]);

  const handleGenerateDocument = async () => {
    if (!selectedExport || selectedThreads.length === 0) {
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: selectedExport,
          selectedThreads,
          outputFormat: documentFormat
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate document: ${response.statusText}`);
      }
      
      const data = await response.json();
      setGeneratedDocumentPath(data.outputPath);
      setSuccess(`Document successfully generated as ${documentFormat.toUpperCase()}`);
      // Switch to the download tab
      setTabValue(1);
    } catch (err) {
      console.error('Error generating document:', err);
      setError('Failed to generate final document. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDocumentFormat(event.target.value as 'md' | 'pdf');
  };

  const handleCloseSnackbar = () => {
    setSuccess(null);
    setError(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate(`/threads/${selectedExport}`)} 
        sx={{ mb: 2 }}
      >
        Back to Thread Selection
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        Document Preview & Generation
      </Typography>
      
      <Paper sx={{ width: '100%', height: 'calc(100% - 100px)' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="document preview tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<DescriptionIcon />} label="PREVIEW" />
          <Tab 
            icon={<DownloadIcon />} 
            label="DOWNLOAD" 
            disabled={!generatedDocumentPath} 
          />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Document Preview ({selectedThreads.length} thread{selectedThreads.length !== 1 ? 's' : ''})
            </Typography>
            
            <Box>
              <RadioGroup
                row
                aria-labelledby="document-format-radio-group"
                name="document-format-radio-buttons-group"
                value={documentFormat}
                onChange={handleFormatChange}
              >
                <FormControlLabel value="md" control={<Radio />} label="Markdown" />
                <FormControlLabel value="pdf" control={<Radio />} label="PDF" />
              </RadioGroup>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ 
            height: 'calc(100% - 120px)', 
            overflow: 'auto', 
            border: '1px solid #ddd',
            p: 2, 
            mb: 2,
            bgcolor: '#fff'
          }}>
            {/* Markdown preview */}
            <Box sx={{ fontFamily: 'serif' }}>
              <ReactMarkdown>{previewContent}</ReactMarkdown>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={documentFormat === 'pdf' ? <PictureAsPdfIcon /> : <DescriptionIcon />}
              onClick={handleGenerateDocument}
              disabled={generating}
            >
              {generating ? (
                <React.Fragment>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Generating...
                </React.Fragment>
              ) : (
                `Generate ${documentFormat.toUpperCase()} Document`
              )}
            </Button>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Your Document is Ready!
            </Typography>
            
            <Typography variant="body1" paragraph>
              Your court-ready document has been generated and is ready for download.
            </Typography>
            
            {generatedDocumentPath && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon />}
                component={Link}
                href={`/api/download/${generatedDocumentPath ? generatedDocumentPath.split('/').pop() : ''}`}
                sx={{ mt: 2 }}
              >
                Download {documentFormat.toUpperCase()} Document
              </Button>
            )}
          </Box>
        </TabPanel>
      </Paper>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={success}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentPreview;
