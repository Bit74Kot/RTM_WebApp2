import React, { useState } from 'react';
import {
  Container, Box, Typography, Button, Paper, Grid, TextField, Stack,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar
} from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import {
  findPlaceholders,
  createDocumentPreserveStyles,
  type PlaceholderData
} from '../utils/documentUtils';

function InvoiceActForm() {
  const navigate = useNavigate();
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<PlaceholderData[]>([]);
  const [error, setError] = useState<string>('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('Пожалуйста, загрузите файл в формате DOCX');
      setSnackbarMessage('Неверный формат файла');
      setSnackbarOpen(true);
      return;
    }

    try {
      setTemplateFile(file);
      const foundPlaceholders = await findPlaceholders(file);
      setPlaceholders(foundPlaceholders);
      setError('');
      setSnackbarMessage('Шаблон успешно загружен');
      setSnackbarOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обработке шаблона';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const handlePlaceholderChange = (index: number, value: string) => {
    const updated = [...placeholders];
    updated[index].value = value;
    setPlaceholders(updated);
  };

  const handlePreview = async () => {
    if (!templateFile) return;

    try {
      const arrayBuffer = await templateFile.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

      let content = html;
      for (const placeholder of placeholders) {
        if (placeholder.value) {
          const regex = new RegExp(`#${placeholder.name}(?![а-яА-ЯёЁa-zA-Z])`, 'g');
          content = content.replace(regex, placeholder.value);
        }
      }

      content = `
        <style>
          body {
            font-family: Calibri, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            margin: 20px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 10px 0;
          }
          td, th {
            border: 1px solid #ddd;
            padding: 8px;
          }
          p {
            margin: 0 0 10px 0;
          }
        </style>
        ${content}
      `;

      setPreviewHtml(content);
      setPreviewDialogOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать предпросмотр';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const handleCreateDocument = async () => {
    if (!templateFile) return;

    try {
      await createDocumentPreserveStyles(placeholders, templateFile);
      setSnackbarMessage('Документ успешно создан');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать документ';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
    } finally {
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Подготовка счета / акта
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack spacing={3}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  disabled
                  value={templateFile?.name || ''}
                  label="Шаблон документа"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button variant="contained" component="label" fullWidth>
                  Загрузить шаблон
                  <input
                    type="file"
                    hidden
                    accept=".docx"
                    onChange={handleTemplateUpload}
                  />
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleCreateDocument}
                disabled={!templateFile}
              >
                Создать документ
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handlePreview}
                disabled={!templateFile}
                startIcon={<PreviewIcon />}
              >
                Предпросмотр
              </Button>
              <Button variant="outlined" onClick={() => navigate('/')}>В главное меню</Button>
            </Box>
          </Stack>
        </Paper>

        {placeholders.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Плейсхолдеры</Typography>
            <Grid container spacing={2}>
              {placeholders.map((ph, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <TextField
                    label={ph.name}
                    fullWidth
                    size="small"
                    value={ph.value}
                    onChange={(e) => handlePlaceholderChange(index, e.target.value)}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        <Dialog
          open={previewDialogOpen}
          onClose={() => setPreviewDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Предпросмотр документа</DialogTitle>
          <DialogContent>
            <Box
              sx={{
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                backgroundColor: '#ffffff',
                minHeight: '600px',
                maxHeight: '800px',
                overflow: 'auto'
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDialogOpen(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          message={snackbarMessage}
        />
      </Box>
    </Container>
  );
}

export default InvoiceActForm;
