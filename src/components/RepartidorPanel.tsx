import React, { useState } from 'react';
import { Pedido, Repartidor, User, ConfigGlobal } from '../types/mandao';
import { fmt, getSemanaActual } from '../services/storage';

interface RepartidorPanelProps {
  repartidores: Repartidor[];
  rankingRepartidores: Repartidor[];
  pedidos: Pedido[];
  currentUser: User | null;
  config: ConfigGlobal;
  sonidoActivo: boolean;
  onToggleSonido: () => void;
  onToggleServicio: (repartidorId: string, enServicio: boolean) => void;
  onTomarPedido: (pedidoId: string) => void;
  onMarcarLlego: (pedidoId: string) => void;
  onValidarPinEntrega: (pedidoId: string, pin: string) => void;
  onCancelarEmergencia: (pedidoId: string) => void;
  onOpenChatModal: (pedidoId: string) => void;
  onOpenSosModal: (rol: 'repartidor', pedidoId?: string) => void;
  onOpenRegistroSocio: (tipo: 'repartidor') => void;
}

export const RepartidorPanel: React.FC<RepartidorPanelProps> = ({
  repartidores,
  rankingRepartidores,
  pedidos,
  currentUser,
  config,
  sonidoActivo,
  onToggleSonido,
  onToggleServicio,
  onTomarPedido,
  onMarcarLlego,
  onValidarPinEntrega,
  onCancelarEmergencia,
  onOpenChatModal,
  onOpenSosModal,
  onOpenRegistroSocio,
}) => {
  const [pinInput, setPinInput] = useState<string>('');

  // Find active rider or fallback
  const miRepartidor =
    (currentUser?.id_referencia && repartidores.find(r => r.id_repartidor === currentUser.id_referencia)) ||
    (currentUser?.rol === 'repartidor' && repartidores.find(r => r.telefono === currentUser.telefono)) ||
    repartidores[0] || null;

  // Active assigned trip ('En camino' or 'Llegó')
  const activeTrip = miRepartidor
    ? pedidos.find(
        p =>
          ['En camino', 'Llegó'].includes(p.estado) &&
          (p.repartidor_id === miRepartidor.id_repartidor || p.repartidor_asignado?.includes(miRepartidor.nombre))
      )
    : null;

  // [64] Available orders: sorted with tip > 0 FIRST!
  const availableOrders = pedidos
    .filter(p => p.estado === 'Listo' && (!p.repartidor_id || p.repartidor_id === ''))
    .sort((a, b) => (Number(b.propina) || 0) - (Number(a.propina) || 0));

  const handleKeypadPress = (val: string) => {
    if (val === 'CLR') {
      setPinInput('');
    } else if (val === 'DEL') {
      setPinInput(prev => prev.slice(0, -1));
    } else if (pinInput.length < 4) {
      setPinInput(prev => prev + val);
    }
  };

  const handleConfirmPin = () => {
    if (!activeTrip) return;
    onValidarPinEntrega(activeTrip.id_pedido, pinInput);
    setPinInput('');
  };

  const isRiderUser = currentUser?.rol === 'repartidor' || currentUser?.rol === 'admin';
  const medals = ['🥇', '🥈', '🥉'];
  const curSemana = getSemanaActual();

  return (
    <section className="w-full h-full bg-[#121217] overflow-hidden flex flex-col relative text-white select-none">
      {/* Top Bar */}
      <div className="px-3 py-2.5 bg-[#1A1A22] border-b border-white/10 flex-shrink-0 space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs border border-emerald-500/30">
              <i className="fa-solid fa-bicycle"></i>
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-white">
                {miRepartidor ? miRepartidor.nombre : 'Panel de Repartidor'}
              </h3>
              <span className="text-[10px] text-neutral-400 font-bold">
                {!miRepartidor || miRepartidor.total_calificaciones === 0
                  ? '🆕 Nuevo'
                  : `⭐ ${miRepartidor.calificacion.toFixed(1)} (${miRepartidor.total_calificaciones})`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenSosModal('repartidor', activeTrip?.id_pedido)}
              className="px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500/40 text-red-300 text-[10px] font-black active:scale-95"
            >
              🆘 SOS
            </button>

            <button
              onClick={onToggleSonido}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] transition ${
                sonidoActivo ? 'bg-[#FFCC00] text-[#141416]' : 'bg-white/10 text-neutral-400'
              }`}
              title="Sonido de alertas"
            >
              <i className={`fa-solid ${sonidoActivo ? 'fa-bell' : 'fa-bell-slash'}`}></i>
            </button>

            {miRepartidor && (
              <>
                <span className="text-[10px] font-bold text-neutral-300">
                  {miRepartidor.en_servicio ? 'En servicio' : 'Inactivo'}
                </span>
                <button
                  onClick={() => onToggleServicio(miRepartidor.id_repartidor, !miRepartidor.en_servicio)}
                  className={`w-11 h-6 rounded-full p-1 flex items-center transition-all ${
                    miRepartidor.en_servicio ? 'bg-emerald-500 justify-end' : 'bg-neutral-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Rider Financial Metrics */}
        {miRepartidor && (
          <div className="bg-[#242432] p-2.5 rounded-2xl flex justify-between border border-white/5 shadow-sm">
            <div>
              <span className="text-[9px] uppercase text-neutral-400 block font-bold">
                Ganancias de Hoy
              </span>
              <span className="font-heading font-black text-lg text-[#FFCC00] font-mono">
                {fmt(miRepartidor.ganancias_hoy || 0, config)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase text-neutral-400 block font-bold">
                Viajes Semana ({curSemana})
              </span>
              <span className="font-heading font-black text-lg text-white font-mono">
                {miRepartidor.viajes_semana || 0}{' '}
                <span className="text-neutral-400 text-xs font-normal">
                  ({miRepartidor.viajes_totales || 0} tot.)
                </span>
              </span>
            </div>
          </div>
        )}

        {!isRiderUser && (
          <div className="p-2.5 bg-purple-950/40 border border-purple-500/30 rounded-2xl flex items-center justify-between">
            <p className="text-[10px] font-bold text-purple-200">
              ¿Quieres entregar pedidos y ganar dinero en Papelón?
            </p>
            <button
              onClick={() => onOpenRegistroSocio('repartidor')}
              className="btn-mandao px-3 py-1 text-[10px] font-bold shadow-sm"
            >
              Postularme
            </button>
          </div>
        )}
      </div>

      {/* Main Scroll Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-3 space-y-3 pb-24">
        {/* [60] Top 3 Semanal Leaderboard */}
        <div className="bg-gradient-to-b from-[#1E1E2A] to-[#181822] p-3 rounded-2xl border border-yellow-500/30 space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black font-heading text-white flex items-center gap-1.5">
              <span>🏆</span>
              <span>Top 3 Repartidores de la Semana</span>
            </h4>
            <span className="text-[9px] text-[#FFCC00] font-bold">Semana {curSemana}</span>
          </div>

          <div className="space-y-1">
            {rankingRepartidores.length === 0 ? (
              <p className="text-[10px] text-neutral-500 text-center py-2">
                Aún no hay entregas registradas esta semana. ¡Sé el primero!
              </p>
            ) : (
              rankingRepartidores.map((r, i) => {
                const isMe = miRepartidor && r.id_repartidor === miRepartidor.id_repartidor;
                return (
                  <div
                    key={r.id_repartidor}
                    className={`flex items-center justify-between text-xs p-2 rounded-xl border transition ${
                      isMe
                        ? 'bg-amber-950/40 border-yellow-500/70 shadow-sm'
                        : 'bg-[#242432] border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{medals[i] || '🎖️'}</span>
                      <span className={`font-bold ${isMe ? 'text-[#FFCC00]' : 'text-white'}`}>
                        {r.nombre}
                      </span>
                      {isMe && (
                        <span className="text-[9px] font-black text-[#FFCC00] bg-yellow-500/20 px-1.5 py-0.2 rounded-full">
                          ← Tú
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[#FFCC00] font-black text-[10px]">
                      {r.viajes_semana || 0} viajes esta semana
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-amber-950/30 border border-amber-500/40 p-2 rounded-xl flex items-center gap-2">
            <span className="text-lg">🎁</span>
            <p className="text-[10px] text-amber-100 font-semibold leading-tight">
              {config.premio_patrocinador}
            </p>
          </div>
        </div>

        {/* Active Trip Section */}
        {activeTrip ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Viaje en Progreso
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[9px] font-bold">
                {activeTrip.estado === 'Llegó' ? '📍 Has llegado al destino' : 'En camino 🚲'}
              </span>
            </div>

            <div className="bg-[#1C1C26] rounded-2xl p-3 border border-white/10 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] text-neutral-400 block">Entregar orden a:</span>
                  <h4 className="font-heading font-black text-sm text-[#FFCC00]">
                    {activeTrip.cliente_nombre}
                  </h4>
                </div>

                {/* [67] Botón "📍 He llegado" */}
                {activeTrip.estado === 'En camino' ? (
                  <button
                    onClick={() => onMarcarLlego(activeTrip.id_pedido)}
                    className="text-xs bg-[#FFCC00] text-[#141416] font-black px-3 py-1.5 rounded-full shadow-md active:scale-95 transition"
                  >
                    📍 He llegado
                  </button>
                ) : (
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 px-2 py-1 rounded-full font-bold">
                    ✓ Notificado en puerta
                  </span>
                )}
              </div>

              <div className="bg-[#121217] p-2.5 rounded-xl text-xs space-y-1">
                <p className="text-neutral-300">
                  <strong className="text-white">📍 Dirección:</strong> {activeTrip.cliente_direccion}
                </p>
                {activeTrip.referencia_direccion && (
                  <p className="text-amber-300 text-[11px]">
                    <strong>Punto de referencia:</strong> {activeTrip.referencia_direccion}
                  </p>
                )}
                <p className="text-neutral-400 text-[10px]">
                  <strong className="text-white">🏪 Origen:</strong> {activeTrip.comercio_nombre}
                </p>
                <p className="text-neutral-400 text-[10px]">
                  <strong className="text-white">📦 Platos:</strong> {activeTrip.detalle_items}
                </p>
              </div>

              {activeTrip.nota_cliente && (
                <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-2 text-[10.5px] text-yellow-200 font-bold">
                  📝 Nota del cliente: {activeTrip.nota_cliente}
                </div>
              )}

              {/* Call, Maps, Chat & Emergency Cancel */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {activeTrip.cliente_telefono && (
                  <a
                    href={`tel:${activeTrip.cliente_telefono}`}
                    className="text-center bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-xl py-2 text-xs font-bold transition hover:bg-blue-500/30"
                  >
                    📞 Llamar
                  </a>
                )}

                <button
                  onClick={() => onOpenChatModal(activeTrip.id_pedido)}
                  className="text-center bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-xl py-2 text-xs font-bold transition hover:bg-purple-500/30"
                >
                  💬 Chat
                </button>

                <a
                  href={
                    activeTrip.lat_cliente && activeTrip.lng_cliente
                      ? `https://www.google.com/maps/dir/?api=1&destination=${activeTrip.lat_cliente},${activeTrip.lng_cliente}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeTrip.cliente_direccion || 'Papelón')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-center bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl py-2 text-xs font-bold transition hover:bg-emerald-500/30"
                >
                  📍 GPS
                </a>
              </div>

              <div className="text-center pt-1">
                <button
                  onClick={() => onCancelarEmergencia(activeTrip.id_pedido)}
                  className="text-[10px] text-red-400 hover:text-red-300 underline font-bold"
                >
                  ⚠️ Cancelar viaje por emergencia vial
                </button>
              </div>
            </div>

            {/* PIN Keypad Box */}
            <div className="bg-[#1A1A24] rounded-2xl p-3 border-2 border-emerald-500/40 space-y-2">
              <div className="text-center">
                <p className="text-xs font-black text-white">
                  Ingresa el PIN de 4 dígitos del cliente
                </p>
                <p className="text-[10px] text-neutral-400">
                  El cliente lo tiene visible en su pantalla
                </p>
              </div>

              {/* Display boxes */}
              <div className="flex justify-center gap-2 py-1">
                {[0, 1, 2, 3].map(k => {
                  const hasDigit = k < pinInput.length;
                  return (
                    <div
                      key={k}
                      className={`w-11 h-12 rounded-xl bg-[#121217] border-2 flex items-center justify-center font-mono font-black text-xl transition-all ${
                        hasDigit
                          ? 'border-[#FFCC00] text-[#FFCC00] shadow-sm'
                          : 'border-neutral-700 text-neutral-600'
                      }`}
                    >
                      {pinInput[k] || '·'}
                    </div>
                  );
                })}
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-1 pt-1 max-w-[280px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                  <button
                    key={n}
                    onClick={() => handleKeypadPress(n)}
                    className="bg-[#242434] hover:bg-[#2c2c3e] active:scale-95 text-white font-mono font-bold py-2.5 rounded-xl text-base transition shadow-sm"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => handleKeypadPress('CLR')}
                  className="bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-400 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  C
                </button>
                <button
                  onClick={() => handleKeypadPress('0')}
                  className="bg-[#242434] hover:bg-[#2c2c3e] active:scale-95 text-white font-mono font-bold py-2.5 rounded-xl text-base transition shadow-sm"
                >
                  0
                </button>
                <button
                  onClick={() => handleKeypadPress('DEL')}
                  className="bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-400 font-bold py-2.5 rounded-xl text-sm transition"
                >
                  ⌫
                </button>
              </div>

              <button
                onClick={handleConfirmPin}
                disabled={pinInput.length !== 4}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-extrabold text-xs py-2.5 rounded-full shadow-md transition active:scale-[0.98] mt-1"
              >
                ✓ Validar PIN y confirmar entrega
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#1C1C26] rounded-2xl p-4 text-center border border-white/5 space-y-1">
            <span className="text-3xl block">🚲</span>
            <p className="text-xs font-bold text-neutral-300">Sin viaje activo en este momento</p>
            <p className="text-[10px] text-neutral-500">
              {miRepartidor && miRepartidor.en_servicio
                ? 'Toma un pedido disponible de la lista a continuación.'
                : 'Activa tu estado "En servicio" arriba para recibir pedidos.'}
            </p>
          </div>
        )}

        {/* [64] Available Orders Section - Orders with TIP are highlighted and first! */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
              <span>🔥</span>
              <span>Pedidos Disponibles ({availableOrders.length})</span>
            </h4>
            <span className="text-[9px] text-neutral-500 font-bold">Listos para retiro</span>
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-[#181822] rounded-xl p-4 text-center text-xs text-neutral-500 border border-white/5">
              No hay pedidos en espera de repartidor ahora.
            </div>
          ) : (
            availableOrders.map(p => {
              const hasTip = Number(p.propina) > 0;
              const payout = Number(p.tarifa_envio || 1) + Number(p.propina || 0);

              return (
                <div
                  key={p.id_pedido}
                  className={`bg-[#1C1C26] rounded-2xl p-3 space-y-1.5 shadow-sm transition ${
                    hasTip
                      ? 'border-2 border-yellow-500/80 bg-gradient-to-br from-yellow-950/30 to-[#1C1C26]'
                      : 'border border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">
                      #{p.id_pedido}
                    </span>

                    {/* [64] Visible tip badge */}
                    {hasTip && (
                      <span className="bg-yellow-400 text-[#141416] text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <span>💰</span>
                        <span>+${Number(p.propina).toFixed(2)} propina</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-neutral-300 truncate">
                    🏪 <strong className="text-white">{p.comercio_nombre}</strong> → 📍 {p.cliente_direccion}
                  </p>

                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <div>
                      <span className="text-[9px] text-neutral-400 block">Tu ganancia:</span>
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        +{fmt(payout, config)}
                      </span>
                    </div>

                    <button
                      onClick={() => onTomarPedido(p.id_pedido)}
                      className="btn-mandao py-1.5 px-4 text-xs shadow-sm hover:brightness-105 active:scale-95"
                    >
                      Tomar pedido
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
