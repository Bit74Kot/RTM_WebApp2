import { Container, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const FailPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Typography variant="h4" align="center" gutterBottom>
        ❌ Оплата не прошла
      </Typography>
      <Typography variant="body1" align="center" sx={{ mt: 2 }}>
        Что-то пошло не так или вы отменили оплату. Попробуйте снова.
      </Typography>

      <Box mt={4} display="flex" justifyContent="center">
        <Button variant="outlined" color="error" onClick={() => navigate('/')}>
          Вернуться на главную
        </Button>
      </Box>
    </Container>
  );
};

export default FailPage;
