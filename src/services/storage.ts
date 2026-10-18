import {
  User,
  Comercio,
  Producto,
  Pedido,
  Repartidor,
  SolicitudSocio,
  VetoCliente,
  ConfigGlobal,
  ReporteCruzado,
  RegistroSOS,
  CierreCaja,
  PagoRegistro,
  AuditLog,
  ErrorLog,
  ChatMessage,
  EstadoPedido,
} from '../types/mandao';

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

// Format currency with Venezuelan standard (dots for thousands, comma for decimals)
export function fmt(n: number | string, customConfig?: ConfigGlobal): string {
  const num = Number(n) || 0;
  const cfg = customConfig || MandaoStorage.getConfig();
  const tasa = cfg.tasa_bcv || 60;
  const modo = cfg.modo_moneda || 'ambos';

  const usdStr = '$' + num.toFixed(2);
  const bsVal = num * tasa;

  // Format Bs with standard VE (e.g. 5.706,35)
  const parts = bsVal.toFixed(2).split('.');
  const integerWithDots = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const bsStr = `Bs. ${integerWithDots},${parts[1]}`;

  if (modo === 'usd') return usdStr;
  if (modo === 'bs') return bsStr;
  return `${usdStr} (${bsStr})`;
}

// Raw USD format
export function fmtUSD(n: number | string): string {
  return '$' + (Number(n) || 0).toFixed(2);
}

// Storage keys
const STORAGE_KEYS = {
  CONFIG: 'mandao_config_v7',
  USUARIOS: 'mandao_usuarios_v7',
  COMERCIOS: 'mandao_comercios_v7',
  REPARTIDORES: 'mandao_repartidores_v7',
  PRODUCTOS: 'mandao_productos_v7',
  PEDIDOS: 'mandao_pedidos_v7',
  VETADOS: 'mandao_vetados_v7',
  SOLICITUDES: 'mandao_solicitudes_v7',
  REPORTES: 'mandao_reportes_v7',
  SOS: 'mandao_sos_v7',
  CIERRES: 'mandao_cierres_v7',
  PAGOS: 'mandao_pagos_v7',
  AUDITORIA: 'mandao_auditoria_v7',
  LOGS: 'mandao_logs_v7',
  USER_SESSION: 'mandao_current_user_v7',
};

// Initial Clean Production Config
const DEFAULT_CONFIG: ConfigGlobal = {
  porcentaje_admin: 0.15,
  dias_veto: 3,
  nombre_pueblo: 'PAPELÓN',
  titulo_app: 'Mandao',
  mensaje_bienvenida: '¿Qué quieres comer hoy?',
  telefono_soporte: '+58 412-5550199',
  instagram_mandao: '@mandao.papelon',
  email_soporte: 'soporte@mandao.com',
  email_admin: 'admin@mandao.com',
  premio_patrocinador: '🏆 Premio Semanal al Repartidor #1 de Papelón',
  terminos_condiciones: 'Al utilizar Mandao aceptas nuestras políticas de entrega local, verificación de Pago Móvil y respeto a los repartidores.',
  tarifa_bicicleta: 1.00,
  min_aviso_sin_rep: 5,
  min_alerta_sin_rep: 10,
  min_critico_sin_rep: 15,
  // Hyperlocal defaults
  modo_demo: false,
  tasa_bcv: 60.50,
  fecha_tasa: new Date().toISOString().slice(0, 10),
  modo_moneda: 'ambos',
  lat_centro: 9.0744,
  lng_centro: -69.2483, // Papelón, Portuguesa
  radio_km: 8.0,
};

// Clean Production Admin User (ONLY ONE user exists at startup!)
const DEFAULT_PROD_USERS: User[] = [
  {
    cedula: 'V-00000000',
    pin: '1234',
    rol: 'admin',
    es_admin: true,
    nombre: 'Super',
    apellido: 'Admin',
    telefono: '0414-0000000',
    email: 'admin@mandao.com',
    strikes: 0,
    pedidos_completados: 0,
    fecha_registro: new Date().toISOString(),
  },
];

// Rich Demo Fixtures (shown ONLY when modo_demo is ON or ?demo=1)
const DEMO_COMERCIOS: Comercio[] = [
  {
    id_comercio: 'COM-BURGERS',
    nombre: 'Burgers Papelón',
    categoria: 'Comidas Rápidas',
    direccion: 'Av. Bolívar c/ Calle 4, Centro',
    lat_comercio: 9.0746,
    lng_comercio: -69.2485,
    telefono: '0414-5551234',
    banco_pago_movil: 'Banesco (0134)',
    telefono_pago_movil: '04145551234',
    cedula_pago_movil: 'V-24120932',
    titular_pago_movil: 'Carlos Mendoza',
    delivery_gratis: false,
    abierto: true,
    tiempo_estimado: '20-30 min',
    logo_emoji: '🍔',
    patrocinado: true,
    oferta_flash: true,
    calificacion: 4.9,
    total_calificaciones: 48,
    activo: true,
    notas_admin: 'Local estrella de comida rápida',
    fecha_registro: '2026-01-10T10:00:00.000Z',
  },
  {
    id_comercio: 'COM-PIZZA',
    nombre: 'Pizzería La Romana',
    categoria: 'Comidas Rápidas',
    direccion: 'Calle Miranda, Plaza Bolívar',
    lat_comercio: 9.0750,
    lng_comercio: -69.2490,
    telefono: '0424-5559876',
    banco_pago_movil: 'Mercantil (0105)',
    telefono_pago_movil: '04245559876',
    cedula_pago_movil: 'V-18765432',
    titular_pago_movil: 'Gianni Rossi',
    delivery_gratis: true,
    abierto: true,
    tiempo_estimado: '25-35 min',
    logo_emoji: '🍕',
    patrocinado: false,
    oferta_flash: false,
    calificacion: 4.8,
    total_calificaciones: 35,
    activo: true,
    fecha_registro: '2026-01-12T10:00:00.000Z',
  },
  {
    id_comercio: 'COM-PANADERIA',
    nombre: 'Panadería San José',
    categoria: 'Panes',
    direccion: 'Av. Sucre frente al Hospital',
    lat_comercio: 9.0735,
    lng_comercio: -69.2470,
    telefono: '0412-5554321',
    banco_pago_movil: 'Bancaribe (0114)',
    telefono_pago_movil: '04125554321',
    cedula_pago_movil: 'V-15432198',
    titular_pago_movil: 'José Da Silva',
    delivery_gratis: false,
    abierto: true,
    tiempo_estimado: '15-20 min',
    logo_emoji: '🥖',
    patrocinado: false,
    oferta_flash: false,
    calificacion: 4.7,
    total_calificaciones: 22,
    activo: true,
    fecha_registro: '2026-01-15T10:00:00.000Z',
  },
];

const DEMO_PRODUCTOS: Producto[] = [
  {
    id_producto: 'PROD-B1',
    id_comercio: 'COM-BURGERS',
    nombre: 'Hamburguesa Especial Mandao',
    descripcion: 'Carne jugosa 150g, tocineta, huevo frito, queso amarillo, papitas y salsas.',
    precio: 4.50,
    categoria: 'Comidas Rápidas',
    foto_emoji: '🍔',
    disponible: true,
    veces_vendido: 42,
  },
  {
    id_producto: 'PROD-B2',
    id_comercio: 'COM-BURGERS',
    nombre: 'Perro Caliente Gigante',
    descripcion: 'Salchicha especial, ensalada fresca, queso rallado y papas crocantes.',
    precio: 2.00,
    categoria: 'Comidas Rápidas',
    foto_emoji: '🌭',
    disponible: true,
    veces_vendido: 29,
  },
  {
    id_producto: 'PROD-P1',
    id_comercio: 'COM-PIZZA',
    nombre: 'Pizza Familiar Pepperoni',
    descripcion: '8 porciones, abundante queso mozzarella y pepperoni premium.',
    precio: 8.50,
    categoria: 'Comidas Rápidas',
    foto_emoji: '🍕',
    disponible: true,
    veces_vendido: 34,
  },
  {
    id_producto: 'PROD-PN1',
    id_comercio: 'COM-PANADERIA',
    nombre: 'Cachito de Jamón y Queso Crema',
    descripcion: 'Masa suave y esponjosa horneada en la mañana.',
    precio: 1.50,
    categoria: 'Panes',
    foto_emoji: '🥐',
    disponible: true,
    veces_vendido: 18,
  },
];

