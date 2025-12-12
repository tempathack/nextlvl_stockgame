import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  RemoveCircleOutline,
  AddCircleOutline,
} from '@mui/icons-material';

interface TradeActivity {
  id: number;
  user_id: number;
  portfolio_id: number;
  display_name: string;
  symbol: string;
  side: 'buy' | 'sell' | 'short' | 'cover';
  quantity: number;
  price: number;
  total_value: number;
  executed_at: string;
}

interface ActivityItemProps {
  activity: TradeActivity;
  onClick?: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onClick }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getSideConfig = (side: string) => {
    switch (side) {
      case 'buy':
        return {
          color: 'success',
          icon: <AddCircleOutline />,
          label: 'BOUGHT',
          bgColor: '#dcfce7',
          textColor: '#15803d',
        };
      case 'sell':
        return {
          color: 'error',
          icon: <RemoveCircleOutline />,
          label: 'SOLD',
          bgColor: '#fee2e2',
          textColor: '#b91c1c',
        };
      case 'short':
        return {
          color: 'warning',
          icon: <TrendingDown />,
          label: 'SHORTED',
          bgColor: '#fed7aa',
          textColor: '#c2410c',
        };
      case 'cover':
        return {
          color: 'info',
          icon: <TrendingUp />,
          label: 'COVERED',
          bgColor: '#dbeafe',
          textColor: '#1e40af',
        };
      default:
        return {
          color: 'default',
          icon: null,
          label: side.toUpperCase(),
          bgColor: '#f3f4f6',
          textColor: '#374151',
        };
    }
  };

  const sideConfig = getSideConfig(activity.side);

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: 3,
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* User Avatar */}
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            {activity.display_name.charAt(0).toUpperCase()}
          </Avatar>

          {/* Trade Details */}
          <Box sx={{ flex: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  {activity.display_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatTimeAgo(activity.executed_at)}
                </Typography>
              </Box>
              <Chip
                label={sideConfig.label}
                size="small"
                icon={sideConfig.icon}
                sx={{
                  bgcolor: sideConfig.bgColor,
                  color: sideConfig.textColor,
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                }}
              />
            </Box>

            {/* Trade Info */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                p: 1.5,
                bgcolor: 'background.default',
                borderRadius: 1,
                mt: 1,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Symbol
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {activity.symbol}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Quantity
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {activity.quantity.toLocaleString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Price
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatCurrency(activity.price)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Value
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="primary.main">
                  {formatCurrency(activity.total_value)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ActivityItem;
