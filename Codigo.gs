/**
 * ==============================================================================
 * MANDAO DELIVERY HIPERLOCAL — BACKEND OFICIAL v8.0 (Google Apps Script)
 * Arquitectura Segura Google Sheets & MailApp HTML
 * ==============================================================================
 */

// ==================== CONFIGURACIÓN Y CONSTANTES ====================
var ADMIN_CREDENTIALS = {
  id: '12345678',
  pin: '0001',
  nombre: 'Admin'
};

var HOJAS = {
  CONFIG: 'CONFIG',
  USUARIOS: 'USUARIOS',
  COMERCIOS: 'COMERCIOS',
  REPARTIDORES: 'REPARTIDORES',
  PRODUCTOS: 'PRODUCTOS',
  PEDIDOS: 'PEDIDOS',
  HISTORIAL_CIERRES: 'HISTORIAL_CIERRES',
  LIQUIDACIONES: 'LIQUIDACIONES',
  SOLICITUDES: 'SOLICITUDES',
  REPORTES: 'REPORTES',
  SOS: 'SOS',
  AUDITORIA: 'AUDITORIA'
};

// ==================== ENTRYPOINTS WEB APP ====================
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : null;
  if (action === 'bcv') {
    return ContentService.createTextOutput(JSON.stringify(consultarTasaBCV()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Mandao Delivery')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  var output = { success: false, error: 'Petición vacía' };
  try {
    var contents = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var payload = JSON.parse(contents);
    var action = payload.action;
    var data = payload.data || {};

    switch (action) {
      // 1. Datos Maestros
      case 'getDatosCompletos':
        output = handleGetDatosCompletos(data.idUsuario);
        break;

      // 2. Autenticación y Registro
      case 'loginUsuario':
        output = handleLoginUsuario(data.idUsuario, data.pin);
        break;
      case 'registrarCliente':
        output = handleRegistrarCliente(data);
        break;
      case 'solicitarRegistroSocio':
        output = handleSolicitarRegistroSocio(data.tipo, data);
        break;

      // 3. Catálogo y Platos
      case 'guardarPlato':
        output = handleGuardarPlato(data);
        break;
      case 'eliminarPlato':
        output = handleEliminarPlato(data.id_producto, data.id_comercio);
        break;

      // 4. Ciclo del Pedido y Prevención de Concurrencia
      case 'crearPedido':
        output = handleCrearPedido(data);
        break;
      case 'validarPagoYPreparar':
        output = handleValidarPagoYPreparar(data.id_pedido, data.id_comercio);
        break;
      case 'marcarListoParaRetiro':
        output = handleMarcarListoParaRetiro(data.id_pedido, data.id_comercio);
        break;
      case 'tomarPedidoRepartidor':
        output = handleTomarPedidoRepartidor(data.id_pedido, data.id_repartidor, data.nombre_repartidor);
        break;
      case 'marcarPedidoRecogido':
        output = handleMarcarPedidoRecogido(data.id_pedido, data.id_repartidor);
        break;
      case 'marcarLlegadaCliente':
        output = handleMarcarLlegadaCliente(data.id_pedido, data.id_repartidor);
        break;
      case 'validarPinYEntregar':
        output = handleValidarPinYEntregar(data.id_pedido, data.pin, data.id_repartidor);
        break;
      case 'autodespachoComercio':
        output = handleAutodespachoComercio(data.id_pedido, data.pin, data.id_comercio);
        break;

      // 5. Chat y Mensajería
      case 'enviarMensajeChat':
        output = handleEnviarMensajeChat(data.id_pedido, data.remitente, data.texto);
        break;

      // 6. Emergencias y S.O.S
      case 'registrarSOS':
        output = handleRegistrarSOS(data);
        break;
      case 'resolverSOS':
        output = handleResolverSOS(data.id_sos, data.admin_pin);
        break;

      // 7. Administración y Cierre Contable
      case 'guardarConfigAdmin':
        output = handleGuardarConfigAdmin(data.config, data.pin);
        break;
      case 'liquidarPagoRepartidor':
        output = handleLiquidarPagoRepartidor(data.id_repartidor, data.monto, data.admin_pin);
        break;
      case 'registrarPagoComercio':
        output = handleRegistrarPagoComercio(data.id_comercio, data.monto, data.admin_pin);
        break;
      case 'aprobarSolicitud':
        output = handleAprobarSolicitud(data.id_solicitud, data.admin_pin);
        break;
      case 'rechazarSolicitud':
        output = handleRechazarSolicitud(data.id_solicitud, data.motivo, data.admin_pin);
        break;
      case 'actualizarGPSComercio':
        output = handleActualizarGPSComercio(data.id_comercio, data.lat, data.lng);
        break;

      default:
        output = { success: false, error: 'Acción no reconocida: ' + action };
        break;
    }
  } catch (err) {
    Logger.log('Error en doPost: ' + err.toString());
    output = { success: false, error: 'Error del servidor: ' + err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== CONEXIÓN Y HOJAS ====================
function getSS() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getHoja(nombre) {
  var ss = getSS();
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    inicializarHoja(sheet, nombre);
  }
  return sheet;
}

function inicializarHoja(sheet, nombre) {
  var encabezados = [];
  switch (nombre) {
    case HOJAS.CONFIG:
      encabezados = ['clave', 'valor', 'descripcion'];
      sheet.appendRow(encabezados);
      sheet.appendRow(['porcentaje_admin', '0.15', 'Comisión administrativa Mandao (15%)']);
      sheet.appendRow(['tasa_bcv', '60.50', 'Tasa oficial BCV en Bolívares']);
      sheet.appendRow(['fecha_tasa', new Date().toISOString().slice(0, 10), 'Última actualización tasa']);
      sheet.appendRow(['distancia_max_km', '7.0', 'Distancia máxima entre comercio y cliente']);
      sheet.appendRow(['email_admin', Session.getActiveUser().getEmail() || 'admin@mandao.com', 'Correo para avisos administrativos']);
      sheet.appendRow(['nombre_pueblo', 'Papelón', 'Municipio']);
      sheet.appendRow(['titulo_app', 'Mandao', 'Nombre app']);
      sheet.appendRow(['logo_navbar_url', '', 'URL de logo personalizado']);
      sheet.appendRow(['tarifa_bicicleta', '1.00', 'Tarifa base de envío en USD']);
      sheet.appendRow(['telefono_soporte', '+58 412-5550199', 'WhatsApp soporte']);
      break;
    case HOJAS.USUARIOS:
      encabezados = ['cedula', 'pin', 'rol', 'nombre', 'apellido', 'telefono', 'email', 'direccion', 'lat', 'lng', 'id_referencia', 'pedidos_completados', 'strikes', 'fecha_registro'];
      sheet.appendRow(encabezados);
      sheet.appendRow([ADMIN_CREDENTIALS.id, ADMIN_CREDENTIALS.pin, 'admin', 'Admin', '', '04140000000', 'admin@mandao.com', 'Central Mandao', '', '', '', '0', '0', new Date().toISOString()]);
      break;
    case HOJAS.COMERCIOS:
      encabezados = ['id_comercio', 'nombre', 'categoria', 'direccion', 'lat_comercio', 'lng_comercio', 'telefono', 'email', 'banco_pago_movil', 'telefono_pago_movil', 'cedula_pago_movil', 'titular_pago_movil', 'abierto', 'tiempo_estimado', 'logo_emoji', 'calificacion', 'total_calificaciones', 'fecha_ultimo_cambio_gps', 'activo'];
      sheet.appendRow(encabezados);
      break;
    case HOJAS.REPARTIDORES:
      encabezados = ['id_repartidor', 'nombre', 'telefono', 'email', 'vehiculo', 'en_servicio', 'ganancias_hoy', 'viajes_semana', 'viajes_mes', 'semana_actual', 'mes_actual', 'viajes_totales', 'calificacion', 'total_calificaciones', 'activo'];
      sheet.appendRow(encabezados);
      break;
    case HOJAS.PRODUCTOS:
      encabezados = ['id_producto', 'id_comercio', 'nombre', 'descripcion_corta', 'descripcion_larga', 'precio', 'categoria', 'foto_emoji', 'disponible', 'veces_vendido'];
      sheet.appendRow(encabezados);
      break;
    case HOJAS.PEDIDOS:
      encabezados = ['id_pedido', 'fecha_hora', 'cliente_cedula', 'cliente_nombre', 'cliente_telefono', 'cliente_email', 'cliente_direccion', 'lat_cliente', 'lng_cliente', 'comercio_id', 'comercio_nombre', 'detalle_items', 'subtotal', 'tarifa_envio', 'propina_bs', 'propina_usd', 'total_usd', 'referencia_pago', 'estado', 'pin_entrega', 'repartidor_id', 'repartidor_nombre', 'fase_reparto', 'hora_preparando', 'hora_listo', 'hora_recogido', 'hora_llego', 'hora_entregado', 'autodespachado', 'nota_cliente', 'mensajes_chat'];
      sheet.appendRow(encabezados);
      break;
    case HOJAS.HISTORIAL_CIERRES:
      encabezados = ['fecha', 'hora', 'id_pedido', 'comercio_id', 'comercio_nombre', 'repartidor_id', 'repartidor_nombre', 'monto_comida_usd', 'tarifa_envio_usd', 'propina_usd', 'comision_mandao_usd', 'neto_repartidor_usd'];
      sheet.appendRow(encabezados);
      break;
    case HOJAS.LIQUIDACIONES:
      encabezados = ['id_liquidacion', 'fecha_hora', 'tipo', 'entidad_id', 'nombre', 'monto_usd', 'admin_id', 'notas'];
      sheet.appendRow(encabezados);
      break;
    case HOJAS.SOLICITUDES:
      encabezados = ['id_solicitud', 'tipo', 'cedula', 'nombre', 'apellido', 'telefono', 'email', 'datos_json', 'fecha', 'estado', 'motivo'];
      sheet.appendRow(encabezados);
      break;
    case HOJAS.SOS:
      encabezados = ['id_sos', 'fecha_hora', 'rol', 'usuario_id', 'nombre', 'motivo', 'id_pedido', 'estado'];
      sheet.appendRow(encabezados);
      break;
    case HOJAS.AUDITORIA:
      encabezados = ['fecha_hora', 'usuario', 'accion', 'tabla', 'detalle'];
      sheet.appendRow(encabezados);
      break;
  }
}

// ==================== TASA BCV AUTOMÁTICA [12] ====================
function consultarTasaBCV() {
  var tasa = 60.50;
  var fecha = new Date().toISOString().slice(0, 10);
  try {
    var response = UrlFetchApp.fetch('https://pydolarve.org/api/v1/dollar?page=bcv', { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var json = JSON.parse(response.getContentText());
      if (json && json.monitors && json.monitors.usd && json.monitors.usd.price) {
        tasa = Number(json.monitors.usd.price);
      }
    }
  } catch (e) {
    Logger.log('Fallback tasa BCV: ' + e.toString());
  }

  // Guardar en hoja CONFIG
  guardarConfigValor('tasa_bcv', tasa.toFixed(2));
  guardarConfigValor('fecha_tasa', fecha);

  return { tasa: tasa, fecha: fecha };
}

// Trigger diario a las 6:00 AM para actualizar tasa
function triggerActualizarBCVDiario() {
  consultarTasaBCV();
}

// ==================== CIERRE CONTABLE AUTOMÁTICO 2:00 AM [13] ====================
function triggerCierreContable2AM() {
  var ss = getSS();
  var hojaPedidos = getHoja(HOJAS.PEDIDOS);
  var hojaCierres = getHoja(HOJAS.HISTORIAL_CIERRES);
  var hojaRepartidores = getHoja(HOJAS.REPARTIDORES);

  var datos = hojaPedidos.getDataRange().getValues();
  if (datos.length <= 1) return;

  var pctAdmin = Number(getConfigValor('porcentaje_admin')) || 0.15;
  var hoyStr = new Date().toISOString().slice(0, 10);
  var horaStr = new Date().toLocaleTimeString();

  // Escanear pedidos entregados hoy y registrar detalle en HISTORIAL_CIERRES
  for (var i = 1; i < datos.length; i++) {
    var estado = datos[i][18];
    var fechaHora = datos[i][1];
    if (estado === 'Entregado' && String(fechaHora).indexOf(hoyStr) >= 0) {
      var idPed = datos[i][0];
      var comId = datos[i][9];
      var comNom = datos[i][10];
      var subtotal = Number(datos[i][12]) || 0;
      var envio = Number(datos[i][13]) || 0;
      var propinaUSD = Number(datos[i][15]) || 0;
      var repId = datos[i][20] || 'COMERCIO';
      var repNom = datos[i][21] || 'Autodespacho';

      var comisionMandao = (envio + propinaUSD) * pctAdmin;
      var netoRepartidor = (envio + propinaUSD) * (1 - pctAdmin);

      hojaCierres.appendRow([
        hoyStr,
        horaStr,
        idPed,
        comId,
        comNom,
        repId,
        repNom,
        subtotal,
        envio,
        propinaUSD,
        comisionMandao,
        netoRepartidor
      ]);
    }
  }

  // Reiniciar ganancias_hoy de repartidores a las 2 AM
  var reps = hojaRepartidores.getDataRange().getValues();
  for (var r = 1; r < reps.length; r++) {
    hojaRepartidores.getRange(r + 1, 7).setValue(0); // ganancias_hoy
  }

  // Limpiar alertas S.O.S mayores a 24 horas [11]
  limpiarAlertasSOSAntiguas();

  Logger.log('Cierre contable de las 2:00 AM completado con éxito.');
}

// Limpieza de SOS mayores a 24 horas [11]
function limpiarAlertasSOSAntiguas() {
  var hoja = getHoja(HOJAS.SOS);
  var datos = hoja.getDataRange().getValues();
  if (datos.length <= 1) return;
  var limite = Date.now() - (24 * 60 * 60 * 1000);
  for (var i = 1; i < datos.length; i++) {
    var fecha = new Date(datos[i][1]).getTime();
    if (fecha < limite && datos[i][7] === 'pendiente') {
      hoja.getRange(i + 1, 8).setValue('expirado_24h');
    }
  }
}

// Trigger Dominical: Aviso de deuda a comercios [16], [17]
function triggerAvisoDominicalComercios() {
  var hojaCierres = getHoja(HOJAS.HISTORIAL_CIERRES);
  var hojaComercios = getHoja(HOJAS.COMERCIOS);
  var datosCierres = hojaCierres.getDataRange().getValues();
  var datosComercios = hojaComercios.getDataRange().getValues();

  var deudasPorComercio = {};
  for (var i = 1; i < datosCierres.length; i++) {
    var cid = datosCierres[i][3];
    var tarifaEnvio = Number(datosCierres[i][8]) || 0;
    deudasPorComercio[cid] = (deudasPorComercio[cid] || 0) + tarifaEnvio;
  }

  for (var c = 1; c < datosComercios.length; c++) {
    var comId = datosComercios[c][0];
    var nombreCom = datosComercios[c][1];
    var emailCom = datosComercios[c][7];
    var deuda = deudasPorComercio[comId] || 0;

    if (emailCom && deuda > 0) {
      enviarCorreoHTML(
        emailCom,
        'Corte Semanal Mandao: Balance de Entregas al Cobro',
        construirTemplateCorreo(
          'Balance Semanal Mandao',
          'Hola ' + nombreCom + ', te informamos que el corte de tu semana arrojó un total de <strong>$' + deuda.toFixed(2) + ' USD</strong> recaudados por concepto de delivery. Recuerda realizar la conciliación correspondiente mañana lunes antes del mediodía.'
        )
      );
    }
  }
}

// ==================== SISTEMA DE CORREOS AUTOMATIZADOS (HTML) [17] ====================
function enviarCorreoHTML(destinatario, asunto, cuerpoHTML) {
  if (!destinatario || destinatario.indexOf('@') < 0) return;
  try {
    MailApp.sendEmail({
      to: destinatario,
      subject: 'Mandao Delivery — ' + asunto,
      htmlBody: cuerpoHTML
    });
  } catch (err) {
    Logger.log('Error enviando correo a ' + destinatario + ': ' + err.toString());
  }
}

function construirTemplateCorreo(titulo, contenidoPrincipal) {
  var appTitle = getConfigValor('titulo_app') || 'Mandao Delivery';
  return '<div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0E0E12; color: #FFFFFF; border-radius: 16px; overflow: hidden; padding: 24px; border: 1px solid #282832;">' +
    '<div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #FFCC00;">' +
      '<h1 style="color: #FFCC00; font-size: 24px; margin: 0; font-weight: 900;">' + appTitle + '</h1>' +
      '<p style="color: #A0A0B0; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Plataforma Hiperlocal de Entregas</p>' +
    '</div>' +
    '<div style="padding: 24px 8px; font-size: 14px; line-height: 1.6; color: #E4E4EB;">' +
      '<h2 style="font-size: 18px; color: #FFFFFF; margin-top: 0;">' + titulo + '</h2>' +
      contenidoPrincipal +
    '</div>' +
    '<div style="border-top: 1px solid #282832; padding-top: 16px; text-align: center; font-size: 11px; color: #787888;">' +
      'Mensaje automático generado por ' + appTitle + ' Papelón. Por favor no respondas a este correo.' +
    '</div>' +
  '</div>';
}

// ==================== CONTROLADORES Y LÓGICA DE NEGOCIO ====================

// [1] Lectura de Datos Maestros
function handleGetDatosCompletos(idUsuario) {
  var ss = getSS();
  var config = obtenerTodaLaConfig();
  var comercios = leerObjetos(ss.getSheetByName(HOJAS.COMERCIOS));
  var productos = leerObjetos(ss.getSheetByName(HOJAS.PRODUCTOS));
  var repartidores = leerObjetos(ss.getSheetByName(HOJAS.REPARTIDORES));
  var pedidos = leerObjetos(ss.getSheetByName(HOJAS.PEDIDOS));
  var solicitudes = leerObjetos(ss.getSheetByName(HOJAS.SOLICITUDES));
  var sosList = leerObjetos(ss.getSheetByName(HOJAS.SOS));
  var auditoria = leerObjetos(ss.getSheetByName(HOJAS.AUDITORIA));

  // Vincular productos a comercios
  comercios.forEach(function(c) {
    c.productos = productos.filter(function(p) { return p.id_comercio === c.id_comercio; });
  });

  // [14] Top Mensual Repartidores: Mostrar solo al #1 Campeón
  var topCampeon = null;
  if (repartidores.length > 0) {
    var ordenadosMes = repartidores.slice().sort(function(a, b) {
      return (Number(b.viajes_mes) || 0) - (Number(a.viajes_mes) || 0);
    });
    if (ordenadosMes[0] && Number(ordenadosMes[0].viajes_mes) > 0) {
      topCampeon = ordenadosMes[0];
    }
  }

  // Usuario actual
  var usuario = null;
  if (idUsuario) {
    var cN = String(idUsuario).trim().toUpperCase();
    var usuarios = leerObjetos(ss.getSheetByName(HOJAS.USUARIOS));
    usuario = usuarios.find(function(u) { return String(u.cedula).toUpperCase() === cN; });
  }

  return {
    success: true,
    config: config,
    comercios: comercios,
    repartidores: repartidores,
    pedidos: pedidos,
    solicitudes: solicitudes,
    sosList: sosList,
    auditoria: auditoria,
    topCampeon: topCampeon,
    usuario: usuario
  };
}

// [2] Login y Credenciales Fijas Admin
function handleLoginUsuario(idUsuario, pin) {
  var id = String(idUsuario || '').trim();
  var p = String(pin || '').trim();

  // Validación fija Admin: ID 12345678 / PIN 0001 [2]
  if (id === ADMIN_CREDENTIALS.id) {
    if (p === ADMIN_CREDENTIALS.pin) {
      return {
        success: true,
        usuario: {
          cedula: ADMIN_CREDENTIALS.id,
          nombre: ADMIN_CREDENTIALS.nombre,
          apellido: '',
          rol: 'admin',
          es_admin: true,
          email: getConfigValor('email_admin') || 'admin@mandao.com'
        }
      };
    } else {
      return { success: false, error: 'PIN de administración incorrecto.' };
    }
  }

  var hoja = getHoja(HOJAS.USUARIOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).toUpperCase() === id.toUpperCase()) {
      if (String(datos[i][1]) === p) {
        return {
          success: true,
          usuario: {
            cedula: datos[i][0],
            rol: datos[i][2],
            nombre: datos[i][3],
            apellido: datos[i][4],
            telefono: datos[i][5],
            email: datos[i][6],
            direccion: datos[i][7],
            id_referencia: datos[i][10]
          }
        };
      } else {
        return { success: false, error: 'PIN incorrecto.' };
      }
    }
  }

  return { success: false, error: 'Usuario no registrado.' };
}

// [1] Registro Cliente con Correo Obligatorio
function handleRegistrarCliente(data) {
  if (!data.email || data.email.indexOf('@') < 0) {
    return { success: false, error: 'El correo electrónico es estrictamente obligatorio.' };
  }
  if (!data.cedula || !data.nombre || !data.telefono || !data.direccion) {
    return { success: false, error: 'Completa todos los campos obligatorios.' };
  }

  var hoja = getHoja(HOJAS.USUARIOS);
  var datos = hoja.getDataRange().getValues();
  var cedNorm = String(data.cedula).trim().toUpperCase();

  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).toUpperCase() === cedNorm) {
      return { success: false, error: 'Esta cédula ya está registrada. Inicia sesión.' };
    }
  }

  hoja.appendRow([
    cedNorm,
    data.pin || '1234',
    'cliente',
    data.nombre.trim(),
    (data.apellido || '').trim(),
    data.telefono.trim(),
    data.email.trim(),
    data.direccion.trim(),
    data.lat || '',
    data.lng || '',
    '',
    0,
    0,
    new Date().toISOString()
  ]);

  return {
    success: true,
    usuario: {
      cedula: cedNorm,
      rol: 'cliente',
      nombre: data.nombre.trim(),
      apellido: (data.apellido || '').trim(),
      telefono: data.telefono.trim(),
      email: data.email.trim(),
      direccion: data.direccion.trim()
    }
  };
}

