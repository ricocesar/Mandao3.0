import React, { useState } from 'react';
import {
  Comercio,
  Repartidor,
  Pedido,
  User,
  SolicitudSocio,
  VetoCliente,
  ConfigGlobal,
  ReporteCruzado,
  RegistroSOS,
  CierreCaja,
  PagoRegistro,
  AuditLog,
} from '../types/mandao';
import { fmt, normalizarCedula, MandaoStorage, descargarReporteCSV } from '../services/storage';

interface AdminPanelProps {
  comercios: Comercio[];
  repartidores: Repartidor[];
  pedidos: Pedido[];
  usuarios: User[];
  solicitudes: SolicitudSocio[];
  vetados: VetoCliente[];
  config: ConfigGlobal;
  reportes: ReporteCruzado[];
  sosList: RegistroSOS[];
  cierres: CierreCaja[];
  pagos: PagoRegistro[];
  auditoria: AuditLog[];
  onLogoutAdmin: () => void;
  onAprobarSolicitud: (idS: string) => void;
  onRechazarSolicitud: (idS: string) => void;
  onEliminarSolicitud: (idS: string) => void;
  onTogglePatrocinado: (idC: string, pat: boolean) => void;
  onToggleFlash: (idC: string, fl: boolean) => void;
  onToggleComercioAbierto: (idC: string, abierto: boolean) => void;
  onOpenEditComercio: (comercio: Comercio) => void;
  onEliminarComercio: (idC: string) => void;
  onReactivarComercio: (idC: string) => void;
  onOpenEditRepartidor: (repartidor: Repartidor) => void;
  onEliminarRepartidor: (idR: string) => void;
  onReactivarRepartidor: (idR: string) => void;
  onVerPinSocio: (cedula: string) => void;
  onCancelarPedidoAdmin: (idP: string) => void;
  onEliminarPedidoAdmin: (idP: string) => void;
  onSuspenderUsuario: (cedula: string) => void;
  onReactivarUsuario: (cedula: string) => void;
  onPerdonarVeto: (cedula: string, comercioId?: string) => void;
  onAprobarSancionReporte: (reporteId: string) => void;
  onDescartarReporte: (reporteId: string) => void;
  onMarcarPagoComercio: (comercioId: string, nombre: string, monto: number) => void;
  onMarcarPagoRepartidor: (repartidorId: string, nombre: string, monto: number) => void;
  onEjecutarCierreDiario: () => void;
  onUpdateConfig: (key: keyof ConfigGlobal, value: unknown) => void;
  onRequireAdminPin: (motivo: string, accion: () => void) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  comercios,
  repartidores,
  pedidos,
  usuarios,
  solicitudes,
  vetados,
  config,
  reportes,
  sosList,
  cierres,
  pagos,
  auditoria,
  onLogoutAdmin,
  onAprobarSolicitud,
  onRechazarSolicitud,
  onEliminarSolicitud,
  onTogglePatrocinado,
  onToggleFlash,
  onToggleComercioAbierto,
  onOpenEditComercio,
  onEliminarComercio,
  onReactivarComercio,
  onOpenEditRepartidor,
  onEliminarRepartidor,
  onReactivarRepartidor,
  onVerPinSocio,
  onCancelarPedidoAdmin,
  onEliminarPedidoAdmin,
  onSuspenderUsuario,
  onReactivarUsuario,
  onPerdonarVeto,
  onAprobarSancionReporte,
  onDescartarReporte,
  onMarcarPagoComercio,
  onMarcarPagoRepartidor,
  onEjecutarCierreDiario,
  onUpdateConfig,
  onRequireAdminPin,
}) => {
  const [adminTab, setAdminTab] = useState<
    'finanzas' | 'metricas' | 'reportes' | 'solicitudes' | 'comercios' | 'repartidores' | 'pedidos' | 'usuarios' | 'sos' | 'auditoria' | 'config'
  >('finanzas');
  const [busquedaUsuario, setBusquedaUsuario] = useState<string>('');

  // Financial calculations [76], [77], [78]
  const entregados = pedidos.filter(p => p.estado === 'Entregado');
  const totalVentasComida = entregados.reduce((sum, p) => sum + (Number(p.subtotal) || 0), 0);
  const totalTarifas = entregados.reduce((sum, p) => sum + (Number(p.tarifa_envio) || 0), 0);
  const totalPropinas = entregados.reduce((sum, p) => sum + (Number(p.propina) || 0), 0);
  const pctAdmin = config.porcentaje_admin || 0.15;
  const gananciaMandao = (totalTarifas + totalPropinas) * pctAdmin;

  // Accounts receivable from stores [76]
  const deudaComercios: Record<string, { id: string; nombre: string; pedidos: number; totalTarifas: number; comisionMandao: number; aTransferir: number }> = {};
  entregados.forEach(p => {
    const cid = p.comercio_id || 'COM-X';
    if (!deudaComercios[cid]) {
      deudaComercios[cid] = {
        id: cid,
        nombre: p.comercio_nombre || cid,
        pedidos: 0,
        totalTarifas: 0,
        comisionMandao: 0,
        aTransferir: 0,
      };
    }
    const tarifa = Number(p.tarifa_envio || 0);
    deudaComercios[cid].pedidos++;
    deudaComercios[cid].totalTarifas += tarifa;
    deudaComercios[cid].comisionMandao += tarifa * pctAdmin;
    deudaComercios[cid].aTransferir += tarifa;
  });

  // Rider payouts [77]
  const pagosRepartidores: Record<string, { id: string; nombre: string; viajes: number; totalGanado: number; aPagar: number }> = {};
  entregados.forEach(p => {
    const rId = p.repartidor_id || 'REP-X';
    const rName = p.repartidor_asignado || 'Repartidor';
    if (!pagosRepartidores[rId]) {
      pagosRepartidores[rId] = { id: rId, nombre: rName, viajes: 0, totalGanado: 0, aPagar: 0 };
    }
    pagosRepartidores[rId].viajes++;
    const net = (Number(p.tarifa_envio || 0) + Number(p.propina || 0)) * (1 - pctAdmin);
    pagosRepartidores[rId].totalGanado += net;
    pagosRepartidores[rId].aPagar += net;
  });

  // [89] Advanced Metrics calculations
  const totalPedidos = pedidos.length;
  const cancelados = pedidos.filter(p => p.estado === 'Cancelado' || p.estado === 'cancelado_fraude').length;
  const tasaCancelacion = totalPedidos > 0 ? ((cancelados / totalPedidos) * 100).toFixed(1) : '0';

  // Top dishes
  const conteoPlatos: Record<string, number> = {};
  pedidos.forEach(p => {
    if (p.detalle_items) {
      const items = p.detalle_items.split('+');
      items.forEach(it => {
        const clean = it.trim();
        if (clean) conteoPlatos[clean] = (conteoPlatos[clean] || 0) + 1;
      });
    }
  });
  const topPlatos = Object.entries(conteoPlatos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top stores by sales
  const ventasPorComercio: Record<string, number> = {};
  entregados.forEach(p => {
    const n = p.comercio_nombre || p.comercio_id;
    ventasPorComercio[n] = (ventasPorComercio[n] || 0) + Number(p.subtotal || 0);
  });
  const topComercios = Object.entries(ventasPorComercio)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // [78] Export to CSV/Excel
  const handleExportarExcelFinanzas = () => {
    const encabezados = ['ID Pedido', 'Fecha/Hora', 'Comercio', 'Cliente', 'Subtotal USD', 'Envio USD', 'Propina USD', 'Total USD', 'Estado', 'Repartidor'];
    const filas = pedidos.map(p => [
      p.id_pedido,
      p.fecha_hora,
      p.comercio_nombre,
      p.cliente_nombre,
      p.subtotal,
      p.tarifa_envio,
      p.propina,
      p.total,
      p.estado,
      p.repartidor_asignado || 'Sin asignar',
    ]);
    descargarReporteCSV(`Mandao_Finanzas_${new Date().toISOString().slice(0, 10)}`, encabezados, filas);
  };

  const handleExportarAuditoria = () => {
    const encabezados = ['ID', 'Usuario', 'Accion', 'Tabla', 'Fecha', 'Detalle'];
    const filas = auditoria.map(a => [a.id, a.usuario, a.accion, a.tabla, a.fecha, a.detalle]);
    descargarReporteCSV(`Mandao_Auditoria_${new Date().toISOString().slice(0, 10)}`, encabezados, filas);
  };

  const filteredUsuarios = usuarios.filter(u => {
    if (!busquedaUsuario.trim()) return true;
    const q = busquedaUsuario.toLowerCase().trim();
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.apellido.toLowerCase().includes(q) ||
      normalizarCedula(u.cedula).toLowerCase().includes(q) ||
      u.telefono.includes(q)
    );
  });

  return (
    <section className="w-full h-full bg-[#141418] text-neutral-100 flex flex-col relative select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-[#1C1C26] px-3 py-2 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#FFCC00] text-[#141416] flex items-center justify-center font-black text-xs">
            ⚙️
          </span>
          <h2 className="font-heading font-black text-sm text-white">Super Admin Mandao</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* [59] Demo Mode Badge indicator */}
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
              config.modo_demo ? 'bg-amber-400 text-black animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {config.modo_demo ? '⚠️ MODO DEMO ACTIVO' : '🟢 MODO PRODUCCIÓN REAL'}
          </span>

          <button
            onClick={() => {
              onRequireAdminPin('cerrar sesión administrativa', onLogoutAdmin);
            }}
            className="text-xs bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-1 rounded-full font-bold active:scale-95 transition"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="bg-[#181822] px-2 py-1 flex gap-1 overflow-x-auto hide-scrollbar border-b border-white/5 flex-shrink-0">
        {[
          { id: 'finanzas', label: '💰 Finanzas' },
          { id: 'metricas', label: '📊 Métricas' },
          { id: 'reportes', label: `⚠️ Reportes (${reportes.filter(r => r.estado === 'pendiente').length})` },
          { id: 'solicitudes', label: `📝 Solicitudes (${solicitudes.filter(s => s.estado === 'pendiente').length})` },
          { id: 'comercios', label: `🏪 Comercios (${comercios.length})` },
          { id: 'repartidores', label: `🚲 Repartidores (${repartidores.length})` },
          { id: 'pedidos', label: `📦 Pedidos (${pedidos.length})` },
          { id: 'usuarios', label: `👥 Usuarios (${usuarios.length})` },
          { id: 'sos', label: `🆘 Emergencias (${sosList.filter(s => s.estado === 'pendiente').length})` },
          { id: 'auditoria', label: '🛡️ Auditoría' },
          { id: 'config', label: '⚙️ Config' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setAdminTab(t.id as typeof adminTab)}
            className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold whitespace-nowrap transition ${
              adminTab === t.id
                ? 'bg-[#FFCC00] text-[#141416] shadow-sm'
                : 'text-neutral-400 hover:text-white bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24 hide-scrollbar">
        {/* ================= 1. FINANZAS [76] - [79] ================= */}
        {adminTab === 'finanzas' && (
          <div className="space-y-3">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#1C1C26] p-2.5 rounded-2xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block">Total Comida</span>
                <span className="font-heading font-black text-base text-white font-mono">{fmt(totalVentasComida, config)}</span>
              </div>
              <div className="bg-[#1C1C26] p-2.5 rounded-2xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block">Tarifas Envíos</span>
                <span className="font-heading font-black text-base text-white font-mono">{fmt(totalTarifas, config)}</span>
              </div>
              <div className="bg-[#1C1C26] p-2.5 rounded-2xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block">Propinas Total</span>
                <span className="font-heading font-black text-base text-amber-400 font-mono">{fmt(totalPropinas, config)}</span>
              </div>
              <div className="bg-amber-950/30 p-2.5 rounded-2xl border border-[#FFCC00]/40">
                <span className="text-[9px] uppercase font-black text-[#FFCC00] block">Ganancia Mandao</span>
                <span className="font-heading font-black text-base text-[#FFCC00] font-mono">{fmt(gananciaMandao, config)}</span>
              </div>
            </div>

            {/* Actions: Daily Close & Excel Export */}
            <div className="flex items-center justify-between gap-2 bg-[#20202E] p-2.5 rounded-2xl border border-white/10">
              <div>
                <p className="text-xs font-bold text-white">Reporte y Cierre Financiero</p>
                <p className="text-[10px] text-neutral-400">Guarda el balance del día en el historial y descarga en formato Excel.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportarExcelFinanzas}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 active:scale-95"
                >
                  <i className="fa-solid fa-file-excel text-xs"></i>
                  <span>Exportar Excel</span>
                </button>
                <button
                  onClick={() => onRequireAdminPin('ejecutar cierre de caja diario', onEjecutarCierreDiario)}
                  className="bg-[#FFCC00] hover:bg-[#ffb700] text-[#141416] font-black text-xs px-3 py-1.5 rounded-full shadow-sm active:scale-95"
                >
                  📅 Cierre Diario
                </button>
              </div>
            </div>

            {/* [76] Cuentas por Cobrar (Comercios) */}
            <div className="bg-[#1C1C26] rounded-2xl p-3 border border-white/10 space-y-2">
              <h4 className="font-heading font-black text-xs text-white">
                Cuentas por Cobrar a Comercios (Tarifas cobradas en efectivo/pago móvil)
              </h4>
              {Object.keys(deudaComercios).length === 0 ? (
                <p className="text-[11px] text-neutral-500 py-1">Sin deudas registradas hoy.</p>
              ) : (
                Object.values(deudaComercios).map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-[#121217] p-2 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-white">{d.nombre}</p>
                      <p className="text-[10px] text-neutral-400">{d.pedidos} pedidos entregados</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-[#FFCC00]">{fmt(d.totalTarifas, config)}</span>
                      <button
                        onClick={() => onMarcarPagoComercio(d.id, d.nombre, d.totalTarifas)}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-1 rounded-full"
                      >
                        ✓ Marcar Pagado
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* [77] Pagos Pendientes a Repartidores */}
            <div className="bg-[#1C1C26] rounded-2xl p-3 border border-white/10 space-y-2">
              <h4 className="font-heading font-black text-xs text-white">
                Pagos Pendientes a Repartidores (Tarifas + Propinas netas)
              </h4>
              {Object.keys(pagosRepartidores).length === 0 ? (
                <p className="text-[11px] text-neutral-500 py-1">Sin pagos pendientes hoy.</p>
              ) : (
                Object.values(pagosRepartidores).map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-[#121217] p-2 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-white">{r.nombre}</p>
                      <p className="text-[10px] text-neutral-400">{r.viajes} viajes realizados</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-emerald-400">{fmt(r.aPagar, config)}</span>
                      <button
                        onClick={() => onMarcarPagoRepartidor(r.id, r.nombre, r.aPagar)}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[10px] font-bold px-2 py-1 rounded-full"
                      >
                        ✓ Liquidar Pago
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Historial de Liquidaciones Registradas */}
            {pagos.length > 0 && (
              <div className="bg-[#1C1C26] rounded-2xl p-3 border border-white/10 space-y-1.5">
                <h4 className="font-heading font-black text-xs text-white">Historial de Pagos y Liquidaciones</h4>
                {pagos.slice(0, 5).map(p => (
                  <div key={p.id} className="flex justify-between items-center text-xs bg-[#121217] p-2 rounded-xl">
                    <div>
                      <span className="font-bold text-white">{p.tipo.toUpperCase()}: {p.nombre}</span>
                      <span className="text-[10px] text-neutral-400 block">{new Date(p.fecha).toLocaleString()}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">{fmt(p.monto, config)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= 2. MÉTRICAS [89] ================= */}
        {adminTab === 'metricas' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#1C1C26] p-3 rounded-2xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block">Tasa de Cancelación</span>
                <span className="font-heading font-black text-xl text-red-400">{tasaCancelacion}%</span>
                <span className="text-[9px] text-neutral-500 block">{cancelados} de {totalPedidos} pedidos</span>
              </div>
              <div className="bg-[#1C1C26] p-3 rounded-2xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block">Tiempo Promedio Entrega</span>
                <span className="font-heading font-black text-xl text-emerald-400">22 min</span>
                <span className="text-[9px] text-neutral-500 block">Dentro de Papelón</span>
              </div>
            </div>

            {/* Top 5 Platos */}
            <div className="bg-[#1C1C26] rounded-2xl p-3 border border-white/10 space-y-2">
              <h4 className="font-heading font-black text-xs text-white">Top 5 Platos Más Vendidos</h4>
              {topPlatos.length === 0 ? (
                <p className="text-[11px] text-neutral-500 py-1">Aún no hay datos de ventas.</p>
              ) : (
                topPlatos.map(([plato, cant], idx) => (
                  <div key={plato} className="flex justify-between items-center bg-[#121217] p-2 rounded-xl text-xs">
                    <span className="font-bold text-neutral-200">#{idx + 1} {plato}</span>
                    <span className="font-black text-[#FFCC00] font-mono">{cant} pedidos</span>
                  </div>
                ))
              )}
            </div>

            {/* Top 5 Comercios */}
            <div className="bg-[#1C1C26] rounded-2xl p-3 border border-white/10 space-y-2">
              <h4 className="font-heading font-black text-xs text-white">Top 5 Comercios por Ventas</h4>
              {topComercios.length === 0 ? (
                <p className="text-[11px] text-neutral-500 py-1">Aún no hay ventas registradas.</p>
              ) : (
                topComercios.map(([com, total], idx) => (
                  <div key={com} className="flex justify-between items-center bg-[#121217] p-2 rounded-xl text-xs">
                    <span className="font-bold text-neutral-200">#{idx + 1} {com}</span>
                    <span className="font-black text-emerald-400 font-mono">{fmt(total, config)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= 3. REPORTES CRUZADOS & 3 STRIKES [80], [81] ================= */}
        {adminTab === 'reportes' && (
          <div className="space-y-2.5">
            <h4 className="font-heading font-black text-xs text-white">
              Reportes Pendientes de Moderación
            </h4>
            {reportes.length === 0 ? (
              <div className="bg-[#1C1C26] p-6 rounded-2xl text-center text-xs text-neutral-500 border border-white/5">
                ✓ No hay reportes disciplinarios pendientes.
              </div>
            ) : (
              reportes.map(r => (
                <div key={r.id} className="bg-[#1C1C26] p-3 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-300">
                      Reportante: {r.nombre_reportante} ({r.tipo_reportante})
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        r.estado === 'pendiente'
                          ? 'bg-amber-500/20 text-amber-300'
                          : r.estado === 'aplicado'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-neutral-700 text-neutral-400'
                      }`}
                    >
                      {r.estado.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-white font-bold">
                    Acusado: <span className="text-[#FFCC00]">{r.nombre_reportado}</span> ({r.tipo_reportado})
                  </p>
                  <p className="text-[11px] text-neutral-300 bg-[#121217] p-2 rounded-xl">
                    Motivo: {r.motivo} {r.detalle ? `— "${r.detalle}"` : ''}
                  </p>

                  {r.estado === 'pendiente' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onAprobarSancionReporte(r.id)}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] px-3 py-1 rounded-full active:scale-95 transition"
                      >
                        ✓ Aprobar Sanción (+1 Strike)
                      </button>
                      <button
                        onClick={() => onDescartarReporte(r.id)}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-[10px] px-3 py-1 rounded-full active:scale-95 transition"
                      >
                        ✕ Descartar Reporte
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= 4. SOLICITUDES ================= */}
        {adminTab === 'solicitudes' && (
          <div className="space-y-2.5">
            <h4 className="font-heading font-black text-xs text-white">Solicitudes de Afiliación de Socios</h4>
            {solicitudes.length === 0 ? (
              <div className="bg-[#1C1C26] p-6 rounded-2xl text-center text-xs text-neutral-500">
                No hay solicitudes de afiliación pendientes.
              </div>
            ) : (
              solicitudes.map(s => (
                <div key={s.id_solicitud} className="bg-[#1C1C26] p-3 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white uppercase">{s.tipo}: {s.nombre} {s.apellido}</span>
                    <span className="text-[10px] text-neutral-400">{s.estado}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300">Cédula: {s.cedula} · Tel: {s.telefono}</p>
                  {s.estado === 'pendiente' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => onAprobarSolicitud(s.id_solicitud)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm"
                      >
                        ✓ Aprobar Socio
                      </button>
                      <button
                        onClick={() => onRechazarSolicitud(s.id_solicitud)}
                        className="bg-red-500/20 text-red-300 text-[10px] font-bold px-3 py-1 rounded-full"
                      >
                        ✕ Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= 5. COMERCIOS ================= */}
        {adminTab === 'comercios' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-white">Comercios Registrados ({comercios.length})</span>
            </div>
            {comercios.length === 0 ? (
              <div className="bg-[#1C1C26] p-6 rounded-2xl text-center text-xs text-neutral-500">
                No hay comercios registrados en la base de datos real.
              </div>
            ) : (
              comercios.map(c => (
                <div key={c.id_comercio} className="bg-[#1C1C26] p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-white text-xs">{c.logo_emoji || '🏪'} {c.nombre}</h5>
                    <p className="text-[10px] text-neutral-400">{c.categoria} · {c.direccion}</p>
                    <p className="text-[10px] text-neutral-500">
                      {c.total_calificaciones === 0 ? '🆕 Nuevo' : `⭐ ${c.calificacion?.toFixed(1) || '5.0'} (${c.total_calificaciones})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleComercioAbierto(c.id_comercio, !c.abierto)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.abierto ? 'bg-emerald-500 text-white' : 'bg-neutral-700 text-neutral-400'}`}
                    >
                      {c.abierto ? 'Abierto' : 'Cerrado'}
                    </button>
                    <button
                      onClick={() => onOpenEditComercio(c)}
                      className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-xs"
                    >
                      <i className="fa-solid fa-pencil text-[10px]"></i>
                    </button>
                    <button
                      onClick={() => onRequireAdminPin(`eliminar el comercio ${c.nombre}`, () => onEliminarComercio(c.id_comercio))}
                      className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs"
                    >
                      <i className="fa-solid fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= 6. REPARTIDORES ================= */}
        {adminTab === 'repartidores' && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-white">Repartidores Activos ({repartidores.length})</span>
            {repartidores.length === 0 ? (
              <div className="bg-[#1C1C26] p-6 rounded-2xl text-center text-xs text-neutral-500">
                No hay repartidores registrados en la base de datos real.
              </div>
            ) : (
              repartidores.map(r => (
                <div key={r.id_repartidor} className="bg-[#1C1C26] p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-white text-xs">{r.nombre}</h5>
                    <p className="text-[10px] text-neutral-400">{r.vehiculo} · Tel: {r.telefono}</p>
                    <p className="text-[10px] text-[#FFCC00]">
                      {r.viajes_semana || 0} viajes semana · {r.viajes_totales || 0} totales
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenEditRepartidor(r)}
                      className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-xs"
                    >
                      <i className="fa-solid fa-pencil text-[10px]"></i>
                    </button>
                    <button
                      onClick={() => onRequireAdminPin(`eliminar al repartidor ${r.nombre}`, () => onEliminarRepartidor(r.id_repartidor))}
                      className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs"
                    >
                      <i className="fa-solid fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= 7. PEDIDOS ================= */}
        {adminTab === 'pedidos' && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-white">Todos los Pedidos ({pedidos.length})</span>
            {pedidos.map(p => (
              <div key={p.id_pedido} className="bg-[#1C1C26] p-2.5 rounded-2xl border border-white/10 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white">#{p.id_pedido} · {p.comercio_nombre}</span>
                  <p className="text-[10px] text-neutral-400">Cliente: {p.cliente_nombre} · Ref: {p.referencia_pago}</p>
                  <span className="text-[9px] text-[#FFCC00]">{p.estado}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{fmt(p.total, config)}</span>
                  <button
                    onClick={() => onRequireAdminPin(`cancelar pedido #${p.id_pedido}`, () => onCancelarPedidoAdmin(p.id_pedido))}
                    className="text-[9px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= 8. USUARIOS & STRIKES ================= */}
        {adminTab === 'usuarios' && (
          <div className="space-y-2">
            <input
              value={busquedaUsuario}
              onChange={e => setBusquedaUsuario(e.target.value)}
              placeholder="Buscar por cédula, nombre o teléfono..."
              className="w-full bg-[#1C1C26] rounded-xl px-3 py-1.5 text-xs text-white outline-none border border-white/10"
            />
            {filteredUsuarios.map(u => {
              const isSuspended = u.suspendido_hasta && new Date(u.suspendido_hasta).getTime() > Date.now();
              return (
                <div key={u.cedula} className="bg-[#1C1C26] p-2.5 rounded-2xl border border-white/10 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-white">{u.nombre} {u.apellido} ({u.rol})</p>
                    <p className="text-[10px] text-neutral-400">{u.cedula} · Tel: {u.telefono}</p>
                    <p className="text-[10px] text-amber-300 font-bold">
                      Strikes: {u.strikes || 0} / 5 {isSuspended ? '🔴 SUSPENDIDO' : '🟢 ACTIVO'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSuspended ? (
                      <button
                        onClick={() => onReactivarUsuario(u.cedula)}
                        className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      >
                        Reactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => onSuspenderUsuario(u.cedula)}
                        className="bg-red-500/20 text-red-300 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      >
                        Suspender
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= 9. SOS EMERGENCIAS [85] ================= */}
        {adminTab === 'sos' && (
          <div className="space-y-2">
            <h4 className="font-heading font-black text-xs text-white">Eventos SOS y Emergencias</h4>
            {sosList.length === 0 ? (
              <div className="bg-[#1C1C26] p-6 rounded-2xl text-center text-xs text-neutral-500">
                ✓ No hay llamados de auxilio activos.
              </div>
            ) : (
              sosList.map(s => (
                <div key={s.id} className="bg-red-950/40 border border-red-500/50 p-3 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-red-300">🆘 {s.rol.toUpperCase()}: {s.nombre}</span>
                    <span className="text-[9px] text-neutral-400">{new Date(s.fecha).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-white font-bold">{s.motivo}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= 10. AUDITORÍA [98] ================= */}
        {adminTab === 'auditoria' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-heading font-black text-xs text-white">Log de Auditoría del Sistema</h4>
              <button
                onClick={handleExportarAuditoria}
                className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full"
              >
                Exportar CSV
              </button>
            </div>
            {auditoria.length === 0 ? (
              <div className="bg-[#1C1C26] p-6 rounded-2xl text-center text-xs text-neutral-500">
                Sin registros de auditoría aún.
              </div>
            ) : (
              auditoria.slice(0, 30).map(a => (
                <div key={a.id} className="bg-[#1C1C26] p-2 rounded-xl border border-white/5 text-[11px] space-y-0.5">
                  <div className="flex justify-between text-neutral-400 text-[10px]">
                    <span className="text-[#FFCC00] font-bold">{a.accion}</span>
                    <span>{new Date(a.fecha).toLocaleString()}</span>
                  </div>
                  <p className="text-white font-mono text-[10px]">{a.usuario} → {a.tabla}: {a.detalle}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= 11. CONFIGURACIÓN [59], [62], [83] ================= */}
        {adminTab === 'config' && (
          <div className="space-y-3">
            {/* [59] Modo Demo Toggle */}
            <div className="bg-[#1C1C26] p-3 rounded-2xl border-2 border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-black text-xs text-white flex items-center gap-1.5">
                    <span>🎮</span>
                    <span>Modo Demo (Pruebas sin alterar datos reales)</span>
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Permite mostrar datos de prueba ficticios. Al apagarlo, la app opera 100% limpia para lanzamiento.
                  </p>
                </div>
                <button
                  onClick={() => onUpdateConfig('modo_demo', !config.modo_demo)}
                  className={`w-11 h-6 rounded-full p-1 flex items-center transition-all ${
                    config.modo_demo ? 'bg-amber-400 justify-end' : 'bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-black shadow-sm"></div>
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono bg-[#121217] p-2 rounded-xl">
                Link de demo directo: <strong className="text-[#FFCC00]">?demo=1</strong>
              </p>
            </div>

            {/* [62] Tasa BCV & Moneda */}
            <div className="bg-[#1C1C26] p-3 rounded-2xl border border-white/10 space-y-2">
              <h4 className="font-heading font-black text-xs text-white">Tasa de Cambio BCV y Moneda</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Tasa Oficial BCV (Bs. / USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.tasa_bcv || 60}
                    onChange={e => onUpdateConfig('tasa_bcv', parseFloat(e.target.value) || 60)}
                    className="w-full bg-[#121217] rounded-xl px-3 py-1.5 text-xs text-white border border-white/10 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Modo de Visualización</label>
                  <select
                    value={config.modo_moneda || 'ambos'}
                    onChange={e => onUpdateConfig('modo_moneda', e.target.value)}
                    className="w-full bg-[#121217] rounded-xl px-2 py-1.5 text-xs text-white border border-white/10"
                  >
                    <option value="ambos">Ambos: $ y Bs.</option>
                    <option value="usd">Solo Dólares ($)</option>
                    <option value="bs">Solo Bolívares (Bs.)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* [83] Cobertura Geográfica */}
            <div className="bg-[#1C1C26] p-3 rounded-2xl border border-white/10 space-y-2">
              <h4 className="font-heading font-black text-xs text-white">Zona de Cobertura Papelón</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Radio Cobertura (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.radio_km || 8}
                    onChange={e => onUpdateConfig('radio_km', parseFloat(e.target.value) || 8)}
                    className="w-full bg-[#121217] rounded-xl px-2 py-1.5 text-xs text-white border border-white/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Latitud Centro</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={config.lat_centro || 9.0744}
                    onChange={e => onUpdateConfig('lat_centro', parseFloat(e.target.value))}
                    className="w-full bg-[#121217] rounded-xl px-2 py-1.5 text-xs text-white border border-white/10 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Longitud Centro</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={config.lng_centro || -69.2483}
                    onChange={e => onUpdateConfig('lng_centro', parseFloat(e.target.value))}
                    className="w-full bg-[#121217] rounded-xl px-2 py-1.5 text-xs text-white border border-white/10 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Comisión Mandao y Teléfono */}
            <div className="bg-[#1C1C26] p-3 rounded-2xl border border-white/10 space-y-2">
              <h4 className="font-heading font-black text-xs text-white">Comisión y Soporte Oficial</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Comisión Mandao (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(config.porcentaje_admin || 0.15) * 100}
                    onChange={e => {
                      const val = (parseFloat(e.target.value) || 15) / 100;
                      onRequireAdminPin(`cambiar comisión a ${e.target.value}%`, () => onUpdateConfig('porcentaje_admin', val));
                    }}
                    className="w-full bg-[#121217] rounded-xl px-3 py-1.5 text-xs text-white border border-white/10 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Teléfono Soporte WhatsApp</label>
                  <input
                    value={config.telefono_soporte || ''}
                    onChange={e => onUpdateConfig('telefono_soporte', e.target.value)}
                    className="w-full bg-[#121217] rounded-xl px-3 py-1.5 text-xs text-white border border-white/10 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
