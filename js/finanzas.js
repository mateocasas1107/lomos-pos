/**
 * Módulo de Finanzas - Lomos & Lomos Express
 * Gestión de utilidades, historial de ventas, cuentas por cobrar (fiados),
 * sistema de copias de seguridad (JSON) y control de Cierre de Caja Diario/Turnos (Reportes X/Z).
 */

export function renderFinanzas(container, state) {
    
    // --- INICIALIZACIÓN DE VARIABLES DE CIERRES EN EL ESTADO ---
    if (!state.cierresCaja) state.cierresCaja = [];
    if (!state.ultimoCierreTimestamp) {
        // Si no hay cierres previos, el turno actual inició al principio de los tiempos o con el primer registro
        state.ultimoCierreTimestamp = "2000-01-01T00:00:00.000Z";
    }

    // --- CÁLCULOS FINANCIEROS GLOBALES ---
    const totalIngresos = (state.ventasRealizadas || []).reduce((acc, v) => acc + (v.total || 0), 0);
    const totalCostos = (state.ventasRealizadas || []).reduce((acc, v) => acc + (v.costo || 0), 0);
    const totalGastosRegistrados = (state.gastos || []).reduce((acc, g) => acc + (g.valor || 0), 0);
    const utilidadNetaBruta = totalIngresos - totalCostos;
    const utilidadNetaReal = utilidadNetaBruta - totalGastosRegistrados;

    // Métricas de ventas registradas hoy estrictamente por fecha ISO
    const hoyISO = new Date().toISOString().split('T')[0];
    const ventasHoy = (state.ventasRealizadas || []).filter(v => (v.fechaISO || "").startsWith(hoyISO));
    const ingresosHoy = ventasHoy.reduce((acc, v) => acc + (v.total || 0), 0);
    const utilidadHoy = ventasHoy.reduce((acc, v) => acc + (v.utilidad || 0), 0);

    // --- CÁLCULOS DEL TURNO ACTIVO (DESDE EL ÚLTIMO CIERRE DE CAJA) ---
    const tsCierreAnterior = new Date(state.ultimoCierreTimestamp).getTime();

    // Filtramos las ventas realizadas en este turno
    const ventasTurno = (state.ventasRealizadas || []).filter(v => {
        const tsVenta = new Date(v.fechaISO || v.fecha).getTime();
        return tsVenta > tsCierreAnterior;
    });

    // Filtramos los gastos de este turno (usamos g.id como marca temporal en ms)
    const gastosTurno = (state.gastos || []).filter(g => {
        return g.id > tsCierreAnterior;
    });

    // Desglose financiero del turno activo
    const totalVentasTurno = ventasTurno.reduce((acc, v) => acc + v.total, 0);
    const ventasContadoTurno = ventasTurno.filter(v => v.metodoPago === 'contado').reduce((acc, v) => acc + v.total, 0);
    const ventasCreditoTurno = ventasTurno.filter(v => v.metodoPago === 'credito').reduce((acc, v) => acc + v.total, 0);
    const totalGastosTurno = gastosTurno.reduce((acc, g) => acc + g.valor, 0);

    // --- CONTROL DE CUENTAS POR COBRAR (FIADOS) ---
    const totalPendienteCobrar = (state.ventasRealizadas || [])
        .filter(v => v.metodoPago === 'credito' && v.estadoPago === 'pendiente')
        .reduce((acc, v) => acc + (v.totalPendiente !== undefined ? v.totalPendiente : v.total), 0);

    // Agrupar facturas pendientes por cliente
    const cuentasClientes = {};
    (state.ventasRealizadas || []).forEach(v => {
        if (v.metodoPago === 'credito' && v.estadoPago === 'pendiente') {
            const nombre = v.cliente ? v.cliente.trim() : "Consumidor Final";
            if (!cuentasClientes[nombre]) {
                cuentasClientes[nombre] = { totalDeuda: 0, facturas: [] };
            }
            const saldo = v.totalPendiente !== undefined ? v.totalPendiente : v.total;
            cuentasClientes[nombre].totalDeuda += saldo;
            cuentasClientes[nombre].facturas.push(v);
        }
    });

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
                <button id="fin-alert-btn" style="background: ${esExito ? '#2ecc71' : '#e74c3c'}; color: ${esExito ? 'black' : 'white'}; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Entendido</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('fin-alert-btn').onclick = () => overlay.remove();
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
                    <button id="fin-cancel-btn" style="flex: 1; background: #333; color: white; border: 1px solid #444; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button id="fin-ok-btn" style="flex: 1; background: #2ecc71; color: white; border: none; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('fin-cancel-btn').onclick = () => overlay.remove();
        document.getElementById('fin-ok-btn').onclick = () => {
            overlay.remove();
            accionConfirmar();
        };
    };

    const mostrarPromptModal = (mensaje, placeholder, accionAceptar) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #1c1c1c; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #f1c40f; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">💵 Registrar Abono</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <input type="number" id="prompt-input-val" placeholder="${placeholder}" style="width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: white; border-radius: 8px; margin-bottom: 20px; text-align: center; font-size: 1.1rem; font-weight: bold; outline: none;" />
                <div style="display: flex; gap: 10px;">
                    <button id="prompt-cancel-btn" style="flex: 1; background: #333; color: white; border: 1px solid #444; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button id="prompt-ok-btn" style="flex: 1; background: #f1c40f; color: black; border: none; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Registrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const inputVal = document.getElementById('prompt-input-val');
        inputVal.focus();

        document.getElementById('prompt-cancel-btn').onclick = () => overlay.remove();
        document.getElementById('prompt-ok-btn').onclick = () => {
            const valor = parseFloat(inputVal.value);
            overlay.remove();
            accionAceptar(valor);
        };
    };

    // --- LÓGICA DE CONTROL DE ARQUEO Y CIERRE DE CAJA ---
    
    /**
     * IMPRIMIR TICKET DE CIERRE (REPORTE Z)
     * Genera la tirilla física del arqueo de caja para archivar.
     */
    window.imprimirReporteZ = (cierre) => {
        const ticketHTML = `
            <html>
            <head>
                <title>Reporte Z - Cierre N° ${cierre.id}</title>
                <style>
                    body { font-family: 'Courier New', monospace; width: 80mm; font-size: 11px; padding: 5px; margin: 0; color: #000; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; }
                    td { font-size: 11px; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="center">
                    <h3 style="margin:0;">LOMOS & LOMOS EXPRESS</h3>
                    <p style="margin:2px 0;">NIT: 52187751-5</p>
                    <h4 style="margin:5px 0;">REPORTE Z - CIERRE DE CAJA</h4>
                    <p class="bold">CIERRE N°: ${cierre.id}</p>
                </div>
                
                <div class="divider"></div>
                <p><b>FECHA CIERRE:</b> ${cierre.fecha}</p>
                <p><b>CAJERO:</b> ${cierre.cajero.toUpperCase()}</p>
                <p><b>TURNO DESDE:</b> ${cierre.turnoDesde}</p>
                <div class="divider"></div>

                <table>
                    <tr><td>(+) Fondo / Base Inicial:</td><td align="right">$${cierre.base.toLocaleString()}</td></tr>
                    <tr><td>(+) Ventas Contado (Caja):</td><td align="right">$${cierre.ventasContado.toLocaleString()}</td></tr>
                    <tr><td>(-) Egresos / Gastos Turno:</td><td align="right">-$${cierre.egresos.toLocaleString()}</td></tr>
                    <tr class="bold"><td>(=) Efectivo Esperado:</td><td align="right">$${cierre.esperado.toLocaleString()}</td></tr>
                    <tr class="bold"><td>(=) Efectivo Real Contado:</td><td align="right">$${cierre.real.toLocaleString()}</td></tr>
                    <tr class="divider"><td colspan="2"></td></tr>
                    <tr class="bold" style="font-size: 12px; color: ${cierre.diferencia < 0 ? '#ff0000' : '#000000'};">
                        <td>DIFERENCIA (Arqueo):</td>
                        <td align="right">
                            ${cierre.diferencia === 0 ? '$0 (Cuadrado)' : (cierre.diferencia < 0 ? `-$${Math.abs(cierre.diferencia).toLocaleString()} (Faltante)` : `+$${cierre.diferencia.toLocaleString()} (Sobrante)`)}
                        </td>
                    </tr>
                </table>

                <div class="divider"></div>
                <div class="center bold" style="margin-bottom: 5px;">OTROS FLUJOS DE TURNO</div>
                <table>
                    <tr><td>Ventas por Fiados (Crédito):</td><td align="right">$${cierre.ventasCredito.toLocaleString()}</td></tr>
                    <tr class="bold"><td>Ventas Totales Turno:</td><td align="right">$${cierre.ventasTotales.toLocaleString()}</td></tr>
                </table>

                <div class="divider" style="margin-top: 30px;"></div>
                <p class="center" style="font-size: 9px;">Firma del Cajero</p>
                <br><br>
                <p class="center">_______________________________</p>
                <br>
                <p class="center" style="font-size: 8px;">Sistema Lomos POS - Registro Auditado Localmente</p>
            </body>
            </html>
        `;

        const win = window.open('', '_blank', 'width=400,height=600');
        win.document.write(ticketHTML);
        win.document.close();
    };

    /**
     * MODAL DE PROCESAMIENTO DEL CIERRE DE CAJA
     */
    window.abrirModalCierreCaja = () => {
        const modalOverlay = document.createElement('div');
        modalOverlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
            display: flex; justify-content: center; align-items: center; z-index: 9999;
        `;

        const efectivoEsperadoCalculado = 100000 + ventasContadoTurno - totalGastosTurno; // Base sugerida 100.000

        modalOverlay.innerHTML = `
            <div style="
                background: #141414; border: 1px solid #333; border-radius: 16px;
                width: 100%; max-width: 485px; padding: 28px; color: white; box-shadow: 0 20px 40px rgba(0,0,0,0.6);
            ">
                <h3 style="margin-top: 0; margin-bottom: 10px; color: #f1c40f; display: flex; align-items: center; gap: 8px;">
                    🔒 Procesar Arqueo y Cierre de Turno
                </h3>
                <p style="font-size: 0.82rem; color: #aaa; margin-bottom: 15px; line-height: 1.4;">
                    Digite la base de caja con la que inició el turno y el dinero en efectivo que contó físicamente en la gaveta registradora. El sistema auditará la diferencia contable.
                </p>

                <!-- Resumen Financiero Dinámico en Modal -->
                <div style="background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 12px; margin-bottom: 15px; font-size: 0.85rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>(+) Ventas de Contado (Caja):</span>
                        <b style="color: #2ecc71;">$${ventasContadoTurno.toLocaleString()}</b>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>(-) Gastos del Turno:</span>
                        <b style="color: #e74c3c;">-$${totalGastosTurno.toLocaleString()}</b>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px dashed #333; padding-top: 5px; margin-top: 5px;">
                        <span>Efectivo Esperado (con Base $100K):</span>
                        <b id="cierre-esperado-lbl" style="color: #fff;">$${efectivoEsperadoCalculado.toLocaleString()}</b>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;">
                            Base / Fondo de Caja Inicial ($)
                        </label>
                        <input type="number" id="cierre-base" value="100000" style="width:100%; padding:10px; margin-top:5px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; font-weight: bold;">
                    </div>

                    <div>
                        <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;">
                            Efectivo Físico Contado ($)
                        </label>
                        <input type="number" id="cierre-real" placeholder="Cuente el dinero físico de la caja..." style="width:100%; padding:10px; margin-top:5px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; font-weight: bold; text-align: center;">
                    </div>

                    <div>
                        <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;">
                            Nombre del Cajero / Operador
                        </label>
                        <input type="text" id="cierre-cajero" placeholder="Quién realiza el arqueo..." style="width:100%; padding:10px; margin-top:5px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem;">
                    </div>

                    <!-- PRESTACIÓN DE DESCUADRE EN TIEMPO REAL -->
                    <div id="cierre-descuadre-box" style="background: #1c1313; border: 1px solid #441c1c; border-radius: 8px; padding: 12px; display: none;">
                        <div style="font-weight: bold; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 3px;" id="cierre-descuadre-title">Cálculo de Arqueo:</div>
                        <div id="cierre-descuadre-text" style="font-size: 0.85rem; line-height: 1.4;"></div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button id="cierre-btn-cancelar" style="flex: 1; padding: 11px; border-radius: 8px; border: 1px solid #333; background: transparent; color: #aaa; cursor: pointer; font-weight: bold;">Cancelar</button>
                    <button id="cierre-btn-guardar" style="flex: 1.5; padding: 11px; border-radius: 8px; border: none; background: #e67e22; color: white; cursor: pointer; font-weight: bold;">Cerrar Turno & Imprimir</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const inputBase = document.getElementById('cierre-base');
        const inputReal = document.getElementById('cierre-real');
        const inputCajero = document.getElementById('cierre-cajero');
        const descBox = document.getElementById('cierre-descuadre-box');
        const descTitle = document.getElementById('cierre-descuadre-title');
        const descText = document.getElementById('cierre-descuadre-text');
        const lblEsperado = document.getElementById('cierre-esperado-lbl');

        const actualizarAnalisisCierre = () => {
            const base = parseFloat(inputBase.value) || 0;
            const real = parseFloat(inputReal.value);
            
            const esperado = base + ventasContadoTurno - totalGastosTurno;
            lblEsperado.innerText = `$${esperado.toLocaleString()}`;

            if (isNaN(real) || real < 0) {
                descBox.style.display = 'none';
                return;
            }

            descBox.style.display = 'block';
            const diferencia = real - esperado;

            if (diferencia === 0) {
                descBox.style.background = '#111a14';
                descBox.style.borderColor = '#1c4424';
                descTitle.innerText = "✅ CAJA CUADRADA";
                descTitle.style.color = "#2ecc71";
                descText.innerHTML = "El dinero físico coincide exactamente con las ventas de caja del turno actual. Todo correcto.";
            } else if (diferencia < 0) {
                descBox.style.background = '#1c1313';
                descBox.style.borderColor = '#441c1c';
                descTitle.innerText = "❌ FALTANTE DE DINERO";
                descTitle.style.color = "#e74c3c";
                descText.innerHTML = `Falta dinero físico en la registradora. Diferencia: <b style="font-size:1rem;">-$${Math.abs(diferencia).toLocaleString()}</b>. Por favor, revise de nuevo o justifique la pérdida.`;
            } else {
                descBox.style.background = '#13191c';
                descBox.style.borderColor = '#1c3444';
                descTitle.innerText = "⚠️ SOBRANTE DE DINERO";
                descTitle.style.color = "#3498db";
                descText.innerHTML = `Sobra dinero físico en la registradora. Diferencia: <b style="font-size:1rem;">+$${diferencia.toLocaleString()}</b>.`;
            }
        };

        inputBase.addEventListener('input', actualizarAnalisisCierre);
        inputReal.addEventListener('input', actualizarAnalisisCierre);

        document.getElementById('cierre-btn-cancelar').onclick = () => modalOverlay.remove();
        
        document.getElementById('cierre-btn-guardar').onclick = () => {
            const base = parseFloat(inputBase.value);
            const real = parseFloat(inputReal.value);
            const cajero = inputCajero.value.trim();

            if (isNaN(base) || isNaN(real) || !cajero) {
                mostrarAlertaModal("Por favor, ingrese todos los valores requeridos y el nombre del cajero.");
                return;
            }

            const esperado = base + ventasContadoTurno - totalGastosTurno;
            const diferencia = real - esperado;

            const nuevoCierre = {
                id: state.cierresCaja.length + 1,
                fecha: new Date().toLocaleString(),
                turnoDesde: state.ultimoCierreTimestamp === "2000-01-01T00:00:00.000Z" ? "Inicio del Sistema" : new Date(state.ultimoCierreTimestamp).toLocaleString(),
                cajero,
                base,
                esperado,
                real,
                diferencia,
                ventasContado: ventasContadoTurno,
                ventasCredito: ventasCreditoTurno,
                ventasTotales: totalVentasTurno,
                egresos: totalGastosTurno
            };

            // Guardar registro, actualizar marca temporal de turno, limpiar pantalla y salvar
            state.cierresCaja.push(nuevoCierre);
            state.ultimoCierreTimestamp = new Date().toISOString();

            modalOverlay.remove();
            window.refreshView();

            // Desplegar confirmación con ticket físico
            mostrarConfirmacionModal(
                `🔐 Cierre de Caja N° ${nuevoCierre.id} consolidado exitosamente.<br>Diferencia de Arqueo: $${diferencia.toLocaleString()}<br><br>¿Desea imprimir la tirilla del reporte Z físico?`,
                () => {
                    window.imprimirReporteZ(nuevoCierre);
                }
            );
        };
    };

    /**
     * --- ELIMINAR TODO EL HISTORIAL DE CIERRES ---
     * Utilizado para limpiar la sección tras finalizar simulaciones de prueba.
     */
    window.eliminarHistorialCierres = () => {
        mostrarConfirmacionModal(
            `🚨 ¡Atención de Auditoría!<br>Está a punto de borrar de forma permanente todos los **cierres de caja históricos** archivados.<br><br>¿Desea restablecer el histórico de turnos?`,
            () => {
                state.cierresCaja = [];
                state.ultimoCierreTimestamp = "2000-01-01T00:00:00.000Z";
                window.refreshView();
                mostrarAlertaModal("🧹 Todo el historial de cierres y turnos ha sido borrado. La caja se encuentra limpia.", true);
            }
        );
    };

    // --- LÓGICA DE COPIAS DE SEGURIDAD (RESPALDOS) ---

    window.exportarCopiaSeguridad = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
            const downloadAnchor = document.createElement('a');
            const fechaArchivo = new Date().toLocaleDateString().replace(/\//g, '-');
            const nombreArchivo = `RESPALDO_LOMOS_EXPRESS_${fechaArchivo}.json`;
            
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", nombreArchivo);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            
            mostrarAlertaModal(`📥 Archivo de copia de seguridad creado con éxito.<br>Guarde el archivo de respaldo <b>${nombreArchivo}</b> en un pendrive USB para asegurar la carnicería.`, true);
        } catch (error) {
            console.error(error);
            mostrarAlertaModal("Hubo un error al intentar empaquetar los datos del sistema.");
        }
    };

    window.procesarArchivoRespaldo = (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const lector = new FileReader();
        lector.onload = function(evento) {
            try {
                const datosImportados = JSON.parse(evento.target.result);
                if (datosImportados.productos && datosImportados.ventasRealizadas) {
                    mostrarConfirmacionModal(
                        `⚠️ ¡ADVERTENCIA CRÍTICA!<br><br>Está a punto de cargar una copia de seguridad externa. Esto <b>reemplazará por completo</b> las ventas, productos y deudas pendientes actuales del mostrador.<br><br>¿Está seguro de que desea continuar?`,
                        () => {
                            Object.keys(state).forEach(key => delete state[key]);
                            Object.assign(state, datosImportados);
                            window.refreshView();
                            mostrarAlertaModal("💪 Base de datos restaurada con éxito. Toda la información ha sido cargada.", true);
                        }
                    );
                } else {
                    mostrarAlertaModal("El archivo seleccionado no corresponde a un formato válido de respaldo de Lomos & Lomos Express.");
                }
            } catch (error) {
                console.error(error);
                mostrarAlertaModal("Error al leer el archivo. Asegúrese de que el JSON no esté corrupto.");
            }
            e.target.value = '';
        };
        lector.readAsText(archivo);
    };

    // --- ACCIONES ADICIONALES DE FACTURACIÓN Y FIADOS ---

    window.eliminarVentaEspecifica = (id) => {
        const ventaIndex = state.ventasRealizadas.findIndex(v => v.id === id);
        if (ventaIndex === -1) return;
        const venta = state.ventasRealizadas[ventaIndex];

        mostrarConfirmacionModal(
            `⚠️ ¿Está seguro de eliminar la venta <b>#${venta.nroFactura || venta.id}</b> de $${venta.total.toLocaleString()}?<br><br>Se reincorporará automáticamente el stock de los productos vendidos al inventario.`,
            () => {
                if (venta.items) {
                    venta.items.forEach(item => {
                        const prod = state.productos.find(p => p.id === item.id);
                        if (prod) prod.stock += item.cantidadVendida;
                    });
                }
                state.ventasRealizadas.splice(ventaIndex, 1);
                window.refreshView();
                mostrarAlertaModal("La factura de prueba ha sido eliminada y sus productos han sido devueltos al inventario.", true);
            }
        );
    };

    window.eliminarTodoElHistorial = () => {
        if (state.ventasRealizadas.length === 0) {
            mostrarAlertaModal("No hay registros de ventas anteriores para limpiar.");
            return;
        }
        mostrarConfirmacionModal(
            `🚨 ¡ADVERTENCIA CRÍTICA DE PRUEBAS! 🚨<br><br>Está a punto de borrar absolutamente <b>TODAS</b> las ventas registradas y vaciar el saldo acumulado de los fiados.<br><br>¿Desea limpiar la caja para empezar a trabajar de manera oficial?`,
            () => {
                state.ventasRealizadas = [];
                state.nroFacturaActual = 1001;
                if (state.carrito) state.carrito = [];
                window.refreshView();
                mostrarAlertaModal("Historial de ventas y fiados vaciado por completo. El correlativo de facturas se ha restablecido al número 1001.", true);
            }
        );
    };

    // --- RENDERIZADO DE LA INTERFAZ HTML ---
    container.innerHTML = `
        <div class="module-fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px;">
                <h1 style="margin: 0;">📊 Finanzas y Control de Caja</h1>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.eliminarTodoElHistorial()" 
                            style="background: #e74c3c; color: white; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;" 
                            title="Vacía toda la base de datos de facturas para empezar en limpio">
                        🚨 Reiniciar Caja (Limpiar Pruebas)
                    </button>
                </div>
            </div>

            <!-- Dashboard de Indicadores Financieros de Vida Completa -->
            <div class="dashboard-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card" style="background: #1a1a1a; padding: 22px; border-radius: 15px; border: 1px solid #333;">
                    <span style="color: #888; font-size: 0.85rem; text-transform: uppercase;">Ventas Totales (Histórico)</span>
                    <h2 style="color: #fff; font-size: 2rem; margin: 10px 0;">$${totalIngresos.toLocaleString()}</h2>
                    <p style="color: #888; font-size: 0.8rem;">Ventas hoy: $${ingresosHoy.toLocaleString()}</p>
                </div>

                <div class="stat-card" style="background: #1a1a1a; padding: 22px; border-radius: 15px; border: 1px solid #333;">
                    <span style="color: #888; font-size: 0.85rem; text-transform: uppercase;">Egresos de Caja (Gastos)</span>
                    <h2 style="color: #e74c3c; font-size: 2rem; margin: 10px 0;">-$${totalGastosRegistrados.toLocaleString()}</h2>
                    <p style="color: #888; font-size: 0.8rem;">Inversión fija del negocio</p>
                </div>

                <div class="stat-card" style="background: #1a1a1a; padding: 22px; border-radius: 15px; border: 1px solid #333; border-left: 4px solid #f1c40f;">
                    <span style="color: #f1c40f; font-size: 0.85rem; text-transform: uppercase; font-weight: bold;">Cuentas por Cobrar (Fiados)</span>
                    <h2 style="color: #f1c40f; font-size: 2rem; margin: 10px 0;">$${totalPendienteCobrar.toLocaleString()}</h2>
                    <p style="color: #888; font-size: 0.8rem;">Dinero pendiente de cobro</p>
                </div>

                <div class="stat-card highlight" style="background: linear-gradient(145deg, #1a1a1a, #1d2b1d); padding: 22px; border-radius: 15px; border: 1px solid #2ecc71;">
                    <span style="color: #2ecc71; font-size: 0.85rem; text-transform: uppercase; font-weight: bold;">Utilidad Neta Estimada</span>
                    <h2 style="color: #2ecc71; font-size: 2.2rem; margin: 10px 0;">$${utilidadNetaReal.toLocaleString()}</h2>
                    <p style="color: #888; font-size: 0.8rem;">Ganancia de hoy: $${utilidadHoy.toLocaleString()}</p>
                </div>
            </div>

            <!-- SECCIÓN: CIERRE DE CAJA DIARIO (TURNO ACTIVO) -->
            <div style="background: #141414; border: 1px solid #e67e2244; border-radius: 15px; padding: 25px; margin-bottom: 35px; border-left: 5px solid #e67e22;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <h3 style="margin: 0; color: #e67e22; font-size: 1.3rem;">🔑 Balance de Turno Activo (Cierre de Caja Diario)</h3>
                        <p style="color: #888; font-size: 0.82rem; margin-top: 5px;">
                            Monitoreo de la caja desde la última reconciliación: <b>${state.ultimoCierreTimestamp === "2000-01-01T00:00:00.000Z" ? "Inicio de Operación" : new Date(state.ultimoCierreTimestamp).toLocaleString()}</b>
                        </p>
                    </div>
                    <button onclick="window.abrirModalCierreCaja()" class="btn-primary" style="background: #e67e22; border-color: #e67e22; padding: 12px 24px; font-weight: 800; width: auto; font-size: 0.95rem;">
                        🔒 REALIZAR CIERRE DE CAJA (Z)
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
                    <div style="background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 15px; text-align: center;">
                        <span style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Ventas Contado (Turno)</span>
                        <h3 style="font-size: 1.5rem; font-weight: 800; color: #2ecc71; margin-top: 5px;">$${ventasContadoTurno.toLocaleString()}</h3>
                    </div>
                    <div style="background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 15px; text-align: center;">
                        <span style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Fiados / Crédito (Turno)</span>
                        <h3 style="font-size: 1.5rem; font-weight: 800; color: #f1c40f; margin-top: 5px;">$${ventasCreditoTurno.toLocaleString()}</h3>
                    </div>
                    <div style="background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 15px; text-align: center;">
                        <span style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Gastos / Egresos (Turno)</span>
                        <h3 style="font-size: 1.5rem; font-weight: 800; color: #e74c3c; margin-top: 5px;">-$${totalGastosTurno.toLocaleString()}</h3>
                    </div>
                    <div style="background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 15px; text-align: center;">
                        <span style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Facturas Emitidas (Turno)</span>
                        <h3 style="font-size: 1.5rem; font-weight: 800; color: #fff; margin-top: 5px;">${ventasTurno.length} uds</h3>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN: COPIAS DE SEGURIDAD (RESPALDO LOCAL) -->
            <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 25px; margin-bottom: 35px;">
                <h3 style="margin-top: 0; color: #3498db; display: flex; align-items: center; gap: 8px;">🛡️ Copias de Seguridad y Respaldo Local</h3>
                <p style="color: #888; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.4;">
                    Dado que el sistema procesa toda la información de forma local, use este panel periódicamente para descargar respaldos. Puede guardar el archivo en una memoria USB para blindar el negocio ante cualquier eventualidad o pérdida del historial de navegación.
                </p>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px; background: #1c1c1c; padding: 20px; border-radius: 8px; border: 1px solid #333; text-align: center;">
                        <span style="font-size: 1.8rem;">📥</span>
                        <h4 style="margin: 10px 0 5px 0;">Exportar Base de Datos</h4>
                        <p style="color: #666; font-size: 0.8rem; margin-bottom: 15px;">Descarga todas las ventas, productos y deudas en un archivo JSON.</p>
                        <button onclick="window.exportarCopiaSeguridad()" class="btn-primary" style="width:100%; background: #3498db; font-weight: bold; padding: 11px;">DESCARGAR COPIA</button>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: #1c1c1c; padding: 20px; border-radius: 8px; border: 1px solid #333; text-align: center;">
                        <span style="font-size: 1.8rem;">📤</span>
                        <h4 style="margin: 10px 0 5px 0;">Restaurar Copia de Seguridad</h4>
                        <p style="color: #666; font-size: 0.8rem; margin-bottom: 15px;">Seleccione un archivo de respaldo generado previamente para restaurar el sistema.</p>
                        <label for="input-archivo-backup" style="display: block; background: #222; border: 1px dashed #444; padding: 11px; border-radius: 6px; color: #aaa; cursor: pointer; font-weight: bold; font-size: 0.9rem; transition: 0.2s; text-align: center;">
                            🔍 SELECCIONAR ARCHIVO .JSON
                        </label>
                        <input type="file" id="input-archivo-backup" accept=".json" onchange="window.procesarArchivoRespaldo(event)" style="display: none;" />
                    </div>
                </div>
            </div>

            <!-- SECCIÓN: CUENTAS POR COBRAR / FIADOS -->
            <div class="table-container" style="margin-bottom: 35px; border-color: #f1c40f;">
                <div style="padding: 20px; border-bottom: 1px solid #2a2a2a; display: flex; justify-content: space-between; align-items: center; background: #1c1c13;">
                    <h3 style="margin: 0; color: #f1c40f;">📋 Libro de Clientes Fiados (Cuentas por Cobrar)</h3>
                    <span style="color: #ccc; font-size: 0.85rem; background: #333; padding: 4px 10px; border-radius: 5px;">
                        Clientes deudores: <b>${Object.keys(cuentasClientes).length}</b>
                    </span>
                </div>
                <table>
                    <thead>
                        <tr style="background: #1a1a1a;">
                            <th style="padding: 15px; text-align: left; color: #888; font-size: 0.75rem;">Cliente</th>
                            <th style="padding: 15px; text-align: center; color: #888; font-size: 0.75rem;">Facturas Pendientes</th>
                            <th style="padding: 15px; text-align: right; color: #888; font-size: 0.75rem;">Deuda Total</th>
                            <th style="padding: 15px; text-align: center; color: #888; font-size: 0.75rem;">Acciones de Cobro</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.keys(cuentasClientes).length > 0 ? Object.keys(cuentasClientes).map(cliente => {
                            const datos = cuentasClientes[cliente];
                            return `
                                <tr style="border-bottom: 1px solid #222;">
                                    <td style="padding: 15px; font-weight: bold; color: #fff; font-size: 1rem;">
                                        👤 ${cliente}
                                    </td>
                                    <td style="padding: 15px; text-align: center; color: #ccc;">
                                        ${datos.facturas.length} remisión(es)
                                    </td>
                                    <td style="padding: 15px; text-align: right; color: #f1c40f; font-weight: bold; font-size: 1.1rem;">
                                        $${datos.totalDeuda.toLocaleString()}
                                    </td>
                                    <td style="padding: 15px; text-align: center; display: flex; gap: 8px; justify-content: center;">
    <button class="btn-abonar" data-cliente="${cliente}" style="background: #3498db; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">
        Abonar
    </button>
    <button class="btn-imprimir" data-cliente="${cliente}" style="background: #2c3e50; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">
        🖨️ Imprimir
    </button>
    <button class="btn-liquidar" data-cliente="${cliente}" style="background: #2ecc71; color: #000; border: none; padding: 8px 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">
        Liquidar Todo
    </button>
