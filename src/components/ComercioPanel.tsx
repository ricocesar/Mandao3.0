import React, { useState } from 'react';
import { Comercio, Producto, Pedido, User, ConfigGlobal } from '../types/mandao';
import { fmt } from '../services/storage';

interface ComercioPanelProps {
  comercios: Comercio[];
  productos: Producto[];
  pedidos: Pedido[];
  currentUser: User | null;
  config: ConfigGlobal;
  sonidoActivo: boolean;
  onToggleSonido: () => void;
  onToggleComercioAbierto: (comercioId: string, abierto: boolean) => void;
  onValidarPago: (pedidoId: string) => void;
  onMarcarListo: (pedidoId: string) => void;
  onMarcarEntregadoPorComercio: (pedidoId: string) => void;
  onCancelarPedidoComercio: (pedidoId: string) => void;
  onOpenFraudeModal: (pedidoId: string, clienteCedula: string) => void;
  onOpenDishModal: (producto?: Producto) => void;
  onToggleDisponibilidadProducto: (productoId: string, disponible: boolean) => void;
  onEliminarProducto: (productoId: string) => void;
  onOpenReporteModal: (pedidoId?: string) => void;
  onOpenSosModal: (rol: 'comercio', pedidoId?: string) => void;
  onOpenRegistroSocio: (tipo: 'comercio') => void;
}

