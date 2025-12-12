import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import ActivityFeed from '../../components/activity/ActivityFeed';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../../api/activity';

/**
 * Activity Page - Public
 *
 * Route: /activity
 * Authentication: Not required
 *
 * Real-time feed of all trades across all players.
 * Auto-refreshes every 5 seconds to show latest activity.
 */
const ActivityPage: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch activity feed with auto-refresh
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => activityApi.getActivityFeed({ limit: 100, offset: 0 }),
    refetchInterval: autoRefresh ? 5000 : false, // Auto-refresh every 5s
    refetchOnWindowFocus: true,
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Live Trading Activity
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time feed of all trades across all players. Updates every 5 seconds.
        </Typography>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load activity feed: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      )}

      <Paper sx={{ p: 0 }}>
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <ActivityFeed
            activities={data?.activities || []}
            total={data?.total || 0}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            onRefresh={() => refetch()}
          />
        )}
      </Paper>
    </Container>
  );
};

export default ActivityPage;
