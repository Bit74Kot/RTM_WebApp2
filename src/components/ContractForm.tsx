import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Button,
  Paper,
  Grid,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  Zoom,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import PreviewIcon from '@mui/icons-material/Preview';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import { 
  findPlaceholders, 
  loadRequisites,
  matchRequisitesToPlaceholders,
  createAndSaveDocuments,
  createPrepopulatedTemplate,
  PlaceholderData,
  type RequisiteData,
  handleRequisiteChange,
  
} from '../utils/documentUtils';

function ContractForm() {
  const navigate = useNavigate();
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [requisitesFile, setRequisitesFile] = useState<File | null>(null);
  const [font, setFont] = useState('Calibri');
  const [fontSize, setFontSize] = useState(11);
  const [saveAsPdf, setSaveAsPdf] = useState(true); // ✅ PDF-флаг
  const [placeholders, setPlaceholders] = useState<PlaceholderData[]>([]);
  const [requisites, setRequisites] = useState<RequisiteData[]>([]);
  const [error, setError] = useState<string>('');
  const [copiedValue, setCopiedValue] = useState<string>('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [createTemplatesDialogOpen, setCreateTemplatesDialogOpen] = useState(false);
  const [templateCreationOpen, setTemplateCreationOpen] = useState(false);
  const [invoiceTemplateFile, setInvoiceTemplateFile] = useState<File | null>(null);
  const [actTemplateFile, setActTemplateFile] = useState<File | null>(null);
      
  const handlePreview = async () => {
    if (!templateFile) {
      setSnackbarMessage('Пожалуйста, загрузите шаблон договора');
      setSnackbarOpen(true);
      return;
    }
  
    try {
      const arrayBuffer = await templateFile.arrayBuffer();
      const html = await mammoth.convertToHtml({ arrayBuffer });
      let content = html.value;
  
      // Заменяем плейсхолдеры
      for (const placeholder of placeholders) {
        if (placeholder.value) {
          const regex = new RegExp(`#${placeholder.name}(?![а-яА-ЯёЁa-zA-Z0-9])`, 'g');
          content = content.replace(regex, placeholder.value);
        }
      }
  
      // ❌ Удаляем изображения из предпросмотра
      content = content.replace(/<img[^>]*>/g, '');
  
      // Добавляем стили предпросмотра
      content = `
        <style>
          body {
            font-family: ${font}, Arial, sans-serif;
            font-size: ${fontSize}pt;
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
      const errorMessage =
        error instanceof Error ? error.message : 'Не удалось создать предпросмотр';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };
 
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handlePlaceholderChange = (index: number, value: string) => {
    const newPlaceholders = [...placeholders];
    newPlaceholders[index].value = value;
    setPlaceholders(
      [...newPlaceholders].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    );
  };

  const handleContractUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('Пожалуйста, загрузите файл в формате DOCX');
      setSnackbarMessage('Пожалуйста, загрузите файл в формате DOCX');
      setSnackbarOpen(true);
      return;
    }

    try {
      setTemplateFile(file);
      setContractFile(file);
      const foundPlaceholders = await findPlaceholders(file);
      setPlaceholders(foundPlaceholders);
      
          
      
      setError('');
      setSnackbarMessage('Шаблон успешно загружен');
      setSnackbarOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось обработать файл договора';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const handleRequisitesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    try {
      setRequisitesFile(file);
      let loadedRequisites: RequisiteData[];
      
      if (file.name.endsWith('.pdf')) {
        // Явно указываем тип для PDF
        const { loadRequisitesFromPDF } = await import('../utils/pdfUtils');
        loadedRequisites = await loadRequisitesFromPDF(file);
      } else {
        loadedRequisites = await loadRequisites(file);
      }
      
      setRequisites(loadedRequisites);
      setSnackbarMessage('Реквизиты успешно загружены');
    } catch (error) {
      setSnackbarMessage(
        error instanceof Error ? error.message : 'Не удалось загрузить реквизиты'
      );
      console.error('Ошибка загрузки реквизитов:', error);
    } finally {
      setSnackbarOpen(true);
    }
  };
  

  const handleMatchRequisites = async () => {
    if (!contractFile || !requisitesFile) {
      const errorMessage = 'Пожалуйста, загрузите шаблон договора и файл реквизитов';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
      return;
    }

    try {
      const matchedPlaceholders = matchRequisitesToPlaceholders(placeholders, requisites);
      setPlaceholders(matchedPlaceholders);
      setError('');
      setSnackbarMessage('Реквизиты успешно сопоставлены');
      setSnackbarOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось сопоставить реквизиты';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const handleCreateDocument = async () => {
    if (!templateFile) {
      setError('Пожалуйста, загрузите шаблон договора');
      return;
    }
  
    try {
      // Читаем файл заново для гарантии актуальности
      const arrayBuffer = await templateFile.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
      let content = html;
  
      // Заменяем плейсхолдеры
      placeholders.forEach(placeholder => {
        if (placeholder.value) {
          const regex = new RegExp(`#${placeholder.name}`, 'g');
          content = content.replace(regex, placeholder.value);
        }
      });
  
      // Сохраняем документ
      await createAndSaveDocuments(
        placeholders,
		templateFile,
		{
		  font,
		  fontSize,
      createPdf: saveAsPdf // ✅ передаём PDF-флаг
		}
        
      );
  
      setSnackbarMessage('Документы успешно созданы');
      setCreateTemplatesDialogOpen(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка создания документов');
    } finally {
      setSnackbarOpen(true);
    }
  };

  const handleCopyRequisite = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setSnackbarMessage('Значение скопировано в буфер обмена');
    setSnackbarOpen(true);
  };

  const handlePastePlaceholder = async (index: number) => {
    if (copiedValue) {
      handlePlaceholderChange(index, copiedValue);
      setSnackbarMessage('Значение вставлено из буфера обмена');
      setSnackbarOpen(true);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, value: string) => {
    if (event.ctrlKey && event.key === 'c') {
      handleCopyRequisite(value);
    }
  };

  const handlePlaceholderKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.ctrlKey && event.key === 'v') {
      handlePastePlaceholder(index);
    }
  };

  const handleCreateTemplatesResponse = (createTemplates: boolean) => {
    setCreateTemplatesDialogOpen(false);
    if (createTemplates) {
      setTemplateCreationOpen(true);
    } else {
      navigate('/');
    }
  };

  const handleInvoiceTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setSnackbarMessage('Пожалуйста, загрузите файл в формате DOCX');
      setSnackbarOpen(true);
      return;
    }

    try {
      setInvoiceTemplateFile(file);
      setSnackbarMessage('Шаблон счета успешно загружен');
      setSnackbarOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось обработать шаблон счета';
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const handleActTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setSnackbarMessage('Пожалуйста, загрузите файл в формате DOCX');
      setSnackbarOpen(true);
      return;
    }

    try {
      setActTemplateFile(file);
      setSnackbarMessage('Шаблон акта успешно загружен');
      setSnackbarOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось обработать шаблон акта';
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const handleCreateInvoiceTemplate = async () => {
    if (!invoiceTemplateFile) {
      setSnackbarMessage('Пожалуйста, загрузите шаблон счета');
      setSnackbarOpen(true);
      return;
    }

    try {
      if (!templateFile) return;
      await createPrepopulatedTemplate(placeholders, invoiceTemplateFile);
      setSnackbarMessage('Шаблон счета успешно создан');
      setSnackbarOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать шаблон счета';
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const handleCreateActTemplate = async () => {
    if (!actTemplateFile) {
      setSnackbarMessage('Пожалуйста, загрузите шаблон акта');
      setSnackbarOpen(true);
      return;
    }

    try {
      if (!templateFile) return;
      await createPrepopulatedTemplate(placeholders, actTemplateFile);
      setSnackbarMessage('Шаблон акта успешно создан');
      setSnackbarOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать шаблон акта';
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  return (
    <Box>
      {/* Верхний блок с полями и кнопками */}
      <Box sx={{ mb: 2 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h1" gutterBottom>
            Подготовка договора
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
                    value={contractFile?.name || ''}
                    label="Шаблон договора"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    component="label"
                    fullWidth
                  >
                    Загрузить шаблон договора
                    <input
                      type="file"
                      hidden
                      accept=".docx"
                      onChange={handleContractUpload}
                    />
                  </Button>
                </Grid>
              </Grid>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    disabled
                    value={requisitesFile?.name || ''}
                    label="Файл реквизитов"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    component="label"
                    fullWidth
                  >
                    Загрузить реквизиты
                    <input
                      type="file"
                      hidden
                      accept=".docx,.pdf"
                      onChange={handleRequisitesUpload}
                    />
                  </Button>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Шрифт</InputLabel>
                    <Select
                      value={font}
                      label="Шрифт"
                      onChange={(e) => setFont(e.target.value)}
                    >
                      <MenuItem value="Calibri">Calibri</MenuItem>
                      <MenuItem value="Arial">Arial</MenuItem>
                      <MenuItem value="Times New Roman">Times New Roman</MenuItem>
                      <MenuItem value="Garamond">Garamond</MenuItem>
                      <MenuItem value="Cambria">Cambria</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Размер шрифта</InputLabel>
                    <Select
                      value={fontSize}
                      label="Размер шрифта"
                      onChange={(e) => setFontSize(Number(e.target.value))}
                    >
                      {[9, 10, 11, 12].map(size => (
                        <MenuItem key={size} value={size}>{size}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                </Grid>
              
                {/* ✅ Чекбокс "Сохранить в PDF" */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={saveAsPdf}
                      onChange={(e) => setSaveAsPdf(e.target.checked)}
                    />
                  }
                  label="Сохранить в PDF"
                />

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-start' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleMatchRequisites}
                  disabled={!contractFile || !requisitesFile}
                >
                  Сопоставить реквизиты
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCreateDocument}
                  disabled={!contractFile}
                >
                  Создать договор
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handlePreview}
                  disabled={!contractFile}
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
        </Container>
      </Box>

      <Box sx={{ overflowX: 'auto', overflowY: 'hidden', pb: 2, display: 'flex', justifyContent: 'center' }}>
        <Grid container spacing={2} wrap="nowrap" sx={{ width: 'max-content', maxWidth: '100%', justifyContent: 'center' }}>

          {/* Левый фрейм */}
          <Grid item sx={{ minWidth: `${Math.min(2, Math.ceil(placeholders.length / 14)) * 320}px` }}>
            <Paper sx={{
              p: 2,
              maxHeight: `${2 * 56 * 14 + 32}px`,
              overflowX: 'auto',
              overflowY: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}>
              <Box sx={{ overflowX: 'auto', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Вставить значения
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', minWidth: `${Math.min(2, Math.ceil(placeholders.length / 14)) * 320}px`, overflowX: 'auto' }}>
                {Array.from({ length: Math.ceil(placeholders.length / 14) }).map((_, colIndex) => (
                  <Box key={colIndex} sx={{ minWidth: 300, pr: 2 }}>
                    <Grid container spacing={2} direction="column">
                      {placeholders
                        .slice(colIndex * 14, (colIndex + 1) * 14)
                        .map((placeholder, index) => (
                          <Grid item key={index}>
                            <Grid container spacing={1} alignItems="center" wrap="nowrap">
                              <Grid item>
                                <Tooltip title={placeholder.name} TransitionComponent={Zoom}>
                                  <Typography sx={{ width: '15ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {placeholder.name}:
                                  </Typography>
                                </Tooltip>
                              </Grid>
                              <Grid item>
                                {placeholder.name.toLowerCase().startsWith('текст') ? (
                                  <TextField
                                    multiline
                                    minRows={2}
                                    maxRows={5}
                                    inputProps={{
                                      style: {
                                        width: '21ch',
                                        overflow: 'auto',
                                      },
                                    }}
                                    value={placeholder.value}
                                    onChange={(e) => handlePlaceholderChange(index + colIndex * 14, e.target.value)}
                                    onKeyDown={(e) => handlePlaceholderKeyDown(e, index + colIndex * 14)}
                                  />
                                ) : (
                                  <TextField
                                    inputProps={{ style: { width: '21ch' } }}
                                    size="small"
                                    value={placeholder.value}
                                    onChange={(e) => handlePlaceholderChange(index + colIndex * 14, e.target.value)}
                                    onKeyDown={(e) => handlePlaceholderKeyDown(e, index + colIndex * 14)}
                                  />
                                )}
                              </Grid>
                              <Grid item>
                                <Tooltip title="Вставить скопированное значение" TransitionComponent={Zoom}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => handlePastePlaceholder(index + colIndex * 14)}
                                      disabled={!copiedValue}
                                    >
                                      <ContentPasteIcon />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Grid>
                            </Grid>
                            <Divider sx={{ mt: 1, mb: 1 }} />
                          </Grid>
                        ))}
                    </Grid>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Правый фрейм */}
          <Grid item>
            <Paper sx={{
              p: 2,
              maxHeight: `${2 * 56 * 14 + 32}px`,
              width: `${2 * 320}px`,
              overflowX: 'auto',
              overflowY: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}>
              <Box sx={{ overflowX: 'auto', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Реквизиты
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', minWidth: `${Math.ceil(requisites.length / 14) * 320}px`, overflowX: 'auto' }}>
                {Array.from({ length: Math.ceil(requisites.length / 14) }).map((_, colIndex) => (
                  <Box key={colIndex} sx={{ minWidth: 300, pr: 2 }}>
                    <Grid container spacing={2} direction="column">
                      {requisites
                        .slice(colIndex * 14, (colIndex + 1) * 14)
                        .map((requisite, index) => (
                          <Grid item key={index}>
                            <Grid container spacing={1} alignItems="center" wrap="nowrap">
                              <Grid item>
                                <Tooltip title={requisite.value} TransitionComponent={Zoom}>
                                <TextField
                                  inputProps={{ style: { width: '21ch' } }}
                                  size="small"
                                  value={requisite.value}
                                  onChange={(e) =>
                                    handleRequisiteChange(
                                      index + colIndex * 14,
                                      e.target.value,
                                      requisites,
                                      setRequisites
                                    )
                                  }
                                  onKeyDown={(e) => handleKeyDown(e, requisite.value)}
                                />
                                </Tooltip>
                              </Grid>
                              <Grid item>
                                <Tooltip title="Копировать значение" TransitionComponent={Zoom}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopyRequisite(requisite.value)}
                                  >
                                    <ContentCopyIcon />
                                  </IconButton>
                                </Tooltip>
                              </Grid>
                            </Grid>
                            <Divider sx={{ mt: 1, mb: 1 }} />
                          </Grid>
                        ))}
                    </Grid>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

        </Grid>
      </Box>

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

      <Dialog
        open={createTemplatesDialogOpen}
        onClose={() => handleCreateTemplatesResponse(false)}
      >
        <DialogTitle>Создать дополнительные шаблоны</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Хотите создать шаблоны счета или акта для этого контрагента?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCreateTemplatesResponse(false)}>Нет</Button>
          <Button onClick={() => handleCreateTemplatesResponse(true)} variant="contained">
            Да
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={templateCreationOpen}
        onClose={() => setTemplateCreationOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Создание шаблонов</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Создать предзаполненные шаблоны счета и акта
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  disabled
                  value={invoiceTemplateFile?.name || ''}
                  label="Шаблон счета"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  component="label"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Загрузить шаблон счета
                  <input
                    type="file"
                    hidden
                    accept=".docx"
                    onChange={handleInvoiceTemplateUpload}
                  />
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleCreateInvoiceTemplate}
                  disabled={!invoiceTemplateFile}
                >
                  Создать шаблон счета
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  disabled
                  value={actTemplateFile?.name || ''}
                  label="Шаблон акта"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  component="label"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Загрузить шаблон акта
                  <input
                    type="file"
                    hidden
                    accept=".docx"
                    onChange={handleActTemplateUpload}
                  />
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleCreateActTemplate}
                  disabled={!actTemplateFile}
                >
                  Создать шаблон акта
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/')}>В главное меню</Button>
          <Button onClick={() => setTemplateCreationOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
}

export default ContractForm;
