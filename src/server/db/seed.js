'use strict';

async function run() {
  const db = require('./database');
  // Wait for async init (sql.js fallback) if needed
  if (db._async && !db._ready) await db._initPromise;

  console.log('🌱 Iniciando seed de Fontanería Rápida Martín...');

  // Limpiar tablas
  db.exec(`DELETE FROM recordatorios`);
  db.exec(`DELETE FROM cobros`);
  db.exec(`DELETE FROM lineas_concepto`);
  db.exec(`DELETE FROM facturas`);
  db.exec(`DELETE FROM presupuestos`);
  db.exec(`DELETE FROM trabajos`);
  db.exec(`DELETE FROM conceptos_reutilizables`);
  db.exec(`DELETE FROM plantillas_recordatorio`);
  db.exec(`DELETE FROM clientes`);
  db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('recordatorios','cobros','lineas_concepto','facturas','presupuestos','trabajos','conceptos_reutilizables','plantillas_recordatorio','clientes')`);

  // ── PLANTILLAS DE RECORDATORIO ──────────────────────────────────────────────
  const insertPlantilla = db.prepare(`INSERT INTO plantillas_recordatorio (tipo, nombre, contenido) VALUES (?, ?, ?)`);

  insertPlantilla.run('amable', 'Recordatorio amable',
    'Hola {{nombre}}, le recordamos que tiene pendiente de pago la factura {{numero}} por importe de {{importe}} €, con vencimiento el {{vencimiento}}. Puede realizar el pago por {{metodo}}. Muchas gracias. — Fontanería Rápida Martín');
  insertPlantilla.run('firme', 'Recordatorio firme',
    'Estimado/a {{nombre}}, le comunicamos que la factura {{numero}} por {{importe}} € venció el {{vencimiento}} y continúa sin abonar. Le rogamos que realice el pago a la mayor brevedad posible. Para cualquier consulta, llámenos al 977 123 456. — Fontanería Rápida Martín');
  insertPlantilla.run('ultimo_aviso', 'Último aviso profesional',
    'Estimado/a {{nombre}}, este es un último aviso relativo a la factura {{numero}} por importe de {{importe}} €, con vencimiento {{vencimiento}}. Si no recibimos el pago en los próximos 5 días hábiles, nos veremos obligados a iniciar acciones de reclamación. — Fontanería Rápida Martín');

  // ── CONCEPTOS REUTILIZABLES ──────────────────────────────────────────────────
  const ic = db.prepare(`INSERT INTO conceptos_reutilizables (nombre, descripcion, precio_base, tipo, iva_porcentaje) VALUES (?, ?, ?, ?, ?)`);
  ic.run('Desplazamiento', 'Desplazamiento a domicilio del cliente', 25.00, 'desplazamiento', 21);
  ic.run('Mano de obra (hora)', 'Trabajo de fontanería por hora', 45.00, 'mano_obra', 21);
  ic.run('Revisión de instalación', 'Inspección y diagnóstico completo', 60.00, 'servicio', 21);
  ic.run('Sustitución de pieza', 'Cambio de pieza o componente', 35.00, 'material', 21);
  ic.run('Material pequeño', 'Tornillos, juntas, cinta, etc.', 8.00, 'material', 21);
  ic.run('Urgencia fuera de horario', 'Recargo por intervención urgente o fin de semana', 80.00, 'urgencia', 21);
  ic.run('Desatasco manual', 'Desatasco con herramienta manual', 55.00, 'servicio', 21);
  ic.run('Desatasco con máquina', 'Desatasco con máquina eléctrica', 90.00, 'servicio', 21);
  ic.run('Instalación de grifo', 'Instalación completa de grifo monomando', 40.00, 'mano_obra', 21);
  ic.run('Instalación de termo eléctrico', 'Colocación y conexión de termo eléctrico', 70.00, 'mano_obra', 21);

  // ── CLIENTES ─────────────────────────────────────────────────────────────────
  const insertCliente = db.prepare(`INSERT INTO clientes (nombre, telefono, email, direccion, nif, notas) VALUES (?, ?, ?, ?, ?, ?)`);
  const c1 = insertCliente.run('Ana García Pérez', '612 345 678', 'ana.garcia@example.com', 'Carrer de Sant Agustí 12, 1º A, Tarragona', '12345678A', 'Clienta habitual. Paga siempre puntual.');
  const c2 = insertCliente.run('Comunidad Vecinos Passeig del Mar', '977 234 567', 'comunidad.passeig@example.com', 'Passeig del Mar 45, Tarragona', 'H43123456', 'Contacto: Presidenta Rosa Vallés. Edificio de 8 pisos.');
  const c3 = insertCliente.run('Bar Restaurante El Serrallo', '977 345 678', 'elserrallo@example.com', 'Carrer del Port 8, Tarragona', 'B43234567', 'Urgencias con preferencia. Preguntar por Paco.');
  const c4 = insertCliente.run('Joan Puig Vidal', '634 456 789', 'joan.puig@example.com', 'Avinguda Prat de la Riba 77, 3º B, Tarragona', '23456789B', 'Casa antigua, instalación de los años 70.');
  const c5 = insertCliente.run('María Dolores Fernández', '655 567 890', 'loles.fernandez@example.com', 'Carrer de Lleida 34, 2º, Tarragona', '34567890C', 'Mayor, necesita paciencia. Paga en efectivo.');
  const c6 = insertCliente.run('Oficinas Gestoria Rambla', '977 456 789', 'gestoria.rambla@example.com', 'La Rambla Nova 88, local 2, Tarragona', 'B43345678', 'Facturar siempre a nombre de la empresa.');
  const c7 = insertCliente.run('Carles Mas Bonet', '678 678 678', 'carles.mas@example.com', 'Urb. Bonavista, Carrer Roser 5, Tarragona', '45678901D', 'Casa nueva, obra terminada 2022.');
  const c8 = insertCliente.run('Hotel Costa Daurada', '977 567 890', 'mantenimiento@hotelcostadaurada.example.com', 'Carrer de la Unió 22, Tarragona', 'A43456789', 'Contrato anual de mantenimiento. Contacto: Sra. Pilar.');

  // ── TRABAJOS ──────────────────────────────────────────────────────────────────
  const it = db.prepare(`INSERT INTO trabajos (cliente_id, titulo, descripcion, estado, prioridad, fecha_creacion, fecha_prevista, materiales, notas, fotos_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const today = new Date();
  const d = (offset) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return dt.toISOString().split('T')[0]; };

  const t1  = it.run(c1.lastInsertRowid, 'Fuga en baño principal', 'Fuga debajo del lavabo, posible junta deteriorada.', 'en_curso', 'urgente', d(-2), d(0), 'Junta silicona, llave de paso 1/2"', 'Acceso por puerta trasera. Cuidado con el parquet.', '["foto_fuga_lavabo.jpg","foto_junta_rota.jpg"]');
  const t2  = it.run(c2.lastInsertRowid, 'Revisión calentador comunitario', 'Revisión anual del calentador de gas de la comunidad.', 'pendiente', 'normal', d(-5), d(3), '', 'Avisar a la presidenta Rosa Vallés con 24h de antelación.', '[]');
  const t3  = it.run(c3.lastInsertRowid, 'Desatasco cocina urgente', 'Desatasco urgente fregadero cocina bar. Sábado noche.', 'terminado', 'urgente', d(-10), d(-9), 'Máquina desatasco', 'Urgencia fin de semana aplicada.', '["foto_desatasco1.jpg"]');
  const t4  = it.run(c4.lastInsertRowid, 'Sustitución llave de paso general', 'La llave de paso general está oxidada y no cierra bien.', 'esperando_material', 'normal', d(-7), d(5), 'Llave de esfera 3/4", cinta de teflón', 'Pedido material a proveedor.', '["foto_llave_vieja.jpg"]');
  const t5  = it.run(c5.lastInsertRowid, 'Instalación termo eléctrico 80L', 'Sustitución de termo antiguo por uno nuevo de 80L.', 'facturado', 'normal', d(-15), d(-12), 'Conexiones flexibles, soporte mural', '', '["foto_termo_instalado.jpg"]');
  const t6  = it.run(c6.lastInsertRowid, 'Cambio de grifo baño', 'Grifo mezclador de lavabo roto. Sustituir por modelo estándar.', 'cobrado', 'baja', d(-20), d(-18), 'Grifo mezclador Roca, flexibles', '', '["foto_grifo_nuevo.jpg"]');
  const t7  = it.run(c1.lastInsertRowid, 'Reparación cisterna WC', 'Cisterna pierde agua continuamente. Cambiar mecanismo interior.', 'terminado', 'normal', d(-3), d(-1), 'Mecanismo cisterna universal, goma de descarga', 'Segunda visita.', '["foto_cisterna.jpg"]');
  const t8  = it.run(c7.lastInsertRowid, 'Instalación nueva línea de agua', 'Nueva toma de agua en garaje para lavado de coche.', 'en_curso', 'normal', d(-1), d(7), 'Tubo multicapa 16mm, codos, tés, llave de paso', '', '[]');
  const t9  = it.run(c8.lastInsertRowid, 'Revisión instalación hotel - zona spa', 'Revisión anual contrato mantenimiento. Zona spa y piscina.', 'pendiente', 'normal', d(-1), d(14), '', 'Acceso con tarjeta de mantenimiento.', '[]');
  const t10 = it.run(c3.lastInsertRowid, 'Cambio grifería bar completo', 'Renovación de toda la grifería: 2 fregaderos + barra.', 'pendiente', 'normal', d(-4), d(10), 'Grifo industrial x6, flexibles', 'Presupuesto pendiente de aprobación.', '[]');
  const t11 = it.run(c2.lastInsertRowid, 'Fuga bajante planta 3', 'Rotura en bajante de aguas residuales, planta 3.', 'en_curso', 'urgente', d(0), d(1), 'Tubo PVC 100mm, manguito', 'Urgente por riesgo de daños a vecinos.', '["foto_bajante_rota.jpg"]');
  const t12 = it.run(c4.lastInsertRowid, 'Revisión general instalación', 'Revisión completa de toda la instalación de fontanería.', 'pendiente', 'baja', d(1), d(20), '', '', '[]');
  const t13 = it.run(c5.lastInsertRowid, 'Desatasco baño', 'Desatasco de ducha, va muy despacio.', 'terminado', 'normal', d(-6), d(-5), 'Producto químico desatasco', '', '[]');
  const t14 = it.run(c7.lastInsertRowid, 'Instalación calentador gas', 'Instalar calentador de gas natural 11L.', 'cancelado', 'normal', d(-30), d(-25), '', 'Cancelado: el cliente ha decidido poner calefacción central.', '[]');
  const t15 = it.run(c8.lastInsertRowid, 'Urgencia fuga tubería zona cocina hotel', 'Rotura de tubería de agua caliente en cocina principal.', 'cobrado', 'urgente', d(-45), d(-45), 'Tubo cobre 22mm, soldadura', 'Urgencia nocturna.', '["foto_rotura_tuberia.jpg"]');

  // ── PRESUPUESTOS ──────────────────────────────────────────────────────────────
  const ip = db.prepare(`INSERT INTO presupuestos (cliente_id, trabajo_id, numero, fecha, validez_hasta, estado, iva_porcentaje, descuento, notas, subtotal, iva_total, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const il = db.prepare(`INSERT INTO lineas_concepto (tipo_documento, documento_id, concepto, descripcion, cantidad, precio_unitario, iva_porcentaje, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  const p1 = ip.run(c1.lastInsertRowid, t1.lastInsertRowid, 'PRES-2026-0001', d(-2), d(28), 'aceptado', 21, 0, 'Trabajo urgente. Precio cerrado.', 130, 27.30, 157.30);
  il.run('presupuesto', p1.lastInsertRowid, 'Desplazamiento', 'Desplazamiento a domicilio', 1, 25, 21, 25);
  il.run('presupuesto', p1.lastInsertRowid, 'Mano de obra', 'Localización y reparación de fuga', 2, 45, 21, 90);
  il.run('presupuesto', p1.lastInsertRowid, 'Material', 'Junta silicona + llave de paso 1/2"', 1, 15, 21, 15);

  const p2 = ip.run(c3.lastInsertRowid, t10.lastInsertRowid, 'PRES-2026-0002', d(-4), d(26), 'enviado', 21, 5, 'Descuento por volumen.', 480, 100.80, 575.80);
  il.run('presupuesto', p2.lastInsertRowid, 'Grifo industrial x6', 'Grifos monomando industrial', 6, 55, 21, 330);
  il.run('presupuesto', p2.lastInsertRowid, 'Mano de obra instalación', 'Instalación completa de 6 grifos', 3, 45, 21, 135);
  il.run('presupuesto', p2.lastInsertRowid, 'Material auxiliar', 'Flexibles, juntas, teflón', 1, 15, 21, 15);

  const p3 = ip.run(c7.lastInsertRowid, t8.lastInsertRowid, 'PRES-2026-0003', d(-1), d(29), 'borrador', 21, 0, 'Pendiente confirmar materiales.', 200, 42, 242);
  il.run('presupuesto', p3.lastInsertRowid, 'Desplazamiento', 'Desplazamiento', 1, 25, 21, 25);
  il.run('presupuesto', p3.lastInsertRowid, 'Mano de obra', 'Instalación nueva línea agua', 3, 45, 21, 135);
  il.run('presupuesto', p3.lastInsertRowid, 'Material tubería', 'Tubo multicapa, codos, tés', 1, 40, 21, 40);

  db.prepare('UPDATE trabajos SET presupuesto_id = ? WHERE id = ?').run(p1.lastInsertRowid, t1.lastInsertRowid);
  db.prepare('UPDATE trabajos SET presupuesto_id = ? WHERE id = ?').run(p2.lastInsertRowid, t10.lastInsertRowid);
  db.prepare('UPDATE trabajos SET presupuesto_id = ? WHERE id = ?').run(p3.lastInsertRowid, t8.lastInsertRowid);

  // ── FACTURAS ──────────────────────────────────────────────────────────────────
  const ifac = db.prepare(`INSERT INTO facturas (cliente_id, trabajo_id, presupuesto_id, numero, fecha, vencimiento, estado, iva_porcentaje, descuento, notas, subtotal, iva_total, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const f1 = ifac.run(c3.lastInsertRowid, t3.lastInsertRowid, null, 'FAC-2026-0001', d(-10), d(-3), 'pagada', 21, 0, 'Urgencia fin de semana. Pagado en efectivo.', 165, 34.65, 199.65);
  il.run('factura', f1.lastInsertRowid, 'Desplazamiento urgente', 'Desplazamiento sábado noche', 1, 25, 21, 25);
  il.run('factura', f1.lastInsertRowid, 'Mano de obra urgencia', 'Desatasco con máquina', 2, 45, 21, 90);
  il.run('factura', f1.lastInsertRowid, 'Urgencia fuera de horario', 'Recargo urgencia fin de semana', 1, 50, 21, 50);

  const f2 = ifac.run(c5.lastInsertRowid, t5.lastInsertRowid, null, 'FAC-2026-0002', d(-15), d(-5), 'vencida', 21, 0, 'Pendiente cobro. Llamar a la clienta.', 145, 30.45, 175.45);
  il.run('factura', f2.lastInsertRowid, 'Desplazamiento', 'Desplazamiento', 1, 25, 21, 25);
  il.run('factura', f2.lastInsertRowid, 'Instalación termo', 'Instalación completa termo 80L', 1, 70, 21, 70);
  il.run('factura', f2.lastInsertRowid, 'Material', 'Conexiones flexibles, soporte', 1, 30, 21, 30);
  il.run('factura', f2.lastInsertRowid, 'Mano de obra extra', 'Hora adicional retirada termo viejo', 1, 20, 21, 20);

  const f3 = ifac.run(c6.lastInsertRowid, t6.lastInsertRowid, null, 'FAC-2026-0003', d(-20), d(-13), 'pagada', 21, 0, '', 110, 23.10, 133.10);
  il.run('factura', f3.lastInsertRowid, 'Desplazamiento', 'Desplazamiento', 1, 25, 21, 25);
  il.run('factura', f3.lastInsertRowid, 'Mano de obra', 'Cambio de grifo lavabo', 1, 45, 21, 45);
  il.run('factura', f3.lastInsertRowid, 'Grifo Roca Esmai', 'Grifo mezclador con instalación', 1, 40, 21, 40);

  const f4 = ifac.run(c8.lastInsertRowid, t15.lastInsertRowid, null, 'FAC-2026-0004', d(-45), d(-38), 'pagada', 21, 0, 'Urgencia nocturna. Transferencia.', 285, 59.85, 344.85);
  il.run('factura', f4.lastInsertRowid, 'Desplazamiento urgente', 'Madrugada', 1, 25, 21, 25);
  il.run('factura', f4.lastInsertRowid, 'Mano de obra urgencia', '3h reparación', 3, 45, 21, 135);
  il.run('factura', f4.lastInsertRowid, 'Material reparación', 'Tubo cobre, soldadura, conectores', 1, 75, 21, 75);
  il.run('factura', f4.lastInsertRowid, 'Urgencia nocturna', 'Recargo nocturno', 1, 50, 21, 50);

  const f5 = ifac.run(c5.lastInsertRowid, t13.lastInsertRowid, null, 'FAC-2026-0005', d(-6), d(0), 'emitida', 21, 0, 'Vence hoy.', 80, 16.80, 96.80);
  il.run('factura', f5.lastInsertRowid, 'Desplazamiento', 'Desplazamiento', 1, 25, 21, 25);
  il.run('factura', f5.lastInsertRowid, 'Desatasco manual ducha', 'Desatasco manual con varilla', 1, 55, 21, 55);

  const f6 = ifac.run(c1.lastInsertRowid, t1.lastInsertRowid, p1.lastInsertRowid, 'FAC-2026-0006', d(-2), d(28), 'emitida', 21, 0, 'Convertida desde presupuesto PRES-2026-0001.', 130, 27.30, 157.30);
  il.run('factura', f6.lastInsertRowid, 'Desplazamiento', 'Desplazamiento a domicilio', 1, 25, 21, 25);
  il.run('factura', f6.lastInsertRowid, 'Mano de obra', 'Localización y reparación de fuga', 2, 45, 21, 90);
  il.run('factura', f6.lastInsertRowid, 'Material', 'Junta silicona + llave de paso 1/2"', 1, 15, 21, 15);

  const f7 = ifac.run(c1.lastInsertRowid, t7.lastInsertRowid, null, 'FAC-2026-0007', d(-3), d(27), 'emitida', 21, 0, '', 95, 19.95, 114.95);
  il.run('factura', f7.lastInsertRowid, 'Desplazamiento', 'Desplazamiento', 1, 25, 21, 25);
  il.run('factura', f7.lastInsertRowid, 'Reparación cisterna', 'Cambio mecanismo interior', 1, 55, 21, 55);
  il.run('factura', f7.lastInsertRowid, 'Material', 'Mecanismo + goma descarga', 1, 15, 21, 15);

  // Actualizar trabajos con factura_id
  const utf = db.prepare('UPDATE trabajos SET factura_id = ? WHERE id = ?');
  utf.run(f1.lastInsertRowid, t3.lastInsertRowid);
  utf.run(f2.lastInsertRowid, t5.lastInsertRowid);
  utf.run(f3.lastInsertRowid, t6.lastInsertRowid);
  utf.run(f4.lastInsertRowid, t15.lastInsertRowid);
  utf.run(f5.lastInsertRowid, t13.lastInsertRowid);
  utf.run(f6.lastInsertRowid, t1.lastInsertRowid);
  utf.run(f7.lastInsertRowid, t7.lastInsertRowid);

  db.prepare("UPDATE presupuestos SET estado = 'convertido' WHERE id = ?").run(p1.lastInsertRowid);

  // ── COBROS ────────────────────────────────────────────────────────────────────
  const ico = db.prepare(`INSERT INTO cobros (factura_id, cliente_id, importe, fecha_vencimiento, fecha_pago, estado, metodo, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const co1 = ico.run(f1.lastInsertRowid, c3.lastInsertRowid, 199.65, d(-3), d(-3), 'pagado', 'efectivo', 'Pagado en mano al terminar el trabajo.');
  const co2 = ico.run(f2.lastInsertRowid, c5.lastInsertRowid, 175.45, d(-5), null, 'vencido', 'transferencia', 'Llamar a la clienta. Mayor, necesita recordatorio por teléfono.');
  const co3 = ico.run(f3.lastInsertRowid, c6.lastInsertRowid, 133.10, d(-13), d(-14), 'pagado', 'transferencia', '');
  const co4 = ico.run(f4.lastInsertRowid, c8.lastInsertRowid, 344.85, d(-38), d(-35), 'pagado', 'transferencia', '');
  const co5 = ico.run(f5.lastInsertRowid, c5.lastInsertRowid, 96.80, d(0), null, 'pendiente', 'efectivo', 'Vence hoy. Acordado efectivo en próxima visita.');
  const co6 = ico.run(f6.lastInsertRowid, c1.lastInsertRowid, 157.30, d(28), null, 'pendiente', 'bizum', 'Acordado bizum cuando terminen los trabajos.');
  const co7 = ico.run(f7.lastInsertRowid, c1.lastInsertRowid, 114.95, d(27), null, 'recordado', 'bizum', '');

  // ── RECORDATORIOS ─────────────────────────────────────────────────────────────
  const ir = db.prepare(`INSERT INTO recordatorios (cobro_id, plantilla_tipo, mensaje, canal_simulado, enviado_en) VALUES (?, ?, ?, ?, ?)`);
  ir.run(co2.lastInsertRowid, 'amable', `Hola María Dolores Fernández, le recordamos que tiene pendiente de pago la factura FAC-2026-0002 por importe de 175,45 €, con vencimiento el ${d(-5)}. Puede realizar el pago por transferencia. Muchas gracias. — Fontanería Rápida Martín`, 'whatsapp', d(-4) + ' 10:30:00');
  ir.run(co2.lastInsertRowid, 'firme', `Estimada María Dolores Fernández, le comunicamos que la factura FAC-2026-0002 por 175,45 € venció el ${d(-5)} y continúa sin abonar. Le rogamos que realice el pago a la mayor brevedad posible. — Fontanería Rápida Martín`, 'whatsapp', d(-2) + ' 09:15:00');
  ir.run(co7.lastInsertRowid, 'amable', `Hola Ana García Pérez, le recordamos que tiene pendiente la factura FAC-2026-0007 por 114,95 €. Vencimiento ${d(27)}. Puede pagar por bizum. Gracias. — Fontanería Rápida Martín`, 'whatsapp', d(-1) + ' 11:00:00');

  console.log('✅ Seed completado con éxito.');
  console.log('   — 8 clientes · 15 trabajos · 3 presupuestos · 7 facturas');
  console.log('   — 7 cobros · 10 conceptos reutilizables · 3 plantillas · 3 recordatorios');
}

run().catch(e => { console.error(e); process.exit(1); });
