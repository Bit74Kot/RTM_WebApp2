import mammoth from 'mammoth';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface PlaceholderData {
  name: string;
  value: string;
}

export interface RequisiteData {
  id: number;
  value: string;
}

export interface DocumentOptions {
  font: string;
  fontSize: number;
  createPdf?: boolean;
}

export const placeholderPatterns: Record<string, RegExp> = {
  имя: /[А-ЯЁ][а-яё]+\s[А-ЯЁ][а-яё]+\s[А-ЯЁ][а-яё]+/,
  название: /"[^"]*[A-ZА-ЯЁ][^"]*"/,
  огрнип: /\b\d{15}\b/,
  огрн: /\b\d{13}\b/,
  инн: /\b\d{12}\b/,
  инно: /\b\d{10}\b/,
  бик: /\b04\d{7}\b/,
  кпп: /\b\d{9}\b/,
  расчетныйсчет: /\b40\d{18}\b/,
  коррсчет: /\b30\d{18}\b/,
  адрес: /(?=.*\d)(?=.*[a-zA-Zа-яА-ЯёЁ])(?=.*[.,]).*/,
  наименованиебанка: /(?=.*банк)(?=.*в)/i,
  имейл: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
};

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanupWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r?\n|\r/g, '');
}

function removeMarkers(text: string): string {
  return text.replace(/{{/g, '').replace(/}}/g, '');
}


// Удаляем функцию processBoldMarkers, так как больше не используем маркеры {{ }}

