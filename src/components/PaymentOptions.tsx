import { Container, Typography, Grid, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const PaymentOptions = () => {
  const navigate = useNavigate();

  const paymentMethods = [
    { name: 'Payeer', emoji: '💰', link: '/pay/payeer' },
    { name: 'YooMoney', emoji: '🟣', link: '/pay/yoomoney' },
    { name: 'Тинькофф', emoji: '🏦', link: '/pay/tinkoff' },
    { name: 'PayPal', emoji: '🌍', link: '/pay/paypal' },
    { name: 'Stripe', emoji: '💳', link: '/pay/stripe' }
  ];

  const handleBack = () => {
    navigate(-1); // можно заменить на navigate('/checkout') при необходимости
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Выберите способ оплаты
      </Typography>

      <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
        {paymentMethods.map((method) => (
          <Grid item xs={12} sm={6} key={method.name}>
            <Button
              variant="outlined"
              fullWidth
              sx={{ py: 1.5 }}
              onClick={() => navigate(method.link)}
            >
              <span style={{ fontSize: '20px', marginRight: '8px' }}>{method.emoji}</span>
              {method.name}
            </Button>
          </Grid>
        ))}
      </Grid>

      <Box mt={4} display="flex" justifyContent="center">
        <Button variant="contained" color="secondary" onClick={handleBack}>
          Назад
        </Button>
      </Box>
    </Container>
  );
};

export default PaymentOptions;
