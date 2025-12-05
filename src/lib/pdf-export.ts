import { jsPDF } from 'jspdf';
import { BatteryAnalysis, BatteryReading, TemperatureUnit } from './types';
import { format } from 'date-fns';

export interface PDFExportData {
  readings: BatteryReading[];
  analysis: BatteryAnalysis;
  temperatureUnit: TemperatureUnit;
}

export function generatePDFReport(data: PDFExportData): void {
  const { readings, analysis, temperatureUnit } = data;
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;
  
  const celsiusToFahrenheit = (celsius: number) => (celsius * 9/5) + 32;
  const convertTemp = (celsius: number) => temperatureUnit === 'C' ? celsius : celsiusToFahrenheit(celsius);
  
  doc.setFontSize(24);
  doc.setTextColor(60, 60, 200);
  doc.text('EV Battery Health Report', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, margin, yPos);
  yPos += 15;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Battery Health Score', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(32);
  doc.setTextColor(60, 60, 200);
  doc.text(`${analysis.healthScore}/100`, margin, yPos);
  
  doc.setFontSize(12);
  const healthLabel = analysis.healthScore >= 80 ? 'Excellent' : 
                      analysis.healthScore >= 60 ? 'Good' : 
                      analysis.healthScore >= 40 ? 'Fair' : 'Poor';
  const healthColor = analysis.healthScore >= 80 ? [34, 197, 94] as [number, number, number] : 
                      analysis.healthScore >= 60 ? [234, 179, 8] as [number, number, number] : [239, 68, 68] as [number, number, number];
  doc.setTextColor(healthColor[0], healthColor[1], healthColor[2]);
  doc.text(`(${healthLabel})`, margin + 40, yPos);
  yPos += 15;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const progressBarWidth = pageWidth - 2 * margin;
  const progressBarHeight = 8;
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(margin, yPos, progressBarWidth, progressBarHeight, 2, 2, 'F');
  
  const fillWidth = (analysis.healthScore / 100) * progressBarWidth;
  doc.setFillColor(healthColor[0], healthColor[1], healthColor[2]);
  doc.roundedRect(margin, yPos, fillWidth, progressBarHeight, 2, 2, 'F');
  yPos += 20;
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Data Summary', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const summaryData = [
    `Data Points: ${analysis.dataPoints}`,
    `Time Span: ${analysis.timeSpan}`,
    `Average Voltage: ${analysis.avgVoltage.toFixed(2)}V`,
    `Voltage Range: ${analysis.voltageRange.min.toFixed(2)}V - ${analysis.voltageRange.max.toFixed(2)}V`,
    `Average Temperature: ${convertTemp(analysis.avgTemperature).toFixed(1)}°${temperatureUnit}`,
    `Temperature Range: ${convertTemp(analysis.temperatureRange.min).toFixed(1)}°${temperatureUnit} - ${convertTemp(analysis.temperatureRange.max).toFixed(1)}°${temperatureUnit}`
  ];
  
  summaryData.forEach(line => {
    doc.text(line, margin + 5, yPos);
    yPos += 6;
  });
  yPos += 10;
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('AI Analysis', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const summaryLines = doc.splitTextToSize(analysis.summary, pageWidth - 2 * margin - 10);
  summaryLines.forEach((line: string) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, margin + 5, yPos);
    yPos += 5;
  });
  yPos += 10;
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Recommendations', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  analysis.recommendations.forEach((rec, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(60, 60, 200);
    doc.circle(margin + 7, yPos - 1.5, 1.5, 'F');
    
    const recLines = doc.splitTextToSize(rec, pageWidth - 2 * margin - 15);
    recLines.forEach((line: string, lineIndex: number) => {
      doc.text(line, margin + 12, yPos + (lineIndex * 5));
    });
    yPos += recLines.length * 5 + 3;
  });
  
  yPos += 10;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Recent Readings', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  
  const tableHeaders = ['Timestamp', 'Voltage', 'Temperature'];
  const colWidths = [70, 40, 50];
  const startX = margin;
  
  doc.setFillColor(240, 240, 245);
  doc.rect(startX, yPos - 5, colWidths.reduce((a, b) => a + b), 8, 'F');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  let xPos = startX + 2;
  tableHeaders.forEach((header, i) => {
    doc.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  
  const maxRows = Math.min(15, readings.length);
  const displayReadings = readings.slice(0, maxRows);
  
  displayReadings.forEach((reading, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(startX, yPos - 4, colWidths.reduce((a, b) => a + b), 6, 'F');
    }
    
    xPos = startX + 2;
    doc.text(format(new Date(reading.timestamp), 'MMM dd, HH:mm:ss'), xPos, yPos);
    xPos += colWidths[0];
    doc.text(`${reading.voltage.toFixed(2)}V`, xPos, yPos);
    xPos += colWidths[1];
    doc.text(`${convertTemp(reading.temperature).toFixed(1)}°${temperatureUnit}`, xPos, yPos);
    
    yPos += 6;
  });
  
  if (readings.length > maxRows) {
    yPos += 2;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`... and ${readings.length - maxRows} more readings`, startX + 2, yPos);
  }
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  const fileName = `battery-health-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}
