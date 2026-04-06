// js/auth.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const usuario = document.getElementById('usuario').value;
            const password = document.getElementById('password').value;

            if (!usuario || !password) {
                alert('Por favor ingrese usuario y contraseña');
                return;
            }

            fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usuario, password: password })
            })
            .then(async res => {
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Credenciales inválidas');
                }
                return res.json();
            })
            .then(data => {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('usuario', usuario);
                    window.location.href = '../index.html';
                } else {
                    alert('Error: No se recibió un token válido');
                }
            })
            .catch(error => {
                console.error('Error en login:', error);
                alert('❌ ' + error.message);
            });
        });
    }
});