function processRuns(paragraph: Element, placeholders: PlaceholderData[], options: DocumentOptions): void {
  const runs = Array.from(paragraph.getElementsByTagName('w:r'));
  if (runs.length === 0) return;

  let fullText = '';
  const positionMap: { bold: boolean; italic: boolean; underline: boolean; color: string | null; rPr: Element | null }[] = [];

  runs.forEach(run => {
    const texts = run.getElementsByTagName('w:t');
    const runText = Array.from(texts).map(t => t.textContent || '').join('');

    const tabs = run.getElementsByTagName('w:tab').length;
    const rPr = run.getElementsByTagName('w:rPr')[0];
    const isBold = rPr ? rPr.getElementsByTagName('w:b').length > 0 : false;
    const isItalic = rPr ? rPr.getElementsByTagName('w:i').length > 0 : false;
    const isUnderline = rPr ? rPr.getElementsByTagName('w:u').length > 0 : false;

    let color: string | null = null;
    const colorElem = rPr?.getElementsByTagName('w:color')[0];
    if (colorElem && colorElem.getAttribute('w:val')) {
      color = colorElem.getAttribute('w:val');
    }

    const rPrClone = rPr ? rPr.cloneNode(true) as Element : null;

    for (let i = 0; i < runText.length; i++) {
      fullText += runText[i];
      positionMap.push({ bold: isBold, italic: isItalic, underline: isUnderline, color, rPr: rPrClone });
    }

    for (let i = 0; i < tabs; i++) {
      fullText += '\t';
      positionMap.push({ bold: isBold, italic: isItalic, underline: isUnderline, color, rPr: rPrClone });
    }
  });

  let finalText = '';
  const formattingMap: { bold: boolean; italic: boolean; underline: boolean; color: string | null; rPr: Element | null }[] = [];

  let i = 0;
  while (i < fullText.length) {
    const match = fullText.slice(i).match(/^#([a-zA-Zа-яА-ЯёЁ]+)/);
    if (match) {
      const name = match[1];
      const placeholder = placeholders.find(p => p.name === name);
      const placeholderLength = match[0].length;

      if (placeholder && placeholder.value) {
        const replacement = escapeXml(cleanupWhitespace(placeholder.value));

        const format = positionMap[i] || { bold: false, italic: false, underline: false, color: null, rPr: null };

        for (let j = 0; j < replacement.length; j++) {
          finalText += replacement[j];
          formattingMap.push({
            bold: format.bold,
            italic: format.italic,
            underline: format.underline,
            color: format.color,
            rPr: format.rPr
          });
        }

        i += placeholderLength;
        continue;
      }
    }

    finalText += fullText[i];
    formattingMap.push(positionMap[i] || { bold: false, italic: false, underline: false, color: null, rPr: null });
    i++;
  }

  runs.forEach(run => {
    const drawings = run.getElementsByTagName('w:drawing');
    if (drawings.length === 0 && run.parentNode) {
      run.parentNode.removeChild(run);
    }
  });

  if (finalText.length > 0) {
    let current = formattingMap[0];
    let currentStart = 0;

    for (let i = 1; i <= finalText.length; i++) {
      const next = formattingMap[i];
      const shouldBreak = i === finalText.length ||
        next?.bold !== current.bold ||
        next?.italic !== current.italic ||
        next?.underline !== current.underline ||
        next?.color !== current.color ||
        next?.rPr !== current.rPr;

      if (shouldBreak) {
        const runText = finalText.slice(currentStart, i);
        const newRun = paragraph.ownerDocument.createElement('w:r');

        if (current.rPr && !current.bold && !current.italic && !current.underline && !current.color) {
          newRun.appendChild(current.rPr.cloneNode(true));
        }

        updateRunPropertiesWithStyle(newRun, options, current.bold, current.italic, current.underline, current.color);

        for (const char of runText) {
          if (char === '\t') {
            const tab = paragraph.ownerDocument.createElement('w:tab');
            newRun.appendChild(tab);
          } else {
            const textNode = paragraph.ownerDocument.createElement('w:t');
            textNode.setAttribute('xml:space', 'preserve');
            textNode.textContent = char;
            newRun.appendChild(textNode);
          }
        }

        paragraph.appendChild(newRun);

        if (i < finalText.length) {
          current = formattingMap[i];
          currentStart = i;
        }
      }
    }
  }
}

function updateRunPropertiesWithStyle(run: Element, options: DocumentOptions, isBold = false, isItalic = false, isUnderline = false, color: string | null = null): void {
  let rPr = run.getElementsByTagName('w:rPr')[0];
  if (!rPr) {
    rPr = run.ownerDocument.createElement('w:rPr');
    run.insertBefore(rPr, run.firstChild);
  }

  const rFonts = run.ownerDocument.createElement('w:rFonts');
  rFonts.setAttribute('w:ascii', options.font);
  rFonts.setAttribute('w:hAnsi', options.font);
  rFonts.setAttribute('w:cs', options.font);
  rPr.appendChild(rFonts);

  const sz = run.ownerDocument.createElement('w:sz');
  sz.setAttribute('w:val', String(options.fontSize * 2));
  rPr.appendChild(sz);

  if (isBold) {
    const bold = run.ownerDocument.createElement('w:b');
    rPr.appendChild(bold);
  }

  if (isItalic) {
    const italic = run.ownerDocument.createElement('w:i');
    rPr.appendChild(italic);
  }

  if (isUnderline) {
    const underline = run.ownerDocument.createElement('w:u');
    underline.setAttribute('w:val', 'single');
    rPr.appendChild(underline);
  }

  if (color) {
    const colorElem = run.ownerDocument.createElement('w:color');
    colorElem.setAttribute('w:val', color);
    rPr.appendChild(colorElem);
  }
}


async function processDocumentXml(xml: string, placeholders: PlaceholderData[], options: DocumentOptions): Promise<string> {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'text/xml');

  // Обрабатываем параграфы
  const paragraphs = xmlDoc.getElementsByTagName('w:p');
  Array.from(paragraphs).forEach(paragraph => {
      processRuns(paragraph, placeholders, options);
  });

  return new XMLSerializer().serializeToString(xmlDoc);
}