const DEMO_REPARTIDORES: Repartidor[] = [
  {
    id_repartidor: 'REP-1',
    nombre: 'Luis Pérez',
    telefono: '0414-1112233',
    email: 'luis.perez@mandao.com',
    vehiculo: 'Bicicleta',
    en_servicio: true,
    ganancias_hoy: 8.50,
    viajes_hoy: 6,
    viajes_semana: 28,
    semana_actual: getSemanaActual(),
    viajes_totales: 84,
    calificacion: 4.9,
    total_calificaciones: 52,
    activo: true,
    lat_actual: 9.0745,
    lng_actual: -69.2480,
    ultima_actualizacion: new Date().toISOString(),
  },
  {
    id_repartidor: 'REP-2',
    nombre: 'María Gómez',
    telefono: '0424-2223344',
    email: 'maria.gomez@mandao.com',
    vehiculo: 'Moto',
    en_servicio: true,
    ganancias_hoy: 6.00,
    viajes_hoy: 4,
    viajes_semana: 21,
    semana_actual: getSemanaActual(),
    viajes_totales: 65,
    calificacion: 4.8,
    total_calificaciones: 40,
    activo: true,
    lat_actual: 9.0730,
    lng_actual: -69.2475,
    ultima_actualizacion: new Date().toISOString(),
  },
];

// Determine if demo mode is enabled via config OR query param ?demo=1
export function isModoDemoActivo(): boolean {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1' || params.get('demo') === 'true') {
      return true;
    }
  }
  const cfg = MandaoStorage.getConfig();
  return Boolean(cfg.modo_demo);
}

// Safe localStorage wrapper
function readStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`Error reading key ${key}:`, err);
    return defaultValue;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('mandao_db_change'));
  } catch (err) {
    console.warn(`Error writing key ${key}:`, err);
  }
}

