/**
 * Main layout component with navigation
 */
import { Outlet, Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  TrendingUp,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const MainLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
  };

  const navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Analysis', path: '/analysis' },
    { label: 'Insider Trades', path: '/insider-trades' },
    { label: 'Leaderboard', path: '/leaderboard' },
    { label: 'Comparison', path: '/comparison' },
    { label: 'Activity', path: '/activity' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          {/* Logo */}
          <TrendingUp sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: isMobile ? 1 : 0,
              mr: 4,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 700,
            }}
          >
            Stock Game
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  color="inherit"
                  sx={{ fontWeight: 600 }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Mobile Menu Icon */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenuOpen}
              sx={{ ml: 'auto' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* User Menu */}
          {!isMobile && (
            <Box sx={{ ml: 'auto' }}>
              {isAuthenticated ? (
                <>
                  <Button
                    component={RouterLink}
                    to="/portfolio"
                    color="inherit"
                    sx={{ mr: 1 }}
                  >
                    My Portfolio
                  </Button>
                  <IconButton
                    color="inherit"
                    onClick={handleUserMenuOpen}
                    aria-label="account"
                  >
                    <AccountCircle />
                  </IconButton>
                  <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={handleUserMenuClose}
                  >
                    <MenuItem disabled>
                      {user?.display_name || user?.username}
                    </MenuItem>
                    <MenuItem
                      component={RouterLink}
                      to="/settings"
                      onClick={handleUserMenuClose}
                    >
                      Settings
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  component={RouterLink}
                  to="/login"
                  color="inherit"
                >
                  Login
                </Button>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={handleMobileMenuClose}
      >
        {navItems.map((item) => (
          <MenuItem
            key={item.path}
            component={RouterLink}
            to={item.path}
            onClick={handleMobileMenuClose}
          >
            {item.label}
          </MenuItem>
        ))}
        {isAuthenticated && (
          <MenuItem
            component={RouterLink}
            to="/portfolio"
            onClick={handleMobileMenuClose}
          >
            My Portfolio
          </MenuItem>
        )}
        {isAuthenticated ? (
          <>
            <MenuItem
              component={RouterLink}
              to="/settings"
              onClick={handleMobileMenuClose}
            >
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </>
        ) : (
          <MenuItem
            component={RouterLink}
            to="/login"
            onClick={handleMobileMenuClose}
          >
            Login
          </MenuItem>
        )}
      </Menu>

      {/* Main Content */}
      <Container
        maxWidth={false}
        disableGutters
        sx={{ flex: 1, py: 4, px: { xs: 2, sm: 3, md: 4 } }}
      >
        <Outlet />
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="body2" color="text.secondary" align="center">
            180-Day Stock Trading Competition - Built with Vite + React + MUI
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;
