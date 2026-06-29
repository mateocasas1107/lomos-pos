/**
 * Módulo de Gastos Operativos - Lomos & Lomos Express
 * Gestiona el registro de egresos, clasificación por categorías, control de gastos fijos
 * y permite calcular la Utilidad Real del negocio para pruebas y operación oficial.
 */

export function renderGastos(container, state) {
    
    // --- INICIALIZACIÓN DE VARIABLES EN EL ESTADO ---
    if (state.gastos === undefined) state.gastos = [];
    if (state.gastosBusqueda === undefined) state.gastosBusqueda = "";
    if (state.gastosFiltroCategoria === undefined) state.gastosFiltroCategoria = "TODOS";
    
    // Categorías predefinidas de gastos operativos del negocio
    if (!state.gastosCategorias) {
        state.gastosCategorias = [
            "Arriendo de Locales",
            "Servicios Públicos (Agua/Luz/Gas)",
            "Nómina / Sueldos Empleados",
            "Empaques y Desechables",
            "Carbón y Madera (Asados)",
            "Mantenimiento de Equipos",
            "Otros Gastos Operacionales"
        ];
    }

    // --- DIÁLOGOS DE INTERFAZ PERSONALIZADOS ---
    const mostrarAlertaModal = (mensaje, esExito = false) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #1c1c1c; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: ${esExito ? '#2ecc71' : '#e74c3c'}; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ${esExito ? '✅ Éxito' : '⚠️ Aviso del Sistema'}
                </h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <button id="gas-alert-btn" style="background: ${esExito ? '#2ecc71' : '#e74c3c'}; color: ${esExito ? 'black' : 'white'}; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Entendido</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('gas-alert-btn').onclick = () => overlay.remove();
    };

    const mostrarConfirmacionModal = (mensaje, accionConfirmar) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #1c1c1c; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #3498db; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">❓ Confirmar Acción</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="gas-cancel-btn" style="flex: 1; background: #333; color: white; border: 1px solid #444; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button id="gas-ok-btn" style="flex: 1; background: #e74c3c; color: white; border: none; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('gas-cancel-btn').onclick = () => overlay.remove();
        document.getElementById('gas-ok-btn').onclick = () => {
            overlay.remove();
            accionConfirmar();
        };
    };

    // --- CÁLCULO DE MÉTRICAS DE EGRESOS ---
    const totalEgresos = state.gastos.reduce((acc, g) => acc + (g.valor || 0), 0);
    
    // Obtener la categoría con mayor gasto registrado
    const resumenPorCategoria = {};
    state.gastos.forEach(g => {
        resumenPorCategoria[g.categoria] = (resumenPorCategoria[g.categoria] || 0) + g.valor;
    });
    
    let categoriaMasCostosa = "Ninguna";
    let valorMasAltoCat = 0;
    Object.keys(resumenPorCategoria).forEach(cat => {
        if (resumenPorCategoria[cat] > valorMasAltoCat) {
            valorMasAltoCat = resumenPorCategoria[cat];
            categoriaMasCostosa = cat;
        }
    });

    // --- ACCIONES DEL MÓDULO ---

    /**
     * MODAL PREMIUM PARA REGISTRAR NUEVO GASTO
     */
    window.showGastoModal = () => {
        const modalOverlay = document.createElement('div');
        modalOverlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
            display: flex; justify-content: center; align-items: center; z-index: 9999;
        `;

        const hoyFechaLocal = new Date().toISOString().split('T')[0];

        modalOverlay.innerHTML = `
            <div style="
                background: #141414; border: 1px solid #2a2a2a; border-radius: 16px;
                width: 100%; max-width: 450px; padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.7);
                color: #fff; box-sizing: border-box;
            ">
                <h2 style="margin-top: 0; margin-bottom: 20px; font-weight: 800; font-size: 1.3rem; border-bottom: 1px solid #2a2a2a; padding-bottom: 12px; color: #e74c3c;">
                    💸 Registrar Gasto Operativo
                </h2>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Descripción del Gasto</label>
                        <input type="text" id="g-desc" placeholder="Ej: Pago de arriendo local Usaquén Junio" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem;">
                    </div>

                    <div>
                        <label style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Clasificación / Categoría</label>
                        <select id="g-categoria" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; cursor: pointer;">
                            <option value="" disabled selected>-- Seleccione una categoría --</option>
                            ${state.gastosCategorias.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                        </select>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <div style="flex: 1.2;">
                            <label style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Valor Pagado ($)</label>
                            <input type="number" id="g-valor" placeholder="Ej: 1200000" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem;">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Fecha de Pago</label>
                            <input type="date" id="g-fecha" value="${hoyFechaLocal}" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem;">
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 25px;">
                    <button type="button" id="g-btn-cancelar" style="flex: 1; padding: 13px; border-radius: 8px; border: 1px solid #333; background: transparent; color: #aaa; font-weight: 600; cursor: pointer;">Cancelar</button>
                    <button type="button" id="g-btn-guardar" style="flex: 1.8; padding: 13px; border-radius: 8px; border: none; background: #e74c3c; color: white; font-weight: bold; cursor: pointer;">Guardar Gasto</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        document.getElementById('g-btn-cancelar').onclick = () => modalOverlay.remove();

        document.getElementById('g-btn-guardar').onclick = () => {
            const desc = document.getElementById('g-desc').value.trim();
            const cat = document.getElementById('g-categoria').value;
            const valor = parseFloat(document.getElementById('g-valor').value);
            const fechaVal = document.getElementById('g-fecha').value;

            if (!desc || !cat || isNaN(valor) || valor <= 0 || !fechaVal) {
                mostrarAlertaModal("Por favor, rellene todos los campos de manera correcta antes de guardar.");
                return;
            }

            state.gastos.push({
                id: Date.now() + Math.floor(Math.random() * 100),
                descripcion: desc,
                categoria: cat,
                valor: valor,
                fecha: fechaVal
            });

            modalOverlay.remove();
            window.refreshView();
            mostrarAlertaModal("💸 Gasto operativo registrado con éxito en la caja del negocio.", true);
        };
    };

    /**
     * ELIMINAR GASTO OPERATIVO INDIVIDUAL (PRUEBAS Y CORRECCIONES)
     */
    window.eliminarGastoIndividual = (id) => {
        const gasto = state.gastos.find(g => g.id === id);
        if (!gasto) return;

        mostrarConfirmacionModal(
            `⚠️ ¿Desea eliminar el registro de gasto "${gasto.descripcion}" por valor de $${gasto.valor.toLocaleString()}?`,
            () => {
                state.gastos = state.gastos.filter(g => g.id !== id);
                window.refreshView();
                mostrarAlertaModal("Gasto removido del historial.", true);
            }
        );
    };

    /**
     * VACIAR HISTORIAL DE GASTOS (ÚTIL PARA FIN DE PRUEBAS)
     */
    window.limpiarHistorialGastos = () => {
        mostrarConfirmacionModal(
            `🚨 <b>¡Atención de Pruebas!</b><br>Está a punto de borrar definitivamente TODO el <b>Historial de Gastos Operacionales</b>.<br><br>¿Desea limpiar el panel para iniciar de manera oficial?`,
            () => {
                state.gastos = [];
                window.refreshView();
                mostrarAlertaModal("🧹 Historial de egresos vaciado correctamente.", true);
            }
        );
    };

    // --- MANEJADORES DE INPUTS ---
    window.manejarBusquedaGastos = (e) => {
        state.gastosBusqueda = e.target.value;
        renderGastos(container, state);
    };

    window.cambiarFiltroCategoriaGastos = (e) => {
        state.gastosFiltroCategoria = e.target.value;
        renderGastos(container, state);
    };

    // --- FILTRADO Y BÚSQUEDA ---
    const gastosFiltrados = state.gastos.filter(g => {
        const coincideBusqueda = g.descripcion.toLowerCase().includes(state.gastosBusqueda.toLowerCase()) ||
                                 g.categoria.toLowerCase().includes(state.gastosBusqueda.toLowerCase());
        const coincideCat = state.gastosFiltroCategoria === "TODOS" || g.categoria === state.gastosFiltroCategoria;
        return coincideBusqueda && coincideCat;
    });

    // Ordenar de más reciente a más antiguo
    gastosFiltrados.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // --- RENDERIZADO DE LA INTERFAZ HTML ---
    container.innerHTML = `
        <div class="module-fade-in">
            <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
                <h1 style="margin: 0;">💸 Control de Gastos Operativos</h1>
                <div style="display: flex; gap: 10px;">
                    ${state.gastos.length > 0 ? `
                        <button onclick="window.limpiarHistorialGastos()" class="btn-outline" style="background: transparent; border: 1px solid #e74c3c; padding: 10px 18px; border-radius: 8px; color: #e74c3c; cursor: pointer; font-weight: 600;">
                            🗑️ Limpiar Pruebas
                        </button>
                    ` : ''}
                    <button onclick="window.showGastoModal()" class="btn-primary" style="width: auto; padding: 10px 22px;">
                        + Registrar Gasto
                    </button>
                </div>
            </div>

            <!-- DASHBOARD DE METRICAS DE EGRESOS -->
            <div class="dashboard-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card" style="background: #1a1a1a; padding: 22px; border-radius: 15px; border: 1px solid #333; border-left: 4px solid #e74c3c;">
                    <span style="color: #888; font-size: 0.85rem; text-transform: uppercase; font-weight: bold;">Egresos Operativos Totales</span>
                    <h2 style="color: #e74c3c; font-size: 2rem; margin: 10px 0;">$${totalEgresos.toLocaleString()}</h2>
                    <p style="color: #555; font-size: 0.8rem;">Costo de funcionamiento acumulado</p>
                </div>

                <div class="stat-card" style="background: #1a1a1a; padding: 22px; border-radius: 15px; border: 1px solid #333;">
                    <span style="color: #888; font-size: 0.85rem; text-transform: uppercase;">Mayor Foco de Egreso</span>
                    <h2 style="color: #fff; font-size: 1.5rem; margin: 10px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${categoriaMasCostosa}</h2>
                    <p style="color: #888; font-size: 0.8rem;">Consumo de la categoría: $${valorMasAltoCat.toLocaleString()}</p>
                </div>

                <div class="stat-card" style="background: #1a1a1a; padding: 22px; border-radius: 15px; border: 1px solid #333; border-left: 4px solid #3498db;">
                    <span style="color: #3498db; font-size: 0.85rem; text-transform: uppercase;">Egresos este mes</span>
                    <h2 style="color: #3498db; font-size: 2rem; margin: 10px 0;">$${totalEgresos.toLocaleString()}</h2>
                    <p style="color: #888; font-size: 0.8rem;">Mes fiscal activo</p>
                </div>
            </div>

            <!-- FILTRADO Y BÚSQUEDA DE GASTOS -->
            <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin-bottom: 25px; display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                <div style="flex: 2; min-width: 250px;">
                    <input type="text" id="gas-search-input" 
                           placeholder="🔍 Buscar gastos por descripción..." 
                           value="${state.gastosBusqueda}" 
                           oninput="window.manejarBusquedaGastos(event)"
                           style="width: 100%; padding: 12px 15px; border-radius: 8px; border: 1px solid #333; background: #0a0a0a; color: white; outline: none; font-size: 0.95rem;">
                </div>

                <div style="flex: 1; min-width: 200px;">
                    <select id="gas-filter-cat" onchange="window.cambiarFiltroCategoriaGastos(event)"
                            style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #333; background: #0a0a0a; color: white; outline: none; font-size: 0.95rem; cursor: pointer;">
                        <option value="TODOS" ${state.gastosFiltroCategoria === "TODOS" ? "selected" : ""}>📋 Filtrar: Todas las categorías</option>
                        ${state.gastosCategorias.map(cat => `
                            <option value="${cat}" ${state.gastosFiltroCategoria === cat ? "selected" : ""}>💸 ${cat}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <!-- TABLA HISTORIAL DE GASTOS -->
            <div class="table-container" style="background: #141414; border-radius: 12px; border: 1px solid #2a2a2a; overflow: hidden; margin-bottom: 30px;">
                <div style="padding: 18px; border-bottom: 1px solid #2a2a2a; background: #1c1c1c; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Lista Detallada de Egresos</h3>
                    <span style="font-size: 0.85rem; color: #888;">Egresos listados: <b>${gastosFiltrados.length}</b></span>
                </div>
                <table>
                    <thead>
                        <tr style="background: #1a1a1a;">
                            <th style="padding: 15px; color: #888; text-align: left;">Fecha</th>
                            <th style="padding: 15px; color: #888; text-align: left;">Categoría</th>
                            <th style="padding: 15px; color: #888; text-align: left;">Descripción</th>
                            <th style="padding: 15px; color: #888; text-align: right;">Monto</th>
                            <th style="padding: 15px; color: #888; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${gastosFiltrados.length > 0 ? gastosFiltrados.map(g => `
                            <tr style="border-bottom: 1px solid #222;">
                                <td style="padding: 15px; color: #aaa; font-size: 0.9rem;">${g.fecha}</td>
                                <td style="padding: 15px;">
                                    <span class="tag" style="background: #201414; color: #e74c3c; border: 1px solid #e74c3c11;">${g.categoria}</span>
                                </td>
                                <td style="padding: 15px; font-weight: bold; color: #fff;">${g.descripcion}</td>
                                <td style="padding: 15px; text-align: right; color: #e74c3c; font-weight: bold; font-size: 1rem;">
                                    -$${g.valor.toLocaleString()}
                                </td>
                                <td style="padding: 15px; text-align: center;">
                                    <button onclick="window.eliminarGastoIndividual(${g.id})" class="btn-delete-small" style="background: #e74c3c; padding: 6px 12px; border-radius: 5px; cursor: pointer; border: none; color: white;" title="Eliminar Registro">✕</button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 50px; color: #555;">
                                    No se encontraron registros de gastos operativos con los criterios de búsqueda actuales.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>

            <!-- NOTA METODOLÓGICA -->
            <div style="padding: 20px; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; border-left: 4px solid #e74c3c; display: flex; gap: 15px; align-items: center;">
                <div style="font-size: 1.8rem;">💡</div>
                <div style="font-size: 0.85rem; color: #888; line-height: 1.5;">
                    <b>Efecto en Utilidad Neta Real:</b> La ganancia de mostrador representa la <i>Utilidad Bruta</i>. Al registrar egresos operativos (nómina, servicios, etc.), el sistema de <b>Finanzas</b> de Lomos restará estos costos fijos automáticamente del balance final del mes para entregarte la <b>Utilidad Real Libre</b>.
                </div>
            </div>
        </div>
    `;

    // Restaurar el foco en la barra de búsqueda si se estaba interactuando con ella
    if (state.gastosBusqueda !== "") {
        const input = document.getElementById('gas-search-input');
        if (input) {
            input.focus();
            input.setSelectionRange(state.gastosBusqueda.length, state.gastosBusqueda.length);
        }
    }
}