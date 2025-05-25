import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Button,
  Paper,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import emailjs from '@emailjs/browser';

// Initialize EmailJS with public key
emailjs.init("Uasenk9EK6m4vHl7K");

// Maximum file size in bytes (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

function TemplateForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('Пожалуйста, загрузите файл в формате DOCX');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Размер файла не должен превышать 1 МБ');
      return;
    }

    setFile(file);
    setError('');
  };

  const handleSubmit = async () => {
    if (!file || !name || !email) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64File = reader.result as string;
        
        const templateParams = {
          to_email: 'aufschrift@gmail.com',
          from_name: name,
          from_email: email,
          message: comments, // Changed from comments to message to match template variable
          file_name: file.name,
          file_content: base64File
        };

        try {
          await emailjs.send(
            'service_wecuskb',
            'template_mauc0oo',
            templateParams,
            'Uasenk9EK6m4vHl7K' // Added public key here as well for extra security
          );

          setSnackbarMessage('Заказ успешно отправлен!');
          setSnackbarOpen(true);
          
          // Clear form
          setName('');
          setEmail('');
          setComments('');
          setFile(null);
        } catch (error) {
          console.error('Email sending error:', error);
          setError('Произошла ошибка при отправке заказа. Пожалуйста, попробуйте позже.');
        }
      };

      reader.onerror = () => {
        setError('Ошибка при чтении файла');
      };
    } catch (error) {
      console.error('Form submission error:', error);
      setError('Произошла ошибка. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    // Handle payment logic here
    console.log('Payment initiated');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Подготовка шаблона
        </Typography>

        <Typography variant="subtitle1" gutterBottom align="center" sx={{ mb: 4 }}>
          Заполни эту форму, оплати стоимость ОДНОЙ страницы документа и мы пришлем тебе шаблон, с которым ты сможешь работать
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 4 }}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Твое имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />

            <TextField
              fullWidth
              label="Твой е-мэйл"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ height: '56px' }}
              disabled={loading}
            >
              {file ? file.name : 'Прикрепи документ для шаблона (макс. 1 МБ)'}
              <input
                type="file"
                hidden
                accept=".docx"
                onChange={handleFileUpload}
              />
            </Button>

            <TextField
              fullWidth
              label="Твои комментарии и пожелания"
              multiline
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              inputProps={{ maxLength: 1000 }}
              helperText={`${comments.length}/1000`}
              disabled={loading}
            />

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handlePayment}
                disabled={loading || !name || !email || !file}
              >
                {loading ? <CircularProgress size={24} /> : 'Оплатить заказ'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={handleSubmit}
                disabled={loading || !name || !email || !file}
              >
                {loading ? <CircularProgress size={24} /> : 'Отправить заказ'}
              </Button>
            </Stack>

            <Button
              variant="outlined"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              В главное меню
            </Button>
          </Stack>
        </Paper>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
}

export default TemplateForm;