// [1] Solicitud de Socio con Correo Obligatorio y Sin Método de Retiro
function handleSolicitarRegistroSocio(tipo, data) {
  if (!data.email || data.email.indexOf('@') < 0) {
    return { success: false, error: 'El correo electrónico es estrictamente obligatorio para validar tu cuenta.' };
  }
  if (tipo === 'comercio' && (!data.lat || !data.lng)) {
    return { success: false, error: 'El comercio debe capturar su ubicación GPS in situ obligatoriamente.' };
  }

  var hoja = getHoja(HOJAS.SOLICITUDES);
  var idSol = 'SOL-' + Math.random().toString(36).slice(2, 9).toUpperCase();

  hoja.appendRow([
    idSol,
    tipo,
    String(data.cedula || '').trim().toUpperCase(),
    data.nombre || '',
    data.apellido || '',
    data.telefono || '',
    data.email || '',
    JSON.stringify(data),
    new Date().toISOString(),
    'pendiente',
    ''
  ]);

  // [17] Aviso por correo al Admin
  var emailAdmin = getConfigValor('email_admin');
  if (emailAdmin) {
    enviarCorreoHTML(
      emailAdmin,
      'Nueva Solicitud de Afiliación (' + tipo.toUpperCase() + ')',
      construirTemplateCorreo(
        'Nueva Solicitud Registrada',
        '<p>Se ha recibido una postulación de socio para el rol <strong>' + tipo.toUpperCase() + '</strong>.</p>' +
        '<p><strong>Nombre:</strong> ' + data.nombre + ' ' + data.apellido + '<br>' +
        '<strong>Cédula:</strong> ' + data.cedula + '<br>' +
        '<strong>WhatsApp:</strong> ' + data.telefono + '<br>' +
        '<strong>Correo:</strong> ' + data.email + '</p>' +
        '<p>Ingresa al panel Admin para revisar y validar en un plazo máximo de 72 horas.</p>'
      )
    );
  }

  return {
    success: true,
    id_solicitud: idSol,
    bannerAviso: 'Atento a tu correo/WhatsApp. Validaremos tu perfil en 72 hrs.'
  };
}

