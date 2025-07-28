import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, IconButton, Switch, Box, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HomeIcon from '@mui/icons-material/Home';
import MenuIcon from '@mui/icons-material/Menu';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useState } from 'react';

// Page stubs
const Landing = () => (
  <Box p={3}>
    <Typography variant="h3">Direction Sky</Typography>
    <Typography variant="h6">Crypto Intelligence Platform</Typography>
    <Typography variant="body1" sx={{ mt: 2 }}>
      Advanced analytics powered by Glassnode, CoinGlass, FRED, and Binance APIs
    </Typography>
  </Box>
);

const OnChain = () => (
  <Box p={3}>
    <Typography variant="h4">On-Chain Analytics</Typography>
    <Typography variant="subtitle1" color="text.secondary">Powered by Glassnode</Typography>
    <Typography variant="body1" sx={{ mt: 2 }}>
      Real-time blockchain metrics and network analysis
    </Typography>
  </Box>
);

const Derivatives = () => (
  <Box p={3}>
    <Typography variant="h4">Derivatives Data</Typography>
    <Typography variant="subtitle1" color="text.secondary">Powered by CoinGlass</Typography>
    <Typography variant="body1" sx={{ mt: 2 }}>
      Futures, options, and funding rate analysis
    </Typography>
  </Box>
);

const Macro = () => (
  <Box p={3}>
    <Typography variant="h4">Macro Economic Data</Typography>
    <Typography variant="subtitle1" color="text.secondary">Powered by FRED</Typography>
    <Typography variant="body1" sx={{ mt: 2 }}>
      Traditional financial indicators and economic trends
    </Typography>
  </Box>
);

const Price = () => (
  <Box p={3}>
    <Typography variant="h4">Price Data</Typography>
    <Typography variant="subtitle1" color="text.secondary">Powered by Binance API</Typography>
    <Typography variant="body1" sx={{ mt: 2 }}>
      Real-time cryptocurrency price feeds and market data
    </Typography>
  </Box>
);

const navItems = [
  { text: 'Home', icon: <HomeIcon />, path: '/' },
  { text: 'On-Chain (Glassnode)', icon: <DataUsageIcon />, path: '/onchain' },
  { text: 'Derivatives (CoinGlass)', icon: <ShowChartIcon />, path: '/derivatives' },
  { text: 'Macro (FRED)', icon: <TrendingUpIcon />, path: '/macro' },
  { text: 'Price (Binance API)', icon: <AssessmentIcon />, path: '/price' },
];

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true); // Open by default
  const theme = createTheme({ palette: { mode: darkMode ? 'dark' : 'light' } });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <AppBar position="static">
            <Toolbar>
              <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setDrawerOpen(!drawerOpen)} sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>Direction Sky</Typography>
              <Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} color="default" />
            </Toolbar>
          </AppBar>
          <Box sx={{ display: 'flex', flex: 1 }}>
            <Drawer 
              anchor="left" 
              open={drawerOpen} 
              onClose={() => setDrawerOpen(false)}
              variant="persistent"
              sx={{
                width: 280,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: 280,
                  boxSizing: 'border-box',
                  top: '64px', // Height of AppBar
                  height: 'calc(100vh - 64px)',
                },
              }}
            >
              <Box sx={{ width: 280 }} role="presentation">
                <List>
                  {navItems.map((item) => (
                    <ListItem disablePadding key={item.text}>
                      <ListItemButton component={Link} to={item.path}>
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.text} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Drawer>
            <Box 
              component="main" 
              sx={{ 
                p: 3, 
                flexGrow: 1,
                marginLeft: drawerOpen ? '280px' : 0,
                transition: theme.transitions.create('margin', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen,
                }),
              }}
            >
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/onchain" element={<OnChain />} />
                <Route path="/derivatives" element={<Derivatives />} />
                <Route path="/macro" element={<Macro />} />
                <Route path="/price" element={<Price />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
