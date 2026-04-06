// AGREGAR ESTO AL FINAL DEL ARCHIVO

function renderPaginacionPago(totalPaginas) {
  const cont = document.getElementById("paginacionPagoClinicas");
  if (!cont) return;
  cont.innerHTML = "";
  for (let i = 1; i <= totalPaginas; i++) {
    const li = document.createElement("li");
    li.className = "page-item " + (i === paginaPagoClinicas ? "active" : "");
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.onclick = (e) => {
      e.preventDefault();
      paginaPagoClinicas = i;
      renderPagoClinicas();
    };
    cont.appendChild(li);
  }
}

function renderPaginacionFacturas(totalPaginas) {
  const cont = document.getElementById("paginacionFacturas");
  if (!cont) return;
  cont.innerHTML = "";
  for (let i = 1; i <= totalPaginas; i++) {
    const li = document.createElement("li");
    li.className = "page-item " + (i === paginaFactAgente ? "active" : "");
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.onclick = (e) => {
      e.preventDefault();
      paginaFactAgente = i;
      renderFacturasAgente();
    };
    cont.appendChild(li);
  }
}