// [5] Catálogo con Descripción Corta y Larga
function handleGuardarPlato(data) {
  var hoja = getHoja(HOJAS.PRODUCTOS);
  var datos = hoja.getDataRange().getValues();

  var idProd = data.id_producto || ('PROD-' + Math.random().toString(36).slice(2, 8).toUpperCase());
  var filaEncontrada = -1;

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idProd) {
      filaEncontrada = i + 1;
      break;
    }
  }

  var filaData = [
    idProd,
    data.id_comercio,
    data.nombre,
    data.descripcion_corta || '',
    data.descripcion_larga || '',
    Number(data.precio) || 1,
    data.categoria || 'Comidas Rápidas',
    data.foto_emoji || '🍽️',
    data.disponible !== false,
    data.veces_vendido || 0
  ];

  if (filaEncontrada > 0) {
    hoja.getRange(filaEncontrada, 1, 1, filaData.length).setValues([filaData]);
  } else {
    hoja.appendRow(filaData);
  }

  return { success: true, id_producto: idProd };
}

function handleEliminarPlato(idProducto, idComercio) {
  var hoja = getHoja(HOJAS.PRODUCTOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idProducto && datos[i][1] === idComercio) {
      hoja.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Plato no encontrado' };
}

// [6], [7], [9], [10] Ciclo de Pedido y Concurrencia
function handleCrearPedido(data) {
  // [7] Validar distancia máxima entre Comercio y Cliente
  var hojaComercios = getHoja(HOJAS.COMERCIOS);
  var comercios = leerObjetos(hojaComercios);
  var com = comercios.find(function(c) { return c.id_comercio === data.comercio_id; });
  if (!com) return { success: false, error: 'Comercio no válido' };

  if (com.lat_comercio && com.lng_comercio && data.lat_cliente && data.lng_cliente) {
    var dist = calcularDistanciaKM(Number(com.lat_comercio), Number(com.lng_comercio), Number(data.lat_cliente), Number(data.lng_cliente));
    var distMax = Number(getConfigValor('distancia_max_km')) || 7.0;
    if (dist > distMax) {
      return {
        success: false,
        error: 'Tu ubicación se encuentra a ' + dist.toFixed(1) + ' km del comercio. El límite máximo de entrega para este local es de ' + distMax + ' km.'
      };
    }
  }

  // [12] Conversión de propina: ingresada en Bs, validar mínimo $0.01
  var tasaBCV = Number(getConfigValor('tasa_bcv')) || 60.50;
  var propinaBs = Number(data.propina_bs) || 0;
  var propinaUSD = propinaBs > 0 ? (propinaBs / tasaBCV) : 0;
  if (propinaBs > 0 && propinaUSD < 0.01) {
    return { success: false, error: 'La propina mínima en Bolívares debe ser equivalente a $0.01 USD.' };
  }

  var subtotal = Number(data.subtotal) || 0;
  var envio = Number(data.tarifa_envio) || 1.0;
  var totalUSD = subtotal + envio + propinaUSD;

  var pinEntrega = Math.floor(1000 + Math.random() * 9000).toString();
  var idPed = 'PED-' + Math.floor(1000 + Math.random() * 9000).toString();

  var hojaPedidos = getHoja(HOJAS.PEDIDOS);
  hojaPedidos.appendRow([
    idPed,
    new Date().toISOString(),
    data.cliente_cedula,
    data.cliente_nombre,
    data.cliente_telefono,
    data.cliente_email || '',
    data.cliente_direccion,
    data.lat_cliente,
    data.lng_cliente,
    data.comercio_id,
    data.comercio_nombre,
    data.detalle_items,
    subtotal,
    envio,
    propinaBs,
    Number(propinaUSD.toFixed(2)),
    Number(totalUSD.toFixed(2)),
    data.referencia_pago,
    'Pendiente',
    pinEntrega,
    '', // repartidor_id
    '', // repartidor_nombre
    'Fase 1', // fase_reparto
    '', // hora_preparando
    '', // hora_listo
    '', // hora_recogido
    '', // hora_llego
    '', // hora_entregado
    false,
    data.nota_cliente || '',
    '[]'
  ]);

  // [17] Correo al Comercio informando el nuevo pedido
  if (com.email) {
    enviarCorreoHTML(
      com.email,
      '¡Nuevo Pedido Recibido #' + idPed + '!',
      construirTemplateCorreo(
        'Nuevo Pedido por Validar',
        '<p>Has recibido la orden <strong>#' + idPed + '</strong> de ' + data.cliente_nombre + '.</p>' +
        '<p><strong>Platos:</strong> ' + data.detalle_items + '<br>' +
        '<strong>Total:</strong> $' + totalUSD.toFixed(2) + ' USD<br>' +
        '<strong>Referencia Pago Móvil:</strong> ' + data.referencia_pago + '</p>' +
        '<p>Ingresa a tu panel de comercio para validar el pago y enviar a preparación.</p>'
      )
    );
  }

  return {
    success: true,
    id_pedido: idPed,
    pin_entrega: pinEntrega
  };
}

// [9] Alerta temprana a repartidores al pasar a "Preparando"
function handleValidarPagoYPreparar(idPedido, idComercio) {
  var hoja = getHoja(HOJAS.PEDIDOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idPedido && datos[i][9] === idComercio) {
      hoja.getRange(i + 1, 19).setValue('Preparando');
      hoja.getRange(i + 1, 24).setValue(new Date().toISOString());

      // [17] Notificar por correo a TODOS los repartidores activos para que se vayan acercando
      notificarRepartidoresEnPreparacion(idPedido, datos[i][10], datos[i][14]);
      return { success: true };
    }
  }
  return { success: false, error: 'Pedido no encontrado' };
}

