'use strict';
const PDFDocument = require('pdfkit');

const AUTONOMO = {
  nombre: 'Fontanería Rápida Martín',
  titular: 'Martín Salcedo García',
  nif: '99887766Z (DEMO)',
  direccion: 'Carrer dels Garrofers 15, 43001 Tarragona',
  telefono: '977 123 456',
  email: 'martin@fontaneriamartín.example.com',
};

const ESTADO_LABELS = {
  borrador: 'BORRADOR', enviado: 'ENVIADO', aceptado: 'ACEPTADO',
  rechazado: 'RECHAZADO', convertido: 'CONVERTIDO',
  emitida: 'EMITIDA', enviada: 'ENVIADA', pagada: 'PAGADA',
  vencida: 'VENCIDA', anulada: 'ANULADA'
};

const COLORES = {
  azul: '#1e40af',
  gris: '#6b7280',
  grisClarito: '#f3f4f6',
  negro: '#111827',
  verde: '#16a34a',
  rojo: '#dc2626',
  naranja: '#d97706',
};

function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function formatFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function generarPDF({ tipo, doc, lineas }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const pdf = new PDFDocument({ margin: 50, size: 'A4' });

    pdf.on('data', c => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const esFactura = tipo === 'factura';
    const titulo = esFactura ? 'FACTURA' : 'PRESUPUESTO';

    // ── CABECERA ──────────────────────────────────────────────────────────────
    pdf.rect(0, 0, pdf.page.width, 110).fill(COLORES.azul);

    pdf.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text(AUTONOMO.nombre, 50, 25, { align: 'left' });
    pdf.fontSize(9).font('Helvetica')
      .text(AUTONOMO.titular, 50, 52)
      .text(`NIF: ${AUTONOMO.nif}`, 50, 64)
      .text(AUTONOMO.direccion, 50, 76)
      .text(`Tel: ${AUTONOMO.telefono}  ·  ${AUTONOMO.email}`, 50, 88);

    // Tipo de documento en cabecera
    pdf.fillColor('white').fontSize(28).font('Helvetica-Bold')
      .text(titulo, 350, 28, { align: 'right', width: 195 });
    pdf.fontSize(13).font('Helvetica')
      .text(doc.numero, 350, 62, { align: 'right', width: 195 });

    // Estado
    const estadoLabel = ESTADO_LABELS[doc.estado] || doc.estado?.toUpperCase() || '';
    const estadoColor = ['pagada','cobrado'].includes(doc.estado) ? COLORES.verde :
                        ['vencida','cancelado'].includes(doc.estado) ? COLORES.rojo :
                        COLORES.naranja;
    pdf.rect(400, 80, 145, 22).fill(estadoColor);
    pdf.fillColor('white').fontSize(10).font('Helvetica-Bold')
      .text(estadoLabel, 400, 85, { align: 'center', width: 145 });

    // ── DATOS CLIENTE / FECHAS ────────────────────────────────────────────────
    let y = 130;

    pdf.fillColor(COLORES.negro);

    // Columna izquierda: cliente
    pdf.rect(50, y, 280, 100).fill(COLORES.grisClarito);
    pdf.fillColor(COLORES.azul).fontSize(9).font('Helvetica-Bold').text('CLIENTE', 60, y + 8);
    pdf.fillColor(COLORES.negro).fontSize(10).font('Helvetica-Bold').text(doc.cliente_nombre || '', 60, y + 22);
    pdf.fontSize(9).font('Helvetica')
      .text(doc.cliente_direccion || '', 60, y + 36)
      .text(`NIF/CIF: ${doc.cliente_nif || '—'}`, 60, y + 50)
      .text(`Tel: ${doc.cliente_telefono || '—'}`, 60, y + 64)
      .text(doc.cliente_email || '', 60, y + 78);

    // Columna derecha: fechas
    pdf.rect(350, y, 195, 100).fill(COLORES.grisClarito);
    pdf.fillColor(COLORES.azul).fontSize(9).font('Helvetica-Bold').text('DATOS', 360, y + 8);
    pdf.fillColor(COLORES.negro).fontSize(9).font('Helvetica')
      .text(`Fecha:`, 360, y + 22).text(formatFecha(doc.fecha), 450, y + 22)
      .text(esFactura ? 'Vencimiento:' : 'Válido hasta:', 360, y + 36)
      .text(formatFecha(esFactura ? doc.vencimiento : doc.validez_hasta), 450, y + 36);
    if (esFactura) {
      pdf.text(`IVA:`, 360, y + 50).text(`${doc.iva_porcentaje || 21}%`, 450, y + 50);
      if (doc.descuento) pdf.text('Descuento:', 360, y + 64).text(`${doc.descuento}%`, 450, y + 64);
    } else {
      pdf.text(`IVA:`, 360, y + 50).text(`${doc.iva_porcentaje || 21}%`, 450, y + 50);
    }

    // ── LÍNEAS ────────────────────────────────────────────────────────────────
    y += 118;

    // Cabecera tabla
    pdf.rect(50, y, 495, 20).fill(COLORES.azul);
    pdf.fillColor('white').fontSize(9).font('Helvetica-Bold')
      .text('Concepto', 58, y + 5, { width: 210 })
      .text('Cant.', 272, y + 5, { width: 40, align: 'right' })
      .text('Precio', 315, y + 5, { width: 70, align: 'right' })
      .text('IVA', 388, y + 5, { width: 35, align: 'right' })
      .text('Total', 426, y + 5, { width: 112, align: 'right' });

    y += 22;
    let bg = false;
    for (const l of lineas) {
      if (bg) pdf.rect(50, y - 2, 495, 20).fill('#f9fafb');
      pdf.fillColor(COLORES.negro).fontSize(9).font('Helvetica')
        .text(l.concepto || '', 58, y, { width: 210 })
        .text(l.cantidad, 272, y, { width: 40, align: 'right' })
        .text(formatEuro(l.precio_unitario), 315, y, { width: 70, align: 'right' })
        .text(`${l.iva_porcentaje || 21}%`, 388, y, { width: 35, align: 'right' })
        .text(formatEuro(l.total || l.cantidad * l.precio_unitario), 426, y, { width: 112, align: 'right' });
      if (l.descripcion) {
        y += 13;
        pdf.fillColor(COLORES.gris).fontSize(8).text(l.descripcion, 58, y, { width: 480 });
      }
      y += 18;
      bg = !bg;
    }

    // Línea separadora
    pdf.moveTo(50, y).lineTo(545, y).strokeColor(COLORES.gris).lineWidth(0.5).stroke();
    y += 10;

    // ── TOTALES ───────────────────────────────────────────────────────────────
    const totalesX = 350;
    pdf.fillColor(COLORES.negro).fontSize(10).font('Helvetica')
      .text('Base imponible:', totalesX, y, { width: 120 })
      .text(formatEuro(doc.subtotal), totalesX + 120, y, { width: 75, align: 'right' });
    y += 16;
    pdf.text(`IVA (${doc.iva_porcentaje || 21}%):`, totalesX, y, { width: 120 })
      .text(formatEuro(doc.iva_total), totalesX + 120, y, { width: 75, align: 'right' });
    if (doc.descuento) {
      y += 16;
      pdf.text(`Descuento (${doc.descuento}%):`, totalesX, y, { width: 120 })
        .text(`-${formatEuro(doc.subtotal * doc.descuento / 100)}`, totalesX + 120, y, { width: 75, align: 'right' });
    }
    y += 8;
    pdf.rect(totalesX, y, 195, 28).fill(COLORES.azul);
    pdf.fillColor('white').fontSize(13).font('Helvetica-Bold')
      .text('TOTAL', totalesX + 8, y + 7, { width: 90 })
      .text(formatEuro(doc.total), totalesX + 95, y + 7, { width: 92, align: 'right' });
    y += 36;

    // ── NOTAS ─────────────────────────────────────────────────────────────────
    if (doc.notas) {
      y += 10;
      pdf.fillColor(COLORES.azul).fontSize(9).font('Helvetica-Bold').text('NOTAS:', 50, y);
      y += 13;
      pdf.fillColor(COLORES.negro).fontSize(9).font('Helvetica').text(doc.notas, 50, y, { width: 495 });
      y += 30;
    }

    // ── PIE ───────────────────────────────────────────────────────────────────
    const pieY = pdf.page.height - 60;
    pdf.moveTo(50, pieY - 10).lineTo(545, pieY - 10).strokeColor(COLORES.gris).lineWidth(0.5).stroke();
    pdf.fillColor(COLORES.rojo).fontSize(7).font('Helvetica-Bold')
      .text('⚠ DOCUMENTO GENERADO POR MVP DEMO — REVISAR CUMPLIMIENTO FISCAL ANTES DE USO REAL', 50, pieY - 5, { align: 'center', width: 495 });
    pdf.fillColor(COLORES.gris).fontSize(7).font('Helvetica')
      .text(`${AUTONOMO.nombre} · ${AUTONOMO.telefono} · ${AUTONOMO.email}`, 50, pieY + 7, { align: 'center', width: 495 });

    pdf.end();
  });
}

module.exports = { generarPDF };
