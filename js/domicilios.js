/**
 * Módulo de Gestión de Domicilios - Lomos & Lomos Express
 * Registro local, seguimiento de pedidos e historial vinculado a tu sistema.
 */

export function renderDomicilios(container, state) {
    if (!state.domicilios) {
        state.domicilios = [];
    }

    // --- DIÁLOGOS DE INTERFAZ PERSONALIZADOS (Reemplazo de alert y confirm) ---
    const mostrarAlertaModal = (mensaje) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #141414; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #e74c3c; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">⚠️ Aviso</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <button id="dom-alert-btn" style="background: #e74c3c; color: white; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Entendido</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('dom-alert-btn').onclick = () => overlay.remove();
    };

    const mostrarConfirmacionModal = (mensaje, accionConfirmar) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #141414; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #e74c3c; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">❓ Confirmar</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="dom-confirm-cancel" style="flex: 1; background: #1a1a1a; color: white; border: 1px solid #333; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button id="dom-confirm-ok" style="flex: 1; background: #e74c3c; color: white; border: none; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        document.getElementById('dom-confirm-cancel').onclick = () => overlay.remove();
        document.getElementById('dom-confirm-ok').onclick = () => {
            overlay.remove();
            accionConfirmar();
        };
    };

    window.abrirModalPedido = () => {
        const modalOverlay = document.createElement('div');
        modalOverlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
            display: flex; justify-content: center; align-items: center; z-index: 9999;
        `;

        modalOverlay.innerHTML = `
            <div style="
                background: #141414; border: 1px solid #2a2a2a; border-radius: 16px;
                width: 100%; max-width: 500px; padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.7);
                color: #fff; box-sizing: border-box;
            ">
                <h2 style="margin-top: 0; margin-bottom: 20px; font-weight: 800; font-size: 1.4rem; border-bottom: 1px solid #2a2a2a; padding-bottom: 15px; color: #e74c3c; display: flex; align-items: center; gap: 10px;">
                    📦 Registrar Domicilio
                </h2>

                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;">Nombre del Cliente</label>
                        <input type="text" id="dom-cliente" placeholder="Ej: Juan Pérez" style="width:100%; padding:13px 15px; margin-top:8px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; box-sizing: border-box; transition: 0.2s;">
                    </div>

                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 150px;">
                            <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;">Teléfono (Opcional)</label>
                            <input type="text" id="dom-telefono" placeholder="Ej: 310 123 4567" style="width:100%; padding:13px 15px; margin-top:8px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; box-sizing: border-box; transition: 0.2s;">
                        </div>
                        <div style="flex: 1.5; min-width: 200px;">
                            <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;">Dirección de Entrega</label>
                            <input type="text" id="dom-direccion" placeholder="Ej: Calle 80 #15-20" style="width:100%; padding:13px 15px; margin-top:8px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; box-sizing: border-box; transition: 0.2s;">
                        </div>
                    </div>

                    <div>
                        <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;">Detalle del Pedido</label>
                        <textarea id="dom-pedido" placeholder="Ej: 2lb Lomo Ancho, 1 paquete de Arepas..." style="width:100%; padding:13px 15px; margin-top:8px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; height: 90px; resize: none; font-family: inherit; box-sizing: border-box; transition: 0.2s;"></textarea>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button type="button" id="dom-btn-cancelar" style="flex: 1; padding: 15px; border-radius: 8px; border: 1px solid #333; background: #141414; color: #ccc; font-weight: bold; cursor: pointer; transition: 0.2s;">Cancelar</button>
                    <button type="button" id="dom-btn-guardar" style="flex: 1; padding: 15px; border-radius: 8px; border: none; background: #e74c3c; color: white; font-weight: bold; cursor: pointer; transition: 0.2s;">Guardar Pedido</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        document.getElementById('dom-cliente').focus();

        // Efectos hover en inputs
        const inputs = modalOverlay.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => input.style.borderColor = '#e74c3c');
            input.addEventListener('blur', () => input.style.borderColor = '#333');
        });

        document.getElementById('dom-btn-cancelar').onclick = () => modalOverlay.remove();

        document.getElementById('dom-btn-guardar').onclick = () => {
            const cliente = document.getElementById('dom-cliente').value.trim();
            const telefono = document.getElementById('dom-telefono').value.trim();
            const direccion = document.getElementById('dom-direccion').value.trim();
            const pedido = document.getElementById('dom-pedido').value.trim();

            if (!cliente || !direccion || !pedido) {
                mostrarAlertaModal("Por favor completa el nombre, dirección y detalle del pedido.");
                return;
            }

            state.domicilios.push({
                id: Date.now(),
                cliente: cliente,
                telefono: telefono !== "" ? telefono : "Sin teléfono",
                direccion: direccion,
                pedido: pedido,
                estado: 'Pendiente',
                fecha: new Date().toLocaleString()
            });

            modalOverlay.remove();
            window.refreshView();
        };
    };

    window.cambiarEstadoPedido = (id) => {
        const d = state.domicilios.find(item => item.id === id);
        if (d) {
            d.estado = d.estado === 'Pendiente' ? 'Entregado' : 'Pendiente';
            window.refreshView();
        }
    };
    
    window.eliminarPedido = (id) => {
        mostrarConfirmacionModal("¿Seguro que deseas borrar este registro del historial permanentemente?", () => {
            state.domicilios = state.domicilios.filter(item => item.id !== id);
            window.refreshView();
        });
    };

    const domiciliosOrdenados = [...state.domicilios].sort((a, b) => b.id - a.id);

    container.innerHTML = `
        <div class="module-fade-in" style="padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
                <h1 style="margin: 0; color: #fff;">🛵 Gestión de Domicilios y Pedidos</h1>
                <button onclick="window.abrirModalPedido()" class="btn-primary" style="background: #e74c3c; color: white; font-weight: bold; padding: 12px 20px;">
                    + Registrar Pedido Nuevo
                </button>
            </div>

            <div class="table-container" style="background: #141414; border-radius: 12px; border: 1px solid #2a2a2a; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #1c1c1c;">
                            <th style="padding: 15px; color: #888; text-align: left; border-bottom: 2px solid #333; font-size: 0.8rem; text-transform: uppercase;">Fecha / Hora</th>
                            <th style="padding: 15px; color: #888; text-align: left; border-bottom: 2px solid #333; font-size: 0.8rem; text-transform: uppercase;">Cliente / Contacto</th>
                            <th style="padding: 15px; color: #888; text-align: left; border-bottom: 2px solid #333; font-size: 0.8rem; text-transform: uppercase;">Dirección</th>
                            <th style="padding: 15px; color: #888; text-align: left; border-bottom: 2px solid #333; font-size: 0.8rem; text-transform: uppercase;">Pedido</th>
                            <th style="padding: 15px; color: #888; text-align: center; border-bottom: 2px solid #333; font-size: 0.8rem; text-transform: uppercase;">Estado</th>
                            <th style="padding: 15px; color: #888; text-align: center; border-bottom: 2px solid #333; font-size: 0.8rem; text-transform: uppercase;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${domiciliosOrdenados.length > 0 ? domiciliosOrdenados.map(d => {
                            const esEntregado = d.estado === 'Entregado';
                            const tagStyle = esEntregado 
                                ? 'background: rgba(46, 204, 113, 0.2); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.5);' 
                                : 'background: rgba(241, 196, 15, 0.2); color: #f1c40f; border: 1px solid rgba(241, 196, 15, 0.5);';
                            
                            return `
                                <tr style="border-bottom: 1px solid #222;">
                                    <td style="padding: 15px; color: #888; font-size: 0.85rem;">${d.fecha}</td>
                                    <td style="padding: 15px;">
                                        <div style="font-weight: bold; color: #fff;">${d.cliente}</div>
                                        <div style="font-size: 0.8rem; color: #aaa; margin-top: 4px;">📱 ${d.telefono}</div>
                                    </td>
                                    <td style="padding: 15px; color: #ccc; font-size: 0.95rem;">${d.direccion}</td>
                                    <td style="padding: 15px; color: #aaa; font-size: 0.95rem;">${d.pedido}</td>
                                    <td style="padding: 15px; text-align: center;">
                                        <span class="tag" style="padding: 6px 12px; border-radius: 6px; font-weight: bold; ${tagStyle}">
                                            ${d.estado}
                                        </span>
                                    </td>
                                    <td style="padding: 15px; text-align: center;">
                                        <div style="display: flex; gap: 8px; justify-content: center;">
                                            <button onclick="window.cambiarEstadoPedido(${d.id})" class="btn-edit-small" style="background: ${esEntregado ? '#7f8c8d' : '#3498db'}; padding: 8px 12px; font-weight: bold; border-radius: 6px;">
                                                ${esEntregado ? 'Reabrir' : '✔ Entregado'}
                                            </button>
                                            <button onclick="window.eliminarPedido(${d.id})" class="btn-delete-small" style="background: transparent; border: 1px solid #e74c3c; color: #e74c3c; padding: 8px 12px; border-radius: 6px; font-weight: bold;" title="Eliminar registro">
                                                ✕
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 50px; color: #555; font-size: 1.1rem;">
                                    🛒 No hay domicilios registrados en el historial en este momento.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}