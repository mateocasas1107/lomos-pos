/**
 * Módulo de Inventario - Lomos & Lomos Express
 * Gestión avanzada del catálogo de productos con control de stock crítico, doble tarifa,
 * alertas sanitarias de vencimiento (Multi-Lote FIFO), desposte con rendimiento y despensa.
 * Incluye gestión de Proveedores/Marcas.
 */

export function renderInventario(container, state) {
    
    // --- CONTEXTO TEMPORAL ACTUAL (Para alertas sanitarias 2026) ---
    const FECHA_HOY = new Date("2026-06-21");

    // --- INICIALIZACIÓN DE VARIABLES EN EL ESTADO ---
    if (state.inventarioBusqueda === undefined) state.inventarioBusqueda = "";
    if (state.inventarioCategoriaFiltro === undefined) state.inventarioCategoriaFiltro = "TODOS";
    if (state.inventarioOrden === undefined) state.inventarioOrden = "nombre-az";
    if (state.registroMermas === undefined) state.registroMermas = [];
    
    // Despensa de materias primas recuperadas para la fabricación de chorizos
    if (!state.subproductosAcumulados) {
        state.subproductosAcumulados = {
            "Piel de Pollo": 0,
            "Grasa de Cerdo": 0,
            "Grasa de Res": 0,
            "Recortes de Carne (Res)": 0,
            "Recortes de Carne (Cerdo)": 0
        };
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
            <div style="background: #141414; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: ${esExito ? '#2ecc71' : '#e74c3c'}; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ${esExito ? '✅ Operación Exitosa' : '⚠️ Alerta de Sistema'}
                </h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <button id="inv-alert-btn" style="background: ${esExito ? '#2ecc71' : '#e74c3c'}; color: ${esExito ? 'black' : 'white'}; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Entendido</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('inv-alert-btn').onclick = () => overlay.remove();
    };

    const mostrarConfirmacionModal = (mensaje, accionConfirmar, accionCancelar = null) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #141414; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #3498db; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">❓ Confirmación</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="inv-cancel-btn" style="flex: 1; background: #1a1a1a; color: #aaa; border: 1px solid #333; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button id="inv-ok-btn" style="flex: 1; background: #e74c3c; color: white; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('inv-cancel-btn').onclick = () => {
            overlay.remove();
            if (accionCancelar) accionCancelar();
        };
        document.getElementById('inv-ok-btn').onclick = () => {
            overlay.remove();
            accionConfirmar();
        };
    };

    const mostrarPromptModal = (titulo, mensaje, placeholder, accionAceptar) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #141414; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #f1c40f; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">${titulo}</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <input type="text" id="prompt-input-val" placeholder="${placeholder}" style="width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #333; color: white; border-radius: 8px; margin-bottom: 20px; text-align: center; font-size: 1.1rem; outline: none; box-sizing: border-box;" />
                <div style="display: flex; gap: 10px;">
                    <button id="prompt-cancel-btn" style="flex: 1; background: #1a1a1a; color: #aaa; border: 1px solid #333; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button id="prompt-ok-btn" style="flex: 1; background: #f1c40f; color: black; border: none; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Guardar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const inputVal = document.getElementById('prompt-input-val');
        inputVal.focus();

        document.getElementById('prompt-cancel-btn').onclick = () => overlay.remove();
        document.getElementById('prompt-ok-btn').onclick = () => {
            const valor = inputVal.value.trim();
            overlay.remove();
            if (valor) accionAceptar(valor);
        };
    };

    // --- ALFABETIZACIÓN DE CATEGORÍAS ---
    const categoriasOrdenadasAlf = [...(state.categorias || [])]
        .filter(cat => cat !== "TODOS")
        .sort((a, b) => a.localeCompare(b));

    window.addCategory = () => {
        mostrarPromptModal(
            "📂 Crear Categoría",
            "Escriba el nombre de la nueva categoría para organizar la vitrina y abarrotes:",
            "Ej: Lácteos, Embutidos, Salsas",
            (categoriaNueva) => {
                const catFormateada = categoriaNueva.trim();
                if (catFormateada && !state.categorias.includes(catFormateada)) {
                    state.categorias.push(catFormateada);
                    window.refreshView();
                    mostrarAlertaModal(`Categoría "${catFormateada}" añadida de forma correcta.`, true);
                } else if (state.categorias.includes(catFormateada)) {
                    mostrarAlertaModal("Esta categoría ya existe en las clasificaciones del sistema.");
                }
            }
        );
    };

    // --- CÁLCULO DE ALERTAS SANITARIAS Y DE STOCK CRÍTICO ---
    const productosConStockBajo = [];
    const productosVencidos = [];
    const productosVencePronto = [];

    (state.productos || []).forEach(p => {
        if (p.stock <= (p.stockMinimo || 0)) {
            productosConStockBajo.push(p);
        }

        // Validación de múltiples lotes (FIFO)
        if (p.lotes && p.lotes.length > 0) {
            p.lotes.forEach(l => {
                if (l.fechaCaducidad && l.fechaCaducidad.trim() !== "" && l.stock > 0) {
                    const fCad = new Date(l.fechaCaducidad + "T00:00:00");
                    const diffDias = Math.ceil((fCad.getTime() - FECHA_HOY.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDias <= 0) {
                        productosVencidos.push({ nombre: `${p.nombre} (Lote: ${l.fechaCaducidad})`, diasExpirado: Math.abs(diffDias), fechaCaducidad: l.fechaCaducidad });
                    } else if (diffDias <= 7) {
                        productosVencePronto.push({ nombre: `${p.nombre} (Lote: ${l.fechaCaducidad})`, diasRestantes: diffDias, fechaCaducidad: l.fechaCaducidad });
                    }
                }
            });
        } else if (p.fechaCaducidad && p.fechaCaducidad.trim() !== "" && p.stock > 0) {
            const fCad = new Date(p.fechaCaducidad + "T00:00:00");
            const diffDias = Math.ceil((fCad.getTime() - FECHA_HOY.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDias <= 0) {
                productosVencidos.push({ nombre: p.nombre, diasExpirado: Math.abs(diffDias), fechaCaducidad: p.fechaCaducidad });
            } else if (diffDias <= 7) {
                productosVencePronto.push({ nombre: p.nombre, diasRestantes: diffDias, fechaCaducidad: p.fechaCaducidad });
            }
        }
    });

    // --- MANEJO DE HISTORIAL DE MERMAS ---
    window.limpiarHistorialMermas = () => {
        mostrarConfirmacionModal(
            `⚠️ ¡Atención de Pruebas!<br>Está a punto de borrar definitivamente todo el <b>Historial de Rendimiento</b>.<br><br>¿Desea vaciar los registros?`,
            () => {
                state.registroMermas = [];
                mostrarConfirmacionModal(
                    `♻️ ¿Desea también reiniciar a cero gramos (0g) todos los subproductos acumulados en la despensa de chorizos?`,
                    () => {
                        state.subproductosAcumulados = {
                            "Piel de Pollo": 0, "Grasa de Cerdo": 0, "Grasa de Res": 0, "Recortes de Carne (Res)": 0, "Recortes de Carne (Cerdo)": 0
                        };
                        window.refreshView();
                        mostrarAlertaModal("🧹 Historial y despensa reiniciados correctamente.", true);
                    },
                    () => {
                        window.refreshView();
                        mostrarAlertaModal("🧹 Historial borrado. Se conservaron las materias primas en despensa.", true);
                    }
                );
            }
        );
    };

    /**
     * MODAL PREMIUM DE CREACIÓN Y EDICIÓN DE PRODUCTO CON SOPORTE MULTI-LOTE Y PROVEEDOR
     */
    window.showProductModal = (productToEdit = null) => {
        const isEditing = !!productToEdit;

        const modalOverlay = document.createElement('div');
        modalOverlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
            display: flex; justify-content: center; align-items: center; z-index: 9999;
        `;

        const categoriesOptions = categoriasOrdenadasAlf
            .map(cat => `<option value="${cat}" ${isEditing && productToEdit.categoria === cat ? 'selected' : ''}>${cat}</option>`)
            .join('');

        modalOverlay.innerHTML = `
            <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 16px; width: 100%; max-width: 500px; padding: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.7); color: #fff; box-sizing: border-box; display: flex; flex-direction: column; max-height: 95vh; overflow-y: auto;">
                <h2 style="margin-top: 0; margin-bottom: 20px; font-weight: 800; font-size: 1.3rem; border-bottom: 1px solid #2a2a2a; padding-bottom: 12px; color: #e74c3c;">
                    ${isEditing ? '✏️ Modificar Producto' : '📦 Registrar Producto'}
                </h2>

                <div style="display: flex; flex-direction: column; gap: 15px; flex-grow: 1;">
                    <div>
                        <label style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Nombre del Producto</label>
                        <input type="text" id="m-nombre" value="${isEditing ? productToEdit.nombre : ''}" placeholder="Ej: Chorizo Santarrosano Especial" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; box-sizing:border-box;">
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <div style="flex: 1;">
                            <label style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Categoría</label>
                            <select id="m-categoria" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; cursor: pointer; box-sizing:border-box;">
                                <option value="" disabled ${!isEditing ? 'selected' : ''}>-- Elija una --</option>
                                ${categoriesOptions}
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Proveedor / Marca (Opc.)</label>
                            <input type="text" id="m-proveedor" value="${isEditing ? (productToEdit.proveedor || '') : ''}" placeholder="Ej: Alpina, Zenú..." style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <div style="flex:1;">
                            <label style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">Costo Base ($)</label>
                            <input type="number" id="m-costo" value="${isEditing ? (productToEdit.costo || 0) : ''}" placeholder="Inversión" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;">Stock Mínimo (Alerta)</label>
                            <input type="number" id="m-stockMinimo" value="${isEditing ? (productToEdit.stockMinimo !== undefined ? productToEdit.stockMinimo : '') : ''}" placeholder="${isEditing && productToEdit.unidad === 'lb' ? 'g (Ej: 2000)' : 'Unidades'}" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label style="font-size: 0.7rem; color: #888; font-weight: bold; text-transform: uppercase;">Vitrina (Detal)</label>
                            <input type="number" id="m-precioDetal" value="${isEditing ? (productToEdit.precioDetal || 0) : ''}" placeholder="Público" style="width:100%; padding:11px 10px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.9rem; box-sizing:border-box;">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 0.7rem; color: #888; font-weight: bold; text-transform: uppercase;">Por Mayor</label>
                            <input type="number" id="m-precioMayor" value="${isEditing ? (productToEdit.precioMayor || 0) : ''}" placeholder="Aliados" style="width:100%; padding:11px 10px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.9rem; box-sizing:border-box;">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 0.7rem; color: #9b59b6; font-weight: bold; text-transform: uppercase;">Alto (Opcional)</label>
                            <input type="number" id="m-precioAlto" value="${isEditing && productToEdit.precioAlto ? productToEdit.precioAlto : ''}" placeholder="+ Valor" style="width:100%; padding:11px 10px; margin-top:6px; background:#0a0a0a; border:1px solid #9b59b666; color:white; border-radius:8px; outline:none; font-size: 0.9rem; box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px; align-items: flex-end;">
                        <div style="flex: 1;">
                            <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;">Unidad</label>
                            <select id="m-unidad" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; cursor: pointer; box-sizing:border-box;">
                                <option value="lb" ${isEditing && productToEdit.unidad === 'lb' ? 'selected' : ''}>Libra (lb)</option>
                                <option value="ud" ${isEditing && productToEdit.unidad === 'ud' ? 'selected' : ''}>Unidad (ud)</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 0.75rem; color: #888; font-weight: bold; text-transform: uppercase;" id="stock-label">Stock Total</label>
                            <input type="number" id="m-stock" value="${isEditing ? productToEdit.stock : ''}" placeholder="Cantidad general" style="width:100%; padding:11px 14px; margin-top:6px; background:#0a0a0a; border:1px solid #333; color:white; border-radius:8px; outline:none; font-size: 0.95rem; box-sizing:border-box;">
                        </div>
                    </div>

                    <!-- SECCIÓN NUEVA: GESTIÓN MULTI-LOTES (VENCIMIENTOS) -->
                    <div style="border: 1px solid #333; border-radius: 8px; padding: 15px; margin-top: 10px; background: #0c0c0c;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
                            <label style="font-size: 0.8rem; color: #f1c40f; font-weight: bold; text-transform: uppercase;">
                                📋 Desglose de Lotes
                            </label>
                            <button type="button" id="btn-add-lote" style="background:#2ecc71; color:black; border:none; padding:6px 12px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">
                                ➕ Añadir Lote
                            </button>
                        </div>
                        <p style="font-size: 0.75rem; color: #888; margin-bottom: 10px;">Si agregas lotes con fechas distintas, el stock general se bloqueará y se calculará sumando los lotes automáticamente.</p>
                        <div id="lotes-list-container" style="max-height: 180px; overflow-y:auto; padding-right:4px; display: flex; flex-direction: column; gap: 8px;"></div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 25px; flex-shrink: 0;">
                    <button type="button" id="m-btn-cancelar" style="flex: 1; padding: 13px; border-radius: 8px; border: 1px solid #333; background: #1a1a1a; color: #aaa; font-weight: 600; cursor: pointer;">Cancelar</button>
                    <button type="button" id="m-btn-guardar" style="flex: 2; padding: 13px; border-radius: 8px; border: none; background: #e74c3c; color: white; font-weight: bold; cursor: pointer;">Guardar Producto</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        setTimeout(() => {
            const unidadSelect = document.getElementById('m-unidad');
            const stockInput = document.getElementById('m-stock');
            const minInput = document.getElementById('m-stockMinimo');

            const actualizarLabelsUnidad = () => {
                if (unidadSelect.value === 'lb') {
                    stockInput.placeholder = "Gramos (ej: 5000)";
                    minInput.placeholder = "Gramos (ej: 2000)";
                } else {
                    stockInput.placeholder = "Unidades (ej: 50)";
                    minInput.placeholder = "Unidades (ej: 10)";
                }
            };
            unidadSelect.addEventListener('change', () => {
                actualizarLabelsUnidad();
                renderLotesInputs();
            });
            actualizarLabelsUnidad();

            // LÓGICA DE LOTES
            let tempLotes = [];
            if (isEditing) {
                if (productToEdit.lotes && productToEdit.lotes.length > 0) {
                    tempLotes = JSON.parse(JSON.stringify(productToEdit.lotes));
                } else if (productToEdit.fechaCaducidad && productToEdit.stock > 0) {
                    tempLotes = [{ stock: productToEdit.stock, fechaCaducidad: productToEdit.fechaCaducidad }];
                }
            }

            const recalcularStockTotalDesdeLotes = () => {
                if (tempLotes.length > 0) {
                    const total = tempLotes.reduce((sum, l) => sum + (parseFloat(l.stock) || 0), 0);
                    stockInput.value = total;
                    stockInput.readOnly = true;
                    stockInput.style.background = "#1a1a1a";
                    stockInput.style.color = "#888";
                } else {
                    stockInput.readOnly = false;
                    stockInput.style.background = "#0a0a0a";
                    stockInput.style.color = "white";
                }
            };

            const renderLotesInputs = () => {
                const containerLotes = document.getElementById('lotes-list-container');
                if (!containerLotes) return;
                
                if (tempLotes.length === 0) {
                    containerLotes.innerHTML = `<div style="text-align: center; color: #555; font-size: 0.8rem; font-style: italic; padding: 10px;">Sin lotes. Usa el stock general.</div>`;
                    return;
                }
                
                containerLotes.innerHTML = tempLotes.map((l, index) => `
                    <div style="display: flex; gap: 8px; align-items: center; background: #141414; padding: 10px; border-radius: 8px; border: 1px solid #333;">
                        <div style="flex: 1.5;">
                            <label style="font-size: 0.65rem; color: #888; font-weight: bold; text-transform: uppercase;">Fecha Vence</label>
                            <input type="date" class="lote-fecha" data-index="${index}" value="${l.fechaCaducidad || ''}" style="width:100%; padding:8px; background:#000; border:1px solid #333; color:white; border-radius:6px; outline:none; font-size: 0.85rem; box-sizing:border-box;">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 0.65rem; color: #888; font-weight: bold; text-transform: uppercase;">${unidadSelect.value === 'lb' ? 'Gramos' : 'Cantidad'}</label>
                            <input type="number" class="lote-stock" data-index="${index}" value="${l.stock || ''}" placeholder="${unidadSelect.value === 'lb' ? 'g' : 'ud'}" style="width:100%; padding:8px; background:#000; border:1px solid #333; color:white; border-radius:6px; outline:none; font-size: 0.85rem; box-sizing:border-box;">
                        </div>
                        <button type="button" class="btn-remove-lote" data-index="${index}" style="background:transparent; color:#e74c3c; border:1px solid #e74c3c; padding:8px 10px; border-radius:6px; cursor:pointer; font-weight:bold; margin-top: 15px;">✕</button>
                    </div>
                `).join('');
                
                containerLotes.querySelectorAll('.lote-fecha').forEach(input => {
                    input.addEventListener('change', (e) => {
                        tempLotes[e.target.dataset.index].fechaCaducidad = e.target.value;
                    });
                });
                
                containerLotes.querySelectorAll('.lote-stock').forEach(input => {
                    input.addEventListener('input', (e) => {
                        tempLotes[e.target.dataset.index].stock = parseFloat(e.target.value) || 0;
                        recalcularStockTotalDesdeLotes();
                    });
                });
                
                containerLotes.querySelectorAll('.btn-remove-lote').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        tempLotes.splice(e.currentTarget.dataset.index, 1);
                        renderLotesInputs();
                        recalcularStockTotalDesdeLotes();
                    });
                });
            };

            document.getElementById('btn-add-lote').onclick = () => {
                tempLotes.push({ stock: '', fechaCaducidad: "" });
                renderLotesInputs();
                recalcularStockTotalDesdeLotes();
            };

            renderLotesInputs();
            recalcularStockTotalDesdeLotes();

            // ACCIÓN GUARDAR
            document.getElementById('m-btn-guardar').onclick = () => {
                const nombre = document.getElementById('m-nombre').value.trim();
                const categoria = document.getElementById('m-categoria').value;
                const proveedor = document.getElementById('m-proveedor').value.trim(); // NUEVO CAMPO
                const costo = parseFloat(document.getElementById('m-costo').value);
                const precioDetal = parseFloat(document.getElementById('m-precioDetal').value);
                const precioMayor = parseFloat(document.getElementById('m-precioMayor').value);
                const precioAlto = parseFloat(document.getElementById('m-precioAlto').value) || 0;
                const stockMinimo = parseFloat(document.getElementById('m-stockMinimo').value);
                const unidad = document.getElementById('m-unidad').value;
                let stock = parseFloat(document.getElementById('m-stock').value);

                if (!nombre || !categoria || isNaN(costo) || isNaN(precioDetal) || isNaN(precioMayor) || isNaN(stockMinimo)) {
                    mostrarAlertaModal("Por favor rellene correctamente todos los campos principales obligatorios.");
                    return;
                }

                if (tempLotes.length > 0) {
                    let valido = true;
                    tempLotes.forEach(l => { if (!l.fechaCaducidad || isNaN(l.stock) || l.stock <= 0) valido = false; });
                    if (!valido) {
                        mostrarAlertaModal("Asegúrese de ingresar fecha y cantidad válida para todos los lotes.");
                        return;
                    }
                    stock = tempLotes.reduce((sum, l) => sum + l.stock, 0);
                } else if (isNaN(stock) || stock < 0) {
                    mostrarAlertaModal("Ingrese un stock general válido.");
                    return;
                }

                if (isEditing) {
                    productToEdit.nombre = nombre;
                    productToEdit.categoria = categoria;
                    productToEdit.proveedor = proveedor; // Se guarda proveedor editado
                    productToEdit.costo = costo;
                    productToEdit.precioDetal = precioDetal;
                    productToEdit.precioMayor = precioMayor;
                    productToEdit.precioAlto = precioAlto;
                    productToEdit.stockMinimo = stockMinimo;
                    productToEdit.unidad = unidad;
                    productToEdit.stock = stock;
                    productToEdit.lotes = tempLotes.length > 0 ? tempLotes : null;
                    if (tempLotes.length > 0) {
                        const fechasOrdenadas = [...tempLotes].sort((a,b) => new Date(a.fechaCaducidad) - new Date(b.fechaCaducidad));
                        productToEdit.fechaCaducidad = fechasOrdenadas[0].fechaCaducidad;
                    } else {
                        productToEdit.fechaCaducidad = "";
                    }
                } else {
                    const nuevo = {
                        id: Date.now(),
                        nombre, categoria, proveedor, costo, precioDetal, precioMayor, precioAlto, stockMinimo, unidad, stock,
                        lotes: tempLotes.length > 0 ? tempLotes : null,
                        fechaCaducidad: ""
                    };
                    if (tempLotes.length > 0) {
                        const fechasOrdenadas = [...tempLotes].sort((a,b) => new Date(a.fechaCaducidad) - new Date(b.fechaCaducidad));
                        nuevo.fechaCaducidad = fechasOrdenadas[0].fechaCaducidad;
                    }
                    state.productos.push(nuevo);
                }

                modalOverlay.remove();
                window.refreshView();
            };

            document.getElementById('m-btn-cancelar').onclick = () => modalOverlay.remove();
        }, 50);
    };

    window.editProduct = (id) => {
        const prod = state.productos.find(p => p.id === id);
        if (prod) window.showProductModal(prod);
    };

    window.deleteProduct = (id) => {
        mostrarConfirmacionModal("¿Estás seguro de eliminar permanentemente este producto del inventario?", () => {
            state.productos = state.productos.filter(p => p.id !== id);
            window.refreshView();
        });
    };

    // --- MANEJADORES DE BÚSQUEDA ---
    window.manejarBusquedaInventario = (e) => {
        state.inventarioBusqueda = e.target.value;
        renderInventario(container, state);
    };

    window.cambiarFiltroCategoriaInventario = (e) => {
        state.inventarioCategoriaFiltro = e.target.value;
        renderInventario(container, state);
    };

    // --- FILTRADO FINAL INCLUYENDO PROVEEDOR ---
    const productosFiltrados = [...(state.productos || [])].filter(p => {
        const busq = state.inventarioBusqueda.toLowerCase();
        const coincide = p.nombre.toLowerCase().includes(busq) || 
                         p.categoria.toLowerCase().includes(busq) || 
                         (p.proveedor && p.proveedor.toLowerCase().includes(busq)); // Búsqueda por proveedor
        
        const coincideCat = state.inventarioCategoriaFiltro === "TODOS" || p.categoria === state.inventarioCategoriaFiltro;
        return coincide && coincideCat;
    });

    // --- RENDERIZADO HTML ---
    container.innerHTML = `
        <div class="module-fade-in">
            <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
                <h1 style="margin: 0;">📦 Inventario Central</h1>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.addCategory()" class="btn-outline" style="background: transparent; border: 1px solid #333; padding: 10px 18px; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">
                        + Nueva Categoría
                    </button>
                    <button onclick="window.showProductModal()" class="btn-primary" style="width: auto; padding: 10px 22px;">
                        + Registrar Producto
                    </button>
                </div>
            </div>

            <!-- TABLERO DE ALERTAS DE VENCIMIENTO Y STOCK -->
            ${(productosConStockBajo.length > 0 || productosVencidos.length > 0 || productosVencePronto.length > 0) ? `
                <div style="background: #1c1313; border: 1px solid #e74c3c33; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="margin-top: 0; margin-bottom: 15px; color: #e74c3c; display: flex; align-items: center; gap: 8px; font-size: 1.1rem;">
                        🚨 Panel de Control y Alertas Sanitarias
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
                        ${productosVencidos.length > 0 ? `
                            <div style="background: #2a1010; border-radius: 8px; padding: 12px; border-left: 4px solid #e74c3c;">
                                <h4 style="color: #e74c3c; margin-top: 0; font-size: 0.9rem;">🚫 LOTES VENCIDOS (${productosVencidos.length})</h4>
                                <ul style="padding-left: 15px; font-size: 0.82rem; color: #ccc; margin-top: 8px;">
                                    ${productosVencidos.map(p => `<li><b>${p.nombre}</b>: Venció hace ${p.diasExpirado} días</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${productosVencePronto.length > 0 ? `
                            <div style="background: #2a2210; border-radius: 8px; padding: 12px; border-left: 4px solid #f1c40f;">
                                <h4 style="color: #f1c40f; margin-top: 0; font-size: 0.9rem;">⏰ VENCE PRONTO (${productosVencePronto.length})</h4>
                                <ul style="padding-left: 15px; font-size: 0.82rem; color: #ccc; margin-top: 8px;">
                                    ${productosVencePronto.map(p => `<li><b>${p.nombre}</b>: Vence en ${p.diasRestantes} días</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${productosConStockBajo.length > 0 ? `
                            <div style="background: #151c2a; border-radius: 8px; padding: 12px; border-left: 4px solid #3498db;">
                                <h4 style="color: #3498db; margin-top: 0; font-size: 0.9rem;">📉 STOCK CRÍTICO (${productosConStockBajo.length})</h4>
                                <ul style="padding-left: 15px; font-size: 0.82rem; color: #ccc; margin-top: 8px;">
                                    ${productosConStockBajo.map(p => `<li><b>${p.nombre}</b>: ${p.unidad==='lb' ? (p.stock/1000).toFixed(2)+'kg' : p.stock+'ud'}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- FILTROS -->
            <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin-bottom: 25px; display: flex; gap: 15px; flex-wrap: wrap;">
                <div style="flex: 2; min-width: 250px;">
                    <input type="text" id="inv-search-input" placeholder="🔍 Buscar por nombre, categoría o proveedor (Ej: Alpina)..." value="${state.inventarioBusqueda}" oninput="window.manejarBusquedaInventario(event)" style="width: 100%; padding: 12px 15px; border-radius: 8px; border: 1px solid #333; background: #0a0a0a; color: white; outline: none; font-size: 0.95rem;">
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <select onchange="window.cambiarFiltroCategoriaInventario(event)" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #333; background: #0a0a0a; color: white; outline: none; cursor: pointer;">
                        <option value="TODOS" ${state.inventarioCategoriaFiltro === "TODOS" ? "selected" : ""}>📁 Todas las Categorías</option>
                        ${categoriasOrdenadasAlf.map(cat => `<option value="${cat}" ${state.inventarioCategoriaFiltro === cat ? "selected" : ""}>📁 ${cat}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- TABLA PRINCIPAL DE INVENTARIO -->
            <div class="table-container" style="background: #141414; border-radius: 12px; border: 1px solid #2a2a2a; overflow: hidden; margin-bottom: 35px;">
                <table>
                    <thead>
                        <tr style="background: #1c1c1c;">
                            <th style="padding: 15px; text-align: left; color: #888;">Producto</th>
                            <th style="padding: 15px; text-align: left; color: #888;">Categoría</th>
                            <th style="padding: 15px; text-align: right; color: #888;">Costo Base</th>
                            <th style="padding: 15px; text-align: right; color: #888;">Precios (Det/May/Alto)</th>
                            <th style="padding: 15px; text-align: center; color: #888;">Stock Actual</th>
                            <th style="padding: 15px; text-align: center; color: #888;">Estado / Lotes</th>
                            <th style="padding: 15px; text-align: center; color: #888;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productosFiltrados.length > 0 ? productosFiltrados.map(p => {
                            const esCriticoStock = p.stock <= (p.stockMinimo || 0);
                            const displayStock = p.unidad === 'lb'
                                ? `<span style="${esCriticoStock ? 'color:#e74c3c; font-weight:bold;' : 'color:#f1c40f;'}">${(p.stock / 1000).toFixed(2)} kg</span>`
                                : `<span style="${esCriticoStock ? 'color:#e74c3c; font-weight:bold;' : 'color:#3498db;'}">${p.stock} ud</span>`;

                            let vencimientoTag = `<span style="color: #555; font-size: 0.8rem;">Sin fecha</span>`;
                            
                            if (p.lotes && p.lotes.length > 0) {
                                let tieneVencidos = false, tieneProximos = false;
                                p.lotes.forEach(l => {
                                    if (l.fechaCaducidad) {
                                        const dRest = Math.ceil((new Date(l.fechaCaducidad).getTime() - FECHA_HOY.getTime()) / (1000 * 60 * 60 * 24));
                                        if (dRest <= 0) tieneVencidos = true;
                                        else if (dRest <= 7) tieneProximos = true;
                                    }
                                });
                                if (tieneVencidos) vencimientoTag = `<span class="tag" style="background:#e74c3c; color:white; font-weight:bold;">🚫 Lote Vencido</span>`;
                                else if (tieneProximos) vencimientoTag = `<span class="tag" style="background:#f1c40f; color:black; font-weight:bold;">⏰ Lote Próximo</span>`;
                                else vencimientoTag = `<span class="tag" style="background:#2ecc71; color:black; font-weight:bold;">📋 Multi-Lote Ok</span>`;
                            } else if (p.fechaCaducidad) {
                                const dRest = Math.ceil((new Date(p.fechaCaducidad).getTime() - FECHA_HOY.getTime()) / (1000 * 60 * 60 * 24));
                                if (dRest <= 0) vencimientoTag = `<span class="tag" style="background:#e74c3c; color:white; font-weight:bold;">🚫 Vencido</span>`;
                                else if (dRest <= 7) vencimientoTag = `<span class="tag" style="background:#f1c40f; color:black; font-weight:bold;">⏰ Vence Pronto</span>`;
                                else vencimientoTag = `<span class="tag" style="background:#2ecc71; color:black; font-weight:bold;">✅ Ok (${p.fechaCaducidad})</span>`;
                            }

                            return `
                                <tr style="border-bottom: 1px solid #222;">
                                    <td style="padding: 15px;">
                                        <div style="font-weight: 600; color: #fff;">${p.nombre}</div>
                                        ${p.proveedor ? `<div style="font-size: 0.75rem; color: #888; margin-top: 4px;">🏢 ${p.proveedor}</div>` : ''}
                                    </td>
                                    <td style="padding: 15px;"><span class="tag" style="background: #252525; padding: 4px 8px;">${p.categoria}</span></td>
                                    <td style="padding: 15px; text-align: right; color: #e74c3c; font-weight: bold;">$${(p.costo || 0).toLocaleString()}</td>
                                    <td style="padding: 15px; text-align: right;">
                                        <div style="color: #2ecc71; font-weight: bold;">$${(p.precioDetal || 0).toLocaleString()}</div>
                                        <div style="color: #3498db; font-size: 0.75rem;">M: $${(p.precioMayor || p.precioDetal).toLocaleString()}</div>
                                        ${p.precioAlto ? `<div style="color: #9b59b6; font-size: 0.75rem;">A: $${p.precioAlto.toLocaleString()}</div>` : ''}
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-weight: bold;">${displayStock}</td>
                                    <td style="padding: 15px; text-align: center;">${vencimientoTag}</td>
                                    <td style="padding: 15px; text-align: center;">
                                        <button onclick="window.editProduct(${p.id})" class="btn-edit-small" style="background: #3498db; padding: 6px 12px; border-radius: 5px; cursor: pointer; border: none; color: white;">Editar</button>
                                        <button onclick="window.deleteProduct(${p.id})" class="btn-delete-small" style="background: #e74c3c; padding: 6px 12px; border-radius: 5px; cursor: pointer; border: none; color: white;">✕</button>
                                    </td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr><td colspan="7" style="text-align: center; padding: 50px; color: #555;">No hay productos con los criterios de búsqueda actuales.</td></tr>
                        `}
                    </tbody>
                </table>
            </div>

            <!-- DESPENSA DE SUBPRODUCTOS (MERMAS Y CHORIZOS) -->
            <div style="background: #111a14; border: 1px solid #2ecc7133; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin-top:0; margin-bottom: 15px; color: #2ecc71; display: flex; align-items: center; gap: 8px; font-size: 1.1rem;">
                    🏭 Despensa para Mezcla de Embutidos (Proveniente de Desposte)
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
                    ${Object.keys(state.subproductosAcumulados).map(sub => {
                        const cant = state.subproductosAcumulados[sub];
                        const displayCant = cant >= 1000 ? `${(cant / 1000).toFixed(2)} kg` : `${cant} g`;
                        return `
                            <div style="background: #080d0a; border: 1px solid #2ecc7122; border-radius: 8px; padding: 12px; text-align: center;">
                                <div style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">${sub}</div>
                                <div style="font-size: 1.4rem; font-weight: 800; color: #2ecc71; margin-top: 6px;">${displayCant}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- NOTA METODOLÓGICA -->
            <div style="padding: 20px; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; border-left: 4px solid #f1c40f; display: flex; gap: 15px; align-items: center;">
                <div style="font-size: 1.8rem;">💡</div>
                <div style="font-size: 0.85rem; color: #888; line-height: 1.5;">
                    <b>Gestión Multi-Lote:</b> Al agregar diferentes fechas de vencimiento al mismo producto, el Módulo de Ventas usará automáticamente la lógica <b>FIFO (Primero en expirar, primero en salir)</b> para descontar el inventario, garantizando la rotación perfecta de tus embutidos.
                </div>
            </div>
        </div>
    `;

    // Restaurar foco al buscador
    if (state.inventarioBusqueda !== "") {
        const input = document.getElementById('inv-search-input');
        if (input) {
            input.focus();
            input.setSelectionRange(state.inventarioBusqueda.length, state.inventarioBusqueda.length);
        }
    }
}