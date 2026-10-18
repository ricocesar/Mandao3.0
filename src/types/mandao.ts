export type UserRole = 'cliente' | 'comercio' | 'repartidor' | 'admin';

export interface User {
  cedula: string;
  pin?: string;
  rol: UserRole;
  es_comercio?: boolean;
  es_repartidor?: boolean;
  es_admin?: boolean;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  direccion_guardada?: string;
  lat_usuario?: string | number;
  lng_usuario?: string | number;
  id_referencia?: string;
  pedidos_completados?: number;
  suspendido_hasta?: string;
  motivo_ultima_suspension?: string;
  strikes?: number;
  tutorial_visto?: boolean;
  notas_admin?: string;
  ultimo_acceso?: string;
  fecha_registro?: string;
}

export interface HorarioDia {
  apertura: string; // ej "08:00"
  cierre: string;   // ej "20:00"
  cerrado?: boolean;
}

export interface Comercio {
  id_comercio: string;
  nombre: string;
  categoria: string;
  direccion: string;
  lat_comercio?: number;
  lng_comercio?: number;
  telefono: string;
  banco_pago_movil: string;
  telefono_pago_movil: string;
  cedula_pago_movil: string;
  titular_pago_movil: string;
  delivery_gratis: boolean;
  abierto: boolean;
  override_cerrado?: boolean;
  horario?: Record<string, HorarioDia>;
  tiempo_estimado: string;
  logo_emoji: string;
  patrocinado: boolean;
  oferta_flash: boolean;
  calificacion: number;
  total_calificaciones: number;
  activo: boolean;
  notas_admin?: string;
  fecha_registro?: string;
  productos?: Producto[];
}

export interface Producto {
  id_producto: string;
  id_comercio: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  foto_emoji: string;
  disponible: boolean;
  veces_vendido: number;
  _comercio_nombre?: string;
  _logo_emoji?: string;
}

export type EstadoPedido = 
  | 'Pendiente'
  | 'Preparando'
  | 'Listo'
  | 'En camino'
  | 'Llegó'
  | 'Entregado'
  | 'Cancelado'
  | 'cancelado_fraude';

export interface ItemCarrito {
  id_producto: string;
  id_comercio: string;
  nombre: string;
  precio: number;
  foto_emoji: string;
  cantidad: number;
}

export interface ChatMessage {
  id: string;
  remitente: 'cliente' | 'repartidor';
  texto: string;
  timestamp: string;
}

export interface Pedido {
  id_pedido: string;
  fecha_hora: string;
  cliente_cedula: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  referencia_direccion?: string;
  lat_cliente?: string | number;
  lng_cliente?: string | number;
  comercio_id: string;
  comercio_nombre: string;
  lat_comercio?: number;
  lng_comercio?: number;
  detalle_items: string;
  subtotal: number;
  tarifa_envio: number;
  propina: number;
  total: number;
  tipo_vehiculo: string;
  metodo_pago: string;
  referencia_pago: string;
  estado: EstadoPedido;
  pin_entrega: string;
  repartidor_asignado?: string;
  repartidor_id?: string;
  lat_repartidor?: number;
  lng_repartidor?: number;
  entregado_a_repartidor?: string;
  hora_listo?: string;
  hora_llego?: string;
  calificacion_comercio?: number;
  calificacion_repartidor?: number;
  idempotency_key?: string;
  nota_cliente?: string;
  cancelado_por?: string;
  motivo_cancelacion?: string;
  es_problematico?: boolean;
  mensajes_chat?: ChatMessage[];
}

export interface Repartidor {
  id_repartidor: string;
  nombre: string;
  telefono: string;
  email: string;
  vehiculo: string;
  en_servicio: boolean;
  ganancias_hoy: number;
  viajes_hoy: number;
  viajes_semana: number;
  semana_actual?: string;
  viajes_totales: number;
  calificacion: number;
  total_calificaciones: number;
  activo: boolean;
  zona?: string;
  lat_actual?: number;
  lng_actual?: number;
  ultima_actualizacion?: string;
  notas_admin?: string;
  fecha_registro?: string;
}

export interface SolicitudSocio {
  id_solicitud: string;
  tipo: 'comercio' | 'repartidor';
  cedula: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  datos_json: string;
  fecha_solicitud: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo?: string;
  notas_admin?: string;
  procesada_fecha?: string;
}

export interface InactivoCliente {
  cedula_cliente: string;
  id_comercio: string;
  fecha_fin_veto: string;
  motivo_reporte: string;
}

export type VetoCliente = InactivoCliente;

export interface ReporteCruzado {
  id: string;
  tipo_reportante: 'cliente' | 'comercio' | 'repartidor';
  id_reportante: string;
  nombre_reportante: string;
  tipo_reportado: 'cliente' | 'comercio' | 'repartidor';
  id_reportado: string;
  nombre_reportado: string;
  motivo: string;
  detalle?: string;
  pedido_id?: string;
  fecha: string;
  estado: 'pendiente' | 'aplicado' | 'descartado';
}

export interface RegistroSOS {
  id: string;
  rol: UserRole;
  usuario_id: string;
  nombre: string;
  motivo: string;
  pedido_id?: string;
  fecha: string;
  estado: 'pendiente' | 'atendido';
}

export interface CierreCaja {
  id: string;
  fecha: string;
  total_ventas: number;
  ganancia_admin: number;
  total_propinas: number;
  total_tarifas: number;
  pedidos_entregados: number;
}

export interface PagoRegistro {
  id: string;
  tipo: 'comercio' | 'repartidor';
  entidad_id: string;
  nombre: string;
  monto: number;
  fecha: string;
  admin_cedula: string;
  notas?: string;
}

export interface AuditLog {
  id: string;
  usuario: string;
  accion: string;
  tabla: string;
  fecha: string;
  detalle: string;
}

export interface ErrorLog {
  id: string;
  fecha: string;
  funcion: string;
  mensaje: string;
  stack?: string;
}

export interface ConfigGlobal {
  porcentaje_admin: number;
  dias_veto: number;
  nombre_pueblo: string;
  titulo_app: string;
  mensaje_bienvenida: string;
  telefono_soporte: string;
  instagram_mandao: string;
  email_soporte: string;
  email_admin: string;
  premio_patrocinador: string;
  terminos_condiciones: string;
  tarifa_bicicleta: number;
  min_aviso_sin_rep: number;
  min_alerta_sin_rep: number;
  min_critico_sin_rep: number;
  // Production Hyperlocal Features
  modo_demo: boolean;
  tasa_bcv: number;
  fecha_tasa?: string;
  modo_moneda: 'usd' | 'bs' | 'ambos';
  lat_centro: number;
  lng_centro: number;
  radio_km: number;
}