function notificarRepartidoresEnPreparacion(idPed, nombreComercio, propinaBs) {
  var hojaRep = getHoja(HOJAS.REPARTIDORES);
  var reps = leerObjetos(hojaRep);
  var emails = reps
    .filter(function(r) { return r.en_servicio && r.email; })
    .map(function(r) { return r.email; });

  if (emails.length > 0) {
    var asunto = 'Orden en Preparación en ' + nombreComercio + ' (Acércate)';
    var msg = construirTemplateCorreo(
      'Nuevo Pedido Preparándose',
      '<p>La orden <strong>#' + idPed + '</strong> ha comenzado a prepararse en <strong>' + nombreComercio + '</strong>.</p>' +
      (Number(propinaBs) > 0 ? '<p style="color:#FFCC00; font-weight:bold;">💰 ¡Incluye propina extra en Bolívares!</p>' : '') +
      '<p>Mantente atento en tu panel para tomar el pedido en cuanto esté listo.</p>'
    );
    emails.forEach(function(em) {
      enviarCorreoHTML(em, asunto, msg);
    });
  }
}

function handleMarcarListoParaRetiro(idPedido, idComercio) {
  var hoja = getHoja(HOJAS.PEDIDOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idPedido && datos[i][9] === idComercio) {
      hoja.getRange(i + 1, 19).setValue('Listo');
      hoja.getRange(i + 1, 25).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  return { success: false, error: 'Pedido no encontrado' };
}

// [9] Concurrencia Atómica en Servidor al Tomar Pedido
function handleTomarPedidoRepartidor(idPedido, idRepartidor, nombreRepartidor) {
  var hoja = getHoja(HOJAS.PEDIDOS);
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Bloqueo atómico contra carreras
    var datos = hoja.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] === idPedido) {
        var estado = datos[i][18];
        var repActual = datos[i][20];
        if (repActual && String(repActual).trim() !== '') {
          return { success: false, error: 'Este pedido ya fue tomado por otro repartidor.' };
        }
        if (estado !== 'Listo') {
          return { success: false, error: 'El pedido ya no está disponible para tomar.' };
        }

        // Asignar repartidor en Fase 1 (Solo Comercio visible) [6]
        hoja.getRange(i + 1, 19).setValue('En camino');
        hoja.getRange(i + 1, 21).setValue(idRepartidor);
        hoja.getRange(i + 1, 22).setValue(nombreRepartidor);
        hoja.getRange(i + 1, 23).setValue('Fase 1');

        // Notificar al cliente por correo [17]
        var emailCliente = datos[i][5];
        if (emailCliente) {
          enviarCorreoHTML(
            emailCliente,
            'Repartidor Asignado a tu Pedido #' + idPedido,
            construirTemplateCorreo(
              'Repartidor en Camino al Comercio',
              '<p>Tu repartidor <strong>' + nombreRepartidor + '</strong> ha tomado tu orden y se dirige a retirar tus alimentos.</p>'
            )
          );
        }

        return { success: true, fase: 'Fase 1' };
      }
    }
    return { success: false, error: 'Pedido no encontrado.' };
  } catch (e) {
    return { success: false, error: 'Error de concurrencia: ' + e.message };
  } finally {
    lock.releaseLock();
  }
}

