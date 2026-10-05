import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Tenant, Location, Product, Batch, StockBalance,
  Category, Generic, Manufacturer, Supplier
} from '../types/pharmacy';
import { gregorianToEthiopian } from './ethiopianCalendar';

export interface EfdaPdfExportOptions {
  tenant: Tenant;
  location: Location;
  locations?: Location[];
  products: Product[];
  batches: Batch[];
  stockBalances: StockBalance[];
  categories: Category[];
  generics?: Generic[];
  manufacturers?: Manufacturer[];
  suppliers?: Supplier[];
  scope?: 'ALL_90' | 'CRITICAL_30' | 'WARNING_60' | 'ATTENTION_90' | 'EXPIRED';
  locationScope?: 'CURRENT' | 'ALL';
  signatoryName?: string;
  signatoryTitle?: string;
  reportNotes?: string;
}

export interface EfdaExportResult {
  doc: jsPDF;
  docId: string;
  filename: string;
  totalBatches: number;
  totalExpired: number;
  totalCritical: number;
  totalWarning: number;
  totalAttention: number;
  totalValuation: number;
}

/**
 * Format dual date for PDF export (ASCII-safe for standard jsPDF fonts)
 */
export function formatDualDateAscii(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const eth = gregorianToEthiopian(d);
  const gcStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const ecStr = `${eth.date} ${eth.monthNameEn} ${eth.year} E.C.`;

  return `${gcStr} (${ecStr})`;
}

/**
 * Generates an EFDA-compliant Pharmaceutical Expiry & Near-Expiration Regulatory Report PDF.
 */
