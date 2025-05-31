import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface RequisiteData {
  id: number;
  value: string;
}

export async function extractTextFromPDF(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Группируем текстовые элементы по координате y
      const linesMap = new Map<number, string[]>();

      textContent.items.forEach((item) => {
        if ('str' in item && item.str.trim()) {
          const textItem = item as TextItem;
          const y = Math.round(textItem.transform[5]); // координата Y, округляем
          if (!linesMap.has(y)) {
            linesMap.set(y, []);
          }
          linesMap.get(y)!.push(textItem.str);
        }
      });

      const pageLines = [...linesMap.entries()]
        .sort((a, b) => b[0] - a[0]) // сверху вниз
        .map(([_, words]) => words.join(' ').replace(/\s+/g, ' ').trim())
        .filter(line => line.length > 0 && /[a-zA-Zа-яА-ЯёЁ0-9]/.test(line));

      allLines.push(...pageLines);
    }

    return [...new Set(allLines)];

  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}


export async function loadRequisitesFromPDF(file: File): Promise<RequisiteData[]> {
  try {
    const textLines = await extractTextFromPDF(file);
    return textLines.map((value, index) => ({
      id: index,
      value: value.trim()
    }));
  } catch (error) {
    console.error('Error loading requisites from PDF:', error);
    throw new Error('Failed to load requisites from PDF');
  }
}

export async function createPDFFromDocx(docxContent: Blob): Promise<Blob> {
  try {
    const arrayBuffer = await docxContent.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    const doc = new jsPDF();
    const lines = result.value.split('\n');
    const margin = 20;
    let y = margin;
    
    doc.setFont('helvetica');
    doc.setFontSize(12);
    
    lines.forEach(line => {
      if (y > doc.internal.pageSize.height - margin) {
        doc.addPage();
        y = margin;
      }
      
      if (line.trim()) {
        doc.text(line, margin, y);
        y += 10;
      } else {
        y += 5;
      }
    });

    return doc.output('blob');
  } catch (error) {
    console.error('Error creating PDF from DOCX:', error);
    throw new Error('Failed to create PDF from DOCX');
  }
}

export async function saveAsPDF(docxContent: Blob, fileName: string): Promise<void> {
  try {
    const pdfBlob = await createPDFFromDocx(docxContent);
    saveAs(pdfBlob, fileName.replace('.docx', '.pdf'));
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw new Error('Failed to save PDF');
  }
}

// ✅ Добавлено для совместимости
export const convertDocxToPdf = createPDFFromDocx;
