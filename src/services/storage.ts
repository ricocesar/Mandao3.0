import {
  User, Comercio, Producto, Pedido, Repartidor, SolicitudSocio, VetoCliente,
  ConfigGlobal, ReporteCruzado, RegistroSOS, CierreCaja, PagoRegistro, AuditLog, ErrorLog, ChatMessage
} from '../types/mandao';

// ✅ AQUÍ ESTÁ TU URL REAL DE GOOGLE APPS SCRIPT
const GAS_URL = "https://script.google.com/macros/s/AKfycbz6Z1oure3TUVo6LLjLd9VgZw_Kh3EVmE6-ACmb0-5XtsETecAj9dq_Wk-fhhU3OE0/exec";

// Función maestra para comunicarse con el backend
async function callApi(action: string, data: Record<string, unknown> = {}) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data })
    });
    const json = await res.json();
    return json;
  } catch (error) {
    console.error(`Error en API (${action}):`, error);
    return { success: false, error: 'Error de conexión con el servidor.' };
  }
}

export function normalizarCedula(c: string): string {
  if (!c) return '';
  const s = String(c).trim().toUpperCase().replace(/\s+/g, '');
  const m = s.match(/^([VEJ])?-?(\d{6,9})$/);
  if (!m) return s;
  return (m[1] || 'V') + '-' + m[2];
}

export function soloNumeros(v: string | number): string {
  return String(v || '').replace(/[^0-9]/g, '');
}

export function validarEmail(e: string): boolean {
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e).trim());
}

