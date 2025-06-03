import React, { useState, useEffect, useCallback } from "react";

import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Badge,
  Card,
  CardContent,
  Alert,
} from "@mui/material";
import {
  Search as SearchIcon,
  Email as EmailIcon,
  Block as BlockIcon,
  Close as CloseIcon,
  Undo as UndoIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useProjects } from "../context/ProjectContext";

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body?: {
    plain?: string;
    html?: string;
  };
}

const EmailSelector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProject } = useProjects();

  // State for email selection
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [ignoredEmails, setIgnoredEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "sender" | "subject">("date");

  // State for preview panel
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // State for hide ignored emails toggle
  const [hideIgnored, setHideIgnored] = useState(false);

  // State for confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  // State for pagination
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Load email search results
  useEffect(() => {
    const searchParams = location.state?.searchParams;

    if (!searchParams) {
      setError(
        "No search parameters provided. Please go back to the search page."
      );
      setLoading(false);
      return;
    }

    // Reset state when search params change
    setEmails([]);
    setNextPageToken(null);
    setHasMore(true);

    const fetchEmails = async () => {
      try {
        setLoading(true);

        // Prepare request body with pagination
        const requestBody = {
          ...searchParams,
          pageToken: null, // Initial load, no page token
          maxResults: 50, // Start with a reasonable page size
        };

        const response = await fetch("/api/search-emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...requestBody,
            maxResults: 20, // Load fewer emails initially for better performance
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to search emails");
        }

        const data = await response.json();
        setEmails(data.emails || []);
        setNextPageToken(data.nextPageToken || null);
        setHasMore(!!data.nextPageToken);

        if (data.emails?.length === 0) {
          console.log("No emails found matching the search criteria");
        } else {
          console.log(`Loaded ${data.emails?.length || 0} emails`);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, [location.state]);

  // Function to load more emails
  const loadMoreEmails = useCallback(async () => {
    if (isLoadingMore || !nextPageToken) return;

    try {
      setIsLoadingMore(true);

      const searchParams = location.state?.searchParams;
      if (!searchParams) return;

      const response = await fetch("/api/search-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...searchParams,
          pageToken: nextPageToken,
          maxResults: 50,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load more emails");
      }

      const data = await response.json();

      // Filter out any duplicate emails (in case of overlap)
      const newEmails = data.emails || [];
      const existingIds = new Set(emails.map((email) => email.id));
      const uniqueNewEmails = newEmails.filter(
        (email: Email) => !existingIds.has(email.id)
      );

      setEmails((prev) => [...prev, ...uniqueNewEmails]);
      setNextPageToken(data.nextPageToken || null);
      setHasMore(!!data.nextPageToken);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load more emails"
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextPageToken, location.state?.searchParams, emails]);

  // Handle email selection
  const handleToggleEmail = (emailId: string) => {
    setSelectedEmails((prev) => {
      if (prev.includes(emailId)) {
        return prev.filter((id) => id !== emailId);
      } else {
        return [...prev, emailId];
      }
    });
  };

  // Handle selecting all emails
  const handleSelectAll = () => {
    // If all visible emails are already selected, deselect all
    const allVisibleSelected = filteredEmails.every(email => 
      selectedEmails.includes(email.id)
    );
    
    if (allVisibleSelected) {
      // Deselect all visible emails
      const visibleIds = new Set(filteredEmails.map(email => email.id));
      setSelectedEmails(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      // Select all visible emails that aren't already selected
      const visibleIds = filteredEmails.map(email => email.id);
      const newSelections = new Set([...selectedEmails, ...visibleIds]);
      setSelectedEmails(Array.from(newSelections));
    }
  };

  // Handle ignoring an email
  const handleIgnoreEmail = (emailId: string) => {
    // Remove from selected emails if it's selected
    if (selectedEmails.includes(emailId)) {
      setSelectedEmails((prev) => prev.filter((id) => id !== emailId));
    }

    // Add to ignored emails
    setIgnoredEmails((prev) => [...prev, emailId]);
  };

  // Handle unignoring an email
  const handleUnignoreEmail = (emailId: string) => {
    setIgnoredEmails((prev) => prev.filter((id) => id !== emailId));
  };

  // Handle ignore all currently filtered emails
  const handleIgnoreAll = () => {
    setConfirmAction(() => () => {
      const emailsToIgnore = filteredEmails.map((email) => email.id);

      // Remove these from selected emails
      setSelectedEmails((prev) =>
        prev.filter((id) => !emailsToIgnore.includes(id))
      );

      // Add to ignored emails (avoiding duplicates)
      setIgnoredEmails((prev) => {
        const newIgnored = [...prev];
        emailsToIgnore.forEach((id) => {
          if (!newIgnored.includes(id)) {
            newIgnored.push(id);
          }
        });
        return newIgnored;
      });

      setConfirmDialogOpen(false);
    });

    setConfirmDialogOpen(true);
  };

  // Handle unignore all emails
  const handleUnignoreAll = () => {
    setIgnoredEmails([]);
  };

  // Handle opening the preview panel
  const handleOpenPreview = async (email: Email) => {
    setPreviewEmail(email);
    setPreviewOpen(true);

    // If we don't have the full email body, fetch it
    if (!email.body) {
      setPreviewLoading(true);
      try {
        const response = await fetch(`/api/email/${email.id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch email content");
        }

        const data = await response.json();

        // Update the email in our list with the full content
        setEmails((prevEmails) => {
          return prevEmails.map((e) => {
            if (e.id === email.id) {
              return { ...e, body: data.body };
            }
            return e;
          });
        });

        // Also update the preview email
        setPreviewEmail({ ...email, body: data.body });
      } catch (err) {
        console.error("Error fetching email content:", err);
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  // Handle closing the preview panel
  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewEmail(null);
  };

  // Filter emails based on search query and ignored status
  const filteredEmails = emails.filter((email) => {
    // First check if we should hide ignored emails
    if (hideIgnored && ignoredEmails.includes(email.id)) {
      return false;
    }

    // Then filter by search query if one exists
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const searchableFields = [
      email.subject || "",
      email.from || "",
      email.to || "",
      email.snippet || "",
    ];

    return searchableFields.some((field) =>
      field.toLowerCase().includes(query)
    );
  });

  // Sort emails based on sortBy value
  const sortedEmails = [...filteredEmails].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "sender":
        return a.from.localeCompare(b.from);
      case "subject":
        return a.subject.localeCompare(b.subject);
      default:
        return 0;
    }
  });

  // Continue to the analysis step with selected emails
  const handleContinue = async () => {
    if (selectedEmails.length === 0) {
      setError("Please select at least one email to continue.");
      return;
    }

    try {
      setLoading(true);

      // Save the selection to create an export file
      const response = await fetch("/api/create-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: selectedProject?.id,
          selectedEmails: selectedEmails,
          exportName: `${selectedProject?.name || "Export"}-${new Date()
            .toISOString()
            .slice(0, 10)}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create export");
      }

      const data = await response.json();

      // Navigate to analysis page with the export file info
      navigate("/analysis", {
        state: {
          filename: data.filename,
          emailCount: selectedEmails.length,
          projectId: selectedProject?.id,
          projectName: selectedProject?.name,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Select Emails for Analysis
      </Typography>

      <Typography variant="body1" paragraph>
        Showing {emails.length} emails{hasMore ? " (scroll to load more)" : ""}{" "}
        matching your search criteria.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {selectedProject && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 3,
            bgcolor: "primary.light",
            color: "primary.contrastText",
          }}
        >
          <Typography variant="subtitle1">
            Project: <strong>{selectedProject.name}</strong>
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
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
            onChange={(e) =>
              setSortBy(e.target.value as "date" | "sender" | "subject")
            }
          >
            <MenuItem value="date">Date (newest first)</MenuItem>
            <MenuItem value="sender">Sender</MenuItem>
            <MenuItem value="subject">Subject</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper elevation={2} sx={{ mb: 3 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
              }}
            >
              <Typography variant="h6" component="h2">
                {filteredEmails.length} emails found
                {ignoredEmails.length > 0 && (
                  <Badge
                    badgeContent={ignoredEmails.length}
                    color="error"
                    sx={{ ml: 2 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      ignored
                    </Typography>
                  </Badge>
                )}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {ignoredEmails.length > 0 && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hideIgnored}
                        onChange={(e) => setHideIgnored(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Hide ignored"
                  />
                )}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        selectedEmails.length === filteredEmails.length &&
                        filteredEmails.length > 0
                      }
                      onChange={handleSelectAll}
                      indeterminate={
                        selectedEmails.length > 0 &&
                        selectedEmails.length < filteredEmails.length
                      }
                    />
                  }
                  label="Select All"
                />
                {filteredEmails.length > 0 && (
                  <Tooltip title="Ignore all displayed emails">
                    <IconButton color="default" onClick={handleIgnoreAll}>
                      <BlockIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {ignoredEmails.length > 0 && (
                  <Tooltip title="Restore all ignored emails">
                    <IconButton color="primary" onClick={handleUnignoreAll}>
                      <UndoIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
            <Divider />
            {sortedEmails.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  {loading
                    ? "Searching for emails..."
                    : "No emails found matching your criteria."}
                </Typography>
              </Box>
            ) : (
              <List>
                {sortedEmails.map((email) => (
                  <ListItem
                    key={email.id}
                    divider
                    sx={{
                      opacity: ignoredEmails.includes(email.id) ? 0.7 : 1,
                    }}
                    secondaryAction={
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {ignoredEmails.includes(email.id) ? (
                          <Tooltip title="Restore email">
                            <IconButton
                              edge="end"
                              onClick={() => handleUnignoreEmail(email.id)}
                            >
                              <UndoIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Ignore email">
                            <IconButton
                              edge="end"
                              onClick={() => handleIgnoreEmail(email.id)}
                            >
                              <BlockIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Preview email">
                          <IconButton
                            edge="end"
                            onClick={() => handleOpenPreview(email)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Checkbox
                          edge="end"
                          onChange={() => handleToggleEmail(email.id)}
                          checked={selectedEmails.includes(email.id)}
                        />
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      <EmailIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: "bold",
                              flexGrow: 1,
                              mr: 2,
                              textDecoration: ignoredEmails.includes(email.id)
                                ? "line-through"
                                : "none",
                              color: ignoredEmails.includes(email.id)
                                ? "text.disabled"
                                : "text.primary",
                            }}
                          >
                            {email.subject || "(no subject)"}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "nowrap",
                              color: "text.secondary",
                            }}
                          >
                            {new Date(email.date).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{
                              color: ignoredEmails.includes(email.id)
                                ? "text.disabled"
                                : "text.primary",
                            }}
                          >
                            <strong>From:</strong> {email.from}
                          </Typography>
                          <br />
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{
                              color: ignoredEmails.includes(email.id)
                                ? "text.disabled"
                                : "text.primary",
                            }}
                          >
                            <strong>To:</strong> {email.to}
                          </Typography>
                          <br />
                          <Typography
                            variant="body2"
                            color={
                              ignoredEmails.includes(email.id)
                                ? "text.disabled"
                                : "text.secondary"
                            }
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              mt: 1,
                            }}
                          >
                            {email.snippet}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}

            {hasMore && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Showing {emails.length} emails
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={loadMoreEmails}
                  disabled={isLoadingMore}
                  startIcon={isLoadingMore ? <CircularProgress size={16} /> : null}
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </Box>
            )}

            {isLoadingMore && (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress />
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Confirmation Dialog for Ignore All */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to ignore all displayed emails? This will
            remove them from your selection.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmAction} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Preview Drawer */}
      <Drawer
        anchor="right"
        open={previewOpen}
        onClose={handleClosePreview}
        sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", sm: 450 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Email Preview</Typography>
            <IconButton onClick={handleClosePreview}>
              <CloseIcon />
            </IconButton>
          </Box>

          {previewEmail ? (
            <Card variant="outlined">
              <CardContent>
                {previewLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>
                      {previewEmail.subject || "(no subject)"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      <strong>Date:</strong>{" "}
                      {new Date(previewEmail.date).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>From:</strong> {previewEmail.from}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>To:</strong> {previewEmail.to}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    {previewEmail.body ? (
                      <Typography
                        variant="body2"
                        component="div"
                        sx={{ mt: 2 }}
                      >
                        {previewEmail.body.html ? (
                          <Box
                            sx={{ mt: 2, maxHeight: "50vh", overflow: "auto" }}
                            dangerouslySetInnerHTML={{
                              __html: previewEmail.body.html,
                            }}
                          />
                        ) : previewEmail.body.plain ? (
                          <Box
                            sx={{
                              mt: 2,
                              maxHeight: "50vh",
                              overflow: "auto",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {previewEmail.body.plain}
                          </Box>
                        ) : (
                          <Typography color="text.secondary">
                            No email content available.
                          </Typography>
                        )}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        {previewEmail.snippet}
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Typography color="text.secondary">
              No email selected for preview.
            </Typography>
          )}
        </Box>
      </Drawer>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          onClick={() => navigate("/search")}
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
          {loading ? "Processing..." : "Continue to Analysis"}
        </Button>
      </Box>
    </Box>
  );
};

export default EmailSelector;
