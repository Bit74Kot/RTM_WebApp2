import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Button,
  Paper,
  Grid,
  TextField,
  Stack,
  List,
  ListItem,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import { 
  findPlaceholders,
  createTemplate,
  type PlaceholderData
} from '../utils/documentUtils';

function InvoiceActForm() {
  const navigate = useNavigate();
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<PlaceholderData[]>([]);
  const [error, setError] = useState<string>('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('Пожалуйста, загрузите файл в формате DOCX');
      return;
    }

    try {
      setTemplateFile(file);
      const foundPlaceholders = await findPlaceholders(file);
      setPlaceholders(foundPlaceholders);
      setError('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось обработать файл шаблона';
      setError(errorMessage);
    }
  };

  const handlePlaceholderChange = (index: number, value: string) => {
    const newPlaceholders = [...placeholders];
    newPlaceholders[index].value = value;
    setPlaceholders(newPlaceholders);
  };

  const handlePreview = async () => {
    if (!templateFile) {
      setError('Пожалуйста, загрузите шаблон');
      return;
    }

    try {
      const arrayBuffer = await templateFile.arrayBuffer();
      let html = await mammoth.convertToHtml({ arrayBuffer });
      let content = html.value;

      for (const placeholder of placeholders) {
        if (placeholder.value) {
          const regex = new RegExp(`#${placeholder.name}`, 'g');
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
    }
  };

  const handleCreateDocument = async () => {
    if (!templateFile) {
      setError('Пожалуйста, загрузите шаблон');
      return;
    }

    try {
      await createTemplate(templateFile, placeholders);
      setError('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать документ';
      setError(errorMessage);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Подготовка счета/акта
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack spacing={3}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  disabled
                  value={templateFile?.name || ''}
                  label="Файл шаблона"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  component="label"
                  fullWidth
                >
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

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-start' }}>
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
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
              >
                В главное меню
              </Button>
            </Box>
          </Stack>
        </Paper>

        {placeholders.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Поля документа
            </Typography>
            <List>
              {placeholders.map((placeholder, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={4}>
                        <Typography>{placeholder.name}:</Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <TextField
                          fullWidth
                          size="small"
                          value={placeholder.value}
                          onChange={(e) => handlePlaceholderChange(index, e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
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
      </Box>
    </Container>
  );
}

export default InvoiceActForm;