export const MandaoStorage = {
  getConfig(): ConfigGlobal {
    const cfg = readStorage<ConfigGlobal>(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG, ...cfg };
  },
  saveConfig(cfg: ConfigGlobal): void {
    writeStorage(STORAGE_KEYS.CONFIG, cfg);
    registrarAuditoria('admin', 'UPDATE_CONFIG', 'CONFIG', JSON.stringify(cfg));
  },

  getUsuarios(): User[] {
    if (isModoDemoActivo()) {
      return [
        ...DEFAULT_PROD_USERS,
        {
          cedula: 'V-12345678',
          pin: '1234',
          rol: 'cliente',
          nombre: 'Pedro',
          apellido: 'Pérez',
          telefono: '0414-1234567',
          email: 'pedro@demo.com',
          direccion_guardada: 'Calle Bolívar, Casa #42',
          lat_usuario: 9.0744,
          lng_usuario: -69.2483,
          pedidos_completados: 5,
        },
        {
          cedula: 'V-24120932',
          pin: '1234',
          rol: 'comercio',
          es_comercio: true,
          nombre: 'Carlos',
          apellido: 'Mendoza',
          telefono: '0414-5551234',
          email: 'carlos@demo.com',
          id_referencia: 'COM-BURGERS',
        },
        {
          cedula: 'V-11122334',
          pin: '1234',
          rol: 'repartidor',
          es_repartidor: true,
          nombre: 'Luis',
          apellido: 'Pérez',
          telefono: '0414-1112233',
          email: 'luis@demo.com',
          id_referencia: 'REP-1',
        },
      ];
    }
    return readStorage<User[]>(STORAGE_KEYS.USUARIOS, DEFAULT_PROD_USERS);
  },
  saveUsuarios(us: User[]): void {
    if (isModoDemoActivo()) return;
    writeStorage(STORAGE_KEYS.USUARIOS, us);
  },

  getComercios(): Comercio[] {
    if (isModoDemoActivo()) return DEMO_COMERCIOS;
    return readStorage<Comercio[]>(STORAGE_KEYS.COMERCIOS, []);
  },
  saveComercios(cs: Comercio[]): void {
    if (isModoDemoActivo()) return;
    writeStorage(STORAGE_KEYS.COMERCIOS, cs);
  },

  getProductos(): Producto[] {
    if (isModoDemoActivo()) return DEMO_PRODUCTOS;
    return readStorage<Producto[]>(STORAGE_KEYS.PRODUCTOS, []);
  },
  saveProductos(ps: Producto[]): void {
    if (isModoDemoActivo()) return;
    writeStorage(STORAGE_KEYS.PRODUCTOS, ps);
  },

  getRepartidores(): Repartidor[] {
    const list = isModoDemoActivo()
      ? DEMO_REPARTIDORES
      : readStorage<Repartidor[]>(STORAGE_KEYS.REPARTIDORES, []);

    // Check week reset
    const curSemana = getSemanaActual();
    let modified = false;
    list.forEach(r => {
      if (r.semana_actual !== curSemana) {
        r.viajes_semana = 0;
        r.semana_actual = curSemana;
        modified = true;
      }
    });
    if (modified && !isModoDemoActivo()) {
      writeStorage(STORAGE_KEYS.REPARTIDORES, list);
    }
    return list;
  },
  saveRepartidores(rs: Repartidor[]): void {
    if (isModoDemoActivo()) return;
    writeStorage(STORAGE_KEYS.REPARTIDORES, rs);
  },

  getPedidos(): Pedido[] {
    if (isModoDemoActivo()) {
      return [
        {
          id_pedido: 'PED-9001',
          fecha_hora: new Date(Date.now() - 15 * 60000).toISOString(),
          cliente_cedula: 'V-12345678',
          cliente_nombre: 'Pedro Pérez',
          cliente_telefono: '0414-1234567',
          cliente_direccion: 'Calle Bolívar, Casa #42',
          lat_cliente: 9.0744,
          lng_cliente: -69.2483,
          comercio_id: 'COM-BURGERS',
          comercio_nombre: 'Burgers Papelón',
          detalle_items: '1x Hamburguesa Especial Mandao + 1x Perro Gigante',
          subtotal: 6.50,
          tarifa_envio: 1.00,
          propina: 0.50,
          total: 8.00,
          tipo_vehiculo: 'Bicicleta',
          metodo_pago: 'Pago Móvil',
          referencia_pago: '4892',
          estado: 'En camino',
          pin_entrega: '7391',
          repartidor_asignado: 'Luis Pérez',
          repartidor_id: 'REP-1',
          lat_repartidor: 9.0740,
          lng_repartidor: -69.2480,
          mensajes_chat: [
            { id: 'm1', remitente: 'repartidor', texto: 'Voy en camino con tu comida caliente 🚲', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
          ],
        },
      ];
    }
    return readStorage<Pedido[]>(STORAGE_KEYS.PEDIDOS, []);
  },
  savePedidos(ps: Pedido[]): void {
    if (isModoDemoActivo()) return;
    writeStorage(STORAGE_KEYS.PEDIDOS, ps);
  },

  getSolicitudes(): SolicitudSocio[] {
    if (isModoDemoActivo()) return [];
    return readStorage<SolicitudSocio[]>(STORAGE_KEYS.SOLICITUDES, []);
  },
  saveSolicitudes(ss: SolicitudSocio[]): void {
    if (isModoDemoActivo()) return;
    writeStorage(STORAGE_KEYS.SOLICITUDES, ss);
  },

  getVetados(): VetoCliente[] {
    if (isModoDemoActivo()) return [];
    return readStorage<VetoCliente[]>(STORAGE_KEYS.VETADOS, []);
  },
  saveVetados(vs: VetoCliente[]): void {
    if (isModoDemoActivo()) return;
    writeStorage(STORAGE_KEYS.VETADOS, vs);
  },

  getReportes(): ReporteCruzado[] {
    return readStorage<ReporteCruzado[]>(STORAGE_KEYS.REPORTES, []);
  },
  saveReportes(rs: ReporteCruzado[]): void {
    writeStorage(STORAGE_KEYS.REPORTES, rs);
  },

  getSOS(): RegistroSOS[] {
    return readStorage<RegistroSOS[]>(STORAGE_KEYS.SOS, []);
  },
  saveSOS(s: RegistroSOS[]): void {
    writeStorage(STORAGE_KEYS.SOS, s);
  },

  getCierres(): CierreCaja[] {
    return readStorage<CierreCaja[]>(STORAGE_KEYS.CIERRES, []);
  },
  saveCierres(cs: CierreCaja[]): void {
    writeStorage(STORAGE_KEYS.CIERRES, cs);
  },

  getPagos(): PagoRegistro[] {
    return readStorage<PagoRegistro[]>(STORAGE_KEYS.PAGOS, []);
  },
  savePagos(ps: PagoRegistro[]): void {
    writeStorage(STORAGE_KEYS.PAGOS, ps);
  },

  getAuditoria(): AuditLog[] {
    return readStorage<AuditLog[]>(STORAGE_KEYS.AUDITORIA, []);
  },
  saveAuditoria(as: AuditLog[]): void {
    writeStorage(STORAGE_KEYS.AUDITORIA, as);
  },

  getLogs(): ErrorLog[] {
    return readStorage<ErrorLog[]>(STORAGE_KEYS.LOGS, []);
  },
  saveLogs(ls: ErrorLog[]): void {
    writeStorage(STORAGE_KEYS.LOGS, ls);
  },

  getCurrentUser(): User | null {
    return readStorage<User | null>(STORAGE_KEYS.USER_SESSION, null);
  },
  saveCurrentUser(u: User | null): void {
    writeStorage(STORAGE_KEYS.USER_SESSION, u);
  },
};

// =================== LOGGING & AUDIT ===================

export function registrarAuditoria(usuario: string, accion: string, tabla: string, detalle: string) {
  try {
    const logs = MandaoStorage.getAuditoria();
    const newEntry: AuditLog = {
      id: 'AUD-' + Math.random().toString(36).slice(2, 9),
      usuario,
      accion,
      tabla,
      fecha: new Date().toISOString(),
      detalle,
    };
    logs.unshift(newEntry);
    if (logs.length > 500) logs.pop();
    MandaoStorage.saveAuditoria(logs);
  } catch (err) {
    console.error('Audit log failed', err);
  }
}

export function logError(funcion: string, mensaje: string, stack?: string) {
  try {
    const logs = MandaoStorage.getLogs();
    const newEntry: ErrorLog = {
      id: 'ERR-' + Math.random().toString(36).slice(2, 9),
      fecha: new Date().toISOString(),
      funcion,
      mensaje,
      stack,
    };
    logs.unshift(newEntry);
    if (logs.length > 200) logs.pop();
    MandaoStorage.saveLogs(logs);
  } catch (err) {
    console.error('Error logging failed', err);
  }
}

// =================== GEOLOCATION & DISTANCES ===================

export function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function validarEnZonaCobertura(lat: number, lng: number, cfg?: ConfigGlobal): { dentro: boolean; distanciaKm: number } {
  const config = cfg || MandaoStorage.getConfig();
  const dist = calcularDistanciaKm(config.lat_centro, config.lng_centro, lat, lng);
  return {
    dentro: dist <= (config.radio_km || 8),
    distanciaKm: dist,
  };
}

export function calcularTiempoEstimado(distanciaKm: number): string {
  // 5 min preparación + (distancia_km * 3 min/km)
  const totalMin = Math.round(5 + distanciaKm * 3);
  const minMin = Math.max(10, totalMin - 5);
  const maxMin = totalMin + 5;
  return `${minMin}-${maxMin} min`;
}

// =================== MASTER DATA FETCH ===================

export async function getDatosCompletos(cedulaConsulta?: string) {
  const cfg = MandaoStorage.getConfig();
  const comercios = MandaoStorage.getComercios();
  const productos = MandaoStorage.getProductos();
  const repartidores = MandaoStorage.getRepartidores();
  const pedidos = MandaoStorage.getPedidos();
  const vetados = MandaoStorage.getVetados();
  const usuarios = MandaoStorage.getUsuarios();

  // Attach products to comercios
  const comerciosConProds = comercios.map(c => ({
    ...c,
    productos: productos.filter(p => p.id_comercio === c.id_comercio),
  }));

  // Weekly Leaderboard: sorted by viajes_semana desc
  const rankingRepartidores = [...repartidores]
    .filter(r => r.activo !== false)
    .sort((a, b) => (b.viajes_semana || 0) - (a.viajes_semana || 0))
    .slice(0, 3);

  let usuario: User | undefined;
  let suspendido = false;
  let motivoSuspension = '';

  if (cedulaConsulta) {
    const cN = normalizarCedula(cedulaConsulta);
    usuario = usuarios.find(u => normalizarCedula(u.cedula) === cN);
    if (usuario && usuario.suspendido_hasta) {
      if (new Date(usuario.suspendido_hasta).getTime() > Date.now()) {
        suspendido = true;
        motivoSuspension = usuario.motivo_ultima_suspension || 'Tu cuenta está temporalmente suspendida por acumulación de sanciones.';
      }
    }
  }

  return {
    success: true,
    config: cfg,
    comercios: comerciosConProds,
    repartidores,
    rankingRepartidores,
    pedidos,
    vetados,
    usuario,
    suspendido,
    motivoSuspension,
  };
}

// =================== AUTHENTICATION & USERS ===================

export async function loginUsuario(cedula: string, pin: string) {
  const cN = normalizarCedula(cedula);
  const usuarios = MandaoStorage.getUsuarios();
  const user = usuarios.find(u => normalizarCedula(u.cedula) === cN);

  if (!user) {
    return { success: false, error: 'Usuario no registrado. Regístrate para continuar.' };
  }

  if (user.suspendido_hasta && new Date(user.suspendido_hasta).getTime() > Date.now()) {
    return {
      success: false,
      error: `Cuenta suspendida hasta ${new Date(user.suspendido_hasta).toLocaleDateString()}. Motivo: ${user.motivo_ultima_suspension || 'Sanción disciplinaria.'}`,
    };
  }

  if (user.pin && String(user.pin).trim() !== String(pin).trim()) {
    return { success: false, error: 'PIN de acceso incorrecto.' };
  }

  user.ultimo_acceso = new Date().toISOString();
  MandaoStorage.saveUsuarios(usuarios);
  MandaoStorage.saveCurrentUser(user);

  return {
    success: true,
    usuario: user,
  };
}

export async function registrarCliente(data: {
  cedula: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  direccion: string;
  pin?: string;
  lat?: number | string;
  lng?: number | string;
}) {
  const cN = normalizarCedula(data.cedula);
  if (!cN) return { success: false, error: 'Cédula requerida' };
  if (!data.nombre.trim() || !data.apellido.trim()) return { success: false, error: 'Nombre y apellido requeridos' };
  if (!data.telefono.trim()) return { success: false, error: 'Teléfono requerido' };
  if (data.email && !validarEmail(data.email)) return { success: false, error: 'Correo electrónico inválido' };

  const usuarios = MandaoStorage.getUsuarios();
  let user = usuarios.find(u => normalizarCedula(u.cedula) === cN);

  if (user) {
    user.nombre = data.nombre.trim();
    user.apellido = data.apellido.trim();
    user.telefono = data.telefono.trim();
    user.email = data.email.trim();
    user.direccion_guardada = data.direccion.trim();
    if (data.pin) user.pin = data.pin;
    if (data.lat) user.lat_usuario = Number(data.lat);
    if (data.lng) user.lng_usuario = Number(data.lng);
  } else {
    user = {
      cedula: cN,
      pin: data.pin || '1234',
      rol: 'cliente',
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      telefono: data.telefono.trim(),
      email: data.email.trim(),
      direccion_guardada: data.direccion.trim(),
      lat_usuario: data.lat ? Number(data.lat) : undefined,
      lng_usuario: data.lng ? Number(data.lng) : undefined,
      pedidos_completados: 0,
      strikes: 0,
      fecha_registro: new Date().toISOString(),
    };
    usuarios.push(user);
  }

  MandaoStorage.saveUsuarios(usuarios);
  MandaoStorage.saveCurrentUser(user);
  registrarAuditoria(cN, 'REGISTER_CLIENT', 'USUARIOS', `Registro cliente ${data.nombre} ${data.apellido}`);

  return { success: true, usuario: user };
}

export async function actualizarDatosCliente(data: {
  cedula: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  lat?: number | string;
  lng?: number | string;
  tutorial_visto?: boolean;
}) {
  const cN = normalizarCedula(data.cedula);
  const usuarios = MandaoStorage.getUsuarios();
  const user = usuarios.find(u => normalizarCedula(u.cedula) === cN);
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  if (data.nombre) user.nombre = data.nombre.trim();
  if (data.apellido) user.apellido = data.apellido.trim();
  if (data.telefono) user.telefono = data.telefono.trim();
  if (data.email) user.email = data.email.trim();
  if (data.direccion) user.direccion_guardada = data.direccion.trim();
  if (data.lat) user.lat_usuario = Number(data.lat);
  if (data.lng) user.lng_usuario = Number(data.lng);
  if (data.tutorial_visto !== undefined) user.tutorial_visto = data.tutorial_visto;

  MandaoStorage.saveUsuarios(usuarios);
  MandaoStorage.saveCurrentUser(user);
  return { success: true, usuario: user };
}

// =================== PARTNER APPLICATIONS ===================

export async function solicitarRegistroSocio(tipo: 'comercio' | 'repartidor', data: Record<string, unknown>) {
  const cN = normalizarCedula(String(data.cedula || ''));
  if (!cN) return { success: false, error: 'Cédula requerida' };

  const solicitudes = MandaoStorage.getSolicitudes();
  const solId = 'SOL-' + Math.random().toString(36).slice(2, 9).toUpperCase();

  const nueva: SolicitudSocio = {
    id_solicitud: solId,
    tipo,
    cedula: cN,
    nombre: String(data.nombre || ''),
    apellido: String(data.apellido || ''),
    telefono: String(data.telefono || ''),
    email: String(data.email || ''),
    datos_json: JSON.stringify(data),
    fecha_solicitud: new Date().toISOString(),
    estado: 'pendiente',
  };

  solicitudes.unshift(nueva);
  MandaoStorage.saveSolicitudes(solicitudes);
  registrarAuditoria(cN, 'SOLICITUD_SOCIO', 'SOLICITUDES', `Tipo: ${tipo}`);

  return { success: true, id_solicitud: solId };
}

export async function aprobarSolicitud(idSolicitud: string, adminCedula = 'V-00000000') {
  const solicitudes = MandaoStorage.getSolicitudes();
  const s = solicitudes.find(x => x.id_solicitud === idSolicitud);
  if (!s) return { success: false, error: 'Solicitud no encontrada' };

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(s.datos_json || '{}');
  } catch {
    payload = {};
  }

  const usuarios = MandaoStorage.getUsuarios();
  const cN = normalizarCedula(s.cedula);
  let user = usuarios.find(u => normalizarCedula(u.cedula) === cN);

  if (s.tipo === 'comercio') {
    const comercios = MandaoStorage.getComercios();
    const idC = 'COM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const nuevoComercio: Comercio = {
      id_comercio: idC,
      nombre: String(payload.nombre_comercio || payload.nombre || 'Nuevo Comercio'),
      categoria: String(payload.categoria || 'Comidas Rápidas'),
      direccion: String(payload.direccion || 'Papelón'),
      lat_comercio: payload.lat ? Number(payload.lat) : undefined,
      lng_comercio: payload.lng ? Number(payload.lng) : undefined,
      telefono: s.telefono,
      banco_pago_movil: String(payload.banco_pago_movil || 'Banco de Venezuela (0102)'),
      telefono_pago_movil: String(payload.telefono_pago_movil || s.telefono),
      cedula_pago_movil: String(payload.cedula_pago_movil || s.cedula),
      titular_pago_movil: String(payload.titular_pago_movil || `${s.nombre} ${s.apellido}`),
      delivery_gratis: false,
      abierto: true,
      tiempo_estimado: '20-30 min',
      logo_emoji: String(payload.logo_emoji || '🏪'),
      patrocinado: false,
      oferta_flash: false,
      calificacion: 0,
      total_calificaciones: 0,
      activo: true,
      fecha_registro: new Date().toISOString(),
    };
    comercios.push(nuevoComercio);
    MandaoStorage.saveComercios(comercios);

    if (user) {
      user.rol = 'comercio';
      user.es_comercio = true;
      user.id_referencia = idC;
    } else {
      user = {
        cedula: cN,
        pin: '1234',
        rol: 'comercio',
        es_comercio: true,
        nombre: s.nombre,
        apellido: s.apellido,
        telefono: s.telefono,
        email: s.email,
        id_referencia: idC,
        strikes: 0,
        fecha_registro: new Date().toISOString(),
      };
      usuarios.push(user);
    }
  } else {
    // Repartidor
    const repartidores = MandaoStorage.getRepartidores();
    const idR = 'REP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const nuevoRepartidor: Repartidor = {
      id_repartidor: idR,
      nombre: `${s.nombre} ${s.apellido}`.trim(),
      telefono: s.telefono,
      email: s.email,
      vehiculo: String(payload.vehiculo || 'Bicicleta'),
      en_servicio: true,
      ganancias_hoy: 0,
      viajes_hoy: 0,
      viajes_semana: 0,
      semana_actual: getSemanaActual(),
      viajes_totales: 0,
      calificacion: 0,
      total_calificaciones: 0,
      activo: true,
      lat_actual: payload.lat ? Number(payload.lat) : undefined,
      lng_actual: payload.lng ? Number(payload.lng) : undefined,
      fecha_registro: new Date().toISOString(),
    };
    repartidores.push(nuevoRepartidor);
    MandaoStorage.saveRepartidores(repartidores);

    if (user) {
      user.rol = 'repartidor';
      user.es_repartidor = true;
      user.id_referencia = idR;
    } else {
      user = {
        cedula: cN,
        pin: '1234',
        rol: 'repartidor',
        es_repartidor: true,
        nombre: s.nombre,
        apellido: s.apellido,
        telefono: s.telefono,
        email: s.email,
        id_referencia: idR,
        strikes: 0,
        fecha_registro: new Date().toISOString(),
      };
      usuarios.push(user);
    }
  }

  s.estado = 'aprobado';
  s.procesada_fecha = new Date().toISOString();
  MandaoStorage.saveSolicitudes(solicitudes);
  MandaoStorage.saveUsuarios(usuarios);
  registrarAuditoria(adminCedula, 'APROBAR_SOLICITUD', 'SOLICITUDES', `ID: ${idSolicitud}`);

  return { success: true };
}