// [6] Transición a Fase 2: "Pedido Recogido"
function handleMarcarPedidoRecogido(idPedido, idRepartidor) {
  var hoja = getHoja(HOJAS.PEDIDOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idPedido && datos[i][20] === idRepartidor) {
      hoja.getRange(i + 1, 23).setValue('Fase 2'); // Revela dirección de cliente
      hoja.getRange(i + 1, 26).setValue(new Date().toISOString());

      // [17] Disparar alerta y correo al cliente
      var emailCli = datos[i][5];
      if (emailCli) {
        enviarCorreoHTML(
          emailCli,
          '¡Tu comida va en camino!',
          construirTemplateCorreo(
            '¡Comida Recogida y en Camino! 🚲',
            '<p>El repartidor ya recogió tus alimentos en el comercio y va directo a tu dirección.</p>' +
            '<p style="color:#FFCC00; font-size:16px; font-weight:bold;">Recuerda tener a mano tu PIN de entrega: ' + datos[i][19] + '</p>'
          )
        );
      }

      return {
        success: true,
        fase: 'Fase 2',
        cliente_direccion: datos[i][6],
        lat_cliente: datos[i][7],
        lng_cliente: datos[i][8]
      };
    }
  }
  return { success: false, error: 'Pedido no asignado a este repartidor' };
}

