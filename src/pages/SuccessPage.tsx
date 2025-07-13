import { Container, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const SuccessPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Typography variant="h4" align="center" gutterBottom>
        ✅ Оплата прошла успешно!
      </Typography>
      <Typography variant="body1" align="center" sx={{ mt: 2 }}>
        Спасибо за оплату. Мы уже начали обработку вашего заказа.
      </Typography>

      <Box mt={4} display="flex" justifyContent="center">
        <Button variant="contained" color="primary" onClick={() => navigate('/')}>
          Вернуться на главную
        </Button>
      </Box>
    </Container>
  );
};

export default SuccessPage;
