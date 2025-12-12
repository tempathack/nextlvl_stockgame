import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  TextField,
  Button,
  Alert,
  Divider,
  Switch,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/user';

/**
 * Settings Page - Protected
 *
 * Route: /settings
 * Authentication: Required
 *
 * User profile and preferences management.
 * Allows updating display name, email, and notification preferences.
 */
const Settings: React.FC = () => {
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Profile form state
  const [profile, setProfile] = useState({
    displayName: user?.display_name || user?.username || '',
    email: user?.email || '',
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    tradeAlerts: true,
    weeklyReport: true,
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof profile) => userApi.updateProfile(data),
    onSuccess: () => {
      setSuccessMessage('Profile updated successfully');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update profile');
      setSuccessMessage('');
    },
  });

  // Preferences update mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: typeof preferences) => userApi.updatePreferences(data),
    onSuccess: () => {
      setSuccessMessage('Preferences saved successfully');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save preferences');
      setSuccessMessage('');
    },
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setPreferences((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profile);
  };

  const handlePreferencesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferencesMutation.mutate(preferences);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your profile and preferences
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Your display name is visible to other players
            </Typography>

            <Box component="form" onSubmit={handleProfileSubmit} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Username"
                value={user?.username || ''}
                disabled
                margin="normal"
                helperText="Username cannot be changed"
              />

              <TextField
                fullWidth
                label="Display Name"
                name="displayName"
                value={profile.displayName}
                onChange={handleProfileChange}
                margin="normal"
                required
                helperText="This name will appear on the leaderboard"
              />

              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleProfileChange}
                margin="normal"
                helperText="Used for notifications and account recovery"
              />

              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 3 }}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Notification Preferences */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Choose what updates you'd like to receive
            </Typography>

            <Box component="form" onSubmit={handlePreferencesSubmit} sx={{ mt: 2 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.emailNotifications}
                      onChange={handlePreferenceChange}
                      name="emailNotifications"
                    />
                  }
                  label="Email Notifications"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                  Receive general updates via email
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.tradeAlerts}
                      onChange={handlePreferenceChange}
                      name="tradeAlerts"
                    />
                  }
                  label="Trade Execution Alerts"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                  Get notified when your trades are executed
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.weeklyReport}
                      onChange={handlePreferenceChange}
                      name="weeklyReport"
                    />
                  }
                  label="Weekly Performance Report"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                  Receive weekly portfolio performance summaries
                </Typography>
              </FormGroup>

              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 3 }}
                disabled={updatePreferencesMutation.isPending}
              >
                {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Game Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Game Rules
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Starting Capital
                </Typography>
                <Typography variant="h6">$100,000</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Competition Duration
                </Typography>
                <Typography variant="h6">180 Days</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Trading Limits
                </Typography>
                <Typography variant="h6">None</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Short Selling
                </Typography>
                <Typography variant="h6">Allowed</Typography>
              </Grid>
            </Grid>
            <Alert severity="info" sx={{ mt: 3 }}>
              All trades are public and visible to other players. Portfolio transparency is a core
              feature of this competition.
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Settings;
