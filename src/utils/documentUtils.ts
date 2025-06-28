import mammoth from 'mammoth';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface PlaceholderData {
  name: string;
  value: string;
  position?: number;
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
  имякратко: /[А-ЯЁ][а-яё]+\s[А-ЯЁ][а-яё]+\s[А-ЯЁ][а-яё]+/,
  название: /"[^"]*[A-ZА-ЯЁ][^"]*"/,
  огрнип: /\b\d{15}\b/,
  огрн: /\b\d{13}\b/,
  инн: /\b\d{12}\b/,
  инно: /\b\d{10}\b/,
  бик: /\b04\d{7}\b/,
  кпп: /\b\d{9}\b/,
  снилс: /\b\d{3}-\d{3}-\d{3} \d{2}\b/i,
  госномер: /\b[А-Я]{1}\d{3}[А-Я]{2}\d{2,3}\b/,
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
    const match = fullText.slice(i).match(/^#([a-zA-Zа-яА-ЯёЁ0-9]+)/);
    if (match) {
      const name = match[1];
      const placeholder = placeholders.find(p => p.name === name);
      const placeholderLength = match[0].length;

      if (placeholder) {
        const replacement = placeholder.value?.trim() ? escapeXml(cleanupWhitespace(placeholder.value)) : '';
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

        if (current.rPr) {
          newRun.appendChild(current.rPr.cloneNode(true));
        } else {
          updateRunPropertiesWithStyle(newRun, options, current.bold, current.italic, current.underline, current.color);
        }

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

function updateRunPropertiesWithStyle(
  run: Element,
  options: DocumentOptions,
  isBold = false,
  isItalic = false,
  isUnderline = false,
  color: string | null = null
): void {
  let rPr = run.getElementsByTagName('w:rPr')[0];
  if (!rPr) {
    rPr = run.ownerDocument.createElement('w:rPr');
    run.insertBefore(rPr, run.firstChild);
  }

  // ✅ Сохраняем оригинальный шрифт
  if (options.font && options.font !== 'preserve') {
    const rFonts = run.ownerDocument.createElement('w:rFonts');
    rFonts.setAttribute('w:ascii', options.font);
    rFonts.setAttribute('w:hAnsi', options.font);
    rFonts.setAttribute('w:cs', options.font);
    rPr.appendChild(rFonts);
  }

  // ✅ Сохраняем оригинальный размер
  if (options.fontSize && options.fontSize > 0) {
    const sz = run.ownerDocument.createElement('w:sz');
    sz.setAttribute('w:val', String(options.fontSize * 2));
    rPr.appendChild(sz);
  }

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

export function handleRequisiteChange(
  index: number,
  newValue: string,
  requisites: RequisiteData[],
  setRequisites: React.Dispatch<React.SetStateAction<RequisiteData[]>>
) {
  const updated = [...requisites];
  updated[index] = { ...updated[index], value: newValue };
  setRequisites(updated);
}

export function pasteValueToPlaceholder(
  index: number,
  value: string,
  placeholders: PlaceholderData[],
  setPlaceholders: React.Dispatch<React.SetStateAction<PlaceholderData[]>>
) {
  const updated = [...placeholders];
  updated[index] = { ...updated[index], value };
  setPlaceholders(updated);
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

    if (options.createPdf) {
      const formData = new FormData();
      formData.append('file', docxContent, 'Договор.docx');

      try {
        const response = await fetch('https://contract-pdf-server-production.up.railway.app/convert-to-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Ошибка при получении PDF');

        const blob = await response.blob();
        saveAs(blob, 'Договор.pdf');
      } catch (err) {
        console.error('PDF conversion error:', err);
      }
    }

  } catch (error) {
    console.error('Document creation error:', error);
    throw error;
  }
}

export async function createPrepopulatedTemplate(
  placeholders: PlaceholderData[],
  file: File
): Promise<void> {
  return createDocumentPreserveStyles(placeholders, file);
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

    const regex = /#([a-zA-Zа-яА-ЯёЁ0-9]+)/g;
    const placeholdersMap: Record<string, number> = {};
    let match;

    while ((match = regex.exec(htmlContent)) !== null) {
      const name = match[1];
      if (!(name in placeholdersMap)) {
        placeholdersMap[name] = match.index; // сохранить позицию первого вхождения
      }
    }

    return Object.entries(placeholdersMap).map(([name, position]) => ({
      name,
      value: '',
      position
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
  const updatedPlaceholders = [...placeholders];
  const usedValues = new Set<string>();

  // Паттерны ФИО
  const fullNameRegex = /[А-ЯЁ][а-яё]+ [А-ЯЁ][а-яё]+ [А-ЯЁ][а-яё]+/;
  const shortNameRegex = /\b[А-ЯЁ][а-яё]+\s[А-ЯЁ]\.(?:\s?[А-ЯЁ]\.)?\b/;

  // Найти полное имя
  let fullName: string | null = null;
  let shortName: string | null = null;

  for (const { value } of requisites) {
    if (!fullName) {
      const match = value.match(fullNameRegex);
      if (match) fullName = match[0];
    }
    if (!shortName) {
      const match = value.match(shortNameRegex);
      if (match) shortName = match[0];
    }
  }

  // Сформировать краткое имя
  if (!shortName && fullName) {
    const parts = fullName.split(' ');
    if (parts.length === 3) {
      const [last, first, middle] = parts;
      shortName = `${last} ${first[0]}.${middle[0]}.`;
    }
  }

  // Функция нормализации госномера
  function normalizePlate(value: string): string {
    const map: Record<string, string> = {
      A: 'А', a: 'А', B: 'В', b: 'В', E: 'Е', e: 'Е',
      K: 'К', k: 'К', M: 'М', m: 'М', H: 'Н', h: 'Н',
      O: 'О', o: 'О', P: 'Р', p: 'Р', C: 'С', c: 'С',
      T: 'Т', t: 'Т', Y: 'У', y: 'У', X: 'Х', x: 'Х'
    };
    return value.replace(/[A-Za-z]/g, ch => map[ch] || ch).toUpperCase();
  }

  // Проверка, похожа ли строка на госномер
  function looksLikeCarPlate(value: string): boolean {
    const normalized = normalizePlate(value);
    return /^[А-Я]{1}\d{3}[А-Я]{2}\d{2,3}$/.test(normalized);
  }

  for (const placeholder of updatedPlaceholders) {
    const placeholderKey = placeholder.name.trim().toLowerCase();

    if (placeholderKey === 'имя' && fullName) {
      placeholder.value = fullName;
      usedValues.add(fullName);
      continue;
    }

    if (placeholderKey === 'имякратко' && shortName) {
      placeholder.value = shortName;
      usedValues.add(shortName);
      continue;
    }

    if (placeholderKey === 'госномер') {
      for (const { value } of requisites) {
        if (looksLikeCarPlate(value)) {
          const normalized = normalizePlate(value);
          placeholder.value = normalized;
          usedValues.add(normalized);
          break;
        }
      }
      continue;
    }

    const pattern = placeholderPatterns[placeholderKey];
    if (!pattern) continue;

    for (const { value } of requisites) {
      if (pattern.test(value) && !usedValues.has(value)) {
        placeholder.value = value;
        usedValues.add(value);
        break;
      }
    }
  }

  return updatedPlaceholders;
}

export async function createDocumentPreserveStyles(
  placeholders: PlaceholderData[],
  file: File,
  options?: DocumentOptions
): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) throw new Error('Could not find document.xml');

    const processedXml = await processDocumentXml(documentXml, placeholders, {
      font: 'preserve',      // специальный маркер: не изменять шрифт
      fontSize: -1           // специальный маркер: не изменять размер
    });

    const newZip = new JSZip();
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (path === 'word/document.xml') {
        newZip.file(path, processedXml, { binary: false });
      } else {
        const content = await zipEntry.async('uint8array');
        newZip.file(path, content);
      }
    }

    const docxContent = await newZip.generateAsync({ type: 'blob' });
    const fileName = `Документ_${new Date().toISOString().replace(/[:.]/g, '-')}.docx`;
    saveAs(docxContent, fileName);

    if (options?.createPdf) {
      const formData = new FormData();
      formData.append('file', docxContent, 'Документ.docx');

      try {
        const response = await fetch('https://contract-pdf-server-production.up.railway.app/convert-to-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Ошибка при получении PDF');

        const blob = await response.blob();
        saveAs(blob, 'Документ.pdf');
      } catch (err) {
        console.error('PDF conversion error:', err);
      }
    }
  } catch (error) {
    console.error('Document creation error:', error);
    throw error;
  }
}

