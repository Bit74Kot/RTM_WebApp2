import React, { useState, useRef } from 'react';
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


function TemplateForm() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
  
    // Проверка расширения
    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      setError("Пожалуйста, загрузите файл в формате .DOCX");
      setFile(null);
      setFileName("");
      return;
    }
  
    // Проверка размера (20 МБ)
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("Размер файла не должен превышать 20 МБ");
      setFile(null);
      setFileName("");
      return;
    }
  
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError("");
  };
  

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSuccess(false);
    setIsSuccess(true);
    setLoading(true);
  
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("comments", message); // ⬅️ вот ключевое соответствие
      if (file) {
        formData.append("file", file);
      }
      
      for (let [key, value] of formData.entries()) {
        console.log("FormData", key, value);
      }

      const response = await fetch("https://email-server-production-b175.up.railway.app/api/send-template", {
        method: "POST",
        body: formData,
      });
  
      if (response.ok) {
        setIsSuccess(true);
        setName("");
        setEmail("");
        setMessage("");
        setFile(null);
        setFileName("");
      } else {
        throw new Error("Ошибка при отправке письма");
      }
    } catch (err) {
      console.error(err);
      } finally {
      setLoading(false);
    }
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

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ p: 4 }}>
          <form ref={formRef} onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                name="from_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                label="Твое имя"
                required
                disabled={loading}
              />
              <TextField
                fullWidth
                name="from_email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label="Твой е-мэйл"
                type="email"
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
                {fileName ? fileName : 'Прикрепи документ для шаблона (макс. 1 МБ)'}
                <input
                  type="file"
                  name="attachment"
                  hidden
                  accept=".docx"
                  onChange={handleFileUpload}
                />
              </Button>
              <TextField
                fullWidth
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                label="Твои комментарии и пожелания"
                multiline
                rows={4}
                inputProps={{ maxLength: 1000 }}
                helperText="Макс. 1000 символов"
                disabled={loading}
              />

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => console.log('Оплата...')}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Оплатить заказ'}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  fullWidth
                  disabled={loading}
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
          </form>

          <Snackbar
            open={isSuccess}
            autoHideDuration={10000}
            onClose={() => setIsSuccess(false)}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            sx={{
              top: '50% !important',
              transform: 'translateY(-50%)'
            }}
          >
            <Alert
              onClose={() => setIsSuccess(false)}
              severity="success"
              sx={{
                width: '100%',
                py: 4,
                fontSize: '1.1rem',
                textAlign: 'center'
              }}
            >
              Ваш документ успешно отправлен! Мы пришлем вам готовый шаблон в течение суток
            </Alert>
          </Snackbar>
        </Paper>
      </Box>

      {isSuccess && (
        <p className="text-green-600 text-sm text-center">Документ успешно отправлен!</p>
      )}
      
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
