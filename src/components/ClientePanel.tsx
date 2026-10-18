import React, { useState } from 'react';
import { Comercio, Producto, Pedido, User, ItemCarrito, ConfigGlobal } from '../types/mandao';
import { fmt, normalizarCedula } from '../services/storage';

interface ClientePanelProps {
  comercios: Comercio[];
  productos: Producto[];
  pedidos: Pedido[];
  currentUser: User | null;
  config: ConfigGlobal;
  carrito: ItemCarrito[];
  onAddToCart: (producto: Producto) => void;
  onOpenCart: () => void;
  onOpenRatingModal: (pedidoId: string) => void;
  onOpenChatModal: (pedidoId: string) => void;
  onOpenSosModal: (rol: 'cliente', pedidoId?: string) => void;
  onOpenFaqModal: () => void;
  onOpenPrivacyModal: () => void;
  onOpenTutorial: () => void;
}

const CATEGORIAS = [
  { id: '', label: 'Todo' },
  { id: 'Comidas Rápidas', label: '🍔 Rápida' },
  { id: 'Panes', label: '🥖 Panadería' },
  { id: 'casera', label: '🥘 Casera' },
  { id: 'Bebidas', label: '🥤 Bebidas' },
];

export const ClientePanel: React.FC<ClientePanelProps> = ({
  comercios,
  productos,
  pedidos,
  currentUser,
  config,
  carrito,
  onAddToCart,
  onOpenCart,
  onOpenRatingModal,
  onOpenChatModal,
  onOpenSosModal,
  onOpenFaqModal,
  onOpenPrivacyModal,
  onOpenTutorial,
}) => {
  const [comercioFiltro, setComercioFiltro] = useState<string>('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');

  // Active client order
  const activeOrder = currentUser
    ? pedidos.find(p =>
        normalizarCedula(p.cliente_cedula) === normalizarCedula(currentUser.cedula) &&
        ['Pendiente', 'Preparando', 'Listo', 'En camino', 'Llegó'].includes(p.estado)
      )
    : null;

  // Unrated order
  const unratedOrder = currentUser
    ? pedidos.find(p =>
        normalizarCedula(p.cliente_cedula) === normalizarCedula(currentUser.cedula) &&
        p.estado === 'Entregado' &&
        (!p.calificacion_comercio || p.calificacion_comercio === 0)
      )
    : null;

  // [51] Filter products - When store is selected from carousel, strictly show ONLY dishes from that store!
  let filteredProds = [...productos];
  if (comercioFiltro) {
    filteredProds = filteredProds.filter(p => p.id_comercio === comercioFiltro);
  }
  if (categoriaFiltro) {
    filteredProds = filteredProds.filter(p =>
      String(p.categoria || '').toLowerCase().includes(categoriaFiltro.toLowerCase())
    );
  }
  if (busqueda.trim()) {
    const q = busqueda.toLowerCase().trim();
    filteredProds = filteredProds.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
      (p._comercio_nombre && p._comercio_nombre.toLowerCase().includes(q))
    );
  }

  const selectedComercio = comercios.find(c => c.id_comercio === comercioFiltro);
  const cartTotalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const cartSubtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  // Time elapsed for ready order waiting for rider
  let minWaitingRider = 0;
  if (activeOrder && activeOrder.estado === 'Listo' && !activeOrder.repartidor_id && (activeOrder.hora_listo || activeOrder.entregado_a_repartidor)) {
    const timeRef = activeOrder.hora_listo || activeOrder.entregado_a_repartidor || '';
    const t = new Date(timeRef.replace(' ', 'T')).getTime();
    if (!isNaN(t)) {
      minWaitingRider = Math.floor((Date.now() - t) / 60000);
    }
  }

  const orderStateBadges: Record<string, { label: string; color: string }> = {
    Pendiente: { label: '1. Pago por validar ⏳', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    Preparando: { label: '2. En preparación 👨‍🍳', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    Listo: { label: '3. Listo para retiro 📦', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    'En camino': { label: '4. En camino 🚲', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    'Llegó': { label: '5. ¡Repartidor en tu puerta! 📍', color: 'bg-green-500 text-black border-green-400 font-black animate-pulse' },
  };

  return (
    <section className="w-full h-full bg-white overflow-hidden flex flex-col relative select-none">
      {/* Search Input */}
      <div className="px-3 pt-2 pb-1.5 bg-white flex-shrink-0">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs"></i>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="¿Qué quieres comer hoy en Papelón?"
            className="w-full bg-[#F4F4F6] rounded-full pl-9 pr-9 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#FFCC00] text-[#141416]"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs hover:text-neutral-700"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* Category Chips */}
      <div className="px-3 pb-1.5 flex gap-1.5 overflow-x-auto hide-scrollbar flex-shrink-0 bg-white">
        {CATEGORIAS.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaFiltro(cat.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition active:scale-95 ${
              categoriaFiltro === cat.id
                ? 'bg-[#FFCC00] text-[#141416] shadow-sm'
                : 'bg-[#F4F4F6] text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-28">
        {/* Comercios Afiliados Carousel */}
        <div className="px-3 py-1.5 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="font-heading font-black text-xs text-[#141416]">Comercios Afiliados</h4>
            <span className="text-[10px] text-neutral-400 font-bold">
              {comercios.length === 0 ? 'Sin comercios' : `${comercios.length} locales`}
            </span>
          </div>

          {comercios.length === 0 ? (
            <div className="bg-[#F8F8FA] border border-dashed border-neutral-200 rounded-2xl p-4 text-center">
              <span className="text-2xl block mb-1">🏪</span>
              <p className="text-xs font-bold text-neutral-700">Aún no hay comercios afiliados en vivo</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                ¡Los primeros restaurantes de Papelón están abriendo muy pronto!
              </p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
              {comercios.map(c => {
                const isSelected = comercioFiltro === c.id_comercio;
                return (
                  <button
                    key={c.id_comercio}
                    onClick={() => setComercioFiltro(isSelected ? '' : c.id_comercio)}
                    className="flex flex-col items-center gap-0.5 flex-shrink-0 w-[64px] active:scale-95 transition group"
                  >
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all shadow-sm ${
                          isSelected
                            ? 'bg-[#FFCC00] ring-3 ring-[#141416]'
                            : c.patrocinado
                            ? 'border-2 border-[#FFCC00] bg-amber-50'
                            : 'border border-neutral-200 bg-[#F4F4F6] group-hover:border-neutral-400'
                        }`}
                      >
                        {c.logo_emoji || '🏪'}
                      </div>

                      {isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 bg-[#141416] text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                          <i className="fa-solid fa-check"></i>
                        </span>
                      )}

                      {c.delivery_gratis && !isSelected && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                          title="Envío Gratis"
                        >
                          🚲
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[9px] font-bold text-center leading-tight line-clamp-1 mt-0.5 ${
                        isSelected ? 'text-[#141416]' : 'text-neutral-700'
                      }`}
                    >
                      {c.nombre}
                    </span>

                    {c.total_calificaciones === 0 ? (
                      <span className="text-[7.5px] text-blue-600 font-bold">🆕 Nuevo</span>
                    ) : (
                      <span className="text-[7.5px] text-amber-600 font-bold">
                        ⭐ {c.calificacion?.toFixed(1) || '5.0'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* [51] Active Store Filter Banner */}
        {selectedComercio && (
          <div className="mx-3 my-1.5 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">{selectedComercio.logo_emoji || '🏪'}</span>
              <div>
                <p className="text-[11px] font-black text-amber-950">
                  Mostrando solo platos de {selectedComercio.nombre}
                </p>
                <p className="text-[9px] text-amber-800">
                  {selectedComercio.tiempo_estimado} · {selectedComercio.direccion}
                </p>
              </div>
            </div>
            <button
              onClick={() => setComercioFiltro('')}
              className="bg-amber-200 hover:bg-amber-300 text-amber-950 text-[10px] font-bold px-2 py-1 rounded-full transition"
            >
              ✕ Ver todos
            </button>
          </div>
        )}

        {/* Active Order Card */}
        {activeOrder && (
          <div className="mx-3 my-2 bg-[#18181E] text-white rounded-2xl p-3 border border-neutral-800 shadow-md">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-[9px] text-neutral-400 uppercase tracking-wider font-bold">
                Orden en curso
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${orderStateBadges[activeOrder.estado]?.color || 'bg-white/10 text-white'}`}>
                {orderStateBadges[activeOrder.estado]?.label || activeOrder.estado}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <h4 className="font-heading font-extrabold text-sm text-white">
                #{activeOrder.id_pedido}
              </h4>
              <button
                onClick={() => onOpenSosModal('cliente', activeOrder.id_pedido)}
                className="text-[9px] text-red-400 hover:text-red-300 font-bold bg-red-950/40 border border-red-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 active:scale-95"
              >
                <span>🆘 Ayuda</span>
              </button>
            </div>

            <p className="text-[10px] text-neutral-300 mb-2">
              {activeOrder.comercio_nombre} · {activeOrder.detalle_items}
            </p>

            {/* [67] Arrival Banner */}
            {activeOrder.estado === 'Llegó' && (
              <div className="bg-emerald-500 text-[#141416] rounded-xl p-3 text-center my-2 shadow-lg animate-bounce">
                <span className="text-xl block mb-0.5">🚴🚪</span>
                <span className="font-heading font-black text-sm block">
                  ¡Tu repartidor ha llegado a tu puerta!
                </span>
                <span className="text-[10px] font-bold block mt-0.5">
                  Sal a recibir tu pedido y facilítale el PIN a continuación:
                </span>
              </div>
            )}

            {/* PIN Code Box */}
            {['En camino', 'Llegó'].includes(activeOrder.estado) && (
              <div className="bg-[#24242E] rounded-xl p-2.5 text-center border-2 border-[#FFCC00]/70 my-2">
                <span className="text-[9px] uppercase text-neutral-400 font-bold block mb-0.5">
                  Muestra este PIN al repartidor al recibir:
                </span>
                <span className="text-3xl font-black font-mono tracking-widest text-[#FFCC00]">
                  {activeOrder.pin_entrega}
                </span>
              </div>
            )}

            {/* Waiting Rider notice */}
            {activeOrder.estado === 'Listo' && !activeOrder.repartidor_id && minWaitingRider >= config.min_aviso_sin_rep && (
              <div
                className={`rounded-xl p-2 text-[10px] font-bold mt-1.5 ${
                  minWaitingRider >= config.min_critico_sin_rep
                    ? 'bg-red-500/20 border border-red-500/40 text-red-200'
                    : minWaitingRider >= config.min_alerta_sin_rep
                    ? 'bg-orange-500/20 border border-orange-500/40 text-orange-200'
                    : 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                }`}
              >
                {minWaitingRider >= config.min_critico_sin_rep
                  ? `🔴 Han pasado ${minWaitingRider} min. El comercio despachará tu orden directamente.`
                  : minWaitingRider >= config.min_alerta_sin_rep
                  ? `🟠 Buscando repartidor cercano (${minWaitingRider} min transcurridos)...`
                  : `⏳ Tu pedido está listo, buscando repartidor disponible (${minWaitingRider} min)...`}
              </div>
            )}

            {/* Interactive Actions for Active Order: Chat, Call, Maps */}
            {['En camino', 'Llegó'].includes(activeOrder.estado) && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
                <button
                  onClick={() => onOpenChatModal(activeOrder.id_pedido)}
                  className="bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <i className="fa-solid fa-comment-dots text-xs"></i>
                  <span>💬 Chat con repartidor</span>
                </button>

                {activeOrder.lat_cliente && activeOrder.lng_cliente && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.lat_cliente},${activeOrder.lng_cliente}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-200 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
                  >
                    <i className="fa-solid fa-map-location-dot text-xs"></i>
                    <span>🗺️ Ver ruta en Maps</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pending Rating Prompt */}
        {unratedOrder && (
          <div className="mx-3 my-2 bg-amber-50 rounded-2xl p-3 border border-amber-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-900">¡Tu pedido fue entregado!</p>
              <p className="text-xs font-black text-amber-950">
                #{unratedOrder.id_pedido} · {unratedOrder.comercio_nombre}
              </p>
            </div>
            <button
              onClick={() => onOpenRatingModal(unratedOrder.id_pedido)}
              className="bg-[#FFCC00] text-[#141416] font-extrabold text-[10px] px-3 py-1.5 rounded-full shadow-sm active:scale-95"
            >
              ⭐ Calificar
            </button>
          </div>
        )}

        {/* Dish Feed Header */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h4 className="font-heading font-black text-xs text-[#141416]">
              {selectedComercio ? `Platos de ${selectedComercio.nombre}` : 'Platos destacados'}
            </h4>
          </div>
          <span className="text-[10px] text-neutral-400 font-bold">
            {filteredProds.length} platos
          </span>
        </div>

        {/* Product Cards Feed */}
        <div className="px-3 space-y-1.5 pt-1">
          {filteredProds.length === 0 ? (
            <div className="text-center py-10 text-xs text-neutral-400">
              <i className="fa-solid fa-utensils text-3xl mb-2 text-neutral-300"></i>
              <p>No encontramos platos con ese criterio.</p>
              <p className="text-[10px] mt-1 text-neutral-500">
                {selectedComercio
                  ? `Este comercio aún no ha publicado platos disponibles.`
                  : `Prueba seleccionando un comercio o buscando platos caseros o comidas rápidas.`}
              </p>
            </div>
          ) : (
            filteredProds.map(prod => {
              const com = comercios.find(c => c.id_comercio === prod.id_comercio);
              const isOpen = com ? com.abierto !== false : true;
              const isAvailable = prod.disponible !== false;
              const hasFreeDelivery = com?.delivery_gratis === true;

              return (
                <div
                  key={prod.id_producto}
                  className="bg-white rounded-2xl p-2.5 border border-neutral-200 flex items-center justify-between gap-2.5 transition shadow-xs hover:border-neutral-300"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0 select-none">
                      {prod.foto_emoji || '🍽️'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                        {hasFreeDelivery && (
                          <span className="text-[8px] bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded-full">
                            🚲 ENVÍO GRATIS
                          </span>
                        )}
                      </div>

                      <h4 className="font-heading font-extrabold text-xs text-[#141416] leading-tight truncate">
                        {prod.nombre}
                      </h4>
                      <p className="text-[10px] text-neutral-500 line-clamp-1">
                        {prod.descripcion || ''}
                      </p>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-heading font-black text-xs text-[#141416] font-mono">
                          {fmt(prod.precio, config)}
                        </span>
                        <span className="text-[9px] text-neutral-400 truncate">
                          · {com?.logo_emoji || ''} {com?.nombre || prod._comercio_nombre}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAvailable && isOpen ? (
                    <button
                      onClick={() => onAddToCart(prod)}
                      className="w-8 h-8 rounded-full bg-[#FFCC00] hover:bg-[#ffb700] text-[#141416] flex items-center justify-center font-black text-base flex-shrink-0 active:scale-90 shadow-sm transition"
                      title="Agregar al carrito"
                    >
                      +
                    </button>
                  ) : (
                    <span className="text-[8px] bg-neutral-100 text-neutral-500 font-bold px-2 py-1 rounded-full uppercase flex-shrink-0">
                      {!isOpen ? 'Cerrado' : 'Agotado'}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & Links [90], [91], [92] */}
        <div className="mt-8 border-t border-neutral-100 pt-4 px-3 pb-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-neutral-600">
            <button onClick={onOpenTutorial} className="hover:text-black">
              📖 ¿Cómo pedir?
            </button>
            <span>·</span>
            <button onClick={onOpenFaqModal} className="hover:text-black">
              ❓ Preguntas Frecuentes
            </button>
            <span>·</span>
            <button onClick={onOpenPrivacyModal} className="hover:text-black">
              🔒 Privacidad
            </button>
          </div>

          <div className="text-[9px] text-neutral-400">
            Mandao Delivery {config.nombre_pueblo} · Soporte Oficial:{' '}
            <a
              href={`https://wa.me/${config.telefono_soporte.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-neutral-600 font-bold hover:underline"
            >
              {config.telefono_soporte}
            </a>
          </div>
        </div>
      </div>

      {/* [54] Floating Bottom Cart Bar (opens ONLY by user action) */}
      {cartTotalItems > 0 && (
        <div
          onClick={onOpenCart}
          className="absolute bottom-3 left-3 right-3 bg-[#141416] text-white p-2.5 rounded-full flex items-center justify-between shadow-2xl z-20 cursor-pointer active:scale-[0.98] transition hover:bg-[#202026]"
        >
          <div className="flex items-center gap-2 pl-2">
            <span className="bg-[#FFCC00] text-[#141416] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
              {cartTotalItems}
            </span>
            <span className="text-xs font-bold">Ver Mi Carrito</span>
          </div>

          <div className="flex items-center gap-2 pr-2">
            <span className="text-xs font-black text-[#FFCC00] font-mono">
              {fmt(cartSubtotal, config)}
            </span>
            <i className="fa-solid fa-arrow-right text-xs"></i>
          </div>
        </div>
      )}
    </section>
  );
};