export async function rechazarSolicitud(idSolicitud: string, motivo: string, adminCedula = 'V-00000000') {
  const solicitudes = MandaoStorage.getSolicitudes();
  const s = solicitudes.find(x => x.id_solicitud === idSolicitud);
  if (!s) return { success: false, error: 'Solicitud no encontrada' };

  s.estado = 'rechazado';
  s.motivo_rechazo = motivo;
  s.procesada_fecha = new Date().toISOString();
  MandaoStorage.saveSolicitudes(solicitudes);
  registrarAuditoria(adminCedula, 'RECHAZAR_SOLICITUD', 'SOLICITUDES', `ID: ${idSolicitud}. Motivo: ${motivo}`);

  return { success: true };
}

export async function eliminarSolicitud(idSolicitud: string, adminCedula = 'V-00000000') {
  let solicitudes = MandaoStorage.getSolicitudes();
  solicitudes = solicitudes.filter(x => x.id_solicitud !== idSolicitud);
  MandaoStorage.saveSolicitudes(solicitudes);
  registrarAuditoria(adminCedula, 'ELIMINAR_SOLICITUD', 'SOLICITUDES', `ID: ${idSolicitud}`);
  return { success: true };
}

// =================== ORDER LIFECYCLE ===================

export async function crearPedido(data: {
  cliente_cedula: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  referencia_direccion?: string;
  lat_cliente: number;
  lng_cliente: number;
  comercio_id: string;
  comercio_nombre: string;
  detalle_items: string;
  subtotal: number;
  tarifa_envio: number;
  propina: number;
  total: number;
  tipo_vehiculo?: string;
  metodo_pago?: string;
  referencia_pago: string;
  nota_cliente?: string;
}) {
  const cN = normalizarCedula(data.cliente_cedula);
  if (!cN) return { success: false, error: 'Cédula de cliente requerida' };

  // Check if client is suspended
  const usuarios = MandaoStorage.getUsuarios();
  const user = usuarios.find(u => normalizarCedula(u.cedula) === cN);
  if (user?.suspendido_hasta && new Date(user.suspendido_hasta).getTime() > Date.now()) {
    return { success: false, error: 'Tu cuenta está suspendida por incumplimiento de términos.' };
  }

  // Check if client is active vetoed by store
  const vetados = MandaoStorage.getVetados();
  const veto = vetados.find(v => normalizarCedula(v.cedula_cliente) === cN && (!v.id_comercio || v.id_comercio === data.comercio_id));
  if (veto && new Date(veto.fecha_fin_veto).getTime() > Date.now()) {
    return {
      success: false,
      error: `No puedes ordenar de este comercio hasta el ${new Date(veto.fecha_fin_veto).toLocaleDateString()}. Motivo: ${veto.motivo_reporte}`,
    };
  }

  // Validate GPS coverage
  const cfg = MandaoStorage.getConfig();
  if (data.lat_cliente && data.lng_cliente) {
    const cov = validarEnZonaCobertura(data.lat_cliente, data.lng_cliente, cfg);
    if (!cov.dentro) {
      return {
        success: false,
        error: `Tu ubicación está a ${cov.distanciaKm} km del centro. Nuestro radio de cobertura actual es de ${cfg.radio_km} km. ¡Pronto llegaremos a tu zona!`,
      };
    }
  } else {
    return { success: false, error: 'La ubicación GPS es obligatoria para garantizar la entrega.' };
  }

  // Generate 4-digit PIN (1000 - 9999)
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  const pedId = 'PED-' + Math.floor(1000 + Math.random() * 9000).toString();

  // Find store GPS
  const comercios = MandaoStorage.getComercios();
  const com = comercios.find(c => c.id_comercio === data.comercio_id);

  const nuevoPedido: Pedido = {
    id_pedido: pedId,
    fecha_hora: new Date().toISOString(),
    cliente_cedula: cN,
    cliente_nombre: data.cliente_nombre,
    cliente_telefono: data.cliente_telefono,
    cliente_direccion: data.cliente_direccion,
    referencia_direccion: data.referencia_direccion || '',
    lat_cliente: data.lat_cliente,
    lng_cliente: data.lng_cliente,
    comercio_id: data.comercio_id,
    comercio_nombre: data.comercio_nombre,
    lat_comercio: com?.lat_comercio,
    lng_comercio: com?.lng_comercio,
    detalle_items: data.detalle_items,
    subtotal: data.subtotal,
    tarifa_envio: data.tarifa_envio,
    propina: data.propina,
    total: data.total,
    tipo_vehiculo: data.tipo_vehiculo || 'Bicicleta',
    metodo_pago: data.metodo_pago || 'Pago Móvil',
    referencia_pago: data.referencia_pago,
    estado: 'Pendiente',
    pin_entrega: pin,
    nota_cliente: data.nota_cliente,
    mensajes_chat: [],
  };

  const pedidos = MandaoStorage.getPedidos();
  pedidos.unshift(nuevoPedido);
  MandaoStorage.savePedidos(pedidos);

  // Update client saved address
  if (user) {
    user.direccion_guardada = data.cliente_direccion;
    user.lat_usuario = data.lat_cliente;
    user.lng_usuario = data.lng_cliente;
    MandaoStorage.saveUsuarios(usuarios);
  }

  registrarAuditoria(cN, 'CREAR_PEDIDO', 'PEDIDOS', `Orden #${pedId} para ${data.comercio_nombre} - Total: $${data.total}`);

  return {
    success: true,
    id_pedido: pedId,
    pin_entrega: pin,
    pedido: nuevoPedido,
  };
}

