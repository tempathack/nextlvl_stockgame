/**
 * Activity Feed Component
 * Displays real-time trade activity with auto-refresh
 */
import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Refresh,
} from '@mui/icons-material';
import { TradeActivity } from '../../api/activity';
import { formatCurrency, formatPercentage, getChangeColor } from '../../theme';
import { Link as RouterLink } from 'react-router-dom';

interface ActivityFeedProps {
  activities: TradeActivity[];
  total?: number;
  autoRefresh?: boolean;
  onToggleAutoRefresh?: () => void;
  onRefresh?: () => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  total,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
}) => {
  const getSideIcon = (side: string) => {
    switch (side.toLowerCase()) {
      case 'buy':
        return <TrendingUp sx={{ color: 'success.main' }} />;
      case 'sell':
        return <TrendingDown sx={{ color: 'error.main' }} />;
      case 'short':
        return <TrendingDown sx={{ color: 'warning.main' }} />;
      case 'cover':
        return <TrendingUp sx={{ color: 'info.main' }} />;
      default:
        return <SwapHoriz />;
    }
  };

  const getSideColor = (side: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (side.toLowerCase()) {
      case 'buy':
        return 'success';
      case 'sell':
        return 'error';
      case 'short':
        return 'warning';
      case 'cover':
        return 'info';
      default:
        return 'info';
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  };

  if (!activities || activities.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No trading activity yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with refresh controls */}
      {(onRefresh || onToggleAutoRefresh) && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {total ? `${total} total trades` : `${activities.length} recent trades`}
          </Typography>
          <Box>
            {onToggleAutoRefresh && (
              <Chip
                label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                size="small"
                color={autoRefresh ? 'success' : 'default'}
                onClick={onToggleAutoRefresh}
                sx={{ mr: 1 }}
              />
            )}
            {onRefresh && (
              <Tooltip title="Refresh now">
                <IconButton size="small" onClick={onRefresh}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {/* Activity List */}
      <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
        {activities.map((activity, index) => (
          <React.Fragment key={activity.id}>
            <ListItem
              alignItems="flex-start"
              sx={{
                py: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: `${getSideColor(activity.side)}.main` }}>
                  {getSideIcon(activity.side)}
                </Avatar>
              </ListItemAvatar>

              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 0.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        component={RouterLink}
                        to={`/player/${activity.user_id}`}
                        sx={{
                          fontWeight: 600,
                          textDecoration: 'none',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {activity.display_name}
                      </Typography>
                      <Chip
                        label={activity.side.toUpperCase()}
                        size="small"
                        color={getSideColor(activity.side)}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimeAgo(activity.executed_at)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" component="span">
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {parseFloat(activity.quantity).toLocaleString('en-US', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        shares
                      </Box>{' '}
                      of{' '}
                      <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {activity.symbol}
                      </Box>{' '}
                      at {formatCurrency(parseFloat(activity.price))}
                    </Typography>
                    <Box
                      sx={{
                        mt: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Chip
                        label={`Total: ${formatCurrency(parseFloat(activity.total_value))}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.75rem' }}
                      />
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            {index < activities.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default ActivityFeed;
