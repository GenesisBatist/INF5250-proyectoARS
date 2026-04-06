// AGREGAR ESTO AL FINAL

function renderPaginacionHistorial(totalPaginas){
  const cont = document.getElementById("paginacionHistorialPago");
  if(!cont) return;
  cont.innerHTML = "";

  for(let i=1;i<=totalPaginas;i++){
    const li = document.createElement("li");
    li.className = "page-item " + (i === paginaHistorialPago ? "active":"");
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.onclick = (e)=>{
      e.preventDefault();
      paginaHistorialPago = i;
      renderHistorialPago();
    };
    cont.appendChild(li);
  }
}