export async function validarPagoYEnviarACocina(pedidoId: string) {
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (!p) return { success: false, error: 'Pedido no encontrado' };

  p.estado = 'Preparando';
  MandaoStorage.savePedidos(pedidos);
  registrarAuditoria(p.comercio_id, 'VALIDAR_PAGO', 'PEDIDOS', `Orden #${pedidoId} en preparación`);
  return { success: true };
}

export async function marcarListoParaRetiro(pedidoId: string) {
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (!p) return { success: false, error: 'Pedido no encontrado' };

  p.estado = 'Listo';
  p.entregado_a_repartidor = new Date().toISOString();
  p.hora_listo = new Date().toISOString();
  MandaoStorage.savePedidos(pedidos);
  registrarAuditoria(p.comercio_id, 'MARCAR_LISTO', 'PEDIDOS', `Orden #${pedidoId} lista`);
  return { success: true };
}

export async function tomarPedidoRepartidor(pedidoId: string, repartidorId: string, repartidorNombre: string) {
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (!p) return { success: false, error: 'Pedido no encontrado' };

  const repartidores = MandaoStorage.getRepartidores();
  const rep = repartidores.find(r => r.id_repartidor === repartidorId);

  p.repartidor_id = repartidorId;
  p.repartidor_asignado = repartidorNombre;
  p.lat_repartidor = rep?.lat_actual;
  p.lng_repartidor = rep?.lng_actual;
  p.estado = 'En camino';

  MandaoStorage.savePedidos(pedidos);
  registrarAuditoria(repartidorId, 'TOMAR_PEDIDO', 'PEDIDOS', `Repartidor ${repartidorNombre} tomó orden #${pedidoId}`);
  return { success: true };
}

export async function marcarLlego(pedidoId: string, repartidorId: string) {
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (!p) return { success: false, error: 'Pedido no encontrado' };

  p.estado = 'Llegó';
  p.hora_llego = new Date().toISOString();
  MandaoStorage.savePedidos(pedidos);
  registrarAuditoria(repartidorId, 'LLEGA_REPARTIDOR', 'PEDIDOS', `Repartidor llegó con orden #${pedidoId}`);
  return { success: true };
}

export async function validarPinYEntregar(pedidoId: string, pin: string) {
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (!p) return { success: false, error: 'Pedido no encontrado' };

  if (String(p.pin_entrega).trim() !== String(pin).trim()) {
    return { success: false, error: 'PIN incorrecto. Pide al cliente que verifique el código en su pantalla.' };
  }

  p.estado = 'Entregado';

  // Financial and stats updates
  const cfg = MandaoStorage.getConfig();
  const pctAdmin = cfg.porcentaje_admin || 0.15;
  const pagoNeto = (Number(p.tarifa_envio || 1) + Number(p.propina || 0)) * (1 - pctAdmin);

  // Update Repartidor stats
  if (p.repartidor_id) {
    const repartidores = MandaoStorage.getRepartidores();
    const r = repartidores.find(x => x.id_repartidor === p.repartidor_id);
    if (r) {
      r.ganancias_hoy = (Number(r.ganancias_hoy) || 0) + pagoNeto;
      r.viajes_hoy = (Number(r.viajes_hoy) || 0) + 1;
      r.viajes_totales = (Number(r.viajes_totales) || 0) + 1;

      // Update weekly count
      const curSemana = getSemanaActual();
      if (r.semana_actual !== curSemana) {
        r.semana_actual = curSemana;
        r.viajes_semana = 1;
      } else {
        r.viajes_semana = (Number(r.viajes_semana) || 0) + 1;
      }
      MandaoStorage.saveRepartidores(repartidores);
    }
  }

  // Update client completed count
  const usuarios = MandaoStorage.getUsuarios();
  const u = usuarios.find(x => normalizarCedula(x.cedula) === normalizarCedula(p.cliente_cedula));
  if (u) {
    u.pedidos_completados = (Number(u.pedidos_completados) || 0) + 1;
    MandaoStorage.saveUsuarios(usuarios);
  }

  MandaoStorage.savePedidos(pedidos);
  registrarAuditoria(p.repartidor_id || 'RIDER', 'ENTREGAR_ORDEN', 'PEDIDOS', `Orden #${pedidoId} entregada con éxito`);

  return { success: true };
}

export async function marcarEntregadoPorComercio(pedidoId: string) {
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (!p) return { success: false, error: 'Pedido no encontrado' };

  p.estado = 'Entregado';
  p.repartidor_asignado = 'Despachado por Comercio';

  const usuarios = MandaoStorage.getUsuarios();
  const u = usuarios.find(x => normalizarCedula(x.cedula) === normalizarCedula(p.cliente_cedula));
  if (u) {
    u.pedidos_completados = (Number(u.pedidos_completados) || 0) + 1;
    MandaoStorage.saveUsuarios(usuarios);
  }

  MandaoStorage.savePedidos(pedidos);
  registrarAuditoria(p.comercio_id, 'ENTREGADO_POR_COMERCIO', 'PEDIDOS', `Orden #${pedidoId} despachada por el comercio`);
  return { success: true };
}

