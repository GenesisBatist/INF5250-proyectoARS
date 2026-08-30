// dist/js/guard-agente.js

document.addEventListener('DOMContentLoaded', () => {
    if (typeof esAgente === 'function' && !esAgente()) {
        alert('Acceso denegado. Solo el Agente ARS puede entrar aquí.');
        window.location.href = 'examples/seleccion-rol.html';
        return;
    }

    const nombre = localStorage.getItem('nombre') || localStorage.getItem('usuario') || 'Agente ARS';

    document.querySelectorAll('#userName, #userFullName').forEach(el => {
        if (el) el.innerText = nombre;
    });

    const rol = document.getElementById('userRol');
    if (rol) rol.innerText = 'Agente ARS';
});

function logout() {
    try { localStorage.removeItem('ars_current_user'); } catch {}
    try { localStorage.removeItem('token'); } catch {}
    try { localStorage.removeItem('usuario'); } catch {}
    try { localStorage.removeItem('nombre'); } catch {}
    window.location.href = 'examples/seleccion-rol.html';
}