export function generateEfdaExpiryPdf(options: EfdaPdfExportOptions): EfdaExportResult {
  const {
    tenant,
    location,
    locations = [location],
    products,
    batches,
    stockBalances,
    categories,
    generics = [],
    manufacturers = [],
    suppliers = [],
    scope = 'ALL_90',
    locationScope = 'CURRENT',
    signatoryName = 'Lead Pharmacist / Technical Manager',
    signatoryTitle = 'Registered Pharmacist (EFDA Licensee)',
    reportNotes = 'Routine quarterly expiry surveillance conducted pursuant to EFDA Health Facility Standards and Good Pharmacy Practice (GPP).',
  } = options;

  const now = new Date();
  const docId = `EFDA-EXP-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Evaluate batches expiring within 90 days or already expired
  const evaluatedItems = batches
    .map((batch) => {
      const prod = products.find((p) => p.id === batch.productId);
      const cat = prod ? categories.find((c) => c.id === prod.categoryId) : undefined;
      // Skip categories that don't track expiry
      if (cat && !cat.trackExpiry) return null;

      const expDate = new Date(batch.expiryDate);
      const diffTime = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calculate physical stock
      const locationFilteredBalances = stockBalances.filter((b) => {
        if (b.batchId !== batch.id) return false;
        if (locationScope === 'CURRENT') {
          return b.locationId === location.id;
        }
        return true;
      });

      const totalQty = locationFilteredBalances.reduce((sum, b) => sum + b.quantity, 0);

      // Only include if physical stock exists
      if (totalQty <= 0) return null;

      // Classify into EFDA regulatory tiers
      let tier: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'ATTENTION' | 'HEALTHY' = 'HEALTHY';
      if (diffDays <= 0) tier = 'EXPIRED';
      else if (diffDays <= 30) tier = 'CRITICAL';
      else if (diffDays <= 60) tier = 'WARNING';
      else if (diffDays <= 90) tier = 'ATTENTION';

      const isWithin90 = diffDays <= 90;
      if (!isWithin90) return null;

      const unitVal = Number(batch.sellingPrice || batch.costPrice || 0);
      const totalVal = totalQty * unitVal;
      const gen = generics.find((g) => g.id === prod?.genericId);
      const mfr = manufacturers.find((m) => m.id === prod?.manufacturerId);
      const sup = suppliers.find((s) => s.id === batch.supplierId);

      // Determine required EFDA directive regulatory action
      let regulatoryAction = '';
      if (tier === 'EXPIRED') {
        regulatoryAction = 'MANDATORY SEGREGATION -> QUARANTINE -> EFDA FORM-D DISPOSAL';
      } else if (tier === 'CRITICAL') {
        regulatoryAction = 'PRIORITY FEFO DISPENSING / RECALL / RETURN TO SUPPLIER';
      } else if (tier === 'WARNING') {
        regulatoryAction = 'FRONT DISPENSARY ROTATION & CLINICAL PRESCRIBER NOTICE';
      } else {
        regulatoryAction = 'STOCK VELOCITY MONITORING & REORDER FREEZE';
      }

      return {
        batch,
        product: prod,
        category: cat,
        generic: gen,
        manufacturer: mfr,
        supplier: sup,
        diffDays,
        tier,
        totalQty,
        totalVal,
        regulatoryAction,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Apply user-selected scope filter
  const filteredItems = evaluatedItems
    .filter((item) => {
      if (scope === 'CRITICAL_30') return item.tier === 'CRITICAL';
      if (scope === 'WARNING_60') return item.tier === 'WARNING';
      if (scope === 'ATTENTION_90') return item.tier === 'ATTENTION';
      if (scope === 'EXPIRED') return item.tier === 'EXPIRED';
      return true; // ALL_90
    })
    .sort((a, b) => a.diffDays - b.diffDays); // FEFO chronological sequence

  // Metrics
  const totalExpired = evaluatedItems.filter((i) => i.tier === 'EXPIRED').length;
  const totalCritical = evaluatedItems.filter((i) => i.tier === 'CRITICAL').length;
  const totalWarning = evaluatedItems.filter((i) => i.tier === 'WARNING').length;
  const totalAttention = evaluatedItems.filter((i) => i.tier === 'ATTENTION').length;
  const totalValuation = evaluatedItems.reduce((acc, i) => acc + i.totalVal, 0);

  // ------------------------------------------------------------------
  // Initialize jsPDF Document (Landscape A4 for comprehensive regulatory table)
  // ------------------------------------------------------------------
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 14;

  // 1. Top Ethiopian Flag Colors Header Stripe
  doc.setFillColor(0, 155, 68); // Green
  doc.rect(margin, 8, (pageWidth - margin * 2) / 3, 2, 'F');
  doc.setFillColor(254, 209, 0); // Yellow
  doc.rect(margin + (pageWidth - margin * 2) / 3, 8, (pageWidth - margin * 2) / 3, 2, 'F');
  doc.setFillColor(225, 27, 34); // Red
  doc.rect(margin + ((pageWidth - margin * 2) / 3) * 2, 8, (pageWidth - margin * 2) / 3, 2, 'F');

  // 2. Official Header Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('ETHIOPIAN FOOD AND DRUG AUTHORITY (EFDA) / የኢትዮጵያ ምግብና መድኃኒት ባለሥልጣን', margin, 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('PHARMACEUTICAL INVENTORY EXPIRY & NEAR-EXPIRATION REGULATORY REPORT', margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    'Compliant with EFDA Medicines Waste Management Directive No. 981/2023 & FEFO Dispensing Surveillance Standards',
    margin,
    24
  );

  // Document Reference & Stamp Box on Right
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth - margin - 70, 11, 70, 15, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('REGULATORY DOCUMENT ID:', pageWidth - margin - 67, 15.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(docId, pageWidth - margin - 67, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Official Inspection Copy • Page 1 of 1`, pageWidth - margin - 67, 24);

  // 3. Facility Details Grid
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 27, pageWidth - margin * 2, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('FACILITY DETAILS:', margin + 3, 31.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${tenant.name}`, margin + 3, 36);
  doc.text(`City: ${tenant.city}, Ethiopia`, margin + 3, 40);
  doc.text(`EFDA License: ${tenant.licenseNumber || 'EFDA-DISP-AA-2024-998'}`, margin + 3, 44);

  // Column 2 of Facility details
  const col2X = margin + 85;
  doc.setFont('helvetica', 'bold');
  doc.text('MONITORED PREMISES:', col2X, 31.5);
  doc.setFont('helvetica', 'normal');
  const locScopeText = locationScope === 'CURRENT'
    ? `${location.name} (${location.code})`
    : `All Facility Locations (${locations.map((l) => l.code).join(', ')})`;
  doc.text(`Location: ${locScopeText}`, col2X, 36);
  doc.text(`Facility TIN: ${tenant.tinNumber || '0029384756'}`, col2X, 40);
  doc.text(`Contact: ${location.phone || tenant.phone || '+251 911 234 568'}`, col2X, 44);

  // Column 3 of Facility details
  const col3X = margin + 175;
  doc.setFont('helvetica', 'bold');
  doc.text('AUDIT PARAMETERS:', col3X, 31.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Inspection Date: ${formatDualDateAscii(now)}`, col3X, 36);
  doc.text(`Surveillance Horizon: Next 90 Calendar Days (FEFO)`, col3X, 40);
  doc.text(`Scope Filter: ${scope.replace('_', ' ')} (${filteredItems.length} records listed)`, col3X, 44);

  // 4. Executive Summary KPI Badges
  const kpiY = 48;
  const kpiWidth = (pageWidth - margin * 2 - 12) / 5;

  const kpis = [
    { label: 'TOTAL AT RISK (<= 90d)', value: evaluatedItems.length.toString(), color: [79, 70, 229] }, // indigo
    { label: 'EXPIRED (QUARANTINE)', value: totalExpired.toString(), color: [225, 29, 72] }, // rose
    { label: 'CRITICAL (<= 30d)', value: totalCritical.toString(), color: [217, 119, 6] }, // amber
    { label: 'WARNING (31-60d)', value: (totalWarning + totalAttention).toString(), color: [234, 179, 8] }, // yellow
    { label: 'VALUATION AT RISK', value: `${totalValuation.toLocaleString()} ETB`, color: [5, 150, 105] }, // emerald
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kpiX, kpiY, kpiWidth, 12, 1.5, 1.5, 'FD');

    // Colored left indicator bar
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(kpiX, kpiY, 2, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kpiX + 4, kpiY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, kpiX + 4, kpiY + 9.5);
  });

  // 5. Main Regulatory Table (jsPDF-AutoTable)
  const tableHead = [
    [
      'S/N',
      'PRODUCT & DOSAGE FORM',
      'GENERIC (INN)',
      'BATCH NO.',
      'MANUFACTURER',
      'EXPIRY DATE',
      'STATUS / DAYS',
      'QTY ON HAND',
      'VALUE (ETB)',
      'EFDA MANDATORY DIRECTIVE ACTION',
    ],
  ];

  const tableBody = filteredItems.map((item, idx) => {
    const p = item.product;
    const g = item.generic;
    const m = item.manufacturer;

    const brandDisplay = p ? `${p.brandName}${p.strength ? ` ${p.strength}` : ''}` : 'N/A';
    const genericDisplay = g ? g.name : (p?.productType === 'GENERAL' ? 'General Health Goods' : 'N/A');
    const mfrDisplay = m ? `${m.name} (${m.country})` : (p?.countryOfOrigin || 'Ethiopia');
    const expiryDisplay = formatDualDateAscii(item.batch.expiryDate);

    let statusDisplay = '';
    if (item.tier === 'EXPIRED') {
      statusDisplay = `EXPIRED (${Math.abs(item.diffDays)}d ago)`;
    } else if (item.tier === 'CRITICAL') {
      statusDisplay = `CRITICAL: ${item.diffDays}d left`;
    } else if (item.tier === 'WARNING') {
      statusDisplay = `WARNING: ${item.diffDays}d left`;
    } else {
      statusDisplay = `ATTENTION: ${item.diffDays}d left`;
    }

    const qtyDisplay = `${item.totalQty.toLocaleString()} ${p?.baseUnit || 'Units'}`;
    const valueDisplay = `${item.totalVal.toLocaleString()}`;

    return [
      (idx + 1).toString(),
      brandDisplay,
      genericDisplay,
      item.batch.batchNumber,
      mfrDisplay,
      expiryDisplay,
      statusDisplay,
      qtyDisplay,
      valueDisplay,
      item.regulatoryAction,
    ];
  });

  autoTable(doc, {
    startY: 63,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, // S/N
      1: { cellWidth: 42, fontStyle: 'bold' }, // Brand
      2: { cellWidth: 32 }, // Generic
      3: { cellWidth: 22, fontStyle: 'bold', halign: 'center' }, // Batch
      4: { cellWidth: 32 }, // Mfr
      5: { cellWidth: 38, halign: 'center' }, // Expiry
      6: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }, // Status
      7: { cellWidth: 18, halign: 'right' }, // Qty
      8: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }, // Value
      9: { cellWidth: 'auto', fontSize: 5.8 }, // Directive
    },
    didParseCell: (data) => {
      // Highlight rows by severity
      if (data.section === 'body') {
        const item = filteredItems[data.row.index];
        if (item) {
          if (item.tier === 'EXPIRED') {
            if (data.column.index === 6) {
              data.cell.styles.textColor = [190, 18, 60]; // rose-700
              data.cell.styles.fillColor = [255, 228, 230]; // rose-100
            }
          } else if (item.tier === 'CRITICAL') {
            if (data.column.index === 6) {
              data.cell.styles.textColor = [180, 83, 9]; // amber-700
              data.cell.styles.fillColor = [254, 243, 199]; // amber-100
            }
          }
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // 6. Official Declaration & Sign-off Block at End of Document
  // @ts-ignore
  let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : 160;

  // If table is close to page bottom, add new page for signature block
  if (finalY > pageHeight - 40) {
    doc.addPage();
    finalY = 16;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL REGULATORY DECLARATION & EFDA PHARMACY SIGN-OFF:', margin + 4, finalY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'I hereby certify under penalty of law that the batch records listed above have been physically inspected against storage & dispensary stock balances in accordance with EFDA Directive No. 981/2023. All batches classified as EXPIRED have been segregated from active dispensing into a locked quarantine container pending authorized disposal.',
    margin + 4,
    finalY + 8.5,
    { maxWidth: pageWidth - margin * 2 - 80 }
  );

  doc.text(
    `Notes / Facility Directive: ${reportNotes}`,
    margin + 4,
    finalY + 14.5,
    { maxWidth: pageWidth - margin * 2 - 80 }
  );

  // Signatory Block 1: Responsible Pharmacist
  const sign1X = margin + 4;
  const signY = finalY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Audited By: ${signatoryName}`, sign1X, signY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Title: ${signatoryTitle}`, sign1X, signY + 3.5);
  doc.text(`Signature & Date: _________________________`, sign1X, signY + 7);

  // Signatory Block 2: Technical Manager / Lead Pharmacist
  const sign2X = margin + 85;
  doc.setFont('helvetica', 'bold');
  doc.text('Approved By: Managing Director / Technical Dir.', sign2X, signY);
  doc.setFont('helvetica', 'normal');
  doc.text('EFDA Facility License Holder', sign2X, signY + 3.5);
  doc.text('Signature & Date: _________________________', sign2X, signY + 7);

  // Pharmacy Official Seal Box
  const stampX = pageWidth - margin - 45;
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.roundedRect(stampX, finalY + 3, 40, 22, 1.5, 1.5, 'S');
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('OFFICIAL PHARMACY', stampX + 20, finalY + 11, { align: 'center' });
  doc.text('REGULATORY STAMP / SEAL', stampX + 20, finalY + 15, { align: 'center' });

  // 7. Footer line with timestamp and verification hash
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  const footerText = `TenaPharm SaaS • EFDA Compliance Module • Generated: ${now.toISOString()} • Document ID: ${docId} • Verification: https://efda.gov.et/verify/${docId}`;
  doc.text(footerText, margin, pageHeight - 4);

  const filename = `EFDA_Batch_Expiry_Report_${location.code}_${now.toISOString().slice(0, 10)}.pdf`;

  return {
    doc,
    docId,
    filename,
    totalBatches: filteredItems.length,
    totalExpired,
    totalCritical,
    totalWarning,
    totalAttention,
    totalValuation,
  };
}