// [68] Cancelaciones según rol
export async function cancelarPedidoConMotivo(
  pedidoId: string,
  canceladoPor: string,
  motivo: string,
  rol: 'cliente' | 'comercio' | 'repartidor' | 'admin'
) {
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (!p) return { success: false, error: 'Pedido no encontrado' };

  // Rule 68 validation:
  if (rol === 'cliente') {
    if (p.estado !== 'Pendiente') {
      return { success: false, error: 'Solo puedes cancelar tu pedido mientras esté en validación de pago.' };
    }
  } else if (rol === 'comercio') {
    if (p.estado === 'En camino' || p.estado === 'Llegó' || p.estado === 'Entregado') {
      return { success: false, error: 'No puedes cancelar un pedido que ya salió en reparto.' };
    }
  } else if (rol === 'repartidor') {
    if (!motivo || motivo.trim().length < 5) {
      return { success: false, error: 'Debes indicar el motivo de la emergencia para cancelar el viaje.' };
    }
  }

  p.estado = 'Cancelado';
  p.cancelado_por = `${rol.toUpperCase()} (${canceladoPor})`;
  p.motivo_cancelacion = motivo;
  MandaoStorage.savePedidos(pedidos);

  registrarAuditoria(canceladoPor, 'CANCELAR_PEDIDO', 'PEDIDOS', `Orden #${pedidoId} cancelada por ${rol}. Motivo: ${motivo}`);

  return { success: true };
}

export async function eliminarPedido(pedidoId: string, adminCedula = 'V-00000000') {
  let pedidos = MandaoStorage.getPedidos();
  pedidos = pedidos.filter(x => x.id_pedido !== pedidoId);
  MandaoStorage.savePedidos(pedidos);
  registrarAuditoria(adminCedula, 'ELIMINAR_PEDIDO', 'PEDIDOS', `Orden #${pedidoId} eliminada`);
  return { success: true };
}

// [74] Chat en tiempo real simulado
export async function enviarMensajeChat(pedidoId: string, remitente: 'cliente' | 'repartidor', texto: string) {
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (!p) return { success: false, error: 'Pedido no encontrado' };

  if (!p.mensajes_chat) p.mensajes_chat = [];
  const msg: ChatMessage = {
    id: 'MSG-' + Math.random().toString(36).slice(2, 9),
    remitente,
    texto: texto.slice(0, 200),
    timestamp: new Date().toISOString(),
  };
  p.mensajes_chat.push(msg);
  MandaoStorage.savePedidos(pedidos);
  return { success: true, mensaje: msg };
}

// =================== RATINGS & FRAUD ===================

export async function calificarPedido(pedidoId: string, califComercio: number, califRepartidor?: number) {
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (!p) return { success: false, error: 'Pedido no encontrado' };

  p.calificacion_comercio = califComercio;
  if (califRepartidor) p.calificacion_repartidor = califRepartidor;

  // Update Comercio rating
  const comercios = MandaoStorage.getComercios();
  const c = comercios.find(x => x.id_comercio === p.comercio_id);
  if (c) {
    const curTotal = c.total_calificaciones || 0;
    const curCalif = c.calificacion || 0;
    c.calificacion = Number(((curCalif * curTotal + califComercio) / (curTotal + 1)).toFixed(2));
    c.total_calificaciones = curTotal + 1;
    MandaoStorage.saveComercios(comercios);
  }

  // Update Repartidor rating
  if (califRepartidor && p.repartidor_id) {
    const repartidores = MandaoStorage.getRepartidores();
    const r = repartidores.find(x => x.id_repartidor === p.repartidor_id);
    if (r) {
      const curTotal = r.total_calificaciones || 0;
      const curCalif = r.calificacion || 0;
      r.calificacion = Number(((curCalif * curTotal + califRepartidor) / (curTotal + 1)).toFixed(2));
      r.total_calificaciones = curTotal + 1;
      MandaoStorage.saveRepartidores(repartidores);
    }
  }

  MandaoStorage.savePedidos(pedidos);
  registrarAuditoria(p.cliente_cedula, 'CALIFICAR_PEDIDO', 'PEDIDOS', `Orden #${pedidoId} calificada (Comercio: ${califComercio}, Repartidor: ${califRepartidor})`);

  return { success: true };
}

export async function reportarFraude(pedidoId: string, clienteCedula: string, motivo: string, comercioId: string) {
  const cN = normalizarCedula(clienteCedula);
  const pedidos = MandaoStorage.getPedidos();
  const p = pedidos.find(x => x.id_pedido === pedidoId);
  if (p) {
    p.estado = 'cancelado_fraude';
    p.motivo_cancelacion = motivo;
    MandaoStorage.savePedidos(pedidos);
  }

  const cfg = MandaoStorage.getConfig();
  const diasVeto = cfg.dias_veto || 3;
  const fechaFin = new Date(Date.now() + diasVeto * 86400000).toISOString();

  const vetados = MandaoStorage.getVetados();
  vetados.push({
    cedula_cliente: cN,
    id_comercio: comercioId,
    fecha_fin_veto: fechaFin,
    motivo_reporte: motivo,
  });
  MandaoStorage.saveVetados(vetados);

  // Add strike to user
  const usuarios = MandaoStorage.getUsuarios();
  const u = usuarios.find(x => normalizarCedula(x.cedula) === cN);
  if (u) {
    u.strikes = (u.strikes || 0) + 1;
    if (u.strikes >= 5) {
      u.suspendido_hasta = '9999-12-31';
      u.motivo_ultima_suspension = 'Suspensión permanente por 5 strikes de fraude/mal comportamiento.';
    } else if (u.strikes >= 3) {
      u.suspendido_hasta = new Date(Date.now() + 7 * 86400000).toISOString();
      u.motivo_ultima_suspension = 'Suspensión de 7 días por acumular 3 strikes.';
    }
    MandaoStorage.saveUsuarios(usuarios);
  }

  registrarAuditoria(comercioId, 'REPORTAR_FRAUDE', 'VETADOS', `Cliente ${cN} reportado por fraude en #${pedidoId}`);

  return { success: true };
}

export async function quitarVeto(cedula: string, comercioId?: string, adminCedula = 'V-00000000') {
  const cN = normalizarCedula(cedula);
  let vetados = MandaoStorage.getVetados();
  if (comercioId) {
    vetados = vetados.filter(x => !(normalizarCedula(x.cedula_cliente) === cN && x.id_comercio === comercioId));
  } else {
    vetados = vetados.filter(x => normalizarCedula(x.cedula_cliente) !== cN);
  }
  MandaoStorage.saveVetados(vetados);
  registrarAuditoria(adminCedula, 'QUITAR_VETO', 'VETADOS', `Cedula ${cN}`);
  return { success: true };
}

// =================== CROSS-REPORTS & 3 STRIKES [80], [81] ===================

export async function crearReporteCruzado(data: {
  tipo_reportante: 'cliente' | 'comercio' | 'repartidor';
  id_reportante: string;
  nombre_reportante: string;
  tipo_reportado: 'cliente' | 'comercio' | 'repartidor';
  id_reportado: string;
  nombre_reportado: string;
  motivo: string;
  detalle?: string;
  pedido_id?: string;
}) {
  const reportes = MandaoStorage.getReportes();
  const nuevo: ReporteCruzado = {
    id: 'REP-' + Math.random().toString(36).slice(2, 9).toUpperCase(),
    ...data,
    fecha: new Date().toISOString(),
    estado: 'pendiente',
  };
  reportes.unshift(nuevo);
  MandaoStorage.saveReportes(reportes);
  registrarAuditoria(data.id_reportante, 'CREAR_REPORTE', 'REPORTES', `Reportó a ${data.tipo_reportado}: ${data.motivo}`);
  return { success: true, reporte: nuevo };
}