export async function createAndSaveDocuments(
  placeholders: PlaceholderData[],
  file: File,
  options: DocumentOptions
): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Обрабатываем основной документ
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) throw new Error('Could not find document.xml');
    
    const processedXml = await processDocumentXml(documentXml, placeholders, options);
    const newZip = new JSZip();

    // Копируем все файлы, корректно обрабатывая тип содержимого
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (path === 'word/document.xml') {
        newZip.file(path, processedXml, { binary: false }); // сохраняем как текст
      } else {
        const content = await zipEntry.async('uint8array'); // сохраняем бинарно
        newZip.file(path, content);
      }
    }

    // Генерируем и сохраняем DOCX
    const docxContent = await newZip.generateAsync({ type: 'blob' });
    saveAs(docxContent, 'Договор.docx');

  } catch (error) {
    console.error('Document creation error:', error);
    throw error;
  }
}


export async function createTemplate(
  templateFile: File,
  placeholders: PlaceholderData[]
): Promise<void> {
  if (!templateFile) {
    throw new Error('Template file is required');
  }

  try {
    const arrayBuffer = await templateFile.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('Could not find document.xml in the template');
    }

    // Parse the document XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(documentXml, 'text/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Failed to parse document XML');
    }

    // Apply template-specific replacements
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    replaceTextInParagraphsTemplate(Array.from(paragraphs), placeholders);

    const tables = xmlDoc.getElementsByTagName('w:tbl');
    replaceTextInTablesTemplate(Array.from(tables), placeholders);

    replaceTextInHeadersFootersTemplate(xmlDoc, placeholders);

    // Create a new ZIP to preserve all original files
    const newZip = new JSZip();
    
    // Copy all files from original ZIP to preserve styles and formatting
    for (const [path, file] of Object.entries(zip.files)) {
      if (path === 'word/document.xml') {
        const serializedXml = new XMLSerializer().serializeToString(xmlDoc);
        newZip.file(path, serializedXml);
      } else {
        const content = await file.async('arraybuffer');
        newZip.file(path, content);
      }
    }

    // Generate DOCX content
    const docxContent = await newZip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const docxFileName = `template_${timestamp}.docx`;

    // Save DOCX file
    await saveAs(docxContent, docxFileName);
  } catch (error) {
    console.error('Template creation error:', error);
    throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function replacePlaceholders(template: string, placeholders: PlaceholderData[]): string {
  if (!template || !placeholders) {
    throw new Error('Missing template or placeholders');
  }

  let content = removeMarkers(template);
  placeholders.forEach(placeholder => {
    if (placeholder.value) {
      const regex = new RegExp(`#${escapeRegExp(placeholder.name)}`, 'g');
      const cleanValue = cleanupWhitespace(placeholder.value);
      content = content.replace(regex, cleanValue);
    }
  });
  return content;
}

export async function findPlaceholders(file: File): Promise<PlaceholderData[]> {
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const htmlContent = result.value;

    const regex = /#([a-zA-Zа-яА-ЯёЁ]+)/g;
    const matches = htmlContent.match(regex) || [];
    const uniquePlaceholders = [...new Set(matches.map(match => match.slice(1)))];
    
    return uniquePlaceholders.map(name => ({
      name,
      value: ''
    }));
  } catch (error) {
    console.error('Error finding placeholders:', error);
    throw new Error('Failed to process document');
  }
}

export async function readDocxFile(file: File): Promise<string> {
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return removeMarkers(result.value);
  } catch (error) {
    console.error('Error reading DOCX file:', error);
    throw new Error('Failed to read document');
  }
}

export async function loadRequisites(file: File): Promise<RequisiteData[]> {
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    const text = await readDocxFile(file);
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return lines.map((value, index) => ({
      id: index,
      value: removeMarkers(value.trim())
    }));
  } catch (error) {
    console.error('Error loading requisites:', error);
    throw new Error('Failed to load requisites');
  }
}

