import { 
  Container, 
  Box, 
  Typography, 
  Button,
  Grid,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import DescriptionIcon from '@mui/icons-material/Description';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ContractForm from './components/ContractForm';
import InvoiceActForm from './components/InvoiceActForm';
import TemplateForm from './components/TemplateForm';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        },
      },
    },
  },
});

function MainMenu() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        my: 6,
        textAlign: 'center',
      }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ mb: 4 }}
        >
          Менеджер документов
        </Typography>
        
        <Grid 
          container 
          spacing={4} 
          justifyContent="center"
          sx={{ maxWidth: '1000px', mx: 'auto' }}
        >
          <Grid item xs={12} sm={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: 4, flexGrow: 1 }}>
                <DescriptionIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Подготовка договора
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Создание и управление договорами с автоматическим заполнением и предварительным просмотром
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button 
                  variant="contained" 
                  fullWidth
                  size="large"
                  onClick={() => navigate('/contract')}
                >
                  Подготовить договор
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: 4, flexGrow: 1 }}>
                <ReceiptIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Подготовка счета и акта
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Создание счетов и актов с автоматическим заполнением данных
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button 
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => navigate('/invoice-act')}
                >
                  Подготовить счет/акт
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: 4, flexGrow: 1 }}>
                <DesignServicesIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Подготовка шаблонов
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Направь нам проект документа и мы разработаем для тебя шаблон
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button 
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => navigate('/template')}
                >
                  Подготовить шаблон
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 2
      }}>
        <Router>
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/contract" element={<ContractForm />} />
            <Route path="/invoice-act" element={<InvoiceActForm />} />
            <Route path="/template" element={<TemplateForm />} />
          </Routes>
        </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;