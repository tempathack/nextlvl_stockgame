import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Box,
  Link,
  Chip,
} from '@mui/material';
import { Article, AccessTime } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string;
  summary?: string;
  symbols?: string[];
}

interface NewsFeedResponse {
  news: NewsItem[];
  updated_at: string;
}

// Mock data for development (replace with actual API call)
const fetchNews = async (): Promise<NewsFeedResponse> => {
  // In production, this would call /api/market/news
  // For now, return mock data
  return {
    news: [
      {
        id: '1',
        title: 'Tech Stocks Rally on Strong Earnings Reports',
        source: 'Financial Times',
        url: '#',
        published_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        summary: 'Major technology companies report better-than-expected quarterly earnings.',
        symbols: ['AAPL', 'MSFT', 'GOOGL'],
      },
      {
        id: '2',
        title: 'Federal Reserve Holds Interest Rates Steady',
        source: 'Bloomberg',
        url: '#',
        published_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        summary: 'The Fed maintains current interest rate policy amid economic uncertainty.',
      },
      {
        id: '3',
        title: 'Energy Sector Sees Gains on Oil Price Increase',
        source: 'Reuters',
        url: '#',
        published_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        symbols: ['XOM', 'CVX'],
      },
      {
        id: '4',
        title: 'Retail Sales Beat Expectations in Latest Report',
        source: 'CNBC',
        url: '#',
        published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        summary: 'Consumer spending shows resilience despite inflation concerns.',
      },
      {
        id: '5',
        title: 'Manufacturing Index Shows Signs of Recovery',
        source: 'Wall Street Journal',
        url: '#',
        published_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
    ],
    updated_at: new Date().toISOString(),
  };
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const NewsFeed: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['newsFeed'],
    queryFn: fetchNews,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ p: 3, height: 450 }}>
        <Alert severity="error">Failed to load news feed</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 450, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Article />
        Market News
      </Typography>
      <List sx={{ overflow: 'auto', flex: 1 }}>
        {data.news.map((item, index) => (
          <React.Fragment key={item.id}>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemText
                primary={
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    underline="hover"
                    sx={{
                      fontWeight: 500,
                      display: 'block',
                      mb: 0.5,
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    {item.title}
                  </Link>
                }
                secondary={
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.source}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 14 }} />
                        {formatTimeAgo(item.published_at)}
                      </Typography>
                    </Box>
                    {item.summary && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {item.summary}
                      </Typography>
                    )}
                    {item.symbols && item.symbols.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                        {item.symbols.map((symbol) => (
                          <Chip
                            key={symbol}
                            label={symbol}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                }
              />
            </ListItem>
            {index < data.news.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default NewsFeed;
