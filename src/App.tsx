import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  UserRole,
  Comercio,
  Producto,
  Pedido,
  Repartidor,
  SolicitudSocio,
  VetoCliente,
  ConfigGlobal,
  ItemCarrito,
  ReporteCruzado,
  RegistroSOS,
  CierreCaja,
  PagoRegistro,
  AuditLog,
} from './types/mandao';
import {
  MandaoStorage,
  getDatosCompletos,
  loginUsuario,
  registrarCliente,
  actualizarDatosCliente,
  solicitarRegistroSocio,
  aprobarSolicitud,
  rechazarSolicitud,
  eliminarSolicitud,
  crearPedido,
  validarPagoYEnviarACocina,
  marcarListoParaRetiro,
  tomarPedidoRepartidor,
  marcarLlego,
  validarPinYEntregar,
  marcarEntregadoPorComercio,
  calificarPedido,
  reportarFraude,
  quitarVeto,
  cancelarPedidoConMotivo,
  eliminarPedido,
  crearProductoComercio,
  editarProductoComercio,
  toggleDisponibilidadProducto,
  eliminarProductoComercio,
  toggleComercioAbierto,
  togglePatrocinadoComercio,
  toggleOfertaFlashComercio,
  toggleRepartidorServicio,
  editarComercio,
  eliminarComercio,
  reactivarComercio,
  editarRepartidor,
  eliminarRepartidor,
  reactivarRepartidor,
  suspenderUsuario,
  reactivarUsuario,
  validarAdminPin,
  actualizarConfigGlobal,
  enviarMensajeChat,
  crearReporteCruzado,
  aprobarSancionReporte,
  descartarReporte,
  registrarEventoSOS,
  marcarPagoComercio,
  marcarPagoRepartidor,
  ejecutarCierreDiario,
  normalizarCedula,
} from './services/storage';
import { playSonido, vibrar } from './utils/audio';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Header } from './components/Header';
import { ClientePanel } from './components/ClientePanel';
import { ComercioPanel } from './components/ComercioPanel';
import { RepartidorPanel } from './components/RepartidorPanel';
import { AdminPanel } from './components/AdminPanel';
import {
  CartModal,
  OrderCelebrationModal,
  ChatModal,
  ReporteModal,
  SosModal,
  TutorialModal,
  FaqModal,
  PrivacyModal,
  AccessModal,
  LoginModal,
  RegisterClientModal,
  RegisterSocioModal,
  DishModal,
  RatingModal,
  FraudModal,
  AdminPinModal,
  MyAccountModal,
  EditComercioModal,
  EditRepartidorModal,
  ConfirmModal,
} from './components/Modals';