</td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="4" style="text-align: center; padding: 40px; color: #555;">
                                    ¡Excelente! No hay cuentas pendientes por cobrar. Todos los clientes están al día.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>

            <!-- AUDITORÍA DE HISTORIAL DE CIERRES -->
            <div class="table-container" style="margin-bottom: 35px; border-color: #e67e22;">
                <div style="padding: 18px; border-bottom: 1px solid #2a2a2a; background: #231913; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0; color: #e67e22;">📋 Historial de Auditoría de Cierres de Caja</h3>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <span style="font-size: 0.85rem; color: #aaa;">Cierres: <b>${state.cierresCaja.length}</b></span>
                        ${state.cierresCaja.length > 0 ? `
                            <button onclick="window.eliminarHistorialCierres()" class="btn-delete-small" style="background: #e74c3c; padding: 6px 12px; border-radius: 5px; cursor: pointer; border: none; color: white; font-weight: bold; font-size: 0.8rem;">
                                🗑️ Limpiar Historial Cierres
                            </button>
                        ` : ''}
                    </div>
                </div>
                <table>
                    <thead>
                        <tr style="background: #1a1a1a;">
                            <th style="padding: 12px 15px; color: #888; text-align: left; font-size: 0.8rem;">Cierre N° / Fecha</th>
                            <th style="padding: 12px 15px; color: #888; text-align: left; font-size: 0.8rem;">Cajero / Turno</th>
                            <th style="padding: 12px 15px; color: #888; text-align: right; font-size: 0.8rem;">Efectivo Esperado</th>
                            <th style="padding: 12px 15px; color: #888; text-align: right; font-size: 0.8rem;">Efectivo Real</th>
                            <th style="padding: 12px 15px; color: #888; text-align: right; font-size: 0.8rem;">Descuadre / Arqueo</th>
                            <th style="padding: 12px 15px; color: #888; text-align: center; font-size: 0.8rem;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.cierresCaja.length > 0 ? state.cierresCaja.map(c => {
                            const descColor = c.diferencia === 0 ? '#2ecc71' : (c.diferencia < 0 ? '#e74c3c' : '#3498db');
                            const descTexto = c.diferencia === 0 ? '$0 (Cuadrado)' : (c.diferencia < 0 ? `-$${Math.abs(c.diferencia).toLocaleString()} (Faltante)` : `+$${c.diferencia.toLocaleString()} (Sobrante)`);

                            return `
                                <tr style="border-bottom: 1px solid #222; font-size: 0.9rem;">
                                    <td style="padding: 12px 15px;">
                                        <div style="font-weight: bold; color: #fff;">Z-Report #${c.id}</div>
                                        <div style="font-size: 0.78rem; color: #777; margin-top: 3px;">${c.fecha}</div>
                                    </td>
                                    <td style="padding: 12px 15px;">
                                        <div style="font-weight: bold; color: #ccc;">👤 ${c.cajero}</div>
                                        <div style="font-size: 0.78rem; color: #555; margin-top: 3px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.turnoDesde}">Desde: ${c.turnoDesde.split(',')[0]}</div>
                                    </td>
                                    <td style="padding: 12px 15px; text-align: right; color: #bbb;">$${c.esperado.toLocaleString()}</td>
                                    <td style="padding: 12px 15px; text-align: right; color: #fff; font-weight: bold;">$${c.real.toLocaleString()}</td>
                                    <td style="padding: 12px 15px; text-align: right; color: ${descColor}; font-weight: bold;">
                                        ${descTexto}
                                    </td>
                                    <td style="padding: 12px 15px; text-align: center;">
                                        <button onclick="window.imprimirReporteZ(${JSON.stringify(c).replace(/"/g, '&quot;')})" 
                                                class="btn-edit-small" style="background: #e67e22; padding: 6px 12px;" title="Reimprimir Tirilla de Cierre">
                                            🖨️ Tirilla
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).reverse().join('') : `
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 30px; color: #555;">
                                    No se han registrado cierres de caja históricos.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>

            <!-- HISTORIAL GENERAL DE FACTURAS -->
            <div class="table-container">
                <div style="padding: 20px; border-bottom: 1px solid #2a2a2a;">
                    <h3 style="margin: 0;">Historial General de Ventas</h3>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Factura / Cliente</th>
                            <th>Fecha y Hora</th>
                            <th>Método Pago</th>
                            <th style="text-align: right;">Valor Venta</th>
                            <th style="text-align: center;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.ventasRealizadas.length > 0 ? state.ventasRealizadas.map(v => {
                            const esCredito = v.metodoPago === 'credito';
                            const estadoTexto = esCredito 
                                ? (v.estadoPago === 'pendiente' ? `<span style="color:#f1c40f; font-weight:bold;">Fiado (Pendiente)</span>` : `<span style="color:#2ecc71;">Fiado (Saldado)</span>`)
                                : `<span style="color:#888;">Contado</span>`;
                            
                            // Etiqueta visual si se emitió Factura Electrónica con su código CUFE
                            const feBadge = v.esFE 
                                ? `<div style="font-size:0.7rem; color:#3498db; margin-top:5px; font-weight:bold;" title="CUFE: ${v.cufe}">🧾 Electrónica DIAN</div>` 
                                : '';

                            return `
                                <tr style="border-bottom: 1px solid #222;">
                                    <td>
                                        <div style="font-weight: bold; color: #fff;">#${v.nroFactura || v.id}</div>
                                        <div style="font-size: 0.8rem; color: #666;">${v.cliente || 'Consumidor Final'}</div>
                                    </td>
                                    <td style="color: #888; font-size: 0.85rem;">
                                        ${v.fecha}
                                        ${feBadge}
                                    </td>
                                    <td style="font-size: 0.9rem;">${estadoTexto}</td>
                                    <td style="text-align: right; font-weight: bold; color: #fff;">$${(v.total || 0).toLocaleString()}</td>
                                    <td style="text-align: center; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                                        <button onclick="window.reimprimirFacturaHistorial(${v.id})" 
                                                class="btn-edit-small" style="background: #3498db; width: 40px; padding: 8px;" title="Reimprimir Tirilla POS">
                                            🖨️
                                        </button>
                                        
                                        <!-- Botones exclusivos para Facturas Electrónicas -->
                                        ${v.esFE ? `
                                            <button onclick="window.descargarFacturaPDF(${v.id})" 
                                                    class="btn-edit-small" style="background: #27ae60; width: 40px; padding: 8px;" title="Descargar PDF (Tamaño Carta)">
                                                📄
                                            </button>
                                            <button onclick="window.enviarFacturaCorreo(${v.id})" 
                                                    class="btn-edit-small" style="background: #9b59b6; width: 40px; padding: 8px;" title="Redactar Correo al Cliente">
                                                📧
                                            </button>
                                        ` : ''}

                                        <button onclick="window.eliminarVentaEspecifica(${v.id})" 
                                                class="btn-delete-small" style="background: #e74c3c; width: 40px; padding: 8px; border-radius: 5px; border: none; cursor: pointer; color: white;" title="Eliminar Venta">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).reverse().join('') : `
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 40px; color: #444;">Sin ventas registradas en el historial.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    /**
 * SOLUCIÓN: Función global para imprimir el Estado de Cuenta de un cliente (Fiados).
 * Pégala al final de tu archivo finanzas.js actual.
 */