export async function aprobarSancionReporte(reporteId: string, adminCedula = 'V-00000000') {
  const reportes = MandaoStorage.getReportes();
  const rep = reportes.find(r => r.id === reporteId);
  if (!rep) return { success: false, error: 'Reporte no encontrado' };

  rep.estado = 'aplicado';
  MandaoStorage.saveReportes(reportes);

  // Apply strike to reported user
  const usuarios = MandaoStorage.getUsuarios();
  const targetId = normalizarCedula(rep.id_reportado);
  const u = usuarios.find(x => normalizarCedula(x.cedula) === targetId || x.id_referencia === rep.id_reportado);

  if (u) {
    u.strikes = (u.strikes || 0) + 1;
    if (u.strikes >= 5) {
      u.suspendido_hasta = '9999-12-31';
      u.motivo_ultima_suspension = `Suspensión definitiva tras 5 strikes. Último motivo: ${rep.motivo}`;
    } else if (u.strikes >= 3) {
      u.suspendido_hasta = new Date(Date.now() + 7 * 86400000).toISOString();
      u.motivo_ultima_suspension = `Suspensión de 7 días tras 3 strikes. Último motivo: ${rep.motivo}`;
    }
    MandaoStorage.saveUsuarios(usuarios);
  }

  registrarAuditoria(adminCedula, 'APROBAR_SANCION', 'REPORTES', `Strike aplicado a ${rep.nombre_reportado} por reporte ${reporteId}`);
  return { success: true };
}

export async function descartarReporte(reporteId: string, adminCedula = 'V-00000000') {
  const reportes = MandaoStorage.getReportes();
  const rep = reportes.find(r => r.id === reporteId);
  if (!rep) return { success: false, error: 'Reporte no encontrado' };

  rep.estado = 'descartado';
  MandaoStorage.saveReportes(reportes);
  registrarAuditoria(adminCedula, 'DESCARTAR_REPORTE', 'REPORTES', `Reporte ${reporteId} descartado`);
  return { success: true };
}

// =================== SOS EMERGENCIES [85] ===================

export async function registrarEventoSOS(data: {
  rol: 'cliente' | 'comercio' | 'repartidor' | 'admin';
  usuario_id: string;
  nombre: string;
  motivo: string;
  pedido_id?: string;
}) {
  const sosList = MandaoStorage.getSOS();
  const reg: RegistroSOS = {
    id: 'SOS-' + Math.random().toString(36).slice(2, 9).toUpperCase(),
    ...data,
    fecha: new Date().toISOString(),
    estado: 'pendiente',
  };
  sosList.unshift(reg);
  MandaoStorage.saveSOS(sosList);
  registrarAuditoria(data.usuario_id, 'BOTON_SOS', 'SOS', `Emergencia ${data.rol}: ${data.motivo}`);
  return { success: true, id_sos: reg.id };
}

// =================== CASH CLOSURES & PAYOUTS [76] - [79] ===================

export async function marcarPagoComercio(comercioId: string, nombre: string, monto: number, adminCedula = 'V-00000000', notas = '') {
  const pagos = MandaoStorage.getPagos();
  const p: PagoRegistro = {
    id: 'PAG-C-' + Math.random().toString(36).slice(2, 9),
    tipo: 'comercio',
    entidad_id: comercioId,
    nombre,
    monto,
    fecha: new Date().toISOString(),
    admin_cedula: adminCedula,
    notas,
  };
  pagos.unshift(p);
  MandaoStorage.savePagos(pagos);
  registrarAuditoria(adminCedula, 'PAGO_COMERCIO', 'PAGOS', `Comercio ${nombre} pagó $${monto}`);
  return { success: true };
}

export async function marcarPagoRepartidor(repartidorId: string, nombre: string, monto: number, adminCedula = 'V-00000000', notas = '') {
  const pagos = MandaoStorage.getPagos();
  const p: PagoRegistro = {
    id: 'PAG-R-' + Math.random().toString(36).slice(2, 9),
    tipo: 'repartidor',
    entidad_id: repartidorId,
    nombre,
    monto,
    fecha: new Date().toISOString(),
    admin_cedula: adminCedula,
    notas,
  };
  pagos.unshift(p);
  MandaoStorage.savePagos(pagos);

  // Reset repartidor ganancias_hoy
  const repartidores = MandaoStorage.getRepartidores();
  const r = repartidores.find(x => x.id_repartidor === repartidorId);
  if (r) {
    r.ganancias_hoy = 0;
    r.viajes_hoy = 0;
    MandaoStorage.saveRepartidores(repartidores);
  }

  registrarAuditoria(adminCedula, 'PAGO_REPARTIDOR', 'PAGOS', `Liquidación a ${nombre}: $${monto}`);
  return { success: true };
}

export async function ejecutarCierreDiario(adminCedula = 'V-00000000') {
  const pedidos = MandaoStorage.getPedidos();
  const cfg = MandaoStorage.getConfig();
  const pct = cfg.porcentaje_admin || 0.15;

  const entregados = pedidos.filter(p => p.estado === 'Entregado');
  const totalVentas = entregados.reduce((sum, p) => sum + (Number(p.subtotal) || 0), 0);
  const totalTarifas = entregados.reduce((sum, p) => sum + (Number(p.tarifa_envio) || 0), 0);
  const totalPropinas = entregados.reduce((sum, p) => sum + (Number(p.propina) || 0), 0);
  const gananciaAdmin = (totalTarifas + totalPropinas) * pct;

  const cierre: CierreCaja = {
    id: 'CIE-' + new Date().toISOString().slice(0, 10),
    fecha: new Date().toISOString(),
    total_ventas: totalVentas,
    ganancia_admin: gananciaAdmin,
    total_propinas: totalPropinas,
    total_tarifas: totalTarifas,
    pedidos_entregados: entregados.length,
  };

  const cierres = MandaoStorage.getCierres();
  cierres.unshift(cierre);
  MandaoStorage.saveCierres(cierres);

  // Reset daily counters
  const repartidores = MandaoStorage.getRepartidores();
  repartidores.forEach(r => {
    r.ganancias_hoy = 0;
    r.viajes_hoy = 0;
  });
  MandaoStorage.saveRepartidores(repartidores);

  registrarAuditoria(adminCedula, 'CIERRE_DIARIO', 'CIERRES', `Cierre ejecutado. Ventas: $${totalVentas}, Ganancia Admin: $${gananciaAdmin}`);
  return { success: true, cierre };
}