export default function App() {
  // App Core State
  const [activeRole, setActiveRole] = useState<UserRole>('cliente');
  const [currentUser, setCurrentUser] = useState<User | null>(() => MandaoStorage.getCurrentUser());
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [rankingRepartidores, setRankingRepartidores] = useState<Repartidor[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudSocio[]>([]);
  const [vetados, setVetados] = useState<VetoCliente[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [reportes, setReportes] = useState<ReporteCruzado[]>([]);
  const [sosList, setSosList] = useState<RegistroSOS[]>([]);
  const [cierres, setCierres] = useState<CierreCaja[]>([]);
  const [pagos, setPagos] = useState<PagoRegistro[]>([]);
  const [auditoria, setAuditoria] = useState<AuditLog[]>([]);
  const [config, setConfig] = useState<ConfigGlobal>(() => MandaoStorage.getConfig());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cart & Feedback State
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [cartPulse, setCartPulse] = useState(false);

  // Sound State
  const [sonidoComercio, setSonidoComercio] = useState(true);
  const [sonidoRepartidor, setSonidoRepartidor] = useState(true);
  const prevPedidosRef = useRef<Pedido[]>([]);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (text: string, type: 'ok' | 'err' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  };

  // Modals visibility
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccessMenuOpen, setIsAccessMenuOpen] = useState(false);
  const [loginModalState, setLoginModalState] = useState<{ isOpen: boolean; role: UserRole }>({
    isOpen: false,
    role: 'cliente',
  });
  const [isRegisterClientOpen, setIsRegisterClientOpen] = useState(false);
  const [registerSocioState, setRegisterSocioState] = useState<{ isOpen: boolean; tipo: 'comercio' | 'repartidor' }>({
    isOpen: false,
    tipo: 'comercio',
  });
  const [celebrationState, setCelebrationState] = useState<{ isOpen: boolean; pedidoId: string; pin: string }>({
    isOpen: false,
    pedidoId: '',
    pin: '',
  });
  const [chatModalState, setChatModalState] = useState<{ isOpen: boolean; pedidoId: string | null }>({
    isOpen: false,
    pedidoId: null,
  });
  const [reporteModalState, setReporteModalState] = useState<{ isOpen: boolean; pedidoId?: string }>({
    isOpen: false,
  });
  const [sosModalState, setSosModalState] = useState<{
    isOpen: boolean;
    rol: 'cliente' | 'comercio' | 'repartidor';
    pedidoId?: string;
  }>({
    isOpen: false,
    rol: 'cliente',
  });
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isMyAccountOpen, setIsMyAccountOpen] = useState(false);
  const [dishModalState, setDishModalState] = useState<{ isOpen: boolean; producto: Producto | null }>({
    isOpen: false,
    producto: null,
  });
  const [ratingModalState, setRatingModalState] = useState<{ isOpen: boolean; pedidoId: string | null }>({
    isOpen: false,
    pedidoId: null,
  });
  const [fraudModalState, setFraudModalState] = useState<{ isOpen: boolean; pedidoId: string | null; clienteCedula: string }>({
    isOpen: false,
    pedidoId: null,
    clienteCedula: '',
  });
  const [adminPinModalState, setAdminPinModalState] = useState<{
    isOpen: boolean;
    motivo: string;
    onSuccess: () => void;
  }>({
    isOpen: false,
    motivo: '',
    onSuccess: () => {},
  });
  const [editComercioModal, setEditComercioModal] = useState<{ isOpen: boolean; comercio: Comercio | null }>({
    isOpen: false,
    comercio: null,
  });
  const [editRepartidorModal, setEditRepartidorModal] = useState<{ isOpen: boolean; repartidor: Repartidor | null }>({
    isOpen: false,
    repartidor: null,
  });
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    icon?: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const currentUserRef = useRef<User | null>(currentUser);
  currentUserRef.current = currentUser;

  const sonidoComercioRef = useRef(sonidoComercio);
  sonidoComercioRef.current = sonidoComercio;

  const sonidoRepartidorRef = useRef(sonidoRepartidor);
  sonidoRepartidorRef.current = sonidoRepartidor;

  // Sound & State change notifications [65]
  const detectarCambiosSonido = useCallback((actPedidos: Pedido[], prevPedidos: Pedido[]) => {
    if (prevPedidos.length === 0) return;

    const currUser = currentUserRef.current;
    const soundCom = sonidoComercioRef.current;
    const soundRep = sonidoRepartidorRef.current;

    actPedidos.forEach(p => {
      const antiguo = prevPedidos.find(x => x.id_pedido === p.id_pedido);

      // New order for commerce
      if (!antiguo && currUser?.rol === 'comercio' && p.comercio_id === currUser.id_referencia && p.estado === 'Pendiente') {
        if (soundCom) {
          playSonido('alerta');
          vibrar();
        }
        addToast(`🔔 ¡Nuevo pedido #${p.id_pedido}!`, 'ok');
      }

      // Order becomes ready for riders
      if (antiguo && antiguo.estado === 'Preparando' && p.estado === 'Listo') {
        if (currUser?.rol === 'repartidor' && soundRep) {
          // [64] Special cha-ching sound if order has tip!
          if (Number(p.propina) > 0) {
            playSonido('chaching');
            vibrar([150, 100, 300]);
            addToast(`💰 ¡Pedido con propina +$${Number(p.propina).toFixed(2)} listo #${p.id_pedido}!`, 'ok');
          } else {
            playSonido('alerta');
            vibrar();
            addToast(`🔔 Pedido listo para retiro #${p.id_pedido}`, 'ok');
          }
        }
      }

      // Order arrives at destination for client [67]
      if (antiguo && antiguo.estado !== 'Llegó' && p.estado === 'Llegó') {
        if (currUser && normalizarCedula(currUser.cedula) === normalizarCedula(p.cliente_cedula)) {
          playSonido('suave');
          vibrar([200, 200, 200]);
          addToast(`🚴 ¡Tu repartidor ha llegado a tu puerta! #${p.id_pedido}`, 'ok');
        }
      }
    });
  }, []);

  // Load Database Data
  const loadData = useCallback(async (showFeedback = false) => {
    setIsRefreshing(true);
    try {
      const data = await getDatosCompletos(currentUserRef.current?.cedula);
      if (data.success) {
        if (data.config) setConfig(data.config);
        if (data.comercios) setComercios(data.comercios);
        if (data.pedidos) {
          detectarCambiosSonido(data.pedidos, prevPedidosRef.current);
          setPedidos(data.pedidos);
          prevPedidosRef.current = data.pedidos;
        }
        if (data.repartidores) setRepartidores(data.repartidores);
        if (data.rankingRepartidores) setRankingRepartidores(data.rankingRepartidores);
        if (data.vetados) setVetados(data.vetados);

        setSolicitudes(MandaoStorage.getSolicitudes());
        setUsuarios(MandaoStorage.getUsuarios());
        setReportes(MandaoStorage.getReportes());
        setSosList(MandaoStorage.getSOS());
        setCierres(MandaoStorage.getCierres());
        setPagos(MandaoStorage.getPagos());
        setAuditoria(MandaoStorage.getAuditoria());

        // Extract products
        const allProds: Producto[] = [];
        data.comercios?.forEach(c => {
          c.productos?.forEach(p => {
            allProds.push({
              ...p,
              _comercio_nombre: c.nombre,
              _logo_emoji: c.logo_emoji,
            });
          });
        });
        setProductos(allProds);

        if (data.usuario) {
          setCurrentUser(data.usuario);
        }

        if (data.suspendido) {
          addToast(`⚠️ ${data.motivoSuspension}`, 'err');
        }

        if (showFeedback) {
          addToast('✅ Datos sincronizados', 'ok');
        }
      }
    } catch (err: unknown) {
      console.warn('Error loading data:', err);
      if (showFeedback) addToast('Error de conexión local', 'err');
    } finally {
      setIsRefreshing(false);
    }
  }, [detectarCambiosSonido]);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 20000);

    const onStorageChange = () => {
      loadData();
    };

    window.addEventListener('mandao_db_change', onStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mandao_db_change', onStorageChange);
    };
  }, [loadData]);

  // [51], [52], [53] Handle Add to Cart - Non-intrusive, pop sound, pulsing cart icon!
  const handleAddToCart = (prod: Producto) => {
    // [51] If cart contains items from a DIFFERENT store, ask for confirmation
    if (carrito.length > 0 && carrito[0].id_comercio !== prod.id_comercio) {
      const comActual = comercios.find(c => c.id_comercio === carrito[0].id_comercio)?.nombre || 'otro comercio';
      const comNuevo = comercios.find(c => c.id_comercio === prod.id_comercio)?.nombre || 'este comercio';

      setConfirmState({
        isOpen: true,
        title: '¿Cambiar de comercio?',
        message: `Tu carrito tiene platos de ${comActual}.\n\n¿Deseas vaciarlo y agregar este plato de ${comNuevo}?`,
        icon: '🛍️',
        confirmText: 'Sí, vaciar y cambiar',
        cancelText: 'Conservar actual',
        isDanger: false,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          setCarrito([{ ...prod, cantidad: 1 }]);
          playSonido('pop');
          setCartPulse(true);
          setTimeout(() => setCartPulse(false), 400);
          addToast(`✅ Agregado al carrito (${prod.nombre})`, 'ok');
        },
      });
      return;
    }

    // Add directly to cart without opening modal [52]
    setCarrito(prev => {
      const idx = prev.findIndex(item => item.id_producto === prod.id_producto);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].cantidad += 1;
        return copy;
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });

    // Sound and non-blocking discrete toast [52], [53], [65]
    playSonido('pop');
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 400);
    addToast('✅ Agregado al carrito', 'ok');
  };

  const handleModifyCartQuantity = (prodId: string, delta: number) => {
    setCarrito(prev => {
      return prev
        .map(item => {
          if (item.id_producto === prodId) {
            return { ...item, cantidad: item.cantidad + delta };
          }
          return item;
        })
        .filter(item => item.cantidad > 0);
    });
  };

  // Submit Order & Trigger Confetti Celebration [66]
  const handleSubmitOrder = async (orderData: {
    nombre: string;
    telefono: string;
    direccion: string;
    lat: number;
    lng: number;
    referencia: string;
    nota?: string;
    propina: number;
  }) => {
    if (!currentUser || carrito.length === 0) return;

    const currentComId = carrito[0].id_comercio;
    const com = comercios.find(c => c.id_comercio === currentComId);
    if (!com) return;

    const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const envio = com.delivery_gratis ? 0 : config.tarifa_bicicleta || 1.0;
    const total = subtotal + envio + orderData.propina;
    const detalle = carrito.map(i => `${i.cantidad}x ${i.nombre}`).join(' + ');

    const res = await crearPedido({
      cliente_cedula: currentUser.cedula,
      cliente_nombre: orderData.nombre,
      cliente_telefono: orderData.telefono,
      cliente_direccion: orderData.direccion,
      lat_cliente: orderData.lat,
      lng_cliente: orderData.lng,
      comercio_id: com.id_comercio,
      comercio_nombre: com.nombre,
      detalle_items: detalle,
      subtotal,
      tarifa_envio: envio,
      propina: orderData.propina,
      total,
      referencia_pago: orderData.referencia,
      nota_cliente: orderData.nota,
    });

    if (res.success && res.id_pedido && res.pin_entrega) {
      setCarrito([]);
      setIsCartOpen(false);
      playSonido('exito');
      vibrar([150, 100, 200]);

      // [66] Show Confetti Celebration Modal
      setCelebrationState({
        isOpen: true,
        pedidoId: res.id_pedido,
        pin: res.pin_entrega,
      });

      loadData();
    } else {
      playSonido('error');
      addToast(res.error || 'Error al procesar pedido', 'err');
    }
  };

  const handleRequireAdminPin = (motivo: string, accion: () => void) => {
    setAdminPinModalState({
      isOpen: true,
      motivo,
      onSuccess: accion,
    });
  };

  const activeOrderForChat = pedidos.find(p => p.id_pedido === chatModalState.pedidoId) || null;

  return (
    <div className="w-full h-full flex flex-col bg-[#0E0E12] select-none">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />

      {/* Main Global Header */}
      <Header
        titulo={config.titulo_app}
        pueblo={config.nombre_pueblo}
        currentUser={currentUser}
        activeRole={activeRole}
        isRefreshing={isRefreshing}
        cartCount={carrito.reduce((s, i) => s + i.cantidad, 0)}
        cartPulse={cartPulse}
        onRefresh={() => loadData(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAccessModal={() => setIsAccessMenuOpen(true)}
        onQuickSwitchRole={role => {
          setActiveRole(role);
          addToast(`Cambiado a vista de ${role}`, 'info');
        }}
      />

      {/* Main View Area based on Role */}
      <main className="flex-1 overflow-hidden relative">
        {activeRole === 'cliente' && (
          <ClientePanel
            comercios={comercios}
            productos={productos}
            pedidos={pedidos}
            currentUser={currentUser}
            config={config}
            carrito={carrito}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenRatingModal={pedId => setRatingModalState({ isOpen: true, pedidoId: pedId })}
            onOpenChatModal={pedId => setChatModalState({ isOpen: true, pedidoId: pedId })}
            onOpenSosModal={(rol, pedId) => setSosModalState({ isOpen: true, rol, pedidoId: pedId })}
            onOpenFaqModal={() => setIsFaqOpen(true)}
            onOpenPrivacyModal={() => setIsPrivacyOpen(true)}
            onOpenTutorial={() => setIsTutorialOpen(true)}
          />
        )}

        {activeRole === 'comercio' && (
          <ComercioPanel
            comercios={comercios}
            productos={productos}
            pedidos={pedidos}
            currentUser={currentUser}
            config={config}
            sonidoActivo={sonidoComercio}
            onToggleSonido={() => setSonidoComercio(prev => !prev)}
            onToggleComercioAbierto={async (cid, abierto) => {
              await toggleComercioAbierto(cid, abierto);
              loadData();
            }}
            onValidarPago={async pid => {
              await validarPagoYEnviarACocina(pid);
              playSonido('ok' as any);
              addToast(`Pedido #${pid} enviado a cocina`, 'ok');
              loadData();
            }}
            onMarcarListo={async pid => {
              await marcarListoParaRetiro(pid);
              playSonido('campana');
              addToast(`Pedido #${pid} listo para retiro`, 'ok');
              loadData();
            }}
            onMarcarEntregadoPorComercio={async pid => {
              await marcarEntregadoPorComercio(pid);
              addToast(`Pedido #${pid} entregado por el comercio`, 'ok');
              loadData();
            }}
            onCancelarPedidoComercio={pid => {
              setConfirmState({
                isOpen: true,
                title: '¿Cancelar pedido?',
                message: `¿Estás seguro de cancelar el pedido #${pid}? Se notificará al cliente y repartidor.`,
                isDanger: true,
                onConfirm: async () => {
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                  await cancelarPedidoConMotivo(pid, currentUser?.id_referencia || 'Comercio', 'Cancelado por el comercio', 'comercio');
                  addToast(`Pedido #${pid} cancelado`, 'info');
                  loadData();
                },
              });
            }}
            onOpenFraudeModal={(pid, ced) => setFraudModalState({ isOpen: true, pedidoId: pid, clienteCedula: ced })}
            onOpenDishModal={prod => setDishModalState({ isOpen: true, producto: prod || null })}
            onToggleDisponibilidadProducto={async (prodId, disp) => {
              await toggleDisponibilidadProducto(prodId, disp);
              loadData();
            }}
            onEliminarProducto={prodId => {
              setConfirmState({
                isOpen: true,
                title: '¿Eliminar plato?',
                message: '¿Deseas eliminar este plato de tu menú?',
                isDanger: true,
                onConfirm: async () => {
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                  await eliminarProductoComercio(prodId);
                  loadData();
                },
              });
            }}
            onOpenReporteModal={pedId => setReporteModalState({ isOpen: true, pedidoId: pedId })}
            onOpenSosModal={(rol, pedId) => setSosModalState({ isOpen: true, rol, pedidoId: pedId })}
            onOpenRegistroSocio={tipo => setRegisterSocioState({ isOpen: true, tipo })}
          />
        )}

        {activeRole === 'repartidor' && (
          <RepartidorPanel
            repartidores={repartidores}
            rankingRepartidores={rankingRepartidores}
            pedidos={pedidos}
            currentUser={currentUser}
            config={config}
            sonidoActivo={sonidoRepartidor}
            onToggleSonido={() => setSonidoRepartidor(prev => !prev)}
            onToggleServicio={async (rid, enServ) => {
              await toggleRepartidorServicio(rid, enServ);
              loadData();
            }}
            onTomarPedido={async pid => {
              const rId = currentUser?.id_referencia || repartidores[0]?.id_repartidor || 'REP-1';
              const rName = currentUser ? `${currentUser.nombre} ${currentUser.apellido}` : repartidores[0]?.nombre || 'Repartidor';
              await tomarPedidoRepartidor(pid, rId, rName);
              playSonido('pop');
              addToast(`Has tomado el pedido #${pid}. ¡A pedalear! 🚲`, 'ok');
              loadData();
            }}
            onMarcarLlego={async pid => {
              const rId = currentUser?.id_referencia || 'REP-1';
              await marcarLlego(pid, rId);
              playSonido('suave');
              addToast(`Has marcado llegada para orden #${pid}. Notificando al cliente.`, 'ok');
              loadData();
            }}
            onValidarPinEntrega={async (pid, pin) => {
              const res = await validarPinYEntregar(pid, pin);
              if (res.success) {
                playSonido('epico');
                vibrar([200, 100, 200, 100, 400]);
                addToast(`🎉 ¡Entrega completada exitosamente! Orden #${pid}`, 'ok');
                loadData();
              } else {
                playSonido('error');
                addToast(res.error || 'PIN incorrecto', 'err');
              }
            }}
            onCancelarEmergencia={pid => {
              setConfirmState({
                isOpen: true,
                title: 'Emergencia en la vía',
                message: '¿Tuviste un problema vial o avería mecánica para cancelar este viaje?',
                isDanger: true,
                onConfirm: async () => {
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                  await cancelarPedidoConMotivo(pid, currentUser?.id_referencia || 'Repartidor', 'Emergencia vial del repartidor', 'repartidor');
                  addToast(`Viaje #${pid} cancelado por emergencia`, 'info');
                  loadData();
                },
              });
            }}
            onOpenChatModal={pedId => setChatModalState({ isOpen: true, pedidoId: pedId })}
            onOpenSosModal={(rol, pedId) => setSosModalState({ isOpen: true, rol, pedidoId: pedId })}
            onOpenRegistroSocio={tipo => setRegisterSocioState({ isOpen: true, tipo })}
          />
        )}

        {activeRole === 'admin' && (
          <AdminPanel
            comercios={comercios}
            repartidores={repartidores}
            pedidos={pedidos}
            usuarios={usuarios}
            solicitudes={solicitudes}
            vetados={vetados}
            config={config}
            reportes={reportes}
            sosList={sosList}
            cierres={cierres}
            pagos={pagos}
            auditoria={auditoria}
            onLogoutAdmin={() => {
              MandaoStorage.saveCurrentUser(null);
              setCurrentUser(null);
              setActiveRole('cliente');
              addToast('Sesión de administrador cerrada', 'info');
            }}
            onAprobarSolicitud={async idS => {
              await aprobarSolicitud(idS);
              addToast('Solicitud aprobada', 'ok');
              loadData();
            }}
            onRechazarSolicitud={async idS => {
              await rechazarSolicitud(idS, 'Rechazado por administración');
              addToast('Solicitud rechazada', 'info');
              loadData();
            }}
            onEliminarSolicitud={async idS => {
              await eliminarSolicitud(idS);
              loadData();
            }}
            onTogglePatrocinado={async (cid, pat) => {
              await togglePatrocinadoComercio(cid, pat);
              loadData();
            }}
            onToggleFlash={async (cid, fl) => {
              await toggleOfertaFlashComercio(cid, fl);
              loadData();
            }}
            onToggleComercioAbierto={async (cid, ab) => {
              await toggleComercioAbierto(cid, ab);
              loadData();
            }}
            onOpenEditComercio={com => setEditComercioModal({ isOpen: true, comercio: com })}
            onEliminarComercio={async cid => {
              await eliminarComercio(cid);
              addToast('Comercio eliminado', 'info');
              loadData();
            }}
            onReactivarComercio={async cid => {
              await reactivarComercio(cid);
              loadData();
            }}
            onOpenEditRepartidor={rep => setEditRepartidorModal({ isOpen: true, repartidor: rep })}
            onEliminarRepartidor={async rid => {
              await eliminarRepartidor(rid);
              addToast('Repartidor eliminado', 'info');
              loadData();
            }}
            onReactivarRepartidor={async rid => {
              await reactivarRepartidor(rid);
              loadData();
            }}
            onVerPinSocio={() => {}}
            onCancelarPedidoAdmin={async pid => {
              await cancelarPedidoConMotivo(pid, 'Admin', 'Cancelado por Super Admin', 'admin');
              addToast(`Pedido #${pid} cancelado`, 'info');
              loadData();
            }}
            onEliminarPedidoAdmin={async pid => {
              await eliminarPedido(pid);
              loadData();
            }}
            onSuspenderUsuario={async ced => {
              await suspenderUsuario(ced, 7, 'Sanción administrativa');
              addToast(`Usuario ${ced} suspendido`, 'info');
              loadData();
            }}
            onReactivarUsuario={async ced => {
              await reactivarUsuario(ced);
              addToast(`Usuario ${ced} reactivado`, 'ok');
              loadData();
            }}
            onPerdonarVeto={async (ced, cid) => {
              await quitarVeto(ced, cid);
              addToast('Veto levantado', 'ok');
              loadData();
            }}
            onAprobarSancionReporte={async repId => {
              await aprobarSancionReporte(repId);
              addToast('Sanción aplicada (+1 strike)', 'ok');
              loadData();
            }}
            onDescartarReporte={async repId => {
              await descartarReporte(repId);
              addToast('Reporte descartado', 'info');
              loadData();
            }}
            onMarcarPagoComercio={async (cid, nombre, monto) => {
              await marcarPagoComercio(cid, nombre, monto);
              addToast(`Pago de $${monto.toFixed(2)} registrado para ${nombre}`, 'ok');
              loadData();
            }}
            onMarcarPagoRepartidor={async (rid, nombre, monto) => {
              await marcarPagoRepartidor(rid, nombre, monto);
              addToast(`Liquidación de $${monto.toFixed(2)} registrada para ${nombre}`, 'ok');
              loadData();
            }}
            onEjecutarCierreDiario={async () => {
              await ejecutarCierreDiario();
              addToast('✓ Cierre diario ejecutado y guardado en historial', 'ok');
              loadData();
            }}
            onUpdateConfig={async (k, v) => {
              await actualizarConfigGlobal(k, v);
              addToast('Configuración actualizada', 'ok');
              loadData();
            }}
            onRequireAdminPin={handleRequireAdminPin}
          />
        )}
      </main>

      {/* ================= MODALS ================= */}

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        carrito={carrito}
        comercios={comercios}
        currentUser={currentUser}
        config={config}
        onModifyQuantity={handleModifyCartQuantity}
        onSubmitOrder={handleSubmitOrder}
        onOpenRegisterClient={() => setIsRegisterClientOpen(true)}
      />

      {/* [66] Celebration Confetti Modal */}
      <OrderCelebrationModal
        isOpen={celebrationState.isOpen}
        onClose={() => setCelebrationState(prev => ({ ...prev, isOpen: false }))}
        pedidoId={celebrationState.pedidoId}
        pin={celebrationState.pin}
      />

      {/* [74] Chat Modal */}
      <ChatModal
        isOpen={chatModalState.isOpen}
        onClose={() => setChatModalState({ isOpen: false, pedidoId: null })}
        pedido={activeOrderForChat}
        currentUser={currentUser}
        onEnviarMensaje={async (pid, rem, txt) => {
          await enviarMensajeChat(pid, rem, txt);
          playSonido('pop');
          loadData();
        }}
      />

      {/* [80] Cross Report Modal */}
      <ReporteModal
        isOpen={reporteModalState.isOpen}
        onClose={() => setReporteModalState({ isOpen: false })}
        pedidoId={reporteModalState.pedidoId}
        currentUser={currentUser}
        onEnviarReporte={async data => {
          await crearReporteCruzado(data);
          addToast('Reporte enviado al Super Admin para revisión', 'ok');
          loadData();
        }}
      />

      {/* [85] SOS Emergency Modal */}
      <SosModal
        isOpen={sosModalState.isOpen}
        onClose={() => setSosModalState(prev => ({ ...prev, isOpen: false }))}
        rol={sosModalState.rol}
        pedidoId={sosModalState.pedidoId}
        config={config}
        currentUser={currentUser}
        onRegistrarSOS={async motivo => {
          await registrarEventoSOS({
            rol: sosModalState.rol,
            usuario_id: currentUser?.cedula || 'Anónimo',
            nombre: currentUser ? `${currentUser.nombre} ${currentUser.apellido}` : 'Usuario',
            motivo,
            pedido_id: sosModalState.pedidoId,
          });
          loadData();
        }}
      />

      {/* [91] Tutorial Modal */}
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />

      {/* [92] FAQ Modal */}
      <FaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} />

      {/* [90] Privacy Policy Modal */}
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

      {/* Access Navigation Drawer / Modal */}
      <AccessModal
        isOpen={isAccessMenuOpen}
        onClose={() => setIsAccessMenuOpen(false)}
        currentUser={currentUser}
        onSelectRole={role => setActiveRole(role)}
        onOpenLogin={role => setLoginModalState({ isOpen: true, role })}
        onOpenRegisterClient={() => setIsRegisterClientOpen(true)}
        onOpenRegisterSocio={tipo => setRegisterSocioState({ isOpen: true, tipo })}
        onOpenMyAccount={() => setIsMyAccountOpen(true)}
        onLogout={() => {
          MandaoStorage.saveCurrentUser(null);
          setCurrentUser(null);
          setActiveRole('cliente');
          addToast('Has cerrado sesión', 'info');
        }}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalState.isOpen}
        onClose={() => setLoginModalState(prev => ({ ...prev, isOpen: false }))}
        role={loginModalState.role}
        onLogin={async (ced, pin) => {
          const res = await loginUsuario(ced, pin);
          if (res.success && res.usuario) {
            setCurrentUser(res.usuario);
            setActiveRole(res.usuario.rol);
            addToast(`¡Bienvenido de nuevo, ${res.usuario.nombre}!`, 'ok');
            loadData();
            return true;
          }
          return false;
        }}
      />

      {/* Client Registration Modal */}
      <RegisterClientModal
        isOpen={isRegisterClientOpen}
        onClose={() => setIsRegisterClientOpen(false)}
        onRegister={async data => {
          const res = await registrarCliente(data);
          if (res.success && res.usuario) {
            setCurrentUser(res.usuario);
            setActiveRole('cliente');
            addToast(`¡Bienvenido a Mandao, ${res.usuario.nombre}!`, 'ok');
            loadData();
            return true;
          }
          return false;
        }}
      />

      {/* Partner Registration Modal */}
      <RegisterSocioModal
        isOpen={registerSocioState.isOpen}
        onClose={() => setRegisterSocioState(prev => ({ ...prev, isOpen: false }))}
        tipo={registerSocioState.tipo}
        onRegisterSocio={async (tipo, data) => {
          const res = await solicitarRegistroSocio(tipo, data);
          if (res.success) {
            addToast('✓ Solicitud enviada exitosamente. Te contactaremos pronto.', 'ok');
            loadData();
            return true;
          }
          return false;
        }}
      />

      {/* Dish Modal */}
      <DishModal
        isOpen={dishModalState.isOpen}
        onClose={() => setDishModalState({ isOpen: false, producto: null })}
        producto={dishModalState.producto}
        onSave={async data => {
          const cId = currentUser?.id_referencia || comercios[0]?.id_comercio || 'COM-BURGERS';
          if (dishModalState.producto) {
            await editarProductoComercio(dishModalState.producto.id_producto, data);
            addToast('Plato actualizado', 'ok');
          } else {
            await crearProductoComercio(cId, data);
            addToast('Nuevo plato agregado a tu menú', 'ok');
          }
          loadData();
        }}
      />

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModalState.isOpen}
        onClose={() => setRatingModalState({ isOpen: false, pedidoId: null })}
        pedidoId={ratingModalState.pedidoId}
        onCalificar={async (pid, comS, repS) => {
          await calificarPedido(pid, comS, repS);
          addToast('¡Gracias por calificar tu pedido!', 'ok');
          loadData();
        }}
      />

      {/* Fraud Modal */}
      <FraudModal
        isOpen={fraudModalState.isOpen}
        onClose={() => setFraudModalState({ isOpen: false, pedidoId: null, clienteCedula: '' })}
        pedidoId={fraudModalState.pedidoId}
        clienteCedula={fraudModalState.clienteCedula}
        onReportar={async (pid, ced, mot) => {
          const cId = currentUser?.id_referencia || 'COM-1';
          await reportarFraude(pid, ced, mot, cId);
          addToast(`Cliente ${ced} vetado y pedido reportado`, 'err');
          loadData();
        }}
      />

      {/* Admin PIN Verification Modal [97] */}
      <AdminPinModal
        isOpen={adminPinModalState.isOpen}
        onClose={() => setAdminPinModalState(prev => ({ ...prev, isOpen: false }))}
        motivo={adminPinModalState.motivo}
        onSuccess={adminPinModalState.onSuccess}
        onValidarPin={async pin => {
          const res = await validarAdminPin(currentUser?.cedula || 'V-00000000', pin);
          return res.success;
        }}
      />

      {/* My Account Modal */}
      <MyAccountModal
        isOpen={isMyAccountOpen}
        onClose={() => setIsMyAccountOpen(false)}
        currentUser={currentUser}
        onActualizar={async data => {
          if (currentUser) {
            await actualizarDatosCliente({ cedula: currentUser.cedula, ...data });
            addToast('Perfil actualizado', 'ok');
            loadData();
          }
        }}
      />

      {/* Edit Commerce Modal */}
      <EditComercioModal
        isOpen={editComercioModal.isOpen}
        onClose={() => setEditComercioModal({ isOpen: false, comercio: null })}
        comercio={editComercioModal.comercio}
        onSave={async (cid, data) => {
          await editarComercio(cid, data);
          addToast('Comercio actualizado', 'ok');
          loadData();
        }}
      />

      {/* Edit Rider Modal */}
      <EditRepartidorModal
        isOpen={editRepartidorModal.isOpen}
        onClose={() => setEditRepartidorModal({ isOpen: false, repartidor: null })}
        repartidor={editRepartidorModal.repartidor}
        onSave={async (rid, data) => {
          await editarRepartidor(rid, data);
          addToast('Repartidor actualizado', 'ok');
          loadData();
        }}
      />

      {/* Confirm Action Dialog */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        icon={confirmState.icon}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        isDanger={confirmState.isDanger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