export const ComercioPanel: React.FC<ComercioPanelProps> = ({
  comercios,
  productos,
  pedidos,
  currentUser,
  config,
  sonidoActivo,
  onToggleSonido,
  onToggleComercioAbierto,
  onValidarPago,
  onMarcarListo,
  onMarcarEntregadoPorComercio,
  onCancelarPedidoComercio,
  onOpenFraudeModal,
  onOpenDishModal,
  onToggleDisponibilidadProducto,
  onEliminarProducto,
  onOpenReporteModal,
  onOpenSosModal,
  onOpenRegistroSocio,
}) => {
  const [tab, setTab] = useState<'pedidos' | 'productos'>('pedidos');

  // Find the commerce for the active user, or first one for testing
  const miComercio =
    (currentUser?.id_referencia && comercios.find(c => c.id_comercio === currentUser.id_referencia)) ||
    comercios[0] || null;

  const misPedidos = pedidos.filter(p => !miComercio || p.comercio_id === miComercio.id_comercio);
  const misProductos = productos.filter(p => miComercio && p.id_comercio === miComercio.id_comercio);

  const pendientes = misPedidos.filter(p => ['Pendiente', 'Preparando', 'Listo'].includes(p.estado)).length;
  const entregados = misPedidos.filter(p => p.estado === 'Entregado').length;
  const totalVentas = misPedidos
    .filter(p => p.estado === 'Entregado')
    .reduce((sum, p) => sum + (Number(p.subtotal) || 0), 0);

  const isComercioUser = currentUser?.rol === 'comercio' || currentUser?.rol === 'admin';

  return (
    <section className="w-full h-full bg-[#F4F4F6] overflow-hidden flex flex-col relative select-none">
      {/* Top Header */}
      <div className="px-3 py-2.5 bg-white border-b border-neutral-200 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider">
              PANEL DE COMERCIO
            </span>
            <h3 className="font-heading font-black text-sm text-[#141416] truncate">
              {miComercio ? miComercio.nombre : 'Sin comercio afiliado'}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onOpenSosModal('comercio')}
              className="px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-700 text-[10px] font-black active:scale-95"
            >
              🆘 SOS
            </button>

            <button
              onClick={onToggleSonido}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition ${
                sonidoActivo ? 'bg-amber-100 text-amber-700' : 'bg-[#F4F4F6] text-neutral-400'
              }`}
              title="Sonido de alertas"
            >
              <i className={`fa-solid ${sonidoActivo ? 'fa-bell' : 'fa-bell-slash'}`}></i>
            </button>

            {miComercio && (
              <>
                <span className="text-[10px] font-bold text-neutral-600">
                  {miComercio.abierto ? 'Abierto' : 'Cerrado'}
                </span>

                <button
                  onClick={() => onToggleComercioAbierto(miComercio.id_comercio, !miComercio.abierto)}
                  className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-all ${
                    miComercio.abierto ? 'bg-emerald-500 justify-end' : 'bg-neutral-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Financial Metrics */}
        {miComercio && (
          <div className="grid grid-cols-3 gap-2 bg-[#F8F8FA] p-2 rounded-xl text-center border border-neutral-100">
            <div>
              <span className="text-[9px] text-neutral-400 font-bold block">En Proceso</span>
              <span className="font-heading font-black text-sm text-amber-600">
                {pendientes}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-neutral-400 font-bold block">Entregados</span>
              <span className="font-heading font-black text-sm text-emerald-600">
                {entregados}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-neutral-400 font-bold block">Ventas</span>
              <span className="font-heading font-black text-sm text-[#141416] font-mono">
                {fmt(totalVentas, config)}
              </span>
            </div>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setTab('pedidos')}
            className={`flex-1 py-1.5 text-xs font-black transition border-b-2 ${
              tab === 'pedidos'
                ? 'border-[#FFCC00] text-[#141416]'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Pedidos Recibidos ({pendientes})
          </button>
          <button
            onClick={() => setTab('productos')}
            className={`flex-1 py-1.5 text-xs font-black transition border-b-2 ${
              tab === 'productos'
                ? 'border-[#FFCC00] text-[#141416]'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Menú / Platos ({misProductos.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-3 space-y-2.5 pb-24">
        {!isComercioUser && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between">
            <p className="text-xs font-bold text-amber-900">
              ¿Tienes un restaurante o negocio de comida en Papelón?
            </p>
            <button
              onClick={() => onOpenRegistroSocio('comercio')}
              className="btn-mandao px-3 py-1.5 text-xs font-black shadow-sm"
            >
              Afiliar mi local
            </button>
          </div>
        )}

        {tab === 'pedidos' ? (
          misPedidos.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs text-neutral-400 border border-neutral-200">
              <span className="text-3xl block mb-2">🍽️</span>
              <p className="font-bold text-neutral-700">No hay pedidos recibidos aún.</p>
              <p className="text-[10px] text-neutral-400 mt-1">
                Cuando un cliente haga una orden aparecerá aquí con alerta sonora.
              </p>
            </div>
          ) : (
            misPedidos.map(p => {
              const isPending = p.estado === 'Pendiente';
              const isPrep = p.estado === 'Preparando';
              const isReady = p.estado === 'Listo';
              const canCancel = ['Pendiente', 'Preparando', 'Listo'].includes(p.estado);

              return (
                <div
                  key={p.id_pedido}
                  className="bg-white rounded-2xl p-3 border border-neutral-200 shadow-sm space-y-2"
                >
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-black text-sm text-[#141416]">
                        #{p.id_pedido}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : isPrep
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : isReady
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.estado}
                    </span>
                  </div>

                  <div className="text-xs space-y-0.5 bg-[#F8F8FA] p-2 rounded-xl">
                    <p className="font-bold text-[#141416]">
                      👤 {p.cliente_nombre} · 📱 {p.cliente_telefono}
                    </p>
                    <p className="text-neutral-600 text-[11px]">
                      📍 {p.cliente_direccion}
                    </p>
                    <p className="text-neutral-900 font-bold text-xs pt-1">
                      📦 {p.detalle_items}
                    </p>
                    {p.nota_cliente && (
                      <p className="text-blue-700 text-[10px] font-bold pt-0.5">
                        📝 Nota: {p.nota_cliente}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-bold">
                        Pago Móvil Ref: <strong className="font-mono text-black">{p.referencia_pago}</strong>
                      </span>
                      <span className="font-mono font-black text-sm text-[#141416]">
                        {fmt(p.total, config)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {/* Call Customer Button [75] */}
                      {p.cliente_telefono && (
                        <a
                          href={`tel:${p.cliente_telefono}`}
                          className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs"
                          title="Llamar al cliente"
                        >
                          <i className="fa-solid fa-phone"></i>
                        </a>
                      )}

                      {/* Cancel order button [68] */}
                      {canCancel && (
                        <button
                          onClick={() => onCancelarPedidoComercio(p.id_pedido)}
                          className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold active:scale-95 transition"
                        >
                          ✕ Cancelar
                        </button>
                      )}

                      {/* State transition buttons */}
                      {isPending && (
                        <button
                          onClick={() => onValidarPago(p.id_pedido)}
                          className="btn-mandao px-3 py-1 text-xs font-black shadow-sm"
                        >
                          ✓ Validar Pago
                        </button>
                      )}

                      {isPrep && (
                        <button
                          onClick={() => onMarcarListo(p.id_pedido)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-3 py-1 text-xs rounded-full shadow-sm"
                        >
                          📦 Marcar Listo
                        </button>
                      )}

                      {isReady && !p.repartidor_id && (
                        <button
                          onClick={() => onMarcarEntregadoPorComercio(p.id_pedido)}
                          className="bg-neutral-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full"
                        >
                          🚲 Despaché yo mismo
                        </button>
                      )}

                      {/* Report Fraud / Issue */}
                      {isPending && (
                        <button
                          onClick={() => onOpenFraudeModal(p.id_pedido, p.cliente_cedula)}
                          className="text-[10px] text-red-600 hover:underline font-bold"
                        >
                          Reportar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Products Tab */
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-black text-[#141416]">
                Platos de tu local ({misProductos.length})
              </span>
              <button
                onClick={() => onOpenDishModal()}
                className="btn-mandao px-3 py-1 text-xs font-black shadow-sm flex items-center gap-1"
              >
                <span>+ Agregar Plato</span>
              </button>
            </div>

            {misProductos.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-neutral-300">
                <span className="text-3xl block mb-2">🍔</span>
                <p className="text-xs font-bold text-neutral-800">Aún no tienes platos en tu menú</p>
                <p className="text-[10px] text-neutral-400 mt-1 mb-3">
                  Agrega tus especialidades para que los clientes de Papelón puedan pedir.
                </p>
                <button
                  onClick={() => onOpenDishModal()}
                  className="btn-mandao px-4 py-2 text-xs font-black shadow-sm"
                >
                  + Crear primer plato
                </button>
              </div>
            ) : (
              misProductos.map(prod => (
                <div
                  key={prod.id_producto}
                  className="bg-white p-2.5 rounded-2xl border border-neutral-200 flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-2xl">{prod.foto_emoji || '🍽️'}</span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-heading font-extrabold text-xs text-[#141416] truncate">
                        {prod.nombre}
                      </h4>
                      <p className="text-[10px] text-neutral-500 line-clamp-1">{prod.descripcion}</p>
                      <span className="font-mono font-black text-xs text-[#141416]">
                        {fmt(prod.precio, config)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onToggleDisponibilidadProducto(prod.id_producto, !prod.disponible)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        prod.disponible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {prod.disponible ? 'Disponible' : 'Agotado'}
                    </button>

                    <button
                      onClick={() => onOpenDishModal(prod)}
                      className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-xs text-neutral-700"
                    >
                      <i className="fa-solid fa-pencil text-[10px]"></i>
                    </button>

                    <button
                      onClick={() => onEliminarProducto(prod.id_producto)}
                      className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center text-xs"
                    >
                      <i className="fa-solid fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
};
