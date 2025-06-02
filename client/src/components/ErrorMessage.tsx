import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';

interface ErrorMessageProps {
  message: string;
  details?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, details }) => {
  return (
    <Box sx={{ my: 2 }}>
      <Alert severity="error" variant="outlined">
        <AlertTitle>{message}</AlertTitle>
        {details && <p>{details}</p>}
      </Alert>
    </Box>
  );
};

export default ErrorMessage;
