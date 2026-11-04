'use strict';

/**
 * Servicio SIMULADO de recordatorios.
 * NO envía WhatsApp ni email real.
 * Genera mensajes y los registra en BD.
 */

function generarMensaje(plantilla, datos) {
  let msg = plantilla;
  for (const [key, val] of Object.entries(datos)) {
    msg = msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || '');
  }
  return msg;
}

module.exports = { generarMensaje };
