import React, { useState, useEffect } from 'react';
import { Comercio, Producto, ItemCarrito, User, UserRole, Pedido, Repartidor, ConfigGlobal } from '../types/mandao';
import { fmt, validarEmail, normalizarCedula } from '../services/storage';

// =================== CART MODAL [55], [56], [57], [61], [63] ===================
interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  carrito: ItemCarrito[];
  comercios: Comercio[];
  currentUser: User | null;
  config: ConfigGlobal;
  onModifyQuantity: (productoId: string, delta: number) => void;
  onSubmitOrder: (data: {
    nombre: string;
    telefono: string;
    direccion: string;
    lat: number;
    lng: number;
    referencia: string;
    nota?: string;
    propina: number;
  }) => void;
  onOpenRegisterClient: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  carrito,
  comercios,
  currentUser,
  config,
  onModifyQuantity,
  onSubmitOrder,
  onOpenRegisterClient,
}) => {
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [nota, setNota] = useState('');
  const [propinaStr, setPropinaStr] = useState('0.50');
  const [gpsCoords, setGpsCoords] = useState<{ lat?: number; lng?: number }>({});
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [comprobanteRef, setComprobanteRef] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isGpsNoticeOpen, setIsGpsNoticeOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setTelefono(currentUser.telefono || '');
      if (currentUser.direccion_guardada) {
        setDireccion(currentUser.direccion_guardada);
      }
      if (currentUser.lat_usuario && currentUser.lng_usuario) {
        setGpsCoords({
          lat: Number(currentUser.lat_usuario),
          lng: Number(currentUser.lng_usuario),
        });
        setGpsCaptured(true);
      }
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  // [55] If not registered, show registration prompt first!
  if (!currentUser) {
    return (
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 text-center">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-2xl shadow-sm">
            👤
          </div>
          <div>
            <h3 className="font-heading font-black text-base text-[#141416]">
              Regístrate para confirmar tu pedido
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Tienes {carrito.reduce((s, i) => s + i.cantidad, 0)} platos en tu carrito. Solo te tomará 30 segundos registrarte y tus platos se mantendrán guardados.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenRegisterClient();
              }}
              className="w-full btn-mandao py-3 text-xs font-black shadow-md active:scale-95 transition"
            >
              Registrarme y Continuar Pedido
            </button>
            <button
              onClick={onClose}
              className="w-full bg-[#F4F4F6] hover:bg-neutral-200 text-neutral-700 py-2.5 text-xs font-bold rounded-full transition"
            >
              Seguir agregando platos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentComercioId = carrito.length > 0 ? carrito[0].id_comercio : '';
  const comercio = comercios.find(c => c.id_comercio === currentComercioId);

  const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const envioFee = carrito.length === 0 ? 0 : comercio?.delivery_gratis ? 0 : (config.tarifa_bicicleta || 1.0);
  const propinaNum = Math.max(0, parseFloat(propinaStr) || 0);
  const total = subtotal + envioFee + propinaNum;

  // [56] Capture GPS
  const handleCaptureGps = () => {
    setIsCapturingGps(true);
    setErrorMsg('');
    if (!navigator.geolocation) {
      setIsCapturingGps(false);
      setIsGpsNoticeOpen(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsCaptured(true);
        setIsCapturingGps(false);
        setErrorMsg('');
      },
      () => {
        setIsCapturingGps(false);
        setIsGpsNoticeOpen(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirmOrder = () => {
    if (!gpsCaptured || !gpsCoords.lat || !gpsCoords.lng) {
      setErrorMsg('Debes capturar tu ubicación GPS para que el repartidor pueda llegar a tu casa.');
      return;
    }

    if (!telefono.trim() || !direccion.trim()) {
      setErrorMsg('Por favor completa tu teléfono y dirección exacta.');
      return;
    }

    if (!/^\d{4}$/.test(comprobanteRef.trim())) {
      setErrorMsg('Ingresa exactamente los últimos 4 dígitos de la referencia de Pago Móvil.');
      return;
    }

    onSubmitOrder({
      nombre: `${currentUser.nombre} ${currentUser.apellido}`.trim(),
      telefono: telefono.trim(),
      direccion: direccion.trim(),
      lat: gpsCoords.lat,
      lng: gpsCoords.lng,
      referencia: comprobanteRef.trim(),
      nota: nota.trim(),
      propina: propinaNum,
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-3 border-b flex items-center justify-between flex-shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛍️</span>
              <h3 className="font-heading font-black text-base text-[#141416]">Tu Carrito Mandao</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition"
            >
              <i className="fa-solid fa-xmark text-neutral-600"></i>
            </button>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 hide-scrollbar">
            {/* Cart items */}
            <div className="space-y-1.5">
              {carrito.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">Tu carrito está vacío.</p>
              ) : (
                carrito.map(item => (
                  <div
                    key={item.id_producto}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xl flex-shrink-0">{item.foto_emoji}</span>
                      <span className="font-bold text-[#141416] truncate">{item.nombre}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono font-bold text-neutral-800">
                        {fmt(item.precio * item.cantidad, config)}
                      </span>
                      <div className="flex items-center gap-1 bg-[#F4F4F6] rounded-full px-1.5 py-0.5">
                        <button
                          onClick={() => onModifyQuantity(item.id_producto, -1)}
                          className="font-black px-1.5 hover:text-amber-600 active:scale-95"
                        >
                          −
                        </button>
                        <span className="font-bold font-mono px-1">{item.cantidad}</span>
                        <button
                          onClick={() => onModifyQuantity(item.id_producto, 1)}
                          className="font-black px-1.5 hover:text-amber-600 active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comercio banner */}
            {comercio && (
              <div className="bg-[#F4F4F6] p-2.5 rounded-xl text-xs font-bold text-neutral-700 flex items-center justify-between">
                <span>🏪 {comercio.nombre}</span>
                <span className="text-[10px] text-neutral-500 font-normal">
                  {comercio.tiempo_estimado}
                </span>
              </div>
            )}

            {/* [57] Layout exacto propuesto de Datos del Cliente en el Carrito */}
            <div className="bg-[#FAF7F0] p-3 rounded-2xl border border-amber-300 space-y-2.5">
              <span className="text-[10px] font-black uppercase text-amber-950 tracking-wider block">
                👤 Datos de Entrega
              </span>

              {/* Nombre y Cédula (Bloqueados / Readonly) */}
              <div className="bg-white/70 p-2 rounded-xl border border-amber-200">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block">
                  Pedido a nombre de:
                </span>
                <p className="font-heading font-black text-xs text-[#141416]">
                  {currentUser.nombre} {currentUser.apellido}{' '}
                  <span className="text-neutral-500 font-mono text-[10.5px]">({currentUser.cedula})</span>
                </p>
              </div>

              {/* WhatsApp (Editable) */}
              <div>
                <label className="text-[10px] font-bold text-neutral-700 block mb-0.5">
                  📱 WhatsApp / Teléfono ✏️
                </label>
                <input
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="0414-1234567"
                  className="w-full bg-white rounded-xl px-3 py-1.5 text-xs border border-amber-300 outline-none font-mono text-[#141416]"
                />
              </div>

              {/* Dirección (Editable) */}
              <div>
                <label className="text-[10px] font-bold text-neutral-700 block mb-0.5">
                  📍 Dirección exacta ✏️
                </label>
                <textarea
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  rows={2}
                  placeholder="Calle, número de casa, punto de referencia..."
                  className="w-full bg-white rounded-xl px-3 py-1.5 text-xs border border-amber-300 outline-none resize-none text-[#141416]"
                />
              </div>

              {/* Referencia Textual (Editable) */}
              <div>
                <label className="text-[10px] font-bold text-neutral-700 block mb-0.5">
                  📍 Punto de Referencia (opcional) ✏️
                </label>
                <input
                  value={referencia}
                  onChange={e => setReferencia(e.target.value)}
                  placeholder="Ej: casa reja azul, frente a la bodega de Don Pedro"
                  className="w-full bg-white rounded-xl px-3 py-1.5 text-xs border border-amber-300 outline-none text-[#141416]"
                />
              </div>

              {/* [56] Botón grande obligatorio de GPS */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  disabled={isCapturingGps}
                  className={`w-full py-2.5 px-3 rounded-xl font-heading font-black text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-sm ${
                    gpsCaptured
                      ? 'bg-emerald-500 text-white border border-emerald-600'
                      : 'bg-[#FFCC00] text-[#141416] hover:bg-[#ffb700] ring-2 ring-[#FFCC00]/50 animate-pulse'
                  }`}
                >
                  <i className="fa-solid fa-location-crosshairs text-sm"></i>
                  <span>
                    {isCapturingGps
                      ? 'Obteniendo satélites...'
                      : gpsCaptured
                      ? '✓ GPS Capturado con éxito'
                      : '📍 Capturar mi ubicación GPS (Obligatorio)'}
                  </span>
                </button>
                <p className="text-[9.5px] text-amber-900 mt-1 text-center font-semibold">
                  {gpsCaptured
                    ? `Coordenadas: ${gpsCoords.lat?.toFixed(5)}, ${gpsCoords.lng?.toFixed(5)}`
                    : 'Necesitamos tu ubicación para que el repartidor te encuentre fácilmente.'}
                </p>
              </div>
            </div>

            {/* Customer Note */}
            <div className="bg-blue-50 p-2.5 rounded-2xl border border-blue-200">
              <label className="text-[10px] font-bold text-blue-900 block mb-1">
                📝 Nota para la cocina (opcional)
              </label>
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                rows={1}
                maxLength={200}
                placeholder="Ej: Sin salsas, refresco bien frío..."
                className="w-full bg-white rounded-xl px-3 py-1.5 text-xs border border-blue-300 outline-none resize-none text-[#141416]"
              />
            </div>

            {/* Pago Móvil Data */}
            {comercio && (
              <div className="bg-neutral-50 border-2 border-neutral-200 rounded-2xl p-3 space-y-2">
                <span className="text-xs font-black text-[#141416] block">
                  💳 Datos de Pago Móvil del Comercio
                </span>
                <div className="text-[11px] bg-white p-2.5 rounded-xl font-mono space-y-0.5 border border-neutral-200 text-neutral-800">
                  <p><strong>Banco:</strong> {comercio.banco_pago_movil}</p>
                  <p><strong>Teléfono:</strong> {comercio.telefono_pago_movil}</p>
                  <p><strong>Cédula:</strong> {comercio.cedula_pago_movil}</p>
                  <p><strong>Titular:</strong> {comercio.titular_pago_movil}</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1 text-neutral-800">
                    Últimos 4 dígitos de tu comprobante de Pago Móvil *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={4}
                    value={comprobanteRef}
                    onChange={e => setComprobanteRef(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0000"
                    className="w-full bg-white rounded-full px-3 py-2 text-base text-center font-mono font-black border-2 border-amber-400 outline-none tracking-widest text-[#141416]"
                  />
                </div>
              </div>
            )}

            {/* [61], [63] Tip Input Corregido */}
            <div className="bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-neutral-700">
                  🚴 Propina voluntaria al repartidor (USD)
                </label>
                <div className="flex gap-1">
                  {['0.00', '0.50', '1.00', '2.00'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPropinaStr(val)}
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        propinaStr === val ? 'bg-[#FFCC00] text-[#141416]' : 'bg-white text-neutral-600 border'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* [61] type="tel" with pattern accepting 0.5 directly */}
              <input
                type="tel"
                pattern="[0-9]*\.?[0-9]*"
                value={propinaStr}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setPropinaStr(val);
                }}
                placeholder="0.00"
                className="w-full bg-white rounded-xl px-3 py-1.5 text-xs border border-neutral-300 font-mono font-bold text-[#141416] outline-none"
              />

              {/* [63] Mensaje tenue */}
              <p className="text-[9.5px] text-neutral-400 mt-1">
                💡 La propina es para el repartidor, no para el comercio
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-xs font-bold border border-red-200 text-center">
                ⚠️ {errorMsg}
              </div>
            )}
          </div>

          {/* Bottom Total & Order Button */}
          <div className="p-3 border-t bg-white flex-shrink-0 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500">Subtotal comida:</span>
              <span className="font-mono font-bold text-neutral-800">{fmt(subtotal, config)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500">Envío en bicicleta:</span>
              <span className="font-mono font-bold text-neutral-800">
                {envioFee === 0 ? '¡GRATIS!' : fmt(envioFee, config)}
              </span>
            </div>
            {propinaNum > 0 && (
              <div className="flex justify-between items-center text-xs text-amber-600 font-bold">
                <span>Propina al repartidor:</span>
                <span className="font-mono">+{fmt(propinaNum, config)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm pt-1 border-t border-neutral-100">
              <span className="font-heading font-black text-[#141416]">Total a pagar:</span>
              <span className="font-heading font-black text-base text-[#141416] font-mono">
                {fmt(total, config)}
              </span>
            </div>

            {/* [56] Disable if GPS not captured */}
            <button
              onClick={handleConfirmOrder}
              disabled={!gpsCaptured || carrito.length === 0}
              className="w-full btn-mandao py-3 text-xs font-black shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {!gpsCaptured ? '📍 Captura tu GPS para continuar' : '✓ Pedir Ahora (Confirmar Pago)'}
            </button>
          </div>
        </div>
      </div>

      {/* GPS Notice Modal */}
      {isGpsNoticeOpen && (
        <GpsNoticeModal onClose={() => setIsGpsNoticeOpen(false)} />
      )}
    </>
  );
};

// =================== [66] ORDER CONFIRMATION CELEBRATION MODAL (CONFETTI) ===================
interface OrderCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: string;
  pin: string;
}

export const OrderCelebrationModal: React.FC<OrderCelebrationModalProps> = ({
  isOpen,
  onClose,
  pedidoId,
  pin,
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        // Automatically allow dismissal or proceed
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[380px] rounded-3xl p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
        {/* Animated Confetti Particles in Yellow & Black */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2.5 h-2.5 rounded-sm animate-pulse ${
                i % 3 === 0 ? 'bg-[#FFCC00]' : i % 3 === 1 ? 'bg-[#141416]' : 'bg-amber-400'
              }`}
              style={{
                top: `${(i * 13) % 90}%`,
                left: `${(i * 17) % 90}%`,
                transform: `rotate(${i * 25}deg)`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>

        <div className="w-16 h-16 bg-[#FFCC00] text-[#141416] rounded-full flex items-center justify-center text-3xl mx-auto shadow-md">
          🎉
        </div>

        <div>
          <h2 className="font-heading font-black text-xl text-[#141416]">
            ¡Pedido confirmado! 🎉
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Orden #{pedidoId} enviada al comercio.
          </p>
        </div>

        {/* PIN destacado en grande */}
        <div className="bg-[#141416] text-white p-4 rounded-2xl border-2 border-[#FFCC00]">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
            Tu PIN de Entrega
          </span>
          <span className="text-4xl font-black font-mono tracking-widest text-[#FFCC00]">
            {pin}
          </span>
          <p className="text-[10px] text-neutral-300 mt-2 font-medium">
            Facilita este código de 4 dígitos al repartidor cuando llegue a tu casa para recibir tu comida.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full btn-mandao py-3 text-xs font-black shadow-md active:scale-95 transition"
        >
          Ver seguimiento en vivo 🚲
        </button>
      </div>
    </div>
  );
};

// =================== [74] CHAT MODAL ===================
interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: Pedido | null;
  currentUser: User | null;
  onEnviarMensaje: (pedidoId: string, remitente: 'cliente' | 'repartidor', texto: string) => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  pedido,
  currentUser,
  onEnviarMensaje,
}) => {
  const [texto, setTexto] = useState('');

  if (!isOpen || !pedido) return null;

  const isRider = currentUser?.rol === 'repartidor';
  const remitente: 'cliente' | 'repartidor' = isRider ? 'repartidor' : 'cliente';

  const presets = isRider
    ? [
        'Estoy en la puerta 🚴',
        'Falta el timbre, ¿puedes abrir?',
        'Estoy en la esquina, ¿dónde es exactamente?',
        'Ya llegué con tu comida caliente',
      ]
    : [
        'Ya voy bajando 🏃',
        '¿Puedes dejarlo en recepción?',
        'La casa tiene reja azul',
        'Gracias, ya salgo',
      ];

  const handleSend = (msgText: string) => {
    if (!msgText.trim()) return;
    onEnviarMensaje(pedido.id_pedido, remitente, msgText.trim());
    setTexto('');
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[400px] rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 bg-[#18181E] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <div>
              <h4 className="font-heading font-black text-xs text-white">
                Chat de la Orden #{pedido.id_pedido}
              </h4>
              <span className="text-[9px] text-neutral-400">
                {isRider ? `Cliente: ${pedido.cliente_nombre}` : `Repartidor: ${pedido.repartidor_asignado || 'Mandao'}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">
            ✕
          </button>
        </div>

        {/* Message feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar bg-[#F4F4F6] min-h-[220px]">
          {(!pedido.mensajes_chat || pedido.mensajes_chat.length === 0) ? (
            <p className="text-[11px] text-neutral-400 text-center py-6">
              Envía un mensaje rápido o escribe a continuación.
            </p>
          ) : (
            pedido.mensajes_chat.map(m => {
              const isMine = m.remitente === remitente;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                      isMine
                        ? 'bg-[#141416] text-white rounded-br-none'
                        : 'bg-white text-[#141416] border border-neutral-200 rounded-bl-none shadow-xs'
                    }`}
                  >
                    <p className="font-medium">{m.texto}</p>
                    <span className="text-[8px] opacity-60 block text-right mt-0.5">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Presets */}
        <div className="p-2 bg-neutral-100 flex gap-1 overflow-x-auto hide-scrollbar border-t border-neutral-200">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="bg-white hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap border shadow-xs"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-2.5 bg-white border-t flex gap-1.5 items-center">
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            maxLength={200}
            onKeyDown={e => e.key === 'Enter' && handleSend(texto)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-[#F4F4F6] rounded-full px-3 py-2 text-xs text-[#141416] outline-none border border-neutral-300"
          />
          <button
            onClick={() => handleSend(texto)}
            disabled={!texto.trim()}
            className="w-9 h-9 rounded-full bg-[#FFCC00] text-[#141416] flex items-center justify-center font-bold disabled:opacity-40"
          >
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

// =================== [80] CROSS-REPORT MODAL ===================
interface ReporteModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId?: string;
  currentUser: User | null;
  onEnviarReporte: (data: {
    tipo_reportante: 'cliente' | 'comercio' | 'repartidor';
    id_reportante: string;
    nombre_reportante: string;
    tipo_reportado: 'cliente' | 'comercio' | 'repartidor';
    id_reportado: string;
    nombre_reportado: string;
    motivo: string;
    detalle?: string;
    pedido_id?: string;
  }) => void;
}

export const ReporteModal: React.FC<ReporteModalProps> = ({
  isOpen,
  onClose,
  pedidoId,
  currentUser,
  onEnviarReporte,
}) => {
  const [tipoReportado, setTipoReportado] = useState<'cliente' | 'comercio' | 'repartidor'>('comercio');
  const [nombreReportado, setNombreReportado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleSubmit = () => {
    if (!motivo.trim()) return;
    onEnviarReporte({
      tipo_reportante: currentUser.rol === 'admin' ? 'cliente' : (currentUser.rol as 'cliente' | 'comercio' | 'repartidor'),
      id_reportante: currentUser.cedula,
      nombre_reportante: `${currentUser.nombre} ${currentUser.apellido}`.trim(),
      tipo_reportado: tipoReportado,
      id_reportado: nombreReportado.trim() || 'N/A',
      nombre_reportado: nombreReportado.trim() || 'Usuario reportado',
      motivo: motivo.trim(),
      detalle: detalle.trim(),
      pedido_id: pedidoId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[380px] rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="font-heading font-black text-sm text-red-600 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>Reportar Incidencia</span>
          </h4>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs">✕</button>
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-600 block mb-1">¿A quién deseas reportar?</label>
          <div className="flex gap-1">
            {(['comercio', 'repartidor', 'cliente'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTipoReportado(t)}
                className={`flex-1 py-1 rounded-xl text-[10px] font-bold capitalize ${
                  tipoReportado === t ? 'bg-red-500 text-white' : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Nombre o local reportado *</label>
          <input
            value={nombreReportado}
            onChange={e => setNombreReportado(e.target.value)}
            placeholder="Ej: Burgers Papelón o Repartidor"
            className="w-full bg-[#F4F4F6] rounded-xl px-3 py-1.5 text-xs outline-none border"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Motivo del reporte *</label>
          <input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Comida fría, trato irrespetuoso, no contestó"
            className="w-full bg-[#F4F4F6] rounded-xl px-3 py-1.5 text-xs outline-none border"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Detalles adicionales</label>
          <textarea
            value={detalle}
            onChange={e => setDetalle(e.target.value)}
            rows={2}
            className="w-full bg-[#F4F4F6] rounded-xl px-3 py-1.5 text-xs outline-none border resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!motivo.trim()}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs py-2.5 rounded-full shadow-md active:scale-95 disabled:opacity-40"
        >
          Enviar reporte al Super Admin
        </button>
      </div>
    </div>
  );
};

// =================== [85] SOS EMERGENCY MODAL ===================
interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  rol: 'cliente' | 'comercio' | 'repartidor';
  pedidoId?: string;
  config: ConfigGlobal;
  currentUser: User | null;
  onRegistrarSOS: (motivo: string) => void;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  rol,
  config,
  currentUser,
  onRegistrarSOS,
}) => {
  if (!isOpen) return null;

  const phoneRaw = config.telefono_soporte.replace(/[^0-9]/g, '');

  const handleSos = (motivo: string) => {
    onRegistrarSOS(motivo);
    const text = encodeURIComponent(
      `🚨 [EMERGENCIA SOS MANDAO] Rol: ${rol.toUpperCase()} - Usuario: ${currentUser ? `${currentUser.nombre} ${currentUser.apellido}` : 'Anónimo'}. Motivo: ${motivo}`
    );
    window.open(`https://wa.me/${phoneRaw}?text=${text}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-red-950/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[360px] rounded-3xl p-5 shadow-2xl text-center space-y-3">
        <span className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto shadow-sm">
          🆘
        </span>
        <div>
          <h3 className="font-heading font-black text-base text-red-600">
            {rol === 'repartidor'
              ? 'Emergencia en la Calle'
              : rol === 'comercio'
              ? 'Problema con Pedido / Repartidor'
              : 'Problema con mi Pedido'}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Selecciona tu incidencia para comunicar con la central de auxilio de Papelón:
          </p>
        </div>

        <div className="space-y-1.5 pt-1">
          {rol === 'repartidor' ? (
            <>
              <button
                onClick={() => handleSos('Accidente vial o avería mecánica')}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs py-2 rounded-xl border border-red-200"
              >
                🚨 Accidente o avería en la vía
              </button>
              <button
                onClick={() => handleSos('Cliente no atiende o dirección inaccesible')}
                className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-bold text-xs py-2 rounded-xl border"
              >
                📍 Cliente no sale / dirección no existe
              </button>
            </>
          ) : rol === 'comercio' ? (
            <>
              <button
                onClick={() => handleSos('Repartidor no se presenta')}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs py-2 rounded-xl border border-red-200"
              >
                🚲 Repartidor demorado / no llega
              </button>
              <button
                onClick={() => handleSos('Comprobante de pago inválido')}
                className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-bold text-xs py-2 rounded-xl border"
              >
                💳 Comprobante falso o no cayó
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleSos('Pedido no ha llegado')}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs py-2 rounded-xl border border-red-200"
              >
                ⏱️ Demasiada demora con mi pedido
              </button>
              <button
                onClick={() => handleSos('Comida incompleta o dañada')}
                className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-bold text-xs py-2 rounded-xl border"
              >
                🍱 Plato incompleto o derramado
              </button>
            </>
          )}

          <a
            href={`https://wa.me/${phoneRaw}`}
            target="_blank"
            rel="noreferrer"
            className="w-full btn-mandao py-2.5 text-xs font-black rounded-xl block mt-2 text-center"
          >
            Abrir WhatsApp de Soporte
          </a>
        </div>

        <button onClick={onClose} className="text-xs text-neutral-400 font-bold hover:underline block mx-auto pt-1">
          Cerrar
        </button>
      </div>
    </div>
  );
};

// =================== [91] TUTORIAL 4 PASOS ===================
export const TutorialModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [paso, setPaso] = useState(0);

  if (!isOpen) return null;

  const pasos = [
    { emoji: '🍔', titulo: '1. Elige qué comer', desc: 'Explora los mejores restaurantes y comidas de Papelón, o filtra por tu comercio favorito.' },
    { emoji: '🛒', titulo: '2. Tu carrito inteligente', desc: 'Agrega platos sin interrupciones. Cuando estés listo, abre tu carrito desde la barra o ícono superior.' },
    { emoji: '📍', titulo: '3. GPS y Pago Móvil', desc: 'Captura tu ubicación exacta con un click y coloca los últimos 4 dígitos de tu transferencia.' },
    { emoji: '🚲', titulo: '4. Sigue tu entrega y PIN', desc: 'Mira a tu repartidor en camino y facilítale tu PIN de 4 dígitos al recibir la comida caliente.' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[360px] rounded-3xl p-6 shadow-2xl text-center space-y-4">
        <span className="text-4xl block">{pasos[paso].emoji}</span>
        <div>
          <h3 className="font-heading font-black text-lg text-[#141416]">{pasos[paso].titulo}</h3>
          <p className="text-xs text-neutral-500 mt-1">{pasos[paso].desc}</p>
        </div>

        <div className="flex justify-center gap-1.5 py-1">
          {pasos.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${paso === i ? 'w-6 bg-[#FFCC00]' : 'w-2 bg-neutral-200'}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {paso > 0 && (
            <button
              onClick={() => setPaso(p => p - 1)}
              className="flex-1 bg-neutral-100 text-neutral-700 py-2.5 rounded-full text-xs font-bold"
            >
              Atrás
            </button>
          )}
          {paso < pasos.length - 1 ? (
            <button
              onClick={() => setPaso(p => p + 1)}
              className="flex-1 btn-mandao py-2.5 rounded-full text-xs font-black"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 btn-mandao py-2.5 rounded-full text-xs font-black"
            >
              ¡Empezar a pedir!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// =================== [92] FAQ MODAL ===================
export const FaqModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const faqs = [
    { q: '¿Cómo hago un pedido?', a: 'Elige los platos de tu comercio favorito, abre el carrito, captura tu GPS y coloca los 4 dígitos de tu Pago Móvil.' },
    { q: '¿Cómo pago mi pedido?', a: 'Realizas el Pago Móvil directo al banco y cédula que te indica el comercio en el carrito antes de enviar la orden.' },
    { q: '¿Para qué sirve el PIN de 4 dígitos?', a: 'Es tu seguro de entrega. Solo dáselo al repartidor cuando tengas la bolsa de comida en tus manos.' },
    { q: '¿Puedo cancelar mi pedido?', a: 'Sí, puedes cancelar mientras el comercio esté validando tu pago. Una vez en cocina ya no se puede cancelar.' },
    { q: '¿Cómo me afilio como repartidor o comercio?', a: 'Toca "Acceder" en la esquina superior, selecciona "Ser Repartidor" o "Afiliar Comercio" y llena el formulario.' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[400px] rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <h3 className="font-heading font-black text-sm text-[#141416]">Preguntas Frecuentes (FAQ)</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar text-xs">
          {faqs.map((f, i) => (
            <div key={i} className="bg-[#F8F8FA] p-3 rounded-2xl border border-neutral-100">
              <h5 className="font-bold text-[#141416] mb-1">{f.q}</h5>
              <p className="text-neutral-600 text-[11px] leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =================== [90] PRIVACY POLICY MODAL ===================
export const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[400px] rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <h3 className="font-heading font-black text-sm text-[#141416]">Política de Privacidad y Términos</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2.5 hide-scrollbar text-[11px] text-neutral-600 leading-relaxed">
          <p>
            <strong>Mandao Delivery Papelón</strong> respeta tu privacidad. La información recopilada (nombre, teléfono, dirección y coordenadas GPS) se utiliza exclusivamente para la gestión y entrega efectiva de tus pedidos gastronómicos en el municipio.
          </p>
          <p>
            Tus datos de ubicación únicamente se comparten con el repartidor asignado durante el tiempo que dure el viaje activo para asegurar la llegada exacta.
          </p>
          <p>
            Los comercios reciben tu número telefónico para coordinar detalles de despacho y confirmación del Pago Móvil.
          </p>
        </div>
      </div>
    </div>
  );
};

// =================== ACCESS MODAL ===================
export const AccessModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectRole: (role: UserRole) => void;
  onOpenLogin: (role: UserRole) => void;
  onOpenRegisterClient: () => void;
  onOpenRegisterSocio: (tipo: 'comercio' | 'repartidor') => void;
  onOpenMyAccount: () => void;
  onLogout: () => void;
}> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectRole,
  onOpenLogin,
  onOpenRegisterClient,
  onOpenRegisterSocio,
  onOpenMyAccount,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[380px] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="font-heading font-black text-base text-[#141416]">
              {currentUser ? `Hola, ${currentUser.nombre}` : 'Acceso a Mandao'}
            </h3>
            <span className="text-[10px] text-neutral-400 font-bold">
              {currentUser ? `Rol actual: ${currentUser.rol.toUpperCase()}` : 'Selecciona tu perfil'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600"
          >
            ✕
          </button>
        </div>

        {currentUser ? (
          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                onOpenMyAccount();
              }}
              className="w-full bg-[#F4F4F6] hover:bg-neutral-200 text-[#141416] p-3 rounded-2xl flex items-center justify-between text-xs font-bold transition"
            >
              <span>👤 Mi Cuenta / Perfil</span>
              <i className="fa-solid fa-chevron-right text-neutral-400"></i>
            </button>

            <div className="pt-2 border-t space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block px-1">
                Cambiar de Panel
              </span>
              <button
                onClick={() => {
                  onSelectRole('cliente');
                  onClose();
                }}
                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 p-2.5 rounded-xl text-xs font-bold text-left"
              >
                🍽️ Vista Cliente
              </button>
              {(currentUser.es_comercio || currentUser.rol === 'admin') && (
                <button
                  onClick={() => {
                    onSelectRole('comercio');
                    onClose();
                  }}
                  className="w-full bg-purple-50 hover:bg-purple-100 text-purple-900 p-2.5 rounded-xl text-xs font-bold text-left"
                >
                  🏪 Panel de Comercio
                </button>
              )}
              {(currentUser.es_repartidor || currentUser.rol === 'admin') && (
                <button
                  onClick={() => {
                    onSelectRole('repartidor');
                    onClose();
                  }}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 p-2.5 rounded-xl text-xs font-bold text-left"
                >
                  🚲 Panel de Repartidor
                </button>
              )}
              {(currentUser.es_admin || currentUser.rol === 'admin') && (
                <button
                  onClick={() => {
                    onSelectRole('admin');
                    onClose();
                  }}
                  className="w-full bg-neutral-800 text-[#FFCC00] p-2.5 rounded-xl text-xs font-bold text-left"
                >
                  ⚙️ Super Admin Mandao
                </button>
              )}
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-xl text-xs font-bold mt-2 text-center"
            >
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                onOpenRegisterClient();
              }}
              className="w-full btn-mandao py-3 text-xs font-black shadow-md"
            >
              Registrarme como Cliente
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenLogin('cliente');
              }}
              className="w-full bg-[#F4F4F6] hover:bg-neutral-200 text-[#141416] py-2.5 rounded-full text-xs font-bold"
            >
              Iniciar Sesión (Cédula + PIN)
            </button>

            <div className="pt-2 border-t grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenRegisterSocio('comercio');
                }}
                className="bg-purple-50 hover:bg-purple-100 text-purple-900 p-2.5 rounded-2xl text-[11px] font-bold text-center border border-purple-200"
              >
                🏪 Afiliar mi Comercio
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenRegisterSocio('repartidor');
                }}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 p-2.5 rounded-2xl text-[11px] font-bold text-center border border-emerald-200"
              >
                🚲 Ser Repartidor
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenLogin('admin');
              }}
              className="w-full text-center text-[10px] text-neutral-400 font-bold hover:text-neutral-700 pt-2"
            >
              Acceso a Super Admin
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =================== LOGIN MODAL ===================
export const LoginModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  onLogin: (cedula: string, pin: string) => Promise<boolean>;
}> = ({ isOpen, onClose, role, onLogin }) => {
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula.trim()) {
      setErrorMsg('Ingresa tu cédula');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const ok = await onLogin(cedula, pin);
    setLoading(false);
    if (ok) onClose();
    else setErrorMsg('Cédula o PIN incorrecto.');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[360px] rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-heading font-black text-sm text-[#141416]">
            {role === 'admin' ? 'Acceso Super Admin' : 'Iniciar Sesión'}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Cédula de Identidad</label>
            <input
              value={cedula}
              onChange={e => setCedula(e.target.value)}
              placeholder="V-12345678"
              className="w-full bg-[#F4F4F6] rounded-xl px-3 py-2 text-xs font-mono outline-none border"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">PIN de 4 dígitos</label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-[#F4F4F6] rounded-xl px-3 py-2 text-center text-sm font-mono font-bold tracking-widest outline-none border"
            />
          </div>

          {errorMsg && <p className="text-[11px] text-red-500 font-bold text-center">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-mandao py-3 text-xs font-black shadow-md disabled:opacity-40"
          >
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

// =================== REGISTER CLIENT MODAL ===================
export const RegisterClientModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onRegister: (data: {
    cedula: string;
    nombre: string;
    apellido: string;
    telefono: string;
    email: string;
    direccion: string;
    pin: string;
  }) => Promise<boolean>;
}> = ({ isOpen, onClose, onRegister }) => {
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [pin, setPin] = useState('1234');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula.trim() || !nombre.trim() || !apellido.trim() || !telefono.trim() || !direccion.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }
    const ok = await onRegister({
      cedula: cedula.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      direccion: direccion.trim(),
      pin: pin.trim() || '1234',
    });
    if (ok) onClose();
    else setErrorMsg('Error al registrar usuario.');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[380px] rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-heading font-black text-sm text-[#141416]">Registro de Cliente</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Nombre *</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Pedro"
                className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs outline-none border"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Apellido *</label>
              <input
                value={apellido}
                onChange={e => setApellido(e.target.value)}
                placeholder="Pérez"
                className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs outline-none border"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Cédula de Identidad *</label>
            <input
              value={cedula}
              onChange={e => setCedula(e.target.value)}
              placeholder="V-12345678"
              className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none border"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">WhatsApp / Teléfono *</label>
              <input
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="0414-1234567"
                className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none border"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">PIN 4 dígitos *</label>
              <input
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="1234"
                className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none border text-center"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Correo Electrónico (opcional)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="pedro@ejemplo.com"
              className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs outline-none border"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Dirección en Papelón *</label>
            <textarea
              value={direccion}
              onChange={e => setDireccion(e.target.value)}
              rows={2}
              placeholder="Calle Bolívar frente a la plaza..."
              className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs outline-none border resize-none"
            />
          </div>

          {errorMsg && <p className="text-[11px] text-red-500 font-bold text-center">{errorMsg}</p>}

          <button type="submit" className="w-full btn-mandao py-3 text-xs font-black shadow-md mt-1">
            Crear Cuenta y Continuar
          </button>
        </form>
      </div>
    </div>
  );
};

// =================== REGISTER SOCIO MODAL ===================
export const RegisterSocioModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  tipo: 'comercio' | 'repartidor';
  onRegisterSocio: (tipo: 'comercio' | 'repartidor', data: Record<string, unknown>) => Promise<boolean>;
}> = ({ isOpen, onClose, tipo, onRegisterSocio }) => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [nombreComercio, setNombreComercio] = useState('');
  const [categoria, setCategoria] = useState('Comidas Rápidas');
  const [banco, setBanco] = useState('Banesco (0134)');
  const [vehiculo, setVehiculo] = useState('Bicicleta');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onRegisterSocio(tipo, {
      nombre,
      apellido,
      cedula,
      telefono,
      email,
      nombre_comercio: nombreComercio,
      categoria,
      banco_pago_movil: banco,
      vehiculo,
    });
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[380px] rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-heading font-black text-sm text-[#141416]">
            {tipo === 'comercio' ? '🏪 Afiliar mi Comercio' : '🚲 Postularme como Repartidor'}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs border" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Apellido *</label>
              <input value={apellido} onChange={e => setApellido(e.target.value)} required className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Cédula *</label>
              <input value={cedula} onChange={e => setCedula(e.target.value)} required placeholder="V-12345678" className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs font-mono border" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">WhatsApp *</label>
              <input value={telefono} onChange={e => setTelefono(e.target.value)} required placeholder="0414-1234567" className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs font-mono border" />
            </div>
          </div>

          {tipo === 'comercio' ? (
            <>
              <div>
                <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Nombre del Local / Restaurante *</label>
                <input value={nombreComercio} onChange={e => setNombreComercio(e.target.value)} required placeholder="Ej. Hamburguesas El Sol" className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs border" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Banco para Pago Móvil *</label>
                <input value={banco} onChange={e => setBanco(e.target.value)} placeholder="Banesco (0134)" className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs border" />
              </div>
            </>
          ) : (
            <div>
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Tipo de Vehículo *</label>
              <select value={vehiculo} onChange={e => setVehiculo(e.target.value)} className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs border">
                <option value="Bicicleta">Bicicleta</option>
                <option value="Moto">Moto</option>
                <option value="A pie">A pie (hiperlocal)</option>
              </select>
            </div>
          )}

          <button type="submit" className="w-full btn-mandao py-3 text-xs font-black shadow-md mt-1">
            Enviar Solicitud
          </button>
        </form>
      </div>
    </div>
  );
};

// =================== DISH MODAL ===================
export const DishModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  producto: Producto | null;
  onSave: (data: { nombre: string; descripcion: string; precio: number; categoria: string; foto_emoji: string }) => void;
}> = ({ isOpen, onClose, producto, onSave }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('3.50');
  const [categoria, setCategoria] = useState('Comidas Rápidas');
  const [emoji, setEmoji] = useState('🍔');

  useEffect(() => {
    if (producto) {
      setNombre(producto.nombre);
      setDescripcion(producto.descripcion || '');
      setPrecio(String(producto.precio));
      setCategoria(producto.categoria || 'Comidas Rápidas');
      setEmoji(producto.foto_emoji || '🍔');
    } else {
      setNombre('');
      setDescripcion('');
      setPrecio('3.50');
      setEmoji('🍔');
    }
  }, [producto, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onSave({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio: parseFloat(precio) || 1,
      categoria,
      foto_emoji: emoji,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[360px] rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-heading font-black text-sm text-[#141416]">
            {producto ? 'Editar Plato' : 'Nuevo Plato'}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="flex gap-2 items-center">
            <input
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className="w-12 h-12 text-center text-2xl bg-[#F4F4F6] rounded-2xl border"
            />
            <div className="flex-1">
              <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Nombre del Plato *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Hamburguesa Especial" className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs border" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Precio (USD) *</label>
            <input type="number" step="0.1" value={precio} onChange={e => setPrecio(e.target.value)} required className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold border" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Descripción de Ingredientes</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} placeholder="Carne 150g, queso, tocineta..." className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs border resize-none" />
          </div>

          <button type="submit" className="w-full btn-mandao py-2.5 text-xs font-black shadow-md">
            Guardar Plato
          </button>
        </form>
      </div>
    </div>
  );
};

// =================== RATING MODAL ===================
export const RatingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  pedidoId: string | null;
  onCalificar: (pedidoId: string, califComercio: number, califRepartidor?: number) => void;
}> = ({ isOpen, onClose, pedidoId, onCalificar }) => {
  const [comStars, setComStars] = useState(5);
  const [repStars, setRepStars] = useState(5);

  if (!isOpen || !pedidoId) return null;

  const handleSubmit = () => {
    onCalificar(pedidoId, comStars, repStars);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[340px] rounded-3xl p-5 shadow-2xl text-center space-y-4">
        <div>
          <h3 className="font-heading font-black text-base text-[#141416]">¡Tu opinión vale mucho!</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Califica tu pedido #{pedidoId}</p>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-xs font-bold text-neutral-700 block mb-1">Calidad de la Comida</span>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setComStars(s)} className="text-2xl active:scale-90">
                  {s <= comStars ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-neutral-700 block mb-1">Servicio del Repartidor</span>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRepStars(s)} className="text-2xl active:scale-90">
                  {s <= repStars ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} className="w-full btn-mandao py-3 text-xs font-black shadow-md">
          Enviar Calificación
        </button>
      </div>
    </div>
  );
};

// =================== FRAUD MODAL ===================
export const FraudModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  pedidoId: string | null;
  clienteCedula: string;
  onReportar: (pedidoId: string, clienteCedula: string, motivo: string) => void;
}> = ({ isOpen, onClose, pedidoId, clienteCedula, onReportar }) => {
  const [motivo, setMotivo] = useState('Comprobante de pago falso');

  if (!isOpen || !pedidoId) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[340px] rounded-3xl p-5 shadow-2xl space-y-3">
        <h4 className="font-heading font-black text-sm text-red-600">Reportar Fraude de Pago</h4>
        <p className="text-xs text-neutral-600">
          Esta acción cancelará la orden #{pedidoId} y vetará al cliente ({clienteCedula}).
        </p>

        <select value={motivo} onChange={e => setMotivo(e.target.value)} className="w-full bg-[#F4F4F6] rounded-xl p-2 text-xs border">
          <option value="Comprobante de pago falso">Comprobante de pago falso</option>
          <option value="Transferencia no recibida en banco">Transferencia no recibida en banco</option>
          <option value="Cliente no contesta llamadas">Cliente no contesta llamadas</option>
        </select>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-neutral-100 text-neutral-700 py-2 rounded-full text-xs font-bold">
            Cancelar
          </button>
          <button
            onClick={() => {
              onReportar(pedidoId, clienteCedula, motivo);
              onClose();
            }}
            className="flex-1 bg-red-600 text-white py-2 rounded-full text-xs font-bold"
          >
            Confirmar Veto
          </button>
        </div>
      </div>
    </div>
  );
};

// =================== ADMIN PIN MODAL [97] ===================
export const AdminPinModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  motivo: string;
  onSuccess: () => void;
  onValidarPin: (pin: string) => Promise<boolean>;
}> = ({ isOpen, onClose, motivo, onSuccess, onValidarPin }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleVerify = async () => {
    setErrorMsg('');
    const ok = await onValidarPin(pin);
    if (ok) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg('PIN de administrador incorrecto.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[320px] rounded-3xl p-5 shadow-2xl text-center space-y-3">
        <span className="text-2xl">🔐</span>
        <h4 className="font-heading font-black text-sm text-[#141416]">Verificación de Super Admin</h4>
        <p className="text-xs text-neutral-500">
          Ingresa tu PIN de administración para {motivo}:
        </p>

        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder="••••"
          className="w-full bg-[#F4F4F6] rounded-xl py-2 text-center text-lg font-mono font-bold tracking-widest outline-none border"
        />

        {errorMsg && <p className="text-[11px] text-red-500 font-bold">{errorMsg}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 bg-neutral-100 text-neutral-700 py-2 rounded-full text-xs font-bold">
            Cancelar
          </button>
          <button onClick={handleVerify} className="flex-1 btn-mandao py-2 rounded-full text-xs font-black">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// =================== MY ACCOUNT MODAL ===================
export const MyAccountModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onActualizar: (data: { telefono?: string; direccion?: string }) => void;
}> = ({ isOpen, onClose, currentUser, onActualizar }) => {
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  useEffect(() => {
    if (currentUser) {
      setTelefono(currentUser.telefono || '');
      setDireccion(currentUser.direccion_guardada || '');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[360px] rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-heading font-black text-sm text-[#141416]">Mi Perfil Mandao</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs">✕</button>
        </div>

        <div className="bg-[#F8F8FA] p-3 rounded-2xl text-xs space-y-1">
          <p className="font-bold text-neutral-900">{currentUser.nombre} {currentUser.apellido}</p>
          <p className="text-neutral-500 font-mono text-[11px]">{currentUser.cedula}</p>
          <p className="text-amber-600 font-bold text-[10.5px]">Rol: {currentUser.rol.toUpperCase()}</p>
          <p className="text-neutral-500 text-[10px]">Pedidos completados: {currentUser.pedidos_completados || 0}</p>
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Teléfono</label>
          <input value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs font-mono border" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-600 block mb-0.5">Dirección habitual</label>
          <textarea value={direccion} onChange={e => setDireccion(e.target.value)} rows={2} className="w-full bg-[#F4F4F6] rounded-xl px-2.5 py-1.5 text-xs border resize-none" />
        </div>

        <button
          onClick={() => {
            onActualizar({ telefono, direccion });
            onClose();
          }}
          className="w-full btn-mandao py-2.5 text-xs font-black shadow-md"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

// =================== EDIT COMMERCE MODAL ===================
export const EditComercioModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  comercio: Comercio | null;
  onSave: (id: string, data: Partial<Comercio>) => void;
}> = ({ isOpen, onClose, comercio, onSave }) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tiempo, setTiempo] = useState('20-30 min');

  useEffect(() => {
    if (comercio) {
      setNombre(comercio.nombre);
      setTelefono(comercio.telefono || '');
      setTiempo(comercio.tiempo_estimado || '20-30 min');
    }
  }, [comercio, isOpen]);

  if (!isOpen || !comercio) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[340px] rounded-3xl p-5 shadow-2xl space-y-3">
        <h4 className="font-heading font-black text-sm text-[#141416]">Editar Comercio</h4>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" className="w-full bg-[#F4F4F6] rounded-xl p-2 text-xs border" />
        <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Teléfono" className="w-full bg-[#F4F4F6] rounded-xl p-2 text-xs border" />
        <input value={tiempo} onChange={e => setTiempo(e.target.value)} placeholder="Tiempo estimado" className="w-full bg-[#F4F4F6] rounded-xl p-2 text-xs border" />
        <button
          onClick={() => {
            onSave(comercio.id_comercio, { nombre, telefono, tiempo_estimado: tiempo });
            onClose();
          }}
          className="w-full btn-mandao py-2.5 text-xs font-black"
        >
          Guardar
        </button>
      </div>
    </div>
  );
};

// =================== EDIT RIDER MODAL ===================
export const EditRepartidorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  repartidor: Repartidor | null;
  onSave: (id: string, data: Partial<Repartidor>) => void;
}> = ({ isOpen, onClose, repartidor, onSave }) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [vehiculo, setVehiculo] = useState('Bicicleta');

  useEffect(() => {
    if (repartidor) {
      setNombre(repartidor.nombre);
      setTelefono(repartidor.telefono || '');
      setVehiculo(repartidor.vehiculo || 'Bicicleta');
    }
  }, [repartidor, isOpen]);

  if (!isOpen || !repartidor) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[340px] rounded-3xl p-5 shadow-2xl space-y-3">
        <h4 className="font-heading font-black text-sm text-[#141416]">Editar Repartidor</h4>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" className="w-full bg-[#F4F4F6] rounded-xl p-2 text-xs border" />
        <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Teléfono" className="w-full bg-[#F4F4F6] rounded-xl p-2 text-xs border" />
        <select value={vehiculo} onChange={e => setVehiculo(e.target.value)} className="w-full bg-[#F4F4F6] rounded-xl p-2 text-xs border">
          <option value="Bicicleta">Bicicleta</option>
          <option value="Moto">Moto</option>
          <option value="A pie">A pie</option>
        </select>
        <button
          onClick={() => {
            onSave(repartidor.id_repartidor, { nombre, telefono, vehiculo });
            onClose();
          }}
          className="w-full btn-mandao py-2.5 text-xs font-black"
        >
          Guardar
        </button>
      </div>
    </div>
  );
};

// =================== CONFIRM MODAL ===================
export const ConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  icon?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  isOpen,
  title,
  message,
  icon = '⚠️',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[340px] rounded-3xl p-5 shadow-2xl text-center space-y-3">
        <span className="text-3xl block">{icon}</span>
        <h4 className="font-heading font-black text-sm text-[#141416]">{title}</h4>
        <p className="text-xs text-neutral-600 whitespace-pre-line">{message}</p>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2.5 rounded-full text-xs font-bold">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-full text-xs font-black text-white ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#141416] hover:bg-black'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// =================== GPS NOTICE MODAL [56] ===================
export const GpsNoticeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-[340px] rounded-3xl p-5 shadow-2xl text-center space-y-3">
        <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xl mx-auto shadow-sm">
          📍
        </div>
        <h4 className="font-heading font-black text-sm text-[#141416]">Activa tu ubicación en el navegador</h4>
        <p className="text-xs text-neutral-600 leading-relaxed">
          Para que el repartidor encuentre tu casa en Papelón, tu navegador necesita permiso de GPS.
        </p>
        <div className="bg-[#F8F8FA] p-3 rounded-2xl text-[11px] text-left text-neutral-700 space-y-1">
          <p><strong>1.</strong> Toca el ícono del candado 🔒 en la barra de direcciones.</p>
          <p><strong>2.</strong> En "Ubicación", selecciona "Permitir".</p>
          <p><strong>3.</strong> Vuelve a tocar "Capturar GPS".</p>
        </div>
        <button onClick={onClose} className="w-full btn-mandao py-2.5 text-xs font-black">
          Entendido
        </button>
      </div>
    </div>
  );
};
