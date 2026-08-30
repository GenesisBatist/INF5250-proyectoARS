(function () {
  const STORAGE_KEYS = {
    users: 'ars_users',
    afiliados: 'ars_afiliados',
    clinicas: 'ars_clinicas',
    polizas: 'ars_polizas',
    autorizaciones: 'ars_autorizaciones',
    servicios: 'ars_servicios_realizados',
    facturas: 'ars_facturas',
    auditoria: 'ars_auditoria',
    currentUser: 'ars_current_user'
  };

  const PLAN_COVERAGE_CATALOG = {
    basico: ['Consulta general', 'Emergencia', 'Laboratorio'],
    familiar: ['Consulta general', 'Emergencia', 'Laboratorio', 'Pediatría', 'Ginecología'],
    premium: ['Consulta general', 'Emergencia', 'Laboratorio', 'Cirugía ambulatoria', 'Rayos X', 'Sonografía', 'Internamiento'],
    empresarial: ['Consulta general', 'Emergencia', 'Laboratorio', 'Cirugía ambulatoria', 'Rayos X', 'Sonografía', 'Internamiento', 'Tomografía', 'Maternidad']
  };

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function uid(prefix) { return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000); }
  function today() { return new Date().toLocaleString(); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function isBlank(v) { return String(v ?? '').trim() === ''; }
  function formatMoney(v) { return `RD$ ${Number(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
  function getHomeByRole(rol) {
    const map = { agente: 'agente-dashboard.html', clinica: 'clinica-dashboard.html', afiliado: 'afiliado-dashboard.html' };
    return map[rol] || 'examples/seleccion-rol.html';
  }
  function getTarifas() {
    return [
      { servicio: 'Consulta general', precio: 1500 },
      { servicio: 'Emergencia', precio: 3500 },
      { servicio: 'Laboratorio', precio: 1200 },
      { servicio: 'Pediatría', precio: 1800 },
      { servicio: 'Ginecología', precio: 2200 },
      { servicio: 'Cirugía ambulatoria', precio: 12500 },
      { servicio: 'Rayos X', precio: 2800 },
      { servicio: 'Sonografía', precio: 3200 },
      { servicio: 'Internamiento', precio: 18000 },
      { servicio: 'Tomografía', precio: 8500 },
      { servicio: 'Maternidad', precio: 22000 }
    ];
  }

  function requireFields(data, fields, labels) {
    for (const field of fields) {
      if (isBlank(data[field])) {
        throw new Error(`El campo ${labels[field] || field} es obligatorio`);
      }
    }
  }

  function seedData() {
    const hasUsers = !!read(STORAGE_KEYS.users, null);
    if (!hasUsers) {
      const polizas = [
        {
          id: 'POL-001', tipoPlan: 'basico', nombrePlan: 'Plan Básico Familiar', cobertura: PLAN_COVERAGE_CATALOG.basico, montoMaximo: 15000, estado: 'activa'
        },
        {
          id: 'POL-002', tipoPlan: 'premium', nombrePlan: 'Plan Premium Integral', cobertura: PLAN_COVERAGE_CATALOG.premium, montoMaximo: 75000, estado: 'activa'
        }
      ];

      const users = [
        { id: uid('USR'), username: 'admin', password: 'admin123', rol: 'agente', nombre: 'Administrador ARS', referenciaId: null, activo: true },
        { id: uid('USR'), username: 'agente1', password: '1234', rol: 'agente', nombre: 'Ana Rodríguez', referenciaId: null, activo: true }
      ];

      write(STORAGE_KEYS.users, users);
      write(STORAGE_KEYS.afiliados, []);
      write(STORAGE_KEYS.clinicas, []);
      write(STORAGE_KEYS.polizas, polizas);
      write(STORAGE_KEYS.autorizaciones, []);
      write(STORAGE_KEYS.servicios, []);
      write(STORAGE_KEYS.facturas, []);
      write(STORAGE_KEYS.auditoria, [{ fecha: today(), accion: 'Inicialización del sistema', usuario: 'Sistema', detalle: 'Se cargaron datos base sin usuarios por defecto de clínica ni afiliado' }]);
    }

    if (!localStorage.getItem(STORAGE_KEYS.afiliados)) write(STORAGE_KEYS.afiliados, []);
    if (!localStorage.getItem(STORAGE_KEYS.clinicas)) write(STORAGE_KEYS.clinicas, []);
    if (!localStorage.getItem(STORAGE_KEYS.polizas)) {
      write(STORAGE_KEYS.polizas, [
        { id: 'POL-001', tipoPlan: 'basico', nombrePlan: 'Plan Básico Familiar', cobertura: PLAN_COVERAGE_CATALOG.basico, montoMaximo: 15000, estado: 'activa' },
        { id: 'POL-002', tipoPlan: 'premium', nombrePlan: 'Plan Premium Integral', cobertura: PLAN_COVERAGE_CATALOG.premium, montoMaximo: 75000, estado: 'activa' }
      ]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.autorizaciones)) write(STORAGE_KEYS.autorizaciones, []);
    if (!localStorage.getItem(STORAGE_KEYS.servicios)) write(STORAGE_KEYS.servicios, []);
    if (!localStorage.getItem(STORAGE_KEYS.facturas)) write(STORAGE_KEYS.facturas, []);
    if (!localStorage.getItem(STORAGE_KEYS.auditoria)) write(STORAGE_KEYS.auditoria, []);

    // Limpieza de datos semilla viejos conocidos de clínica/afiliado
    const afiliados = getAfiliados().filter(a => !['AF-001', 'AF-002'].includes(String(a.id || '')));
    const clinicas = getClinicas().filter(c => !(String(c.id || '') === 'CLI-001' && String(c.usuario || '').toLowerCase() === 'clinica1'));
    const users = getUsers().filter(u => {
      if (u.rol === 'afiliado' && ['AF-001', 'AF-002'].includes(String(u.referenciaId || ''))) return false;
      if (u.rol === 'clinica' && String(u.referenciaId || '') === 'CLI-001' && String(u.username || '').toLowerCase() === 'clinica1') return false;
      return true;
    });
    setAfiliados(afiliados);
    setClinicas(clinicas);
    setUsers(users);
  }

  function logAction(accion, detalle) {
    const auditoria = read(STORAGE_KEYS.auditoria, []);
    const current = getCurrentUser();
    auditoria.unshift({ id: uid('AUD'), fecha: today(), accion, usuario: current ? current.nombre : 'Sistema', detalle: detalle || '' });
    write(STORAGE_KEYS.auditoria, auditoria);
  }

  function getUsers() { return read(STORAGE_KEYS.users, []); }
  function setUsers(v) { write(STORAGE_KEYS.users, v); }
  function getAfiliados() { return read(STORAGE_KEYS.afiliados, []); }
  function setAfiliados(v) { write(STORAGE_KEYS.afiliados, v); }
  function getClinicas() { return read(STORAGE_KEYS.clinicas, []); }
  function setClinicas(v) { write(STORAGE_KEYS.clinicas, v); }
  function getPolizas() { return read(STORAGE_KEYS.polizas, []); }
  function setPolizas(v) { write(STORAGE_KEYS.polizas, v); }
  function getAutorizaciones() { return read(STORAGE_KEYS.autorizaciones, []); }
  function setAutorizaciones(v) { write(STORAGE_KEYS.autorizaciones, v); }
  function getServicios() { return read(STORAGE_KEYS.servicios, []); }
  function setServicios(v) { write(STORAGE_KEYS.servicios, v); }
  function getFacturas() { return read(STORAGE_KEYS.facturas, []); }
  function setFacturas(v) { write(STORAGE_KEYS.facturas, v); }
  function getAuditoria() { return read(STORAGE_KEYS.auditoria, []); }

  function normalizeCedula(v) { return String(v || '').replace(/[^0-9]/g, ''); }
  function formatCedula(v) {
    const x = normalizeCedula(v);
    if (x.length !== 11) return v || '';
    return `${x.slice(0,3)}-${x.slice(3,10)}-${x.slice(10)}`;
  }

  function normalizePolicyCoverage(poliza) {
    if (!poliza) return [];
    if (Array.isArray(poliza.coberturas) && poliza.coberturas.length) {
      return poliza.coberturas
        .map(item => {
          if (!item) return null;
          if (typeof item === 'string') return { servicio: item, porcentaje: 100, tope: 0 };
          return {
            servicio: String(item.servicio || item.nombre || '').trim(),
            porcentaje: Number(item.porcentaje ?? 100) || 0,
            tope: Number(item.tope ?? 0) || 0
          };
        })
        .filter(item => item && item.servicio);
    }
    if (Array.isArray(poliza.cobertura) && poliza.cobertura.length) {
      return poliza.cobertura
        .map(item => typeof item === 'string'
          ? { servicio: item, porcentaje: 100, tope: 0 }
          : {
              servicio: String(item?.servicio || item?.nombre || '').trim(),
              porcentaje: Number(item?.porcentaje ?? 100) || 0,
              tope: Number(item?.tope ?? 0) || 0
            })
        .filter(item => item && item.servicio);
    }
    return [];
  }

  function findPoliza(id) { return getPolizas().find(p => p.id === id); }
  function findAfiliado(id) { return getAfiliados().find(a => a.id === id); }
  function findClinica(id) { return getClinicas().find(c => c.id === id); }
  function findAutorizacion(id) { return getAutorizaciones().find(a => a.id === id); }
  function findServicio(id) { return getServicios().find(s => s.id === id); }
  function findAfiliadoByCedula(cedula) {
    const limpia = normalizeCedula(cedula);
    return getAfiliados().find(a => normalizeCedula(a.cedula) === limpia) || null;
  }

  function getCurrentUser() {
    return read(STORAGE_KEYS.currentUser, null);
  }
  function setCurrentUser(user) {
    write(STORAGE_KEYS.currentUser, user);
    try { localStorage.setItem('usuario', String(user?.username || '')); } catch {}
    try { localStorage.setItem('nombre', String(user?.nombre || user?.username || '')); } catch {}
  }

  function hasRequiredRole(user, rol) {
    if (!user) return false;
    if (Array.isArray(rol)) return rol.includes(user.rol);
    return user.rol === rol;
  }

  function waitForCurrentUser(options) {
    const settings = options || {};
    const waitMs = Number(settings.waitMs ?? 1200);
    const intervalMs = Number(settings.intervalMs ?? 80);
    const immediateUser = getCurrentUser();
    if (immediateUser || waitMs <= 0) return Promise.resolve(immediateUser);

    return new Promise(function (resolve) {
      let finished = false;
      let intervalId = null;
      let timeoutId = null;

      function cleanup() {
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('storage', checkNow);
        window.removeEventListener('focus', checkNow);
        window.removeEventListener('ars:storage-sync', checkNow);
      }

      function finish(user) {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(user || null);
      }

      function checkNow() {
        const user = getCurrentUser();
        if (user) finish(user);
      }

      intervalId = setInterval(checkNow, intervalMs);
      timeoutId = setTimeout(function () {
        finish(getCurrentUser());
      }, waitMs);

      checkNow();
    });
  }

  async function requireRoleOrRedirect(rol, options) {
    const settings = options || {};
    const redirectTo = settings.redirectTo || 'examples/seleccion-rol.html';
    const user = await waitForCurrentUser(settings);

    if (hasRequiredRole(user, rol)) {
      return user;
    }

    if (user) {
      window.location.href = getHomeByRole(user.rol);
      return null;
    }

    window.location.href = redirectTo;
    return null;
  }

  function loginAgente(username, password) {
    const user = getUsers().find(u => u.rol === 'agente' && u.username === username && u.password === password && u.activo);
    if (!user) return { success: false, message: 'Credenciales inválidas para Agente ARS' };
    setCurrentUser(user);
    logAction('Inicio de sesión', `Ingreso como agente: ${user.username}`);
    return { success: true, rol: 'agente', user };
  }

  function loginAfiliado(cedula, password) {
    const entrada = String(cedula || '').trim().toUpperCase();
    const limpia = normalizeCedula(cedula);
    const afiliado = getAfiliados().find(a =>
      ((normalizeCedula(a.cedula) === limpia && limpia.length === 11) || String(a.id || '').toUpperCase() === entrada) &&
      String(a.password || '') === String(password || '') &&
      String(a.estado || '').toLowerCase() === 'activo'
    );
    if (!afiliado) return { success: false, message: 'Código del seguro o contraseña incorrecta' };
    let user = getUsers().find(u => u.referenciaId === afiliado.id && u.rol === 'afiliado');
    if (!user) {
      user = { id: uid('USR'), username: afiliado.id, password: afiliado.password, rol: 'afiliado', nombre: afiliado.nombre, referenciaId: afiliado.id, activo: true, codigoSeguro: afiliado.id, cedula: afiliado.cedula };
      const users = getUsers();
      users.push(user);
      setUsers(users);
    }
    setCurrentUser(user);
    logAction('Inicio de sesión', `Ingreso afiliado ${afiliado.cedula}`);
    return { success: true, rol: 'afiliado', user, afiliado };
  }

  function loginClinica(username, password) {
    const userInput = String(username || '').trim();
    const passInput = String(password || '');
    const clinica = getClinicas().find(c =>
      String(c.usuario || '').trim().toLowerCase() === userInput.toLowerCase() &&
      String(c.password || '') === passInput &&
      ['activa', 'activo'].includes(String(c.estado || '').trim().toLowerCase())
    );
    if (!clinica) return { success: false, message: 'Usuario o contraseña incorrectos para clínica' };
    let user = getUsers().find(u => u.referenciaId === clinica.id && u.rol === 'clinica');
    if (!user) {
      user = { id: uid('USR'), username: clinica.usuario, password: clinica.password, rol: 'clinica', nombre: clinica.nombre, referenciaId: clinica.id, activo: true };
      const users = getUsers();
      users.push(user);
      setUsers(users);
    }
    setCurrentUser(user);
    logAction('Inicio de sesión', `Ingreso clínica ${clinica.nombre}`);
    return { success: true, rol: 'clinica', user, clinica };
  }

  function logout() {
    const current = getCurrentUser();
    if (current) logAction('Cierre de sesión', `Salida de ${current.username}`);
    try { localStorage.removeItem(STORAGE_KEYS.currentUser); } catch {}
    try { localStorage.removeItem('usuario'); } catch {}
    try { localStorage.removeItem('nombre'); } catch {}
    window.location.href = 'examples/seleccion-rol.html';
  }

  function requireRole(rol) {
    const u = getCurrentUser();
    return hasRequiredRole(u, rol);
  }


  function generateSequentialId(prefix, items) {
    let max = 0;
    (items || []).forEach(item => {
      const match = String(item?.id || '').match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
      if (match) max = Math.max(max, parseInt(match[1], 10) || 0);
    });
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  function getCoverageOptionsByPlan(tipoPlan) {
    return PLAN_COVERAGE_CATALOG[tipoPlan] ? [...PLAN_COVERAGE_CATALOG[tipoPlan]] : [];
  }

  function createAfiliado(data) {
    const afiliados = getAfiliados();
    const users = getUsers();
    requireFields(data, ['nombre', 'cedula', 'telefono', 'polizaId', 'password'], {
      nombre: 'Nombre', cedula: 'Cédula', telefono: 'Teléfono', polizaId: 'Póliza', password: 'Contraseña'
    });

    const cedulaNorm = normalizeCedula(data.cedula);
    if (cedulaNorm.length !== 11) throw new Error('La cédula debe tener 11 dígitos');
    if (afiliados.some(a => normalizeCedula(a.cedula) === cedulaNorm)) throw new Error('Ya existe un afiliado con esa cédula');
    const poliza = findPoliza(data.polizaId);
    if (!poliza) throw new Error('Debe seleccionar una póliza válida');

    const nuevo = {
      id: generateSequentialId('AFI', afiliados),
      nombre: data.nombre.trim(),
      cedula: formatCedula(cedulaNorm),
      telefono: data.telefono.trim(),
      correo: (data.correo || '').trim(),
      direccion: (data.direccion || '').trim(),
      polizaId: data.polizaId,
      estado: 'activo',
      usuario: generateSequentialId('AFI', afiliados),
      password: data.password.trim(),
      fechaRegistro: new Date().toISOString()
    };
    afiliados.push(nuevo);
    users.push({ id: uid('USR'), username: nuevo.id, password: nuevo.password, rol: 'afiliado', nombre: nuevo.nombre, referenciaId: nuevo.id, activo: true, codigoSeguro: nuevo.id });
    setAfiliados(afiliados);
    setUsers(users);
    logAction('Crear afiliado', `Afiliado ${nuevo.nombre} / ${nuevo.cedula}`);
    return nuevo;
  }

  function updateAfiliado(data) {
    requireFields(data, ['id', 'nombre', 'cedula', 'telefono', 'polizaId', 'password'], {
      id: 'Afiliado', nombre: 'Nombre', cedula: 'Cédula', telefono: 'Teléfono', polizaId: 'Póliza', password: 'Contraseña'
    });

    const afiliados = getAfiliados();
    const users = getUsers();
    const idx = afiliados.findIndex(a => a.id === data.id);
    if (idx === -1) throw new Error('El afiliado indicado no existe');

    const cedulaNorm = normalizeCedula(data.cedula);
    if (cedulaNorm.length !== 11) throw new Error('La cédula debe tener 11 dígitos');
    if (afiliados.some(a => a.id !== data.id && normalizeCedula(a.cedula) === cedulaNorm)) throw new Error('Ya existe otro afiliado con esa cédula');
    const poliza = findPoliza(data.polizaId);
    if (!poliza) throw new Error('Debe seleccionar una póliza válida');

    const anterior = afiliados[idx];
    const actualizado = {
      ...anterior,
      nombre: data.nombre.trim(),
      cedula: formatCedula(cedulaNorm),
      telefono: data.telefono.trim(),
      correo: (data.correo || '').trim(),
      direccion: (data.direccion || '').trim(),
      polizaId: data.polizaId,
      usuario: anterior.usuario || anterior.id || data.id,
      password: data.password.trim(),
      fechaRegistro: anterior.fechaRegistro || new Date().toISOString()
    };
    afiliados[idx] = actualizado;

    const userIdx = users.findIndex(u => u.rol === 'afiliado' && u.referenciaId === actualizado.id);
    if (userIdx >= 0) {
      users[userIdx] = { ...users[userIdx], username: actualizado.id, password: actualizado.password, nombre: actualizado.nombre, codigoSeguro: actualizado.id };
    }

    setAfiliados(afiliados);
    setUsers(users);
    logAction('Editar afiliado', `Afiliado ${actualizado.nombre} / ${actualizado.cedula}`);
    return actualizado;
  }

  function createClinica(data) {
    const clinicas = getClinicas();
    const users = getUsers();
    requireFields(data, ['nombre', 'rnc', 'telefono', 'direccion', 'usuario', 'password'], {
      nombre: 'Nombre', rnc: 'RNC', telefono: 'Teléfono', direccion: 'Dirección', usuario: 'Usuario', password: 'Contraseña'
    });
    const usuarioNormalizado = String(data.usuario || '').trim().toLowerCase();
    if (clinicas.some(c => String(c.usuario || '').trim().toLowerCase() === usuarioNormalizado)) throw new Error('Ese usuario de clínica ya existe');
    if (users.some(u => u.rol === 'clinica' && String(u.username || '').trim().toLowerCase() === usuarioNormalizado)) throw new Error('Ese usuario de clínica ya existe');
    const nueva = {
      id: generateSequentialId('CLI', clinicas),
      nombre: data.nombre.trim(),
      rnc: data.rnc.trim(),
      telefono: data.telefono.trim(),
      direccion: data.direccion.trim(),
      usuario: data.usuario.trim(),
      password: data.password.trim(),
      estado: 'activa',
      fechaRegistro: new Date().toISOString()
    };
    clinicas.push(nueva);
    users.push({ id: uid('USR'), username: nueva.usuario, password: nueva.password, rol: 'clinica', nombre: nueva.nombre, referenciaId: nueva.id, activo: true });
    setClinicas(clinicas);
    setUsers(users);
    logAction('Registrar clínica', `Clínica ${nueva.nombre}`);
    return nueva;
  }

  function createPoliza(data) {
    const polizas = getPolizas();
    requireFields(data, ['tipoPlan', 'nombrePlan', 'montoMaximo'], {
      tipoPlan: 'Tipo de plan', nombrePlan: 'Nombre del plan', montoMaximo: 'Monto máximo'
    });

    const cobertura = Array.isArray(data.cobertura)
      ? data.cobertura.filter(Boolean)
      : String(data.cobertura || '').split(',').map(x => x.trim()).filter(Boolean);

    if (!cobertura.length) throw new Error('Debe seleccionar al menos una cobertura');

    const nueva = {
      id: `POL-${String(polizas.length + 1).padStart(3, '0')}`,
      tipoPlan: data.tipoPlan,
      nombrePlan: data.nombrePlan.trim(),
      cobertura,
      montoMaximo: Number(data.montoMaximo || 0),
      estado: 'activa'
    };
    if (!nueva.montoMaximo || nueva.montoMaximo <= 0) throw new Error('El monto máximo debe ser mayor que cero');
    polizas.push(nueva);
    setPolizas(polizas);
    logAction('Crear póliza', `Póliza ${nueva.id} - ${nueva.nombrePlan}`);
    return nueva;
  }

  function updateAfiliadoPoliza(afiliadoId, polizaId) {
    if (!afiliadoId) throw new Error('Debe seleccionar un afiliado');
    if (!polizaId) throw new Error('Debe seleccionar una póliza');
    const poliza = findPoliza(polizaId);
    if (!poliza) throw new Error('La póliza indicada no existe');
    const afiliados = getAfiliados().map(a => a.id === afiliadoId ? { ...a, polizaId } : a);
    setAfiliados(afiliados);
    const afi = afiliados.find(a => a.id === afiliadoId);
    logAction('Asignar póliza', `${polizaId} a ${afi?.nombre || afiliadoId}`);
  }

  function createAutorizacion(data) {
    const autorizaciones = getAutorizaciones();
    const afiliado = findAfiliado(data.afiliadoId);
    const clinica = data.clinicaId ? findClinica(data.clinicaId) : null;
    if (!afiliado) throw new Error('No existe el afiliado indicado');
    if (!clinica) throw new Error('Debe indicar una clínica válida');

    const poliza = findPoliza(afiliado.polizaId);
    const montoEstimado = Number(data.montoEstimado || 0);
    const coberturasPlan = normalizePolicyCoverage(poliza);
    const coberturaItem = coberturasPlan.find(item => String(item.servicio || '').toLowerCase() === String(data.servicio || '').toLowerCase());
    const coberturaDisponible = !!coberturaItem;
    const afiliadoActivo = String(afiliado.estado || '').toLowerCase() === 'activo';
    const modalidadPago = data.modalidadPago || 'seguro';
    const autoGenerada = !!data.autoGenerada;
    const porcentajeCobertura = modalidadPago === 'seguro' && coberturaDisponible ? Number(coberturaItem?.porcentaje ?? 100) || 0 : 0;
    const montoBaseCobertura = montoEstimado * (porcentajeCobertura / 100);
    const topeCobertura = Number(coberturaItem?.tope || 0);
    const montoCubierto = modalidadPago === 'seguro' && coberturaDisponible
      ? Math.min(montoBaseCobertura, topeCobertura > 0 ? topeCobertura : montoBaseCobertura, Number(poliza?.montoMaximo || montoEstimado))
      : 0;

    let estado = 'pendiente';
    let comentarioAgente = data.comentarioAgente || '';
    let fechaDecision = '';

    if (modalidadPago === 'seguro' && autoGenerada && afiliadoActivo && coberturaDisponible) {
      estado = 'aprobada';
      comentarioAgente = comentarioAgente || 'Autorización generada automáticamente por la clínica con cobertura válida.';
      fechaDecision = today();
    } else if (modalidadPago === 'seguro' && autoGenerada && afiliadoActivo && !coberturaDisponible) {
      estado = 'pendiente';
      comentarioAgente = comentarioAgente || 'Generada automáticamente por clínica, pendiente de validación por servicio no cubierto.';
    } else if (modalidadPago === 'privado') {
      estado = 'privada';
      comentarioAgente = comentarioAgente || 'Proceso privado, sin intervención de ARS.';
      fechaDecision = today();
    }

    const nueva = {
      id: `AUTORIZACION-${String(autorizaciones.length + 1).padStart(3, '0')}`,
      afiliadoId: afiliado.id,
      afiliadoNombre: afiliado.nombre,
      cedula: afiliado.cedula,
      polizaId: afiliado.polizaId,
      clinicaId: clinica.id,
      clinicaNombre: clinica.nombre,
      servicio: data.servicio,
      doctor: data.doctor || '',
      especialidad: data.especialidad || '',
      prioridad: data.prioridad || '',
      fechaServicio: data.fechaServicio || today(),
      diagnostico: data.diagnostico || '',
      observacionMedica: data.observacionMedica || '',
      montoEstimado,
      montoCubierto,
      porcentajeCobertura,
      creadoPorRol: data.creadoPorRol || 'clinica',
      modalidadPago,
      autoGenerada,
      afiliadoActivo,
      coberturaDisponible,
      estado,
      comentarioAgente,
      fechaSolicitud: today(),
      fechaDecision,
      fechaCreacion: data.fechaCreacion || new Date().toISOString()
    };
    autorizaciones.push(nueva);
    setAutorizaciones(autorizaciones);
    logAction('Crear autorización', `${nueva.id} para ${afiliado.nombre} - ${nueva.servicio}`);
    return nueva;
  }

  function decidirAutorizacion(id, estado, comentario) {
    const autorizaciones = getAutorizaciones().map(a => a.id === id ? { ...a, estado, comentarioAgente: comentario || '', fechaDecision: today() } : a);
    setAutorizaciones(autorizaciones);
    logAction('Validar autorización', `${id} -> ${estado}`);
  }

  function createServicioRealizado(data) {
    const servicios = getServicios();
    const autorizacion = findAutorizacion(data.autorizacionId);
    if (!autorizacion) throw new Error('Debe seleccionar una autorización válida');
    if (autorizacion.estado !== 'aprobada') throw new Error('Solo puede registrar servicios con autorización aprobada');
    if (servicios.some(s => s.autorizacionId === autorizacion.id)) throw new Error('Ya existe un servicio registrado para esa autorización');

    const nuevo = {
      id: `SER-${String(servicios.length + 1).padStart(3, '0')}`,
      autorizacionId: autorizacion.id,
      clinicaId: autorizacion.clinicaId,
      clinicaNombre: autorizacion.clinicaNombre,
      afiliadoId: autorizacion.afiliadoId,
      afiliadoNombre: autorizacion.afiliadoNombre,
      cedula: autorizacion.cedula,
      servicio: autorizacion.servicio,
      doctor: data.doctor || autorizacion.doctor || '',
      observaciones: data.observaciones || '',
      fechaServicio: data.fechaServicio || today(),
      estado: 'registrado'
    };
    servicios.push(nuevo);
    setServicios(servicios);
    logAction('Registrar servicio realizado', `${nuevo.id} / ${nuevo.servicio} / ${nuevo.afiliadoNombre}`);
    return nuevo;
  }

  function createFactura(data) {
    const facturas = getFacturas();
    const servicio = findServicio(data.servicioId);
    if (!servicio) throw new Error('Debe seleccionar un servicio realizado válido');
    if (facturas.some(f => f.servicioId === servicio.id)) throw new Error('Ya existe una factura asociada a este servicio');

    const nueva = {
      id: `FAC-${String(facturas.length + 1).padStart(3, '0')}`,
      clinicaId: servicio.clinicaId,
      clinicaNombre: servicio.clinicaNombre,
      afiliadoId: servicio.afiliadoId,
      afiliadoNombre: servicio.afiliadoNombre,
      cedula: servicio.cedula,
      autorizacionId: servicio.autorizacionId,
      servicioId: servicio.id,
      descripcion: data.descripcion || `Factura por ${servicio.servicio}`,
      monto: Number(data.monto || 0),
      estado: 'pendiente',
      fecha: today()
    };
    facturas.push(nueva);
    setFacturas(facturas);
    logAction('Enviar factura', `${nueva.id} / ${nueva.clinicaNombre}`);
    return nueva;
  }

  function getResumen() {
    const afiliados = getAfiliados();
    const clinicas = getClinicas();
    const polizas = getPolizas();
    const autorizaciones = getAutorizaciones();
    const servicios = getServicios();
    const facturas = getFacturas();
    return {
      afiliados: afiliados.length,
      clinicas: clinicas.length,
      polizas: polizas.length,
      autorizaciones: autorizaciones.length,
      autorizacionesPendientes: autorizaciones.filter(a => a.estado === 'pendiente').length,
      autorizacionesAprobadas: autorizaciones.filter(a => a.estado === 'aprobada').length,
      servicios: servicios.length,
      facturas: facturas.length,
      facturasPendientes: facturas.filter(f => f.estado === 'pendiente').length
    };
  }


  function getCobertura(afiliadoId, servicio, monto) {
    const afiliado = findAfiliado(afiliadoId);
    const poliza = afiliado ? findPoliza(afiliado.polizaId) : null;
    const coberturasPlan = normalizePolicyCoverage(poliza);
    const coberturaItem = coberturasPlan.find(item => String(item.servicio || '').toLowerCase() === String(servicio || '').toLowerCase());
    const cubierto = !!coberturaItem;
    const total = Number(monto || 0);
    const porcentaje = cubierto ? Number(coberturaItem?.porcentaje ?? 100) || 0 : 0;
    const tope = cubierto ? Number(coberturaItem?.tope || 0) || 0 : 0;
    const montoBase = total * (porcentaje / 100);
    const seguro = cubierto ? Math.min(montoBase, tope > 0 ? tope : montoBase, Number(poliza?.montoMaximo || total)) : 0;
    const paciente = Math.max(total - seguro, 0);
    return { afiliado, plan: poliza, cubierto, porcentaje, tope, seguro, paciente, cobertura: coberturaItem || null };
  }

  function getResumenClinica(clinicaId) {
    const autorizaciones = getAutorizaciones().filter(a => String(a.clinicaId) === String(clinicaId));
    let servicios = [];
    try { servicios = JSON.parse(localStorage.getItem('ars_servicios_clinica') || '[]'); } catch {}
    servicios = servicios.filter(s => String(s.clinicaId) === String(clinicaId));
    let facturas = [];
    try { facturas = JSON.parse(localStorage.getItem('ars_facturas') || '[]'); } catch {}
    facturas = facturas.filter(f => String(f.clinicaId) === String(clinicaId));
    const totalFacturado = facturas.reduce((a,b)=>a+Number(b.totalFactura ?? b.monto ?? 0),0);
    const totalSeguro = facturas.reduce((a,b)=>a+Number(b.montoSeguro ?? b.totalSeguro ?? 0),0);
    const totalPaciente = facturas.reduce((a,b)=>a+Number(b.diferencia ?? b.totalPaciente ?? 0),0);
    const pendientePago = facturas.filter(f => String(f.estado || '').toLowerCase() === 'pendiente').reduce((a,b)=>a+Number(b.totalFactura ?? b.monto ?? 0),0);
    return { autorizaciones: autorizaciones.length, servicios: servicios.length, facturas: facturas.length, totalFacturado, totalSeguro, totalPaciente, pendientePago };
  }

  seedData();

  window.ARSAuth = {
    STORAGE_KEYS,
    PLAN_COVERAGE_CATALOG,
    normalizePolicyCoverage,
    normalizeCedula,
    formatCedula,
    getCoverageOptionsByPlan,
    getCurrentUser,
    requireRole,
    requireRoleOrRedirect,
    waitForCurrentUser,
    loginAgente,
    loginAfiliado,
    loginClinica,
    logout,
    getUsers,
    getAfiliados,
    getClinicas,
    getPolizas,
    getAutorizaciones,
    getServicios,
    getFacturas,
    getAuditoria,
    findAfiliado,
    findAfiliadoByCedula,
    findClinica,
    findPoliza,
    findAutorizacion,
    findServicio,
    createAfiliado,
    updateAfiliado,
    createClinica,
    createPoliza,
    updateAfiliadoPoliza,
    createAutorizacion,
    decidirAutorizacion,
    createServicioRealizado,
    createFactura,
    getResumen,
    getResumenClinica,
    getHomeByRole,
    getTarifas,
    getCobertura,
    formatMoney,
    logAction,
    clone
  };
})();