function handleMarcarLlegadaCliente(idPedido, idRepartidor) {
  var hoja = getHoja(HOJAS.PEDIDOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idPedido && datos[i][20] === idRepartidor) {
      hoja.getRange(i + 1, 19).setValue('Llegó');
      hoja.getRange(i + 1, 27).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  return { success: false, error: 'Pedido no encontrado' };
}

// [6] Entrega exitosa con PIN
function handleValidarPinYEntregar(idPedido, pin, idRepartidor) {
  var hoja = getHoja(HOJAS.PEDIDOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idPedido && datos[i][20] === idRepartidor) {
      if (String(datos[i][19]).trim() !== String(pin).trim()) {
        return { success: false, error: 'PIN incorrecto. Solicítalo al cliente en su puerta.' };
      }

      hoja.getRange(i + 1, 19).setValue('Entregado');
      hoja.getRange(i + 1, 28).setValue(new Date().toISOString());

      // Actualizar balances del Repartidor
      actualizarMetricasEntregaRepartidor(idRepartidor, Number(datos[i][13]), Number(datos[i][15]));

      // [17] Correo de entrega completada al Comercio
      notificarEntregaAComercio(datos[i][9], idPedido);

      return { success: true };
    }
  }
  return { success: false, error: 'Pedido no encontrado' };
}

// [10] Autodespacho (Rescate) tras 15 minutos sin repartidor
function handleAutodespachoComercio(idPedido, pin, idComercio) {
  var hoja = getHoja(HOJAS.PEDIDOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idPedido && datos[i][9] === idComercio) {
      var horaListo = datos[i][24];
      if (!horaListo) return { success: false, error: 'El pedido debe estar marcado como Listo.' };

      var minEspera = Math.floor((Date.now() - new Date(horaListo).getTime()) / 60000);
      if (minEspera < 15) {
        return { success: false, error: 'El autodespacho solo se habilita tras 15 minutos de espera sin repartidor (Han pasado ' + minEspera + ' min).' };
      }

      if (String(datos[i][19]).trim() !== String(pin).trim()) {
        return { success: false, error: 'PIN incorrecto. Debes pedir el PIN al cliente en su puerta.' };
      }

      hoja.getRange(i + 1, 19).setValue('Entregado');
      hoja.getRange(i + 1, 22).setValue('Comercio (Autodespacho)');
      hoja.getRange(i + 1, 28).setValue(new Date().toISOString());
      hoja.getRange(i + 1, 29).setValue(true); // autodespachado

      return { success: true };
    }
  }
  return { success: false, error: 'Pedido no encontrado' };
}

