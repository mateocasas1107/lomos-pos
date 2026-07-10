/**
 * Módulo de Base de Datos de Clientes - Lomos & Lomos Express
 * Permite registrar, editar y analizar clientes naturales o carnicerías aliadas.
 */

export function renderClientes(container, state) {
    // Inicializar el arreglo de clientes en el estado si no existe
    if (!state.clientes) {
        state.clientes = [];
    }
    
    // Variables de filtro local
    if (state.filtroTipoCliente === undefined) state.filtroTipoCliente = "TODOS";
    if (state.busquedaCliente === undefined) state.busquedaCliente = "";

    // --- DIÁLOGOS DE INTERFAZ LOCALES ---
    const mostrarAlertaLocal = (mensaje) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #1c1c1c; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #e74c3c; font-size: 1.2rem;">⚠️ Aviso</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <button id="cli-alert-btn" style="background: #e74c3c; color: white; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Entendido</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('cli-alert-btn').onclick = () => overlay.remove();
    };

    const mostrarConfirmacionLocal = (mensaje, accionConfirmar) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #1c1c1c; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #3498db; font-size: 1.2rem;">❓ Confirmar Acción</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="cli-cancel-btn" style="flex: 1; background: #333; color: white; border: 1px solid #444; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button id="cli-ok-btn" style="flex: 1; background: #2ecc71; color: white; border: none; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('cli-cancel-btn').onclick = () => overlay.remove();
        document.getElementById('cli-ok-btn').onclick = () => {
            overlay.remove();
            accionConfirmar();
        };
    };

    // --- MANEJADORES DE FILTROS ---
    window.filtrarClientesPorTipo = (tipo) => {
        state.filtroTipoCliente = tipo;
        renderClientes(container, state);
    };

    window.buscarClienteFiltro = (e) => {
        state.busquedaCliente = e.target.value.toLowerCase();
        renderClientes(container, state);
    };

    // --- MODAL PREMIUM PARA AGREGAR/EDITAR CLIENTES ---
    window.mostrarModalCliente = (clienteAEditar = null) => {
        const esEdicion = !!clienteAEditar;
        
        const modalOverlay = document.createElement('div');
        modalOverlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
            display: flex; justify-content: center; align-items: center; z-index: 9999;
        `;

        modalOverlay.innerHTML = `
            <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 16px; width: 100%; max-width: 450px; padding: 30px; color: #fff; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                <h2 style="margin-top:0; margin-bottom: 20px; font-size:1.3rem; border-bottom:1px solid #222; padding-bottom:10px; color: var(--accent, #e74c3c);">
                    ${esEdicion ? '✏️ Editar Registro de Cliente' : '👥 Registrar Nuevo Cliente'}
                </h2>
                
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <div>
                        <label style="font-size:0.75rem; color:#888; font-weight:bold; text-transform:uppercase;">Nombre Completo / Razón Social</label>
                        <input type="text" id="cli-nombre" value="${esEdicion ? clienteAEditar.nombre : ''}" placeholder="Ej: Asadero El Vecino o Juan Pérez" style="width:100%; padding:11px; margin-top:5px; background:#000; border:1px solid #333; color:white; border-radius:8px; outline:none;">
                    </div>

                    <div>
                        <label style="font-size:0.75rem; color:#888; font-weight:bold; text-transform:uppercase;">Cédula o NIT (Opcional)</label>
                        <input type="text" id="cli-cedula" value="${esEdicion ? clienteAEditar.cedula : ''}" placeholder="Ej: 1094.234.567" style="width:100%; padding:11px; margin-top:5px; background:#000; border:1px solid #333; color:white; border-radius:8px; outline:none;">
                    </div>

                    <div>
                        <label style="font-size:0.75rem; color:#888; font-weight:bold; text-transform:uppercase;">Teléfono de Contacto (Opcional)</label>
                        <input type="text" id="cli-telefono" value="${esEdicion ? (clienteAEditar.telefono || '') : ''}" placeholder="Ej: 312 456 7890" style="width:100%; padding:11px; margin-top:5px; background:#000; border:1px solid #333; color:white; border-radius:8px; outline:none;">
                    </div>

                    <div>
                        <label style="font-size:0.75rem; color:#888; font-weight:bold; text-transform:uppercase;">Tipo de Cliente</label>
                        <select id="cli-tipo" style="width:100%; padding:11px; margin-top:5px; background:#000; border:1px solid #333; color:white; border-radius:8px; outline:none; cursor:pointer;">
                            <option value="natural" ${esEdicion && clienteAEditar.tipo === 'natural' ? 'selected' : ''}>👤 Cliente Natural (Particular)</option>
                            <option value="carniceria" ${esEdicion && clienteAEditar.tipo === 'carniceria' ? 'selected' : ''}>🥩 Carnicería / Negocio Aliado</option>
                        </select>
                    </div>

                    <div id="wrapper-ubicacion">
                        <label style="font-size:0.75rem; color:#888; font-weight:bold; text-transform:uppercase;">Ubicación / Dirección de Entrega</label>
                        <input type="text" id="cli-ubicacion" value="${esEdicion ? (clienteAEditar.ubicacion || '') : ''}" placeholder="Ej: Calle 15 #23-44, Frente al Parque Principal" style="width:100%; padding:11px; margin-top:5px; background:#000; border:1px solid #333; color:white; border-radius:8px; outline:none;">
                    </div>
                </div>

                <div style="display:flex; gap:12px; margin-top:25px;">
                    <button id="cli-btn-cancel" style="flex:1; padding:12px; border-radius:8px; border:1px solid #333; background:transparent; color:#aaa; font-weight:bold; cursor:pointer;">Cancelar</button>
                    <button id="cli-btn-save" style="flex:2; padding:12px; border-radius:8px; border:none; background:var(--accent, #e74c3c); color:white; font-weight:bold; cursor:pointer;">Guardar Cliente</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Control dinámico de la visibilidad de la ubicación según el tipo
        const selectTipo = document.getElementById('cli-tipo');
        const wrapperUbi = document.getElementById('wrapper-ubicacion');
        
        const ajustarVisibilidadUbicacion = () => {
            // Se sugiere siempre, pero para Carnicerías se hace énfasis
            if (selectTipo.value === 'carniceria') {
                wrapperUbi.querySelector('label').innerText = "📍 Ubicación / Dirección Comercial (Obligatorio)";
            } else {
                wrapperUbi.querySelector('label').innerText = "🏠 Dirección de Residencia (Opcional)";
            }
        };
        selectTipo.onchange = ajustarVisibilidadUbicacion;
        ajustarVisibilidadUbicacion();

        document.getElementById('cli-btn-cancel').onclick = () => modalOverlay.remove();
        
        document.getElementById('cli-btn-save').onclick = () => {
            const nombre = document.getElementById('cli-nombre').value.trim();
            const cedula = document.getElementById('cli-cedula').value.trim();
            const telefono = document.getElementById('cli-telefono').value.trim();
            const tipo = selectTipo.value;
            const ubicacion = document.getElementById('cli-ubicacion').value.trim();

            if (!nombre) {
                mostrarAlertaLocal("El Nombre del cliente es obligatorio para crear el registro.");
                return;
            }

            if (tipo === 'carniceria' && !ubicacion) {
                mostrarAlertaLocal("Por favor, ingrese la ubicación o dirección para la Carnicería/Negocio aliado.");
                return;
            }

            if (esEdicion) {
                // SOLUCIÓN: Buscamos el cliente real en la base de datos usando su ID
                const clienteReal = state.clientes.find(c => c.id === clienteAEditar.id);
                if (clienteReal) {
                    clienteReal.nombre = nombre;
                    clienteReal.cedula = cedula;
                    clienteReal.telefono = telefono;
                    clienteReal.tipo = tipo;
                    clienteReal.ubicacion = ubicacion;
                }
            } else {
                // Solo validar duplicados si se ingresó una cédula/NIT
                if (cedula) {
                    const duplicado = state.clientes.some(c => c.cedula === cedula);
                    if (duplicado) {
                        mostrarAlertaLocal(`Ya existe un cliente registrado con la Cédula/NIT: ${cedula}`);
                        return;
                    }
                }

                state.clientes.push({
                    id: Date.now(),
                    nombre,
                    cedula: cedula || "", // Se guarda vacío si no se suministra
                    telefono,
                    tipo,
                    ubicacion,
                    fechaRegistro: new Date().toLocaleDateString()
                });
            }

            modalOverlay.remove();
            window.refreshView();
        };
    };

    // --- ANÁLISIS DE COMPRAS DEL CLIENTE ---
    const obtenerEstadisticasCliente = (nombreCliente) => {
        if (!nombreCliente) return { totalCompras: 0, frecuencia: 0, promedio: 0, listado: [] };
        
        const nombreLimpio = nombreCliente.toLowerCase().trim();
        const compras = (state.ventasRealizadas || []).filter(v => 
            v.cliente && v.cliente.toLowerCase().trim() === nombreLimpio
        );

        const totalGastado = compras.reduce((acc, v) => acc + (v.total || 0), 0);
        const cantidadVisitas = compras.length;
        const promedioTicket = cantidadVisitas > 0 ? Math.round(totalGastado / cantidadVisitas) : 0;

        return {
            totalCompras: totalGastado,
            frecuencia: cantidadVisitas,
            promedio: promedioTicket,
            listado: compras
        };
    };

    // --- ELIMINACIÓN DE CLIENTE ---
    window.eliminarClienteReg = (id, nombre) => {
        mostrarConfirmacionLocal(`¿Está seguro de eliminar a "${nombre}" de la base de datos?\n(Esto no afectará el historial de ventas anteriores)`, () => {
            state.clientes = state.clientes.filter(c => c.id !== id);
            window.refreshView();
        });
    };

    // --- MODAL DE HISTORIAL COMPLETO DE COMPRAS ---
    window.verHistorialComprasCliente = (nombre) => {
        const stats = obtenerEstadisticasCliente(nombre);
        
        const modalOverlay = document.createElement('div');
        modalOverlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(5px);
            display: flex; justify-content: center; align-items: center; z-index: 9999;
        `;

        modalOverlay.innerHTML = `
            <div style="background: #141414; border: 1px solid #333; border-radius: 16px; width: 90%; max-width: 600px; max-height: 85vh; padding: 30px; color: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222; padding-bottom:15px; margin-bottom:15px;">
                    <h2 style="margin:0; font-size:1.4rem;">🛍️ Historial de Compras: <span style="color:var(--accent, #e74c3c);">${nombre}</span></h2>
                    <button id="close-historial-btn" style="background:none; border:none; color:#888; font-size:1.5rem; cursor:pointer;">✕</button>
                </div>

                <!-- Resumen de Métricas del Cliente -->
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px; margin-bottom:20px; background:#0d0d0d; padding:15px; border-radius:10px; border:1px solid #222; text-align:center;">
                    <div>
                        <span style="color:#666; font-size:0.75rem; text-transform:uppercase; font-weight:bold;">Visitas / Compras</span>
                        <h3 style="margin:5px 0 0; font-size:1.4rem; color:#fff;">${stats.frecuencia}</h3>
                    </div>
                    <div>
                        <span style="color:#666; font-size:0.75rem; text-transform:uppercase; font-weight:bold;">Total Consumido</span>
                        <h3 style="margin:5px 0 0; font-size:1.4rem; color:#2ecc71;">$${stats.totalCompras.toLocaleString()}</h3>
                    </div>
                    <div>
                        <span style="color:#666; font-size:0.75rem; text-transform:uppercase; font-weight:bold;">Ticket Promedio</span>
                        <h3 style="margin:5px 0 0; font-size:1.4rem; color:#3498db;">$${stats.promedio.toLocaleString()}</h3>
                    </div>
                </div>

                <!-- Listado de Facturas -->
                <div style="flex-grow:1; overflow-y:auto; margin-bottom:15px; padding-right:5px;">
                    ${stats.listado.length > 0 ? stats.listado.map(compra => {
                        const itemsTxt = compra.items.map(i => `${i.nombre} (${i.cantidadDetalle})`).join(', ');
                        return `
                            <div style="background:#1a1a1a; padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid #282828;">
                                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                                    <span style="color:#fff;">Remisión #${compra.nroFactura}</span>
                                    <span style="color:#2ecc71;">$${compra.total.toLocaleString()}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#666; margin-top:5px;">
                                    <span>📅 ${compra.fecha}</span>
                                    <span>Tarifa: ${compra.tipoTarifa === 'mayor' ? 'Mayorista' : 'Vitrina'}</span>
                                </div>
                                <div style="font-size:0.85rem; color:#ccc; margin-top:10px; border-top:1px dashed #222; padding-top:8px;">
                                    🥩 <b>Productos:</b> ${itemsTxt}
                                </div>
                                ${compra.notas ? `
                                    <div style="font-size:0.8rem; color:#f1c40f; margin-top:5px; font-style:italic;">
                                        📝 Nota: ${compra.notas}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).reverse().join('') : `
                        <div style="text-align:center; padding:40px; color:#555;">
                            Este cliente no registra compras cobradas todavía en la aplicación.
                        </div>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        document.getElementById('close-historial-btn').onclick = () => modalOverlay.remove();
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.remove(); };
    };

    // --- PROCESAR FILTRADO EN TIEMPO REAL ---
    const clientesFiltrados = state.clientes.filter(c => {
        const coincideBusqueda = c.nombre.toLowerCase().includes(state.busquedaCliente) || 
                                 c.cedula.includes(state.busquedaCliente);
        
        const coincideTipo = state.filtroTipoCliente === 'TODOS' || 
                             (state.filtroTipoCliente === 'NATURAL' && c.tipo === 'natural') ||
                             (state.filtroTipoCliente === 'CARNICERIA' && c.tipo === 'carniceria');

        return coincideBusqueda && coincideTipo;
    });

    // Cálculos de Tarjetas Informativas Generales
    const totalClientesReg = state.clientes.length;
    const totalCarnicerias = state.clientes.filter(c => c.tipo === 'carniceria').length;
    const totalNaturales = state.clientes.filter(c => c.tipo === 'natural').length;

    container.innerHTML = `
        <div class="module-fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
                <h1 style="margin: 0;">👥 Base de Datos Clientes</h1>
                <button onclick="window.mostrarModalCliente()" class="btn-primary" style="width: auto; padding: 11px 22px;">
                    + Registrar Cliente
                </button>
            </div>

            <!-- Indicadores Rápidos -->
            <div class="dashboard-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <div style="background: #1a1a1a; padding: 20px; border-radius: 12px; border: 1px solid #333; text-align: center;">
                    <span style="color: #888; font-size: 0.8rem; text-transform: uppercase; font-weight: bold;">Clientes Registrados</span>
                    <h2 style="color: #fff; font-size: 2rem; margin: 10px 0;">${totalClientesReg}</h2>
                    <p style="color: #555; font-size: 0.75rem; margin: 0;">Fidelización de Lomos & Lomos</p>
                </div>
                <div style="background: #1a1a1a; padding: 20px; border-radius: 12px; border: 1px solid #333; text-align: center; border-left: 4px solid #3498db;">
                    <span style="color: #3498db; font-size: 0.8rem; text-transform: uppercase; font-weight: bold;">Carnicerías Aliadas</span>
                    <h2 style="color: #3498db; font-size: 2rem; margin: 10px 0;">${totalCarnicerias}</h2>
                    <p style="color: #555; font-size: 0.75rem; margin: 0;">Negocios mayoristas vinculados</p>
                </div>
                <div style="background: #1a1a1a; padding: 20px; border-radius: 12px; border: 1px solid #333; text-align: center; border-left: 4px solid #e74c3c;">
                    <span style="color: #e74c3c; font-size: 0.8rem; text-transform: uppercase; font-weight: bold;">Clientes Particulares</span>
                    <h2 style="color: #e74c3c; font-size: 2rem; margin: 10px 0;">${totalNaturales}</h2>
                    <p style="color: #555; font-size: 0.75rem; margin: 0;">Ventas al Detal (Vitrina)</p>
                </div>
            </div>

            <!-- Panel de Búsqueda y Pestañas -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
                <div class="search-box" style="flex-grow: 1; max-width: 400px;">
                    <input type="text" id="cli-search-input" 
                           placeholder="🔍 Buscar por nombre o Cédula/NIT..." 
                           value="${state.busquedaCliente}" 
                           oninput="window.buscarClienteFiltro(event)"
                           style="width: 100%; padding: 12px 15px 12px 40px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a; color: white; outline: none;">
                </div>
                
                <div style="display: flex; background: #141414; padding: 4px; border-radius: 8px; border: 1px solid #2a2a2a;">
                    <button onclick="window.filtrarClientesPorTipo('TODOS')" 
                            style="padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; font-size:0.85rem; font-weight: bold; transition: 0.2s; background: ${state.filtroTipoCliente === 'TODOS' ? '#333' : 'transparent'}; color: ${state.filtroTipoCliente === 'TODOS' ? '#fff' : '#888'};">
                        Todos
                    </button>
                    <button onclick="window.filtrarClientesPorTipo('NATURAL')" 
                            style="padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; font-size:0.85rem; font-weight: bold; transition: 0.2s; background: ${state.filtroTipoCliente === 'NATURAL' ? '#e74c3c' : 'transparent'}; color: #fff;">
                        👤 Naturales
                    </button>
                    <button onclick="window.filtrarClientesPorTipo('CARNICERIA')" 
                            style="padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; font-size:0.85rem; font-weight: bold; transition: 0.2s; background: ${state.filtroTipoCliente === 'CARNICERIA' ? '#3498db' : 'transparent'}; color: #fff;">
                        🥩 Carnicerías
                    </button>
                </div>
            </div>

            <!-- Listado Principal en Tabla -->
            <div class="table-container" style="background: #141414; border-radius: 12px; border: 1px solid #2a2a2a; overflow: hidden;">
                <table>
                    <thead>
                        <tr style="background: #1c1c1c;">
                            <th style="padding: 15px; color: #888; text-align: left; font-size:0.8rem;">Nombre / Razón Social</th>
                            <th style="padding: 15px; color: #888; text-align: left; font-size:0.8rem;">Cédula / NIT</th>
                            <th style="padding: 15px; color: #888; text-align: left; font-size:0.8rem;">Contacto</th>
                            <th style="padding: 15px; color: #888; text-align: left; font-size:0.8rem;">Ubicación / Dirección</th>
                            <th style="padding: 15px; color: #888; text-align: center; font-size:0.8rem;">Compras</th>
                            <th style="padding: 15px; color: #888; text-align: center; font-size:0.8rem;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clientesFiltrados.length > 0 ? clientesFiltrados.map(c => {
                            const stats = obtenerEstadisticasCliente(c.nombre);
                            const etiquetaTipo = c.tipo === 'carniceria' 
                                ? `<span class="tag" style="background:rgba(52, 152, 219, 0.2); color:#3498db; border:1px solid rgba(52, 152, 219, 0.3);">Carnicería</span>`
                                : `<span class="tag" style="background:rgba(231, 76, 60, 0.2); color:#e74c3c; border:1px solid rgba(231, 76, 60, 0.3);">Natural</span>`;

                            return `
                                <tr style="border-bottom: 1px solid #222;">
                                    <td style="padding: 15px;">
                                        <div style="font-weight: bold; color: #fff; font-size: 0.95rem;">${c.nombre}</div>
                                        <div style="margin-top: 5px;">${etiquetaTipo}</div>
                                    </td>
                                    <td style="padding: 15px; color:#fff; font-family: monospace;">${c.cedula || '<span style="color:#444;">Sin Cédula/NIT</span>'}</td>
                                    <td style="padding: 15px; color:#ccc;">${c.telefono || '<span style="color:#444;">Sin teléfono</span>'}</td>
                                    <td style="padding: 15px; color:#aaa; font-size:0.85rem; max-width:200px; word-wrap:break-word;">
                                        ${c.ubicacion || '<span style="color:#444;">Sin dirección</span>'}
                                    </td>
                                    <td style="padding: 15px; text-align: center;">
                                        <button onclick="window.verHistorialComprasCliente('${c.nombre}')" 
                                                class="btn-edit-small" style="background:#2ecc71; padding: 6px 12px; font-weight: bold;" title="Ver Reporte">
                                            📊 ${stats.frecuencia} comp.
                                        </button>
                                    </td>
                                    <td style="padding: 15px; text-align: center;">
                                        <div style="display:flex; gap:6px; justify-content:center;">
                                            <button onclick="window.mostrarModalCliente(${JSON.stringify(c).replace(/"/g, '&quot;')})" 
                                                    class="btn-edit-small" style="background:#3498db; padding:6px 12px;">
                                                Editar
                                            </button>
                                            <button onclick="window.eliminarClienteReg(${c.id}, '${c.nombre}')" 
                                                    class="btn-delete-small" style="background:#e74c3c; padding:6px 12px;">
                                                ✕
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 50px; color: #555;">
                                    No se encontraron clientes registrados con los filtros aplicados.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Restaurar foco del buscador
    if (state.busquedaCliente !== "") {
        const searchInput = document.getElementById('cli-search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.setSelectionRange(state.busquedaCliente.length, state.busquedaCliente.length);
        }
    }
}