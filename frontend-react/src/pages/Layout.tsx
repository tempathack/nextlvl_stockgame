import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Dashboard,
  Leaderboard,
  ActivityOutlined,
  AccountBalance,
  Settings,
  Logout,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

/**
 * Layout Component
 *
 * Main application layout with navigation bar and sidebar.
 * Responsive design that adapts to mobile and desktop screens.
 */
const Layout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    handleCloseUserMenu();
    await logout();
    navigate('/login');
  };

  // Navigation items
  const publicNavItems = [
    { label: 'Dashboard', path: '/', icon: <Dashboard /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <Leaderboard /> },
    { label: 'Activity', path: '/activity', icon: <ActivityOutlined /> },
  ];

  const protectedNavItems = [
    { label: 'My Portfolio', path: '/portfolio', icon: <AccountBalance /> },
  ];

  const userMenuItems = [
    { label: 'Settings', path: '/settings', icon: <Settings /> },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <TrendingUp />
        Stock Game
      </Typography>
      <Divider />
      <List>
        {publicNavItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              selected={isActivePath(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        {isAuthenticated && (
          <>
            <Divider sx={{ my: 1 }} />
            {protectedNavItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  selected={isActivePath(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* Mobile menu icon */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <TrendingUp sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to="/"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Stock Trading Game
            </Typography>

            {/* Desktop Navigation */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {publicNavItems.map((item) => (
                <Button
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    my: 2,
                    color: 'white',
                    display: 'block',
                    borderBottom: isActivePath(item.path) ? 2 : 0,
                    borderRadius: 0,
                  }}
                  startIcon={item.icon}
                >
                  {item.label}
                </Button>
              ))}
              {isAuthenticated && (
                <>
                  {protectedNavItems.map((item) => (
                    <Button
                      key={item.path}
                      component={RouterLink}
                      to={item.path}
                      sx={{
                        my: 2,
                        color: 'white',
                        display: 'block',
                        borderBottom: isActivePath(item.path) ? 2 : 0,
                        borderRadius: 0,
                      }}
                      startIcon={item.icon}
                    >
                      {item.label}
                    </Button>
                  ))}
                </>
              )}
            </Box>

            {/* Mobile Logo */}
            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to="/"
              sx={{
                flexGrow: 1,
                display: { xs: 'flex', md: 'none' },
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Stock Game
            </Typography>

            {/* User Menu */}
            <Box sx={{ flexGrow: 0 }}>
              {isAuthenticated ? (
                <>
                  <Tooltip title="Open settings">
                    <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                  <Menu
                    sx={{ mt: '45px' }}
                    id="menu-appbar"
                    anchorEl={anchorElUser}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                  >
                    <MenuItem disabled>
                      <Typography textAlign="center" fontWeight="bold">
                        {user?.username}
                      </Typography>
                    </MenuItem>
                    <Divider />
                    {userMenuItems.map((item) => (
                      <MenuItem
                        key={item.path}
                        onClick={() => {
                          handleCloseUserMenu();
                          navigate(item.path);
                        }}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <Typography textAlign="center">{item.label}</Typography>
                      </MenuItem>
                    ))}
                    <Divider />
                    <MenuItem onClick={handleLogout}>
                      <ListItemIcon>
                        <Logout fontSize="small" />
                      </ListItemIcon>
                      <Typography textAlign="center">Logout</Typography>
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  component={RouterLink}
                  to="/login"
                  color="inherit"
                  variant="outlined"
                  startIcon={<AccountCircle />}
                >
                  Login
                </Button>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        <Outlet />
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800],
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="body2" color="text.secondary" align="center">
            180-Day Stock Trading Game - Starting Capital: $100,000 | No Trading Limits | Full
            Transparency
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            Market data provided by Yahoo Finance. All trades are simulated.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