function notificarEntregaAComercio(comercioId, idPedido) {
  var coms = leerObjetos(getHoja(HOJAS.COMERCIOS));
  var com = coms.find(function(c) { return c.id_comercio === comercioId; });
  if (com && com.email) {
    enviarCorreoHTML(
      com.email,
      'Orden #' + idPedido + ' Entregada con Éxito',
      construirTemplateCorreo(
        'Entrega Finalizada',
        '<p>La orden <strong>#' + idPedido + '</strong> ha sido entregada y verificada mediante PIN seguro.</p>'
      )
    );
  }
}

function actualizarMetricasEntregaRepartidor(idRepartidor, envio, propinaUSD) {
  var hojaRep = getHoja(HOJAS.REPARTIDORES);
  var reps = hojaRep.getDataRange().getValues();
  var pctAdmin = Number(getConfigValor('porcentaje_admin')) || 0.15;
  var gananciaNeto = (envio + propinaUSD) * (1 - pctAdmin);

  for (var r = 1; r < reps.length; r++) {
    if (reps[r][0] === idRepartidor) {
      var gHoy = (Number(reps[r][6]) || 0) + gananciaNeto;
      var vSem = (Number(reps[r][7]) || 0) + 1;
      var vMes = (Number(reps[r][8]) || 0) + 1;
      var vTot = (Number(reps[r][11]) || 0) + 1;

      hojaRep.getRange(r + 1, 7).setValue(Number(gHoy.toFixed(2)));
      hojaRep.getRange(r + 1, 8).setValue(vSem);
      hojaRep.getRange(r + 1, 9).setValue(vMes);
      hojaRep.getRange(r + 1, 12).setValue(vTot);
      break;
    }
  }
}

// [7] Actualizar GPS Comercio con Bloqueo de 31 Días
function handleActualizarGPSComercio(idComercio, lat, lng) {
  var hoja = getHoja(HOJAS.COMERCIOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idComercio) {
      var ultimoCambio = datos[i][17];
      if (ultimoCambio) {
        var dias = Math.floor((Date.now() - new Date(ultimoCambio).getTime()) / 86400000);
        if (dias < 31) {
          return { success: false, error: 'Seguridad: Solo puedes cambiar la ubicación GPS del local cada 31 días. Faltan ' + (31 - dias) + ' días.' };
        }
      }

      hoja.getRange(i + 1, 5).setValue(lat);
      hoja.getRange(i + 1, 6).setValue(lng);
      hoja.getRange(i + 1, 18).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  return { success: false, error: 'Comercio no encontrado' };
}

// [2] Guardado Manual Admin con Validación de PIN
function handleGuardarConfigAdmin(nuevaConfig, pin) {
  if (String(pin).trim() !== ADMIN_CREDENTIALS.pin) {
    return { success: false, error: 'PIN de seguridad de administración incorrecto (0001).' };
  }

  var hoja = getHoja(HOJAS.CONFIG);
  var datos = hoja.getDataRange().getValues();

  Object.keys(nuevaConfig).forEach(function(clave) {
    var val = nuevaConfig[clave];
    var encontrada = false;
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] === clave) {
        hoja.getRange(i + 1, 2).setValue(val);
        encontrada = true;
        break;
      }
    }
    if (!encontrada) {
      hoja.appendRow([clave, val, 'Configuración']);
    }
  });

  return { success: true };
}

// [17] Liquidación Semanal a Repartidores con Aviso por Correo
function handleLiquidarPagoRepartidor(idRepartidor, monto, adminPin) {
  if (String(adminPin).trim() !== ADMIN_CREDENTIALS.pin) {
    return { success: false, error: 'PIN incorrecto' };
  }

  var hojaLiq = getHoja(HOJAS.LIQUIDACIONES);
  var idLiq = 'LIQ-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  var hojaRep = getHoja(HOJAS.REPARTIDORES);
  var reps = leerObjetos(hojaRep);
  var rep = reps.find(function(r) { return r.id_repartidor === idRepartidor; });

  hojaLiq.appendRow([
    idLiq,
    new Date().toISOString(),
    'repartidor',
    idRepartidor,
    rep ? rep.nombre : idRepartidor,
    Number(monto),
    ADMIN_CREDENTIALS.id,
    'Saldado'
  ]);

  if (rep && rep.email) {
    enviarCorreoHTML(
      rep.email,
      '¡Tu pago semanal ha sido liquidado!',
      construirTemplateCorreo(
        'Liquidación Semanal Saldada',
        '<p>Hola ' + rep.nombre + ', se ha registrado la liquidación de tus entregas por un total de <strong>$' + Number(monto).toFixed(2) + ' USD</strong>.</p>' +
        '<p>¡Gracias por ser parte del equipo de repartidores de Mandao!</p>'
      )
    );
  }

  return { success: true };
}

function handleRegistrarPagoComercio(idComercio, monto, adminPin) {
  if (String(adminPin).trim() !== ADMIN_CREDENTIALS.pin) {
    return { success: false, error: 'PIN incorrecto' };
  }
  var hojaLiq = getHoja(HOJAS.LIQUIDACIONES);
  var idLiq = 'PAG-C-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  var coms = leerObjetos(getHoja(HOJAS.COMERCIOS));
  var com = coms.find(function(c) { return c.id_comercio === idComercio; });

  hojaLiq.appendRow([
    idLiq,
    new Date().toISOString(),
    'comercio',
    idComercio,
    com ? com.nombre : idComercio,
    Number(monto),
    ADMIN_CREDENTIALS.id,
    'Pago de tarifas recaudadas'
  ]);

  return { success: true };
}

