import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface UserData {
  user: {
    email: string;
    role: string;
    created_at: string;
    household_name?: string;
  };
  members: any[];
  assets: any[];
  income: any[];
  contracts: any[];
}

export async function generateUserDataPDF(data: UserData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.text('User Data Export', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // User Information
  doc.setFontSize(16);
  doc.text('User Information', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.text(`Email: ${data.user.email}`, 14, yPosition);
  yPosition += 5;
  doc.text(`Role: ${data.user.role}`, 14, yPosition);
  yPosition += 5;
  doc.text(`Member Since: ${new Date(data.user.created_at).toLocaleDateString()}`, 14, yPosition);
  yPosition += 5;
  if (data.user.household_name) {
    doc.text(`Household: ${data.user.household_name}`, 14, yPosition);
    yPosition += 5;
  }
  yPosition += 5;

  // Check if new page needed
  if (yPosition > pageHeight - 30) {
    doc.addPage();
    yPosition = 20;
  }

  // Family Members Section
  if (data.members && data.members.length > 0) {
    doc.setFontSize(16);
    doc.text('Family Members', 14, yPosition);
    yPosition += 8;

    const memberTableData = data.members.map(member => [
      member.name,
      member.relationship || 'N/A',
      member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : 'N/A',
      member.notes || 'N/A'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Name', 'Relationship', 'Date of Birth', 'Notes']],
      body: memberTableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if new page needed
  if (yPosition > pageHeight - 30) {
    doc.addPage();
    yPosition = 20;
  }

  // Assets Section
  if (data.assets && data.assets.length > 0) {
    doc.setFontSize(16);
    doc.text('Assets', 14, yPosition);
    yPosition += 8;

    const assetTableData = data.assets.map(asset => [
      asset.name,
      asset.category_name_en || 'N/A',
      asset.ownership_type || 'single',
      asset.currency,
      parseFloat(asset.current_value || asset.amount || 0).toFixed(2),
      asset.status
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Name', 'Category', 'Ownership', 'Currency', 'Value', 'Status']],
      body: assetTableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if new page needed
  if (yPosition > pageHeight - 30) {
    doc.addPage();
    yPosition = 20;
  }

  // Income Section
  if (data.income && data.income.length > 0) {
    doc.setFontSize(16);
    doc.text('Income History', 14, yPosition);
    yPosition += 8;

    const incomeTableData = data.income.map(income => [
      income.category_name_en || 'N/A',
      income.amount,
      income.currency,
      new Date(income.date).toLocaleDateString(),
      income.is_recurring ? 'Yes' : 'No',
      income.frequency || 'N/A'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Amount', 'Currency', 'Date', 'Recurring', 'Frequency']],
      body: incomeTableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if new page needed
  if (yPosition > pageHeight - 30) {
    doc.addPage();
    yPosition = 20;
  }

  // Contracts Section
  if (data.contracts && data.contracts.length > 0) {
    doc.setFontSize(16);
    doc.text('Contracts', 14, yPosition);
    yPosition += 8;

    const contractTableData = data.contracts.map(contract => [
      contract.title,
      contract.type,
      contract.status,
      new Date(contract.start_date).toLocaleDateString(),
      contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Title', 'Type', 'Status', 'Start Date', 'End Date']],
      body: contractTableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 }
    });
  }

  // Footer with export date
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Exported: ${new Date().toLocaleString()}`,
      pageWidth - 14,
      pageHeight - 10,
      { align: 'right' }
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      14,
      pageHeight - 10
    );
  }

  // Save the PDF
  doc.save(`user-data-export-${Date.now()}.pdf`);
}

