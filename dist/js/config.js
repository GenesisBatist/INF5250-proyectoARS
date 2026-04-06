// js/config.js
const API_URL = 'http://localhost:5000';

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