// [8] Chat Inteligente
function handleEnviarMensajeChat(idPedido, remitente, texto) {
  var hoja = getHoja(HOJAS.PEDIDOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idPedido) {
      var chatJson = datos[i][30] || '[]';
      var msgs = [];
      try { msgs = JSON.parse(chatJson); } catch(e) { msgs = []; }

      msgs.push({
        id: 'msg-' + Math.random().toString(36).slice(2, 8),
        remitente: remitente,
        texto: String(texto).slice(0, 200),
        fecha: new Date().toISOString()
      });

      hoja.getRange(i + 1, 31).setValue(JSON.stringify(msgs));
      return { success: true, mensajes: msgs };
    }
  }
  return { success: false, error: 'Pedido no encontrado' };
}

// [11] S.O.S
function handleRegistrarSOS(data) {
  var hoja = getHoja(HOJAS.SOS);
  var idSos = 'SOS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  hoja.appendRow([
    idSos,
    new Date().toISOString(),
    data.rol,
    data.usuario_id,
    data.nombre,
    data.motivo,
    data.id_pedido || '',
    'pendiente'
  ]);
  return { success: true, id_sos: idSos };
}

function handleResolverSOS(idSos, adminPin) {
  if (String(adminPin).trim() !== ADMIN_CREDENTIALS.pin) {
    return { success: false, error: 'PIN incorrecto' };
  }
  var hoja = getHoja(HOJAS.SOS);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idSos) {
      hoja.getRange(i + 1, 8).setValue('resuelto');
      return { success: true };
    }
  }
  return { success: false, error: 'SOS no encontrado' };
}

// Aprobación de socios
function handleAprobarSolicitud(idSolicitud, adminPin) {
  if (String(adminPin).trim() !== ADMIN_CREDENTIALS.pin) {
    return { success: false, error: 'PIN incorrecto' };
  }
  var hojaSol = getHoja(HOJAS.SOLICITUDES);
  var sols = hojaSol.getDataRange().getValues();
  for (var i = 1; i < sols.length; i++) {
    if (sols[i][0] === idSolicitud) {
      var tipo = sols[i][1];
      var ced = sols[i][2];
      var nom = sols[i][3];
      var ape = sols[i][4];
      var tel = sols[i][5];
      var email = sols[i][6];
      var datos = {};
      try { datos = JSON.parse(sols[i][7]); } catch(e) {}

      if (tipo === 'comercio') {
        var idC = 'COM-' + Math.random().toString(36).slice(2, 7).toUpperCase();
        getHoja(HOJAS.COMERCIOS).appendRow([
          idC,
          datos.nombre_comercio || nom,
          datos.categoria || 'Comidas Rápidas',
          datos.direccion || 'Papelón',
          datos.lat || '',
          datos.lng || '',
          tel,
          email,
          datos.banco_pago_movil || 'Banesco',
          datos.telefono_pago_movil || tel,
          datos.cedula_pago_movil || ced,
          datos.titular_pago_movil || (nom + ' ' + ape),
          true,
          '20-30 min',
          '🏪',
          0,
          0,
          new Date().toISOString(),
          true
        ]);
        crearUsuarioInterno(ced, 'comercio', nom, ape, tel, email, idC);
      } else {
        var idR = 'REP-' + Math.random().toString(36).slice(2, 7).toUpperCase();
        getHoja(HOJAS.REPARTIDORES).appendRow([
          idR,
          nom + ' ' + ape,
          tel,
          email,
          datos.vehiculo || 'Bicicleta',
          true,
          0, 0, 0,
          getSemanaActual(),
          new Date().toISOString().slice(0, 7),
          0, 0, 0, true
        ]);
        crearUsuarioInterno(ced, 'repartidor', nom, ape, tel, email, idR);
      }

      hojaSol.getRange(i + 1, 10).setValue('aprobado');
      return { success: true };
    }
  }
  return { success: false, error: 'Solicitud no encontrada' };
}

function handleRechazarSolicitud(idSolicitud, motivo, adminPin) {
  if (String(adminPin).trim() !== ADMIN_CREDENTIALS.pin) {
    return { success: false, error: 'PIN incorrecto' };
  }
  var hoja = getHoja(HOJAS.SOLICITUDES);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idSolicitud) {
      hoja.getRange(i + 1, 10).setValue('rechazado');
      hoja.getRange(i + 1, 11).setValue(motivo || 'No cumple requisitos');
      return { success: true };
    }
  }
  return { success: false, error: 'Solicitud no encontrada' };
}

function crearUsuarioInterno(ced, rol, nom, ape, tel, email, idRef) {
  getHoja(HOJAS.USUARIOS).appendRow([
    ced,
    '1234',
    rol,
    nom,
    ape,
    tel,
    email,
    'Papelón',
    '', '',
    idRef,
    0, 0,
    new Date().toISOString()
  ]);
}

// ==================== UTILIDADES ====================
function calcularDistanciaKM(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLon = ((lon2 - lon1) * Math.PI) / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function getSemanaActual() {
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  var yearStart = new Date(d.getFullYear(), 0, 1);
  var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return d.getFullYear() + '-W' + ('0' + weekNo).slice(-2);
}

function leerObjetos(hoja) {
  if (!hoja) return [];
  var datos = hoja.getDataRange().getValues();
  if (datos.length <= 1) return [];
  var headers = datos[0];
  var lista = [];
  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    var obj = {};
    for (var h = 0; h < headers.length; h++) {
      obj[headers[h]] = fila[h];
    }
    lista.push(obj);
  }
  return lista;
}

function getConfigValor(clave) {
  var hoja = getHoja(HOJAS.CONFIG);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === clave) return datos[i][1];
  }
  return null;
}

function guardarConfigValor(clave, valor) {
  var hoja = getHoja(HOJAS.CONFIG);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === clave) {
      hoja.getRange(i + 1, 2).setValue(valor);
      return;
    }
  }
  hoja.appendRow([clave, valor, 'Configuración']);
}

function obtenerTodaLaConfig() {
  var hoja = getHoja(HOJAS.CONFIG);
  var datos = hoja.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < datos.length; i++) {
    config[datos[i][0]] = datos[i][1];
  }
  return config;
}
