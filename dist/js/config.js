// js/config.js
const API_URL = (function resolveApiUrl() {
    if (window.API_URL) {
        return String(window.API_URL).replace(/\/+$/, '');
    }

    const currentScript = document.currentScript;
    const scriptUrl = currentScript && currentScript.src
        ? currentScript.src
        : new URL('../dist/js/config.js', window.location.href).href;

    return new URL('../../api', scriptUrl).href.replace(/\/+$/, '');
})();
window.API_URL = API_URL;

// Función para obtener los headers con el token
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Función para manejar errores de autenticación
function handleAuthError(res) {
    if (res.status === 401 || res.status === 403) {
        console.warn('Error de autenticación. Redirigiendo al login.');
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'pages/examples/login-v2.html';
        return true;
    }
    return false;
}