// Export CSV for Excel [78], [89]
export function descargarReporteCSV(nombreArchivo: string, encabezados: string[], filas: (string | number)[][]) {
  const lines = [encabezados.join(';')];
  filas.forEach(f => {
    lines.push(f.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'));
  });
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${nombreArchivo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =================== STORE PRODUCTS & CONFIG ===================

export async function crearProductoComercio(comercioId: string, data: {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  foto_emoji: string;
}) {
  const productos = MandaoStorage.getProductos();
  const idProd = 'PROD-' + Math.random().toString(36).slice(2, 9).toUpperCase();

  const nuevo: Producto = {
    id_producto: idProd,
    id_comercio: comercioId,
    nombre: data.nombre.trim(),
    descripcion: data.descripcion.trim(),
    precio: Math.max(0.1, Number(data.precio) || 1),
    categoria: data.categoria.trim() || 'Comidas Rápidas',
    foto_emoji: data.foto_emoji || '🍽️',
    disponible: true,
    veces_vendido: 0,
  };

  productos.push(nuevo);
  MandaoStorage.saveProductos(productos);
  registrarAuditoria(comercioId, 'CREAR_PRODUCTO', 'PRODUCTOS', `Plato: ${data.nombre}`);
  return { success: true, producto: nuevo };
}

export async function editarProductoComercio(productoId: string, data: Partial<Producto>) {
  const productos = MandaoStorage.getProductos();
  const prod = productos.find(x => x.id_producto === productoId);
  if (!prod) return { success: false, error: 'Producto no encontrado' };

  if (data.nombre) prod.nombre = data.nombre.trim();
  if (data.descripcion !== undefined) prod.descripcion = data.descripcion.trim();
  if (data.precio !== undefined) prod.precio = Math.max(0.1, Number(data.precio) || 1);
  if (data.categoria) prod.categoria = data.categoria.trim();
  if (data.foto_emoji) prod.foto_emoji = data.foto_emoji;
  if (data.disponible !== undefined) prod.disponible = data.disponible;

  MandaoStorage.saveProductos(productos);
  return { success: true };
}

export async function toggleDisponibilidadProducto(productoId: string, disponible: boolean) {
  return editarProductoComercio(productoId, { disponible });
}

export async function eliminarProductoComercio(productoId: string) {
  let productos = MandaoStorage.getProductos();
  productos = productos.filter(x => x.id_producto !== productoId);
  MandaoStorage.saveProductos(productos);
  return { success: true };
}

// =================== COMMERCE & RIDER STATUS ===================

export async function toggleComercioAbierto(comercioId: string, abierto: boolean) {
  const comercios = MandaoStorage.getComercios();
  const c = comercios.find(x => x.id_comercio === comercioId);
  if (!c) return { success: false, error: 'Comercio no encontrado' };

  c.abierto = abierto;
  c.override_cerrado = !abierto;
  MandaoStorage.saveComercios(comercios);
  registrarAuditoria(comercioId, 'TOGGLE_ABIERTO', 'COMERCIOS', `Estado: ${abierto ? 'Abierto' : 'Cerrado'}`);
  return { success: true };
}

export async function togglePatrocinadoComercio(comercioId: string, patrocinado: boolean) {
  const comercios = MandaoStorage.getComercios();
  const c = comercios.find(x => x.id_comercio === comercioId);
  if (!c) return { success: false, error: 'Comercio no encontrado' };

  c.patrocinado = patrocinado;
  MandaoStorage.saveComercios(comercios);
  return { success: true };
}

export async function toggleOfertaFlashComercio(comercioId: string, oferta: boolean) {
  const comercios = MandaoStorage.getComercios();
  const c = comercios.find(x => x.id_comercio === comercioId);
  if (!c) return { success: false, error: 'Comercio no encontrado' };

  c.oferta_flash = oferta;
  MandaoStorage.saveComercios(comercios);
  return { success: true };
}

export async function toggleRepartidorServicio(repartidorId: string, enServicio: boolean) {
  const repartidores = MandaoStorage.getRepartidores();
  const r = repartidores.find(x => x.id_repartidor === repartidorId);
  if (!r) return { success: false, error: 'Repartidor no encontrado' };

  r.en_servicio = enServicio;
  MandaoStorage.saveRepartidores(repartidores);
  return { success: true };
}

export async function actualizarUbicacionRepartidor(repartidorId: string, lat: number, lng: number) {
  const repartidores = MandaoStorage.getRepartidores();
  const r = repartidores.find(x => x.id_repartidor === repartidorId);
  if (r) {
    r.lat_actual = lat;
    r.lng_actual = lng;
    r.ultima_actualizacion = new Date().toISOString();
    MandaoStorage.saveRepartidores(repartidores);
  }
  return { success: true };
}

// =================== ADMIN CRUD & PIN VALIDATION ===================

export async function validarAdminPin(cedAdmin: string, pin: string) {
  const cN = normalizarCedula(cedAdmin);
  const u = MandaoStorage.getUsuarios().find(x => normalizarCedula(x.cedula) === cN && (x.rol === 'admin' || x.es_admin));
  if (!u) return { success: false, error: 'Cuenta de admin no encontrada.' };
  if (String(u.pin).trim() !== String(pin).trim()) return { success: false, error: 'PIN de administración incorrecto.' };
  return { success: true };
}

export async function editarComercio(comercioId: string, data: Partial<Comercio>) {
  const comercios = MandaoStorage.getComercios();
  const c = comercios.find(x => x.id_comercio === comercioId);
  if (!c) return { success: false, error: 'Comercio no encontrado' };

  Object.assign(c, data);
  MandaoStorage.saveComercios(comercios);
  registrarAuditoria('admin', 'EDITAR_COMERCIO', 'COMERCIOS', `Comercio: ${c.nombre}`);
  return { success: true };
}

export async function eliminarComercio(comercioId: string, adminCedula = 'V-00000000') {
  let comercios = MandaoStorage.getComercios();
  const c = comercios.find(x => x.id_comercio === comercioId);
  if (c) c.activo = false;
  comercios = comercios.filter(x => x.id_comercio !== comercioId);
  MandaoStorage.saveComercios(comercios);
  registrarAuditoria(adminCedula, 'ELIMINAR_COMERCIO', 'COMERCIOS', `ID: ${comercioId}`);
  return { success: true };
}

export async function reactivarComercio(comercioId: string) {
  const comercios = MandaoStorage.getComercios();
  const c = comercios.find(x => x.id_comercio === comercioId);
  if (!c) return { success: false, error: 'Comercio no encontrado' };
  c.activo = true;
  MandaoStorage.saveComercios(comercios);
  return { success: true };
}

export async function editarRepartidor(repartidorId: string, data: Partial<Repartidor>) {
  const repartidores = MandaoStorage.getRepartidores();
  const r = repartidores.find(x => x.id_repartidor === repartidorId);
  if (!r) return { success: false, error: 'Repartidor no encontrado' };

  Object.assign(r, data);
  MandaoStorage.saveRepartidores(repartidores);
  registrarAuditoria('admin', 'EDITAR_REPARTIDOR', 'REPARTIDORES', `Repartidor: ${r.nombre}`);
  return { success: true };
}

export async function eliminarRepartidor(repartidorId: string, adminCedula = 'V-00000000') {
  let repartidores = MandaoStorage.getRepartidores();
  repartidores = repartidores.filter(x => x.id_repartidor !== repartidorId);
  MandaoStorage.saveRepartidores(repartidores);
  registrarAuditoria(adminCedula, 'ELIMINAR_REPARTIDOR', 'REPARTIDORES', `ID: ${repartidorId}`);
  return { success: true };
}

export async function reactivarRepartidor(repartidorId: string) {
  const repartidores = MandaoStorage.getRepartidores();
  const r = repartidores.find(x => x.id_repartidor === repartidorId);
  if (!r) return { success: false, error: 'Repartidor no encontrado' };
  r.activo = true;
  MandaoStorage.saveRepartidores(repartidores);
  return { success: true };
}

export async function suspenderUsuario(ced: string, dias = 7, motivo = 'Sanción disciplinaria') {
  const cN = normalizarCedula(ced);
  const us = MandaoStorage.getUsuarios();
  const u = us.find(x => normalizarCedula(x.cedula) === cN);
  if (!u) return { success: false, error: 'Usuario no encontrado' };

  u.suspendido_hasta = new Date(Date.now() + dias * 86400000).toISOString();
  u.motivo_ultima_suspension = motivo;
  MandaoStorage.saveUsuarios(us);
  registrarAuditoria('admin', 'SUSPENDER_USUARIO', 'USUARIOS', `Usuario ${cN} suspendido por ${dias} días`);
  return { success: true };
}

export async function reactivarUsuario(ced: string) {
  const cN = normalizarCedula(ced);
  const us = MandaoStorage.getUsuarios();
  const u = us.find(x => normalizarCedula(x.cedula) === cN);
  if (!u) return { success: false, error: 'Usuario no encontrado' };

  u.suspendido_hasta = undefined;
  u.motivo_ultima_suspension = undefined;
  MandaoStorage.saveUsuarios(us);
  registrarAuditoria('admin', 'REACTIVAR_USUARIO', 'USUARIOS', `Usuario ${cN} reactivado`);
  return { success: true };
}

export async function actualizarConfigGlobal(k: keyof ConfigGlobal, v: unknown) {
  const cfg = MandaoStorage.getConfig();
  (cfg as unknown as Record<string, unknown>)[k] = v;
  MandaoStorage.saveConfig(cfg);
  return { success: true };
}

export async function resetearPinUsuario(ced: string) {
  const cN = normalizarCedula(ced);
  const us = MandaoStorage.getUsuarios();
  const u = us.find(x => normalizarCedula(x.cedula) === cN);
  if (!u) return { success: false, error: 'Usuario no encontrado' };

  u.pin = '1234';
  MandaoStorage.saveUsuarios(us);
  return { success: true, nuevoPin: '1234' };
}

export async function verPinUsuario(ced: string) {
  const cN = normalizarCedula(ced);
  const u = MandaoStorage.getUsuarios().find(x => normalizarCedula(x.cedula) === cN);
  if (!u) return { success: false, error: 'Usuario no encontrado' };
  return { success: true, pin: u.pin || '1234' };
}
