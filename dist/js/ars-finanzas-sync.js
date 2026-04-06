(function(){
  const read=(key,fallback=[])=>{try{const v=JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));return Array.isArray(v)?v:fallback}catch{return fallback}};
  const write=(key,val)=>localStorage.setItem(key,JSON.stringify(val));
  const nowIso=()=>new Date().toISOString();
  const currentPeriod=()=>{const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  const norm=(v)=>String(v??'').trim();
  const lower=(v)=>norm(v).toLowerCase();
  const same=(a,b)=>norm(a)===norm(b);
  function getClinicas(){ return read('ars_clinicas'); }
  function getServicios(){ return read('ars_servicios_clinica'); }
  function getCitas(){ return read('ars_citas_clinica'); }
  function getAutorizaciones(){ return read('ars_autorizaciones'); }
  function getPagos(){ return read('ars_pagos_mensuales').map(p=>({...p,estado:p.estado||'enviado_clinica'})); }
  function getReportes(){ return read('ars_reportes_clinica').map(r=>({...r,estadoPago:r.estadoPago||'pendiente_revision'})); }

  function buildReportForClinic(clinicaId){
    const clinica = getClinicas().find(c=>same(c.id,clinicaId)) || {};
    const servicios = getServicios().filter(s=>same(s.clinicaId,clinicaId));
    const citas = getCitas().filter(c=>same(c.clinicaId,clinicaId));
    const auts = getAutorizaciones().filter(a=>same(a.clinicaId,clinicaId));
    const pagos = getPagos().filter(p=>same(p.clinicaId,clinicaId));
    const reportesPrev = getReportes();
    const prev = reportesPrev.find(r=>same(r.clinicaId,clinicaId));

    const detalleProcesos = servicios
      .filter(s=>Number(s.montoSeguro||0)>0 || lower(s.modalidad)==='seguro' || !same(s.autorizacionId,'PRIVADO'))
      .map(s=>({
        id:s.id,
        afiliadoId:s.afiliadoId,
        afiliadoNombre:s.afiliadoNombre || '-',
        cedula:s.cedula || '',
        servicio:s.servicio || '-',
        modalidad:s.modalidad || '-',
        autorizacionId:s.autorizacionId || '-',
        estadoAutorizacion:s.estadoAutorizacion || '-',
        montoSeguro:Number(s.montoSeguro||0),
        montoPaciente:Number(s.diferencia||0),
        costoFinal:Number(s.costoFinal||0),
        fechaRealizada:s.fechaRealizada || s.fechaCreacion || '-',
        doctor:s.doctor || '-',
        comentarioAutorizacion:s.comentarioAutorizacion || ''
      }));

    const totalSeguro = detalleProcesos.reduce((a,s)=>a+Number(s.montoSeguro||0),0);
    const totalPaciente = detalleProcesos.reduce((a,s)=>a+Number(s.montoPaciente||0),0);
    const totalPrivado = servicios.filter(s=>lower(s.modalidad)==='privado').reduce((a,s)=>a+Number(s.costoFinal||0),0);
    const totalSeguroOperacion = servicios.filter(s=>lower(s.modalidad)!=='privado').reduce((a,s)=>a+Number(s.costoFinal||0),0);
    const acceptedPayment = pagos.filter(p=>lower(p.estado)==='aceptado_clinica').sort((a,b)=>new Date(b.fechaAceptacion||0)-new Date(a.fechaAceptacion||0))[0];
    const latestPayment = pagos.sort((a,b)=>new Date(b.fechaAceptacion||b.fechaEnvio||0)-new Date(a.fechaAceptacion||a.fechaEnvio||0))[0];

    return {
      id: prev?.id || `REP-${clinicaId}`,
      clinicaId: clinicaId,
      clinicaNombre: clinica.nombre || clinica.clinica || clinica.nombreClinica || prev?.clinicaNombre || `Clínica ${clinicaId}`,
      periodo: prev?.periodo || currentPeriod(),
      totalPacientesAgendados: citas.length,
      totalProcesosClinicos: servicios.length,
      totalAutorizacionesAprobadas: auts.filter(a=>['aprobada','validada','comprobada'].includes(lower(a.estado))).length,
      totalFacturasAutorizadas: detalleProcesos.length,
      totalSeguro,
      totalPaciente,
      totalPrivado,
      totalSeguroOperacion,
      totalPagosRecibidos: pagos.filter(p=>lower(p.estado)==='aceptado_clinica').length,
      montoPagado: pagos.filter(p=>lower(p.estado)==='aceptado_clinica').reduce((a,p)=>a+Number(p.monto||0),0),
      detallePacientes: citas.map(c=>({
        pacienteNombre:c.pacienteNombre || c.nombre || '-',
        cedula:c.cedula || '-',
        seguro:c.seguro || c.seguroNombre || 'Privado',
        codigoSeguro:c.codigoSeguro || '-',
        estadoSeguro:c.estadoSeguro || '-',
        fechaCita:c.fechaCita || c.fecha || '-',
        horaCita:c.horaCita || c.hora || '-',
        doctor:c.doctor || '-'
      })),
      detalleProcesos,
      detallePagos: pagos.filter(p=>lower(p.estado)==='aceptado_clinica').map(p=>({
        id:p.id,
        periodo:p.periodo || currentPeriod(),
        monto:Number(p.monto||0),
        fechaRecibido:p.fechaAceptacion || p.fechaEnvio || '-',
        observacion:p.observacion || '-'
      })),
      timeline: [
        ...citas.map(c=>({fecha:c.fechaCita || c.fecha || c.fechaCreacion || nowIso(), tipo:'Paciente', referencia:c.id || '-', descripcion:`${c.pacienteNombre || c.nombre || 'Paciente'} agendado`})),
        ...servicios.map(s=>({fecha:s.fechaRealizada || s.fechaCreacion || nowIso(), tipo:'Proceso', referencia:s.id || '-', descripcion:`${s.servicio || 'Servicio'} / ${s.afiliadoNombre || '-'}`})),
        ...pagoSummaryItems(pagos)
      ].sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0)).slice(0,50),
      estadoPago: prev?.estadoPago || (acceptedPayment ? 'aceptado_clinica' : latestPayment ? latestPayment.estado : 'pendiente_revision'),
      pagoId: prev?.pagoId || latestPayment?.id || null,
      fechaPago: prev?.fechaPago || latestPayment?.fechaAceptacion || latestPayment?.fechaEnvio || null,
      fechaActualizacion: nowIso()
    };
  }

  function pagoSummaryItems(pagos){
    return pagos.map(p=>({fecha:p.fechaAceptacion || p.fechaEnvio || nowIso(), tipo:'Pago', referencia:p.id || '-', descripcion:`Pago ${lower(p.estado)==='aceptado_clinica' ? 'aceptado' : 'enviado'} por ${Number(p.monto||0).toLocaleString('es-DO',{minimumFractionDigits:2, maximumFractionDigits:2})}`}));
  }

  function syncAll(){
    const clinicas = getClinicas();
    const existing = getReportes();
    const reportes = clinicas.map(c=>buildReportForClinic(c.id));
    existing.forEach(old=>{
      if (!reportes.some(r=>same(r.clinicaId, old.clinicaId)) && old.clinicaId) {
        reportes.push(old);
      }
    });
    write('ars_reportes_clinica', reportes);
    return reportes;
  }

  function buildFacturasView(){
    const reportes = syncAll();
    const pagos = getPagos();
    const pagoByReporte = new Map(pagos.map(p=>[norm(p.reporteId), p]));
    return reportes.flatMap(r => (Array.isArray(r.detalleProcesos)?r.detalleProcesos:[]).map(item=>({
      id: `FAC-${item.id || Math.random().toString(36).slice(2,8)}`,
      clinica: r.clinicaNombre,
      clinicaId: r.clinicaId,
      afiliado: item.afiliadoNombre || '-',
      autorizacion: item.autorizacionId || '-',
      seguro: Number(item.montoSeguro||0),
      paciente: Number(item.montoPaciente||0),
      estado: pagoByReporte.get(norm(r.id))?.estado || r.estadoPago || item.estadoAutorizacion || 'pendiente',
      fecha: item.fechaRealizada || r.fechaActualizacion,
      servicio: item.servicio || '-'
    })));
  }

  window.ARSFinanzasSync = {
    syncAll,
    getReportes: () => syncAll(),
    getPagos,
    getFacturasView: buildFacturasView,
    buildReportForClinic,
    currentPeriod
  };
})();
