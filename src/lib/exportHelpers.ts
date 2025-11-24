import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashBalance: number;
  totalReceived?: number;
  totalPaid?: number;
  avgTicket?: number;
  defaultRate?: number;
  monthGrowth?: number;
}

// Helper function to convert image URL to base64
async function getImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

// Import Bull Finance logo
import bullFinanceLogo from '@/assets/bull-finance-logo.png';

export async function exportToPDF(data: FinancialData, clientName: string, clientLogoUrl?: string) {
  const doc = new jsPDF();
  
  // Define Bull Finance colors
  const bullGreen: [number, number, number] = [4, 43, 28]; // #042b1c
  const bullGold: [number, number, number] = [212, 175, 55];
  const bullEmerald: [number, number, number] = [52, 168, 83];
  
  // Header with branding
  doc.setFillColor(...bullGreen);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Add Bull Finance logo in the center
  try {
    const base64Logo = await getImageAsBase64(bullFinanceLogo);
    // Logo centered at top (105 is center of 210mm width)
    doc.addImage(base64Logo, 'PNG', 85, 8, 40, 24);
  } catch (error) {
    console.error('Error adding Bull Finance logo to PDF:', error);
  }
  
  // Title in white (left side)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BULL FINANCE', 14, 16);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Financeiro Profissional', 14, 24);
  
  // Client info box
  doc.setTextColor(...bullGreen);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', 14, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(clientName, 35, 50);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Data de Emissão:', 14, 57);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('pt-BR'), 50, 57);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Período:', 14, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), 35, 64);
  
  // Executive Summary Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...bullGreen);
  doc.text('SUMÁRIO EXECUTIVO', 14, 78);
  
  const summaryData = [
    ['Total Recebido no Período', formatCurrency(data.totalReceived || data.totalRevenue)],
    ['Total Pago no Período', formatCurrency(data.totalPaid || data.totalExpenses)],
    ['Lucro Líquido', formatCurrency(data.netProfit)],
    ['Saldo em Caixa', formatCurrency(data.cashBalance)],
    ['Contas a Receber (Pendente)', formatCurrency(data.accountsReceivable)],
    ['Contas a Pagar (Pendente)', formatCurrency(data.accountsPayable)],
  ];
  
  if (data.avgTicket) {
    summaryData.push(['Ticket Médio', formatCurrency(data.avgTicket)]);
  }
  if (data.defaultRate !== undefined) {
    summaryData.push(['Taxa de Inadimplência', `${data.defaultRate.toFixed(1)}%`]);
  }
  if (data.monthGrowth !== undefined) {
    summaryData.push(['Crescimento Mensal', `${data.monthGrowth > 0 ? '+' : ''}${data.monthGrowth.toFixed(1)}%`]);
  }
  
  autoTable(doc, {
    startY: 83,
    head: [['Indicador', 'Valor']],
    body: summaryData,
    theme: 'striped',
    headStyles: { 
      fillColor: bullGreen,
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // DRE section
  const dreY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...bullGreen);
  doc.text('DEMONSTRATIVO DE RESULTADO (DRE)', 14, dreY);
  
  const dreData = [
    ['Receita Operacional', formatCurrency(data.totalReceived || data.totalRevenue)],
    ['(-) Despesas Operacionais', formatCurrency(-(data.totalPaid || data.totalExpenses))],
    ['= Resultado Líquido do Período', formatCurrency(data.netProfit)],
  ];
  
  autoTable(doc, {
    startY: dreY + 5,
    head: [['Descrição', 'Valor (R$)']],
    body: dreData,
    theme: 'striped',
    headStyles: { 
      fillColor: bullGreen,
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didParseCell: (data: any) => {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = bullGold;
      }
    },
  });
  
  // Balance Sheet section
  const balanceY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...bullGreen);
  doc.text('BALANÇO PATRIMONIAL SIMPLIFICADO', 14, balanceY);
  
  const totalAtivo = data.cashBalance + data.accountsReceivable;
  const totalPassivo = data.accountsPayable;
  const patrimonioLiquido = totalAtivo - totalPassivo;
  
  const balanceData = [
    ['ATIVO CIRCULANTE', ''],
    ['  Caixa e Bancos', formatCurrency(data.cashBalance)],
    ['  Contas a Receber', formatCurrency(data.accountsReceivable)],
    ['Total do Ativo', formatCurrency(totalAtivo)],
    ['', ''],
    ['PASSIVO CIRCULANTE', ''],
    ['  Contas a Pagar', formatCurrency(totalPassivo)],
    ['', ''],
    ['PATRIMÔNIO LÍQUIDO', formatCurrency(patrimonioLiquido)],
  ];
  
  autoTable(doc, {
    startY: balanceY + 5,
    head: [['Conta', 'Valor (R$)']],
    body: balanceData,
    theme: 'striped',
    headStyles: { 
      fillColor: bullGreen,
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didParseCell: (data: any) => {
      if (data.row.index === 3 || data.row.index === 8) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = bullGold;
      }
      if (data.cell.section === 'body' && data.column.index === 0) {
        if (data.cell.text[0].includes('ATIVO') || 
            data.cell.text[0].includes('PASSIVO') || 
            data.cell.text[0].includes('PATRIMÔNIO')) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });
  
  // KPIs section - Add new page if needed
  let kpiY = (doc as any).lastAutoTable.finalY + 15;
  if (kpiY > 250) {
    doc.addPage();
    kpiY = 20;
  }
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...bullGreen);
  doc.text('INDICADORES-CHAVE DE DESEMPENHO (KPIs)', 14, kpiY);
  
  const revenue = data.totalReceived || data.totalRevenue;
  const netMargin = revenue > 0 
    ? ((data.netProfit / revenue) * 100).toFixed(2) 
    : '0.00';
  const currentRatio = data.accountsPayable > 0 
    ? ((data.cashBalance + data.accountsReceivable) / data.accountsPayable).toFixed(2) 
    : 'N/A';
  const ebitda = data.netProfit; // Simplificado
  const returnOnEquity = (data.cashBalance + data.accountsReceivable - data.accountsPayable) > 0
    ? ((data.netProfit / (data.cashBalance + data.accountsReceivable - data.accountsPayable)) * 100).toFixed(2)
    : '0.00';
  
  const kpiData = [
    ['Margem Líquida', `${netMargin}%`, netMargin > '10' ? '✓ Saudável' : '⚠ Atenção'],
    ['Índice de Liquidez Corrente', currentRatio, currentRatio !== 'N/A' && parseFloat(currentRatio) > 1 ? '✓ Saudável' : '⚠ Atenção'],
    ['EBITDA Simplificado', formatCurrency(ebitda), ''],
    ['ROE (Return on Equity)', `${returnOnEquity}%`, ''],
  ];
  
  if (data.avgTicket) {
    kpiData.push(['Ticket Médio de Vendas', formatCurrency(data.avgTicket), '']);
  }
  if (data.defaultRate !== undefined) {
    kpiData.push(['Taxa de Inadimplência', `${data.defaultRate.toFixed(1)}%`, data.defaultRate < 5 ? '✓ Excelente' : data.defaultRate < 15 ? '⚠ Atenção' : '✗ Crítico']);
  }
  if (data.monthGrowth !== undefined) {
    kpiData.push(['Crescimento Mensal', `${data.monthGrowth > 0 ? '+' : ''}${data.monthGrowth.toFixed(1)}%`, data.monthGrowth > 0 ? '✓ Positivo' : '⚠ Negativo']);
  }
  
  autoTable(doc, {
    startY: kpiY + 5,
    head: [['Indicador', 'Valor', 'Status']],
    body: kpiData,
    theme: 'striped',
    headStyles: { 
      fillColor: bullGreen,
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text('Este relatório foi gerado automaticamente pelo sistema Bull Finance.', 14, finalY);
  doc.text(`Documento confidencial - ${clientName}`, 14, finalY + 5);
  
  // Credits footer
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema idealizado por Vanessa Dias (LinkedIn: https://www.linkedin.com/in/vanessaazuos/)', 14, finalY + 12);
  doc.text('e desenvolvido por Andressa Mirian (LinkedIn: https://www.linkedin.com/in/andressamirian/) no ano de 2025.', 14, finalY + 17);
  doc.text('Todos os direitos reservados.', 14, finalY + 22);
  
  // Page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
  }
  
  // Save PDF
  doc.save(`relatorio_bull_finance_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportToExcel(data: FinancialData, clientName: string, clientLogoUrl?: string) {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData: any[] = [
    ['BULL FINANCE - RELATÓRIO FINANCEIRO PROFISSIONAL'],
    ['Cliente:', clientName],
    ['Data de Emissão:', new Date().toLocaleDateString('pt-BR')],
    ['Período:', new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })],
    [],
    ['SUMÁRIO EXECUTIVO'],
    ['Indicador', 'Valor'],
    ['Total Recebido no Período', data.totalReceived || data.totalRevenue],
    ['Total Pago no Período', data.totalPaid || data.totalExpenses],
    ['Lucro Líquido', data.netProfit],
    ['Saldo em Caixa', data.cashBalance],
    ['Contas a Receber (Pendente)', data.accountsReceivable],
    ['Contas a Pagar (Pendente)', data.accountsPayable],
  ];
  
  if (data.avgTicket) {
    summaryData.push(['Ticket Médio', data.avgTicket]);
  }
  if (data.defaultRate !== undefined) {
    summaryData.push(['Taxa de Inadimplência (%)', data.defaultRate]);
  }
  if (data.monthGrowth !== undefined) {
    summaryData.push(['Crescimento Mensal (%)', data.monthGrowth]);
  }
  
  summaryData.push(
    [],
    ['DRE - DEMONSTRATIVO DE RESULTADO'],
    ['Descrição', 'Valor'],
    ['Receita Operacional', data.totalReceived || data.totalRevenue],
    ['(-) Despesas Operacionais', -(data.totalPaid || data.totalExpenses)],
    ['= Resultado Líquido do Período', data.netProfit],
    [],
    ['BALANÇO PATRIMONIAL SIMPLIFICADO'],
    ['Conta', 'Valor'],
    ['ATIVO CIRCULANTE', ''],
    ['  Caixa e Bancos', data.cashBalance],
    ['  Contas a Receber', data.accountsReceivable],
    ['Total do Ativo', data.cashBalance + data.accountsReceivable],
    ['', ''],
    ['PASSIVO CIRCULANTE', ''],
    ['  Contas a Pagar', data.accountsPayable],
    ['', ''],
    ['PATRIMÔNIO LÍQUIDO', data.cashBalance + data.accountsReceivable - data.accountsPayable],
    [],
    ['INDICADORES-CHAVE DE DESEMPENHO (KPIs)'],
    ['Indicador', 'Valor', 'Status'],
  );
  
  const revenue = data.totalReceived || data.totalRevenue;
  const netMargin = revenue > 0 ? ((data.netProfit / revenue) * 100).toFixed(2) : '0.00';
  const currentRatio = data.accountsPayable > 0 ? ((data.cashBalance + data.accountsReceivable) / data.accountsPayable).toFixed(2) : 'N/A';
  
  summaryData.push(
    ['Margem Líquida (%)', netMargin, parseFloat(netMargin) > 10 ? 'Saudável' : 'Atenção'],
    ['Índice de Liquidez Corrente', currentRatio, currentRatio !== 'N/A' && parseFloat(currentRatio) > 1 ? 'Saudável' : 'Atenção'],
  );
  
  if (data.avgTicket) {
    summaryData.push(['Ticket Médio de Vendas', data.avgTicket, '']);
  }
  if (data.defaultRate !== undefined) {
    summaryData.push(['Taxa de Inadimplência (%)', data.defaultRate.toFixed(1), data.defaultRate < 5 ? 'Excelente' : data.defaultRate < 15 ? 'Atenção' : 'Crítico']);
  }
  if (data.monthGrowth !== undefined) {
    summaryData.push(['Crescimento Mensal (%)', data.monthGrowth.toFixed(1), data.monthGrowth > 0 ? 'Positivo' : 'Negativo']);
  }
  
  summaryData.push(
    [],
    [],
    ['Este relatório foi gerado automaticamente pelo sistema Bull Finance.'],
    [`Documento confidencial - ${clientName}`],
    [],
    ['Sistema idealizado por Vanessa Dias (LinkedIn: https://www.linkedin.com/in/vanessaazuos/)'],
    ['e desenvolvido por Andressa Mirian (LinkedIn: https://www.linkedin.com/in/andressamirian/) no ano de 2025.'],
    ['Todos os direitos reservados.'],
  );
  
  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 30 },
    { wch: 20 },
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
  
  // Save Excel
  XLSX.writeFile(wb, `relatorio_bull_finance_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
}