export function matchRequisitesToPlaceholders(
  placeholders: PlaceholderData[],
  requisites: RequisiteData[]
): PlaceholderData[] {
  if (!placeholders || !requisites) {
    throw new Error('Missing placeholders or requisites');
  }

  const updatedPlaceholders = [...placeholders];
  const usedValues = new Set<string>();
  
  for (const placeholder of updatedPlaceholders) {
    const lowerName = placeholder.name.toLowerCase();
    
    for (const [patternKey, pattern] of Object.entries(placeholderPatterns)) {
      if (lowerName.includes(patternKey)) {
        for (const requisite of requisites) {
          const value = removeMarkers(requisite.value.trim());
          if (pattern.test(value) && !usedValues.has(value)) {
            placeholder.value = value;
            usedValues.add(value);
            break;
          }
        }
        break;
      }
    }
  }
  
  return updatedPlaceholders;
}

function replaceTextInParagraphTemplate(paragraph: Element, placeholders: PlaceholderData[]): void {
  const runs = Array.from(paragraph.getElementsByTagName('w:r'));
  if (runs.length === 0) return;

  // Get full text from all runs
  let fullText = '';
  const runProperties: Element[] = [];
  
  runs.forEach(run => {
    const rPr = run.getElementsByTagName('w:rPr')[0];
    if (rPr) runProperties.push(rPr.cloneNode(true) as Element);
    
    const texts = run.getElementsByTagName('w:t');
    fullText += Array.from(texts).map(t => t.textContent || '').join('');
  });

  let replaced = false;
  let processedText = fullText;

  // Replace placeholders
  for (const placeholder of placeholders) {
    if (placeholder.value) {
      const pattern = `#${placeholder.name}`;
      if (processedText.includes(pattern)) {
        processedText = processedText.replace(
          new RegExp(escapeRegExp(pattern), 'g'),
          escapeXml(cleanupWhitespace(placeholder.value))
        );
        replaced = true;
      }
    }
  }

  // If any replacements were made, update the paragraph
  if (replaced) {
    // Clear all existing runs
    runs.forEach(run => {
      if (run.parentNode) {
        run.parentNode.removeChild(run);
      }
    });

    // Create a new run with the processed text
    const newRun = paragraph.ownerDocument.createElement('w:r');
    
    // Apply the first available run properties
    if (runProperties.length > 0) {
      newRun.appendChild(runProperties[0]);
    }

    const newText = paragraph.ownerDocument.createElement('w:t');
    newText.setAttribute('xml:space', 'preserve');
    newText.textContent = processedText;
    newRun.appendChild(newText);
    
    paragraph.appendChild(newRun);
  }
}

function replaceTextInTablesTemplate(tables: Element[], placeholders: PlaceholderData[]): void {
  for (const table of tables) {
    const cells = table.getElementsByTagName('w:tc');
    for (const cell of Array.from(cells)) {
      const paragraphs = cell.getElementsByTagName('w:p');
      replaceTextInParagraphsTemplate(Array.from(paragraphs), placeholders);
    }
  }
}

function replaceTextInParagraphsTemplate(paragraphs: Element[], placeholders: PlaceholderData[]): void {
  for (const paragraph of paragraphs) {
    replaceTextInParagraphTemplate(paragraph, placeholders);
  }
}

function replaceTextInHeadersFootersTemplate(document: Document, placeholders: PlaceholderData[]): void {
  const headerRefs = document.getElementsByTagName('w:headerReference');
  const footerRefs = document.getElementsByTagName('w:footerReference');

  for (const ref of [...Array.from(headerRefs), ...Array.from(footerRefs)]) {
    const refId = ref.getAttribute('r:id');
    if (refId) {
      const headerFooterParagraphs = document.getElementsByTagName('w:p');
      replaceTextInParagraphsTemplate(Array.from(headerFooterParagraphs), placeholders);
    }
  }
}