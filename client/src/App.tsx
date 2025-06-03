import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container, AppBar, Toolbar, Typography, Paper } from '@mui/material';
import ExportSelector from './pages/ExportSelector';
import ThreadSelector from './pages/ThreadSelector';
import DocumentPreview from './pages/DocumentPreview';
import ExportSearch from './pages/ExportSearch';
import EmailSelector from './pages/EmailSelector';
import AnalysisReport from './pages/AnalysisReport';
import { SelectionProvider } from './context/SelectionContext';
import { ProjectProvider } from './context/ProjectContext';
import ProjectSelectorWrapper from './components/ProjectSelectorWrapper';

// These will be created for our new workflow

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <SelectionProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Gmail Court Document Generator
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container component="main" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/exports" replace />} />
              <Route path="/exports" element={<ExportSelector />} />
              <Route path="/search" element={<ExportSearch />} />
              <Route path="/select-emails" element={<EmailSelector />} />
              <Route path="/threads/:filename" element={<ThreadSelector />} />
              <Route path="/preview" element={<DocumentPreview />} />
              <Route path="/analysis" element={<AnalysisReport />} />
              {/* New routes will be added here */}
            </Routes>
          </Paper>
          <ProjectSelectorWrapper />
        </Container>
        
        <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: '#f5f5f5' }}>
          <Container maxWidth="sm">
            <Typography variant="body2" color="text.secondary" align="center">
              Gmail Exporter — Court Document Generator
            </Typography>
          </Container>
        </Box>
      </Box>
      </SelectionProvider>
    </ProjectProvider>
  );
};

export default App;
