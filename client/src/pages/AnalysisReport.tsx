import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import AssessmentIcon from '@mui/icons-material/Assessment';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AnalysisData {
  topSenders: { sender: string; count: number }[];
  emailsByDay: { day: string; count: number }[];
  emailsByHour: { hour: number; count: number }[];
  subjectWordFrequency: { word: string; count: number }[];
  totalWordCount: number;
  averageResponseTime: number;
  threadCount: number;
  attachmentCount: number;
  wordCloudData: { text: string; value: number }[];
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AnalysisReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for analysis data
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  
  // Get export info from location state
  const filename = location.state?.filename;
  const emailCount = location.state?.emailCount;
  const projectName = location.state?.projectName;
  
  // Run analysis on the selected emails
  useEffect(() => {
    if (!filename) {
      setError('No export file specified. Please go back and create an export.');
      setLoading(false);
      return;
    }
    
    const analyzeEmails = async () => {
      try {
        setLoading(true);
        
        // Call API to analyze the export file
        const response = await fetch(`/api/analyze/${filename}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze emails');
        }
        
        const responseData = await response.json();
        
        // Transform the server response to match the AnalysisData interface
        const analysisData: AnalysisData = {
          topSenders: responseData.topSenders || [],
          emailsByDay: responseData.volumeByDate || [],
          emailsByHour: [], // Not provided by the server
          subjectWordFrequency: responseData.wordFrequency || [],
          totalWordCount: responseData.summary?.totalEmails || 0,
          averageResponseTime: responseData.summary?.avgResponseTime || 0,
          threadCount: responseData.summary?.threadCount || 0,
          attachmentCount: responseData.summary?.totalAttachments || 0,
          wordCloudData: (responseData.wordFrequency || []).map((item: { word: string; count: number }) => ({
            text: item.word,
            value: item.count
          })),
          sentimentAnalysis: responseData.sentimentAnalysis || {
            positive: 0,
            neutral: 0,
            negative: 0
          }
        };
        
        setAnalysisData(analysisData);
        
        // Generate report URL
        const reportResponse = await fetch(`/api/generate-report/${filename}`, {
          method: 'GET'
        });
        
        if (reportResponse.ok) {
          const reportData = await reportResponse.json();
          setReportUrl(reportData.reportUrl);
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    analyzeEmails();
  }, [filename]);
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Chart data for email volume by day
  const emailVolumeData = {
    labels: analysisData?.emailsByDay.map(item => item.day) || [],
    datasets: [
      {
        label: 'Emails',
        data: analysisData?.emailsByDay.map(item => item.count) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1,
      },
    ],
  };
  
  // Chart data for top senders
  const topSendersData = {
    labels: analysisData?.topSenders.map(item => item.sender) || [],
    datasets: [
      {
        label: 'Emails Sent',
        data: analysisData?.topSenders.map(item => item.count) || [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Chart data for sentiment analysis
  const sentimentData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: analysisData ? [
          analysisData.sentimentAnalysis.positive,
          analysisData.sentimentAnalysis.neutral,
          analysisData.sentimentAnalysis.negative,
        ] : [0, 0, 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(255, 206, 86)',
          'rgb(255, 99, 132)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Email Analysis Report
      </Typography>
      
      {projectName && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="subtitle1">
            Project: <strong>{projectName}</strong>
          </Typography>
          {emailCount && (
            <Typography variant="body2">
              Analyzing {emailCount} emails
            </Typography>
          )}
        </Paper>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Analyzing Emails...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This may take a few moments depending on the number of emails.
          </Typography>
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress />
          </Box>
        </Box>
      ) : (
        <>
          {analysisData && (
            <>
              <Paper sx={{ width: '100%', mb: 4 }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="fullWidth"
                  indicatorColor="primary"
                  textColor="primary"
                >
                  <Tab icon={<AssessmentIcon />} label="Overview" />
                  <Tab icon={<DescriptionIcon />} label="Content Analysis" />
                  <Tab icon={<CloudDownloadIcon />} label="Export Report" />
                </Tabs>
                
                <TabPanel value={tabValue} index={0}>
                  <Grid container spacing={3}>
                    {/* Summary Cards */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardHeader title="Email Volume" />
                        <CardContent>
                          <Box sx={{ height: 300 }}>
                            <Bar
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  title: {
                                    display: true,
                                    text: 'Emails by Day'
                                  }
                                }
                              }}
                              data={emailVolumeData}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardHeader title="Top Senders" />
                        <CardContent>
                          <Box sx={{ height: 300 }}>
                            <Pie
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'bottom'
                                  }
                                }
                              }}
                              data={topSendersData}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardHeader title="Sentiment Analysis" />
                        <CardContent>
                          <Box sx={{ height: 300 }}>
                            <Pie
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'bottom'
                                  }
                                }
                              }}
                              data={sentimentData}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    {/* Stats */}
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Key Statistics
                        </Typography>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Total Emails
                            </Typography>
                            <Typography variant="h5">
                              {emailCount || 0}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Thread Count
                            </Typography>
                            <Typography variant="h5">
                              {analysisData.threadCount}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Attachments
                            </Typography>
                            <Typography variant="h5">
                              {analysisData.attachmentCount}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Avg. Response Time
                            </Typography>
                            <Typography variant="h5">
                              {analysisData.averageResponseTime.toFixed(1)} hrs
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>
                </TabPanel>
                
                <TabPanel value={tabValue} index={1}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardHeader title="Common Subject Words" />
                        <CardContent>
                          <List>
                            {analysisData.subjectWordFrequency.slice(0, 10).map((item, index) => (
                              <ListItem key={index} divider={index < 9}>
                                <ListItemText
                                  primary={item.word}
                                  secondary={`${item.count} occurrences`}
                                />
                                <Chip 
                                  label={`${Math.round((item.count / analysisData.totalWordCount) * 100)}%`} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined" 
                                />
                              </ListItem>
                            ))}
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardHeader title="Sentiment Distribution" />
                        <CardContent>
                          <Typography variant="body1" paragraph>
                            Email sentiment analysis reveals the emotional tone of your communications:
                          </Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">
                              Positive: {analysisData.sentimentAnalysis.positive} emails
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={(analysisData.sentimentAnalysis.positive / emailCount) * 100}
                              color="success"
                              sx={{ height: 10, borderRadius: 5, mb: 1 }}
                            />
                          </Box>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">
                              Neutral: {analysisData.sentimentAnalysis.neutral} emails
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={(analysisData.sentimentAnalysis.neutral / emailCount) * 100}
                              color="info"
                              sx={{ height: 10, borderRadius: 5, mb: 1 }}
                            />
                          </Box>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">
                              Negative: {analysisData.sentimentAnalysis.negative} emails
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={(analysisData.sentimentAnalysis.negative / emailCount) * 100}
                              color="error"
                              sx={{ height: 10, borderRadius: 5 }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </TabPanel>
                
                <TabPanel value={tabValue} index={2}>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Download Analysis Report
                    </Typography>
                    
                    <Typography variant="body1" paragraph>
                      Your detailed analysis report is ready for download in PDF format.
                    </Typography>
                    
                    {reportUrl ? (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CloudDownloadIcon />}
                        href={reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="large"
                        sx={{ mt: 2 }}
                      >
                        Download PDF Report
                      </Button>
                    ) : (
                      <Alert severity="info">
                        Report generation is still in progress. Please check back in a moment.
                      </Alert>
                    )}
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                      This report includes detailed analysis of your selected emails,
                      including communication patterns, content analysis, and data visualizations.
                    </Typography>
                  </Box>
                </TabPanel>
              </Paper>
              
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/select-emails')}
                >
                  Back to Email Selection
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/exports')}
                >
                  Back to All Exports
                </Button>
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default AnalysisReport;
