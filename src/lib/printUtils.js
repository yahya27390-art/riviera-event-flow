import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function printElementAsPDF(elementId, filename = 'report.pdf') {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 0,
  });

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  if (!imgWidth || !imgHeight || imgWidth === 0 || imgHeight === 0) {
    console.error('Canvas dimensions are invalid');
    return;
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const ratio = imgHeight / imgWidth;
  const pdfImgWidth = pdfWidth;
  const pdfImgHeight = pdfWidth * ratio;

  let heightLeft = pdfImgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, pdfImgWidth, pdfImgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - pdfImgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfImgWidth, pdfImgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(filename);
}