export function getSemanaActual(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${('0' + weekNo).slice(-2)}`;
}

export function fmt(n: number | string, customConfig?: ConfigGlobal): string {
  const num = Number(n) || 0;
  // Al no tener localStorage, usamos valores por defecto si no pasa la config
  const cfg = customConfig || { tasa_bcv: 60, modo_moneda: 'ambos' };
  const tasa = cfg.tasa_bcv || 60;
  const modo = cfg.modo_moneda || 'ambos';

  const usdStr = '$' + num.toFixed(2);
  const bsVal = num * tasa;

  const parts = bsVal.toFixed(2).split('.');
  const integerWithDots = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const bsStr = `Bs. ${integerWithDots},${parts[1]}`;

  if (modo === 'usd') return usdStr;
  if (modo === 'bs') return bsStr;
  return `${usdStr} (${bsStr})`;
}

export function fmtUSD(n: number | string): string {
  return '$' + (Number(n) || 0).toFixed(2);
}

// =================== API MAESTRA (LECTURA) ===================
export async function getDatosCompletos(cedulaConsulta?: string) {
  const res = await callApi('getDatosCompletos', { idUsuario: cedulaConsulta });
  if (res.success) {
    // Guardamos la sesión localmente para persistencia visual rápida
    if (res.usuario) localStorage.setItem('mandao_current_user', JSON.stringify(res.usuario));
    return res;
  }
  return res;
}

// =================== AUTH & USUARIOS ===================
export async function loginUsuario(cedula: string, pin: string) {
  const res = await callApi('loginUsuario', { idUsuario: cedula, pin });
  if (res.success && res.usuario) {
    localStorage.setItem('mandao_current_user', JSON.stringify(res.usuario));
  }
  return res;
}

export async function registrarCliente(data: {
  cedula: string; nombre: string; apellido: string; telefono: string; email: string; direccion: string; pin?: string;
}) {
  const res = await callApi('registrarCliente', data);
  if (res.success && res.usuario) {
    localStorage.setItem('mandao_current_user', JSON.stringify(res.usuario));
  }
  return res;
}

export async function actualizarDatosCliente(data: Record<string, unknown>) {
  return await callApi('actualizarDatosCliente', data);
}

export async function solicitarRegistroSocio(tipo: 'comercio' | 'repartidor', data: Record<string, unknown>) {
  return await callApi('solicitarRegistroSocio', { tipo, ...data });
}

// =================== PEDIDOS ===================
export async function crearPedido(data: Record<string, unknown>) {
  return await callApi('crearPedido', data);
}

export async function validarPagoYEnviarACocina(pedidoId: string) {
  return await callApi('validarPagoYPreparar', { id_pedido: pedidoId });
}

export async function marcarListoParaRetiro(pedidoId: string) {
  return await callApi('marcarListoParaRetiro', { id_pedido: pedidoId });
}

export async function tomarPedidoRepartidor(pedidoId: string, repartidorId: string, repartidorNombre: string) {
  return await callApi('tomarPedidoRepartidor', { id_pedido: pedidoId, id_repartidor: repartidorId, nombre_repartidor: repartidorNombre });
}

export async function marcarLlego(pedidoId: string, repartidorId: string) {
  return await callApi('marcarLlegadaCliente', { id_pedido: pedidoId, id_repartidor: repartidorId });
}

export async function validarPinYEntregar(pedidoId: string, pin: string) {
  return await callApi('validarPinYEntregar', { id_pedido: pedidoId, pin });
}

export async function marcarEntregadoPorComercio(pedidoId: string) {
  return await callApi('autodespachoComercio', { id_pedido: pedidoId, pin: '0000' }); // PIN bypass backend logic
}

export async function cancelarPedidoConMotivo(pedidoId: string, motivo: string, rol: string) {
  return await callApi('cancelarPedido', { id_pedido: pedidoId, motivo, rol });
}

// =================== ADMIN & CONFIG ===================
export async function guardarConfigAdmin(config: Record<string, unknown>, pin: string) {
  return await callApi('guardarConfigAdmin', { config, pin });
}

export async function validarAdminPin(cedula: string, pin: string) {
  return await callApi('loginUsuario', { idUsuario: cedula, pin });
}

export async function aprobarSolicitud(id: string) {
  return await callApi('aprobarSolicitud', { id_solicitud: id });
}

export async function rechazarSolicitud(id: string, motivo: string) {
  return await callApi('rechazarSolicitud', { id_solicitud: id, motivo });
}

// Otras funciones dummy temporalmente para que compile React
export const MandaoStorage = {
  getCurrentUser: () => {
    const u = localStorage.getItem('mandao_current_user');
    return u ? JSON.parse(u) : null;
  },
  saveCurrentUser: (u: unknown) => {
    if (u) localStorage.setItem('mandao_current_user', JSON.stringify(u));
    else localStorage.removeItem('mandao_current_user');
  }
};

export const registrarAuditoria = () => {};
export const logError = () => {};
export const calcularDistanciaKm = () => 0;
export const validarEnZonaCobertura = () => ({ dentro: true, distanciaKm: 0 });
export const calcularTiempoEstimado = () => "20-30 min";
export const eliminarSolicitud = async () => ({ success: true });
export const calificarPedido = async () => ({ success: true });
export const reportarFraude = async () => ({ success: true });
export const quitarVeto = async () => ({ success: true });
export const eliminarPedido = async () => ({ success: true });
export const enviarMensajeChat = async () => ({ success: true });
export const crearReporteCruzado = async () => ({ success: true });
export const aprobarSancionReporte = async () => ({ success: true });
export const descartarReporte = async () => ({ success: true });
export const registrarEventoSOS = async () => ({ success: true });
export const marcarPagoComercio = async () => ({ success: true });
export const marcarPagoRepartidor = async () => ({ success: true });
export const ejecutarCierreDiario = async () => ({ success: true });
export const descargarReporteCSV = () => {};
export const crearProductoComercio = async () => ({ success: true });
export const editarProductoComercio = async () => ({ success: true });
export const toggleDisponibilidadProducto = async () => ({ success: true });
export const eliminarProductoComercio = async () => ({ success: true });
export const toggleComercioAbierto = async () => ({ success: true });
export const togglePatrocinadoComercio = async () => ({ success: true });
export const toggleOfertaFlashComercio = async () => ({ success: true });
export const toggleRepartidorServicio = async () => ({ success: true });
export const actualizarUbicacionRepartidor = async () => ({ success: true });
export const editarComercio = async () => ({ success: true });
export const eliminarComercio = async () => ({ success: true });
export const reactivarComercio = async () => ({ success: true });
export const editarRepartidor = async () => ({ success: true });
export const eliminarRepartidor = async () => ({ success: true });
export const reactivarRepartidor = async () => ({ success: true });
export const suspenderUsuario = async () => ({ success: true });
export const reactivarUsuario = async () => ({ success: true });
export const actualizarConfigGlobal = async () => ({ success: true });
export const resetearPinUsuario = async () => ({ success: true, nuevoPin: '1234' });
export const verPinUsuario = async () => ({ success: true, pin: '1234' });