container.addEventListener('click', (e) => {
        const target = e.target;
        const nombreCliente = target.dataset.cliente;
        
        if (!nombreCliente) return;

        if (target.classList.contains('btn-abonar')) {
            window.abonarCuentaCliente(nombreCliente);
        } else if (target.classList.contains('btn-liquidar')) {
            window.liquidarCuentaCliente(nombreCliente);
        } else if (target.classList.contains('btn-imprimir')) {
            window.imprimirEstadoCuenta(nombreCliente);
        }
    });

}
window.abonarCuentaCliente = (nombreCliente) => {
    window.mostrarModalEntrada("Abonar Cuenta", `Registrar abono para: ${nombreCliente}`, (monto) => {
        const facturas = window.state.ventasRealizadas.filter(v => v.cliente === nombreCliente && v.estadoPago === 'pendiente');
        let restante = monto;
        facturas.forEach(f => {
            if (restante <= 0) return;
            let saldo = f.totalPendiente !== undefined ? f.totalPendiente : f.total;
            if (restante >= saldo) { restante -= saldo; f.totalPendiente = 0; f.estadoPago = 'pagado'; }
            else { f.totalPendiente = saldo - restante; restante = 0; }
        });
        window.refreshView();
    });
};

window.liquidarCuentaCliente = (nombreCliente) => {
    window.mostrarModalConfirmacion("Liquidar Cuenta", `¿Confirmas liquidar toda la deuda de ${nombreCliente}?`, () => {
        window.state.ventasRealizadas.forEach(v => {
            if (v.cliente === nombreCliente && v.estadoPago === 'pendiente') { v.totalPendiente = 0; v.estadoPago = 'pagado'; }
        });
        window.refreshView();
    });
};
// --- PEGA ESTO AL FINAL DE TU ARCHIVO ---
window.imprimirEstadoCuenta = (nombreCliente) => {
    // 1. Calculamos los datos primero para asegurar que existen
    const fiados = window.state.ventasRealizadas.filter(v => v.cliente === nombreCliente && v.estadoPago === 'pendiente');
    const totalDeuda = fiados.reduce((acc, v) => acc + (v.totalPendiente !== undefined ? v.totalPendiente : v.total), 0);

    // 2. Abrimos la ventana
    const win = window.open('', '_blank', 'width=350,height=600');
    
    // 3. Escribimos el contenido
    win.document.write(`
        <html>
            <head>
                <style>
                    body { font-family: 'Courier New', monospace; width: 72mm; margin: 0; padding: 5px; font-size: 13px; color: #000; }
                    .center { text-align: center; }
                    .divider { border-top: 1px dashed #000; margin: 5px 0; }
                    .fila { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .total { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 0; margin-top: 10px; text-align: right; font-weight: bold; font-size: 1.1rem; }
                </style>
            </head>
            <body>
                <div class="center">
                    <div style="font-weight:bold; font-size:1.2rem;">LOMOS & LOMOS EXPRESS</div>
                    <p>ESTADO DE CUENTA</p>
                </div>
                <div class="divider"></div>
                <p>Cliente: <b>${nombreCliente}</b><br>Fecha: ${new Date().toLocaleDateString()}</p>
                <div class="divider"></div>
                
                ${fiados.map(f => `
                    <div style="margin-bottom: 8px;">
                        <div style="font-weight:bold;">Factura #${f.nroFactura || f.id}</div>
                        ${(f.items || []).map(i => `
                            <div class="fila">
                                <span>${i.cantidadDetalle} ${i.nombre}</span>
                                <span>$${(i.total || 0).toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
                
                <div class="divider"></div>
                <div class="total">TOTAL: $${totalDeuda.toLocaleString()}</div>
                <div class="center" style="margin-top:15px; font-size: 10px;">¡Gracias por su compra!</div>
            </body>
        </html>
    `);

    // 4. EL PASO MÁS IMPORTANTE: Cerramos el documento y esperamos a que cargue
    win.document.close(); 
    
    // 5. Esperamos 500ms para asegurar que el contenido está "pintado" antes de imprimir
    setTimeout(() => {
        win.focus();
        win.print();
        win.close();
    }, 500);
};
// --- MOTOR DE MODALES PERSONALIZADOS (Estilo Lomos) ---

const crearOverlay = () => {
    const overlay = document.createElement('div');
    overlay.style = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 99999; backdrop-filter: blur(4px);`;
    return overlay;
};

// Modal para Liquidar (Confirmar sí/no)
window.mostrarModalConfirmacion = (titulo, mensaje, onConfirm) => {
    const overlay = crearOverlay();
    overlay.innerHTML = `
        <div style="background: #1c1c1c; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white;">
            <h3 style="margin-top: 0; color: #e74c3c;">${titulo}</h3>
            <p style="margin: 20px 0; color: #ccc;">${mensaje}</p>
            <div style="display: flex; gap: 10px;">
                <button id="btn-no" style="flex:1; padding: 10px; border-radius: 6px; border:none; background:#444; color:white; cursor:pointer;">Cancelar</button>
                <button id="btn-si" style="flex:1; padding: 10px; border-radius: 6px; border:none; background:#2ecc71; color:white; cursor:pointer;">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-si').onclick = () => { onConfirm(); overlay.remove(); };
    overlay.querySelector('#btn-no').onclick = () => overlay.remove();
};

// Modal para Abonar (Input numérico)
window.mostrarModalEntrada = (titulo, mensaje, onConfirm) => {
    const overlay = crearOverlay(); // Asumo que esta función ya la tienes definida al final
    overlay.innerHTML = `
        <div style="background: #1c1c1c; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white;">
            <h3 style="margin-top: 0; color: #3498db;">${titulo}</h3>
            <p style="margin: 20px 0; color: #ccc;">${mensaje}</p>
            <input type="number" id="input-monto-unico" placeholder="Ej: 50000" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #444; background: #000; color: white; margin-bottom: 15px;">
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-unico" style="flex:1; padding: 10px; border-radius: 6px; border:none; background:#444; color:white; cursor:pointer;">Cancelar</button>
                <button id="btn-aceptar-unico" style="flex:1; padding: 10px; border-radius: 6px; border:none; background:#3498db; color:white; cursor:pointer;">Registrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Seleccionamos los elementos DESDE el overlay para asegurar que los encuentra
    const input = overlay.querySelector('#input-monto-unico');
    const btnAceptar = overlay.querySelector('#btn-aceptar-unico');
    const btnCancelar = overlay.querySelector('#btn-cancelar-unico');

    btnAceptar.onclick = () => {
        const val = parseFloat(input.value);
        console.log("Valor capturado:", val); // Esto te dirá en F12 si el número llega bien

        if (!isNaN(val) && val > 0) {
            onConfirm(val); // Ejecuta la lógica de abonar
            overlay.remove(); // Cierra el modal
        } else {
            alert("Por favor ingresa un monto válido.");
        }
    };

    btnCancelar.onclick = () => {
        overlay.remove();
    };
};
