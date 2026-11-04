# 🔧 Control de Trabajos

**MVP de gestión de clientes, trabajos, presupuestos y cobros para técnicos autónomos.**

> ⚠️ **AVISO DEMO:** Este software es un MVP para uso interno. Revisar cumplimiento fiscal antes de uso comercial real en España. Ver sección **Fase 2 obligatoria**.

---

## ¿Qué es?

Aplicación web mobile-first para técnicos independientes: fontaneros, electricistas, instaladores y cualquier autónomo de servicios. Permite gestionar clientes, trabajos en curso, presupuestos, facturas, cobros pendientes y recordatorios de pago desde el móvil, sin necesidad de internet ni servicios externos.

Datos de demo incluidos: **Fontanería Rápida Martín** (Martín Salcedo, Tarragona).

---

## Para quién es

- Fontaneros, electricistas, mantenedores, instaladores
- Autónomos que trabajan en campo desde el móvil
- Talleres y servicios técnicos unipersonales
- Cualquier autónomo que facture a clientes particulares o empresas

---

## Stack técnico

| Capa      | Tecnología |
|-----------|-----------|
| Frontend  | React 18 + Vite + Tailwind CSS |
| Backend   | Node.js + Express |
| Base de datos | SQLite (better-sqlite3) |
| PDFs      | PDFKit |
| Routing   | React Router v6 |
| Dev       | concurrently + nodemon |

---

## Instalación

### Requisitos
- Node.js 18+
- npm 9+

### Pasos

```bash
# 1. Clonar o descomprimir el proyecto
cd control-trabajos

# 2. Instalar todas las dependencias (raíz + cliente + servidor)
npm run install:all

# 3. Cargar datos de demo
npm run seed

# 4. Arrancar en modo desarrollo
npm run dev
```

La app estará disponible en:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001/api

---

## Comandos disponibles

```bash
npm run install:all   # Instala dependencias de todo el monorepo
npm run dev           # Arranca cliente + servidor en paralelo
npm run seed          # Carga datos demo (Fontanería Rápida Martín)
npm run generate-pdfs # Genera 3 PDFs de ejemplo en server/data/pdfs/
npm run build         # Compila el cliente para producción
```

---

## Flujo de uso día a día

### 1. Abrir el panel
Al entrar ves de un vistazo:
- Total pendiente de cobro
- Cobros vencidos y los que vencen hoy
- Trabajos urgentes activos
- Botones rápidos: Presupuesto / Factura / Trabajo

### 2. Ver cobros pendientes
- Ir a **Cobros** (icono 💶 en barra inferior)
- Usar filtros: Vencidos / Hoy / Próximos 7 días
- Pulsar **"Cobrado"** para marcar el pago
- Pulsar **"Recordatorio"** para generar y registrar un aviso simulado

### 3. Crear un trabajo
- Pulsar botón **"+"** en barra inferior → **Nuevo trabajo**
- Seleccionar cliente, título, prioridad y fecha prevista
- El trabajo aparece en el panel si es urgente

### 4. Crear un presupuesto en menos de 60 segundos
- Pulsar **"+"** → **Nuevo presupuesto**
- Seleccionar cliente
- Añadir líneas usando **"⚡ Reutilizable"** (conceptos guardados)
- Pulsar **"Crear presupuesto"**
- ✅ Listo. El número se genera solo (PRES-2026-XXXX)

### 5. Convertir presupuesto a factura
- Abrir el presupuesto
- Pulsar **"🧾 Convertir a factura"**
- Se crea la factura con todas las líneas y el cobro pendiente automáticamente

### 6. Crear factura directamente
- Pulsar **"+"** → **Nueva factura**
- Seleccionar cliente, añadir líneas, definir vencimiento
- Pulsar **"Crear factura"**
- Se genera cobro pendiente automáticamente

### 7. Marcar un cobro como pagado
- Ir a **Cobros**
- Buscar el cobro → pulsar **"✅ Cobrado"**
- Seleccionar método de pago → Confirmar
- La factura se marca como pagada automáticamente

### 8. Enviar recordatorio simulado
- En **Cobros**, pulsar **"💬 Recordatorio"** en cualquier cobro pendiente
- Elegir plantilla (amable / firme / último aviso)
- Ver la vista previa del mensaje generado
- Pulsar **"📤 Enviar simulado"**
- El recordatorio queda registrado con fecha/hora

---

## Cómo generar los 3 PDFs de ejemplo

```bash
# Con el servidor arrancado (o sin él, funciona de forma independiente):
npm run generate-pdfs
```

Genera en `server/data/pdfs/`:
1. `PRES-2026-0001.pdf` — Presupuesto ejemplo
2. `FAC-2026-0002.pdf` — Factura pendiente/vencida
3. `FAC-2026-0001-PAGADA.pdf` — Factura pagada

También puedes descargar cualquier PDF desde la app:
- Abre un presupuesto o factura → botón **"📄 Descargar PDF"**
- O directamente: `GET /api/presupuestos/:id/pdf` / `GET /api/facturas/:id/pdf`

---

## Modelo de datos

| Tabla | Descripción |
|-------|-------------|
| `clientes` | Datos de contacto y NIF |
| `trabajos` | Trabajos con estado, prioridad, materiales y fotos |
| `presupuestos` | Presupuestos con líneas, IVA, descuento |
| `facturas` | Facturas vinculadas a presupuestos o directas |
| `lineas_concepto` | Líneas de presupuestos y facturas |
| `conceptos_reutilizables` | Catálogo de conceptos frecuentes |
| `cobros` | Cobros pendientes vinculados a facturas |
| `recordatorios` | Historial de recordatorios simulados |
| `plantillas_recordatorio` | Plantillas editables de mensaje |

---

## Numeración automática

- Presupuestos: `PRES-AAAA-NNNN` (ej: `PRES-2026-0001`)
- Facturas: `FAC-AAAA-NNNN` (ej: `FAC-2026-0001`)

El número se asigna automáticamente al crear. No hay huecos ni duplicados.

---

## Limitaciones del MVP

- Un solo usuario/negocio (sin autenticación ni multiusuario)
- Sin envío real de email ni WhatsApp
- Sin firma digital de documentos
- Sin cumplimiento Verifactu ni facturación electrónica legal
- Fotos de trabajos son solo nombres de fichero (no upload real)
- Sin backup automático (la BD es un fichero SQLite en `server/data/`)
- Los PDFs son de demo, sin validez fiscal

---

## ⚠️ Fase 2 — OBLIGATORIA para uso comercial en España

Antes de usar esta aplicación para facturar legalmente en España, es **obligatorio** implementar:

### 1. Verifactu (obligatorio desde 2026)
Sistema de verificación de facturas de la AEAT. Todas las facturas emitidas por software deben registrarse en tiempo real en la Agencia Tributaria mediante el sistema Verifactu (RD 1007/2023).

### 2. Facturación electrónica
La **Ley Crea y Crece** (Ley 18/2022) obliga a la factura electrónica en operaciones B2B. Requiere integración con el formato FacturaE o equivalente homologado.

### 3. Firma digital
Los documentos fiscales deben poder firmarse digitalmente con certificado reconocido.

### 4. Envío real de email y WhatsApp
Integración con SendGrid/Resend para email y WhatsApp Business API para comunicaciones reales con clientes.

### 5. Autenticación y seguridad
- Login con contraseña segura o 2FA
- Sesiones con token JWT o similar
- HTTPS obligatorio en producción

### 6. Multiusuario (si aplica)
Gestión de roles: propietario, empleado, contable.

### 7. Backups automáticos
Copias de seguridad cifradas y programadas de la base de datos.

---

## Criterios de aceptación — cómo probarlos

| Criterio | Cómo verificar |
|----------|---------------|
| Factura en <60 seg | Panel → "+" → Nueva factura → seleccionar cliente → añadir línea reutilizable → crear |
| Mobile-first | Abrir en móvil o DevTools modo responsive 390px |
| Panel sin scroll | Panel principal cabe en una pantalla de 844px alto |
| Fichas de cliente | Clientes → cualquier cliente → pestañas Trabajos/Facturas/Cobros |
| Trabajos con estado | Trabajos → ficha → cambiar estado rápido |
| Conversión pres→fac | Presupuesto → botón "Convertir a factura" |
| PDF funcional | Factura o presupuesto → "Descargar PDF" |
| Recordatorio simulado | Cobros → "💬 Recordatorio" → elegir plantilla → enviar |
| Seed completo | `npm run seed` → 8 clientes, 15 trabajos, 7 facturas |
| 3 PDFs de ejemplo | `npm run generate-pdfs` → ver server/data/pdfs/ |

---

## Estructura del proyecto

```
control-trabajos/
├── package.json              # Scripts raíz + concurrently
├── README.md
├── client/                   # Frontend React
│   ├── src/
│   │   ├── api/index.js      # Cliente HTTP centralizado
│   │   ├── components/       # Layout, NavBar, badges, LineaConceptoEditor
│   │   └── pages/            # 11 pantallas
│   └── ...
└── server/                   # Backend Express
    ├── index.js              # Entry point
    ├── db/
    │   ├── database.js       # SQLite + esquema
    │   └── seed.js           # Datos demo
    ├── routes/               # 8 routers REST
    ├── services/
    │   ├── pdfService.js     # Generación PDFKit
    │   └── recordatorioService.js
    └── scripts/
        └── generateSamplePdfs.js
```

---

*Control de Trabajos — MVP by Silys*
