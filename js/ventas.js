/**
 * Módulo de Ventas - Lomos & Lomos Express
 * Funcionalidades: Búsqueda global, pesaje, stock, doble tarifa, calculadora de cambio en efectivo,
 * pagos con tarjeta, lector de códigos de barras (Escáner USB), facturación y control multi-lote FIFO.
 */

export function renderVentas(container, state) {
    
    // Inicialización de variables de control en el estado si no existen
    if (state.terminoBusqueda === undefined) state.terminoBusqueda = "";
    if (state.tmpCliente === undefined) state.tmpCliente = "";
    if (state.tmpNotas === undefined) state.tmpNotas = "";
    if (state.tipoPrecioActivo === undefined) state.tipoPrecioActivo = "detal";
    if (state.tmpCorreo === undefined) state.tmpCorreo = "";
    if (state.tmpDocumento === undefined) state.tmpDocumento = "";
    if (state.tmpDireccion === undefined) state.tmpDireccion = "";
    if (state.tmpFE === undefined) state.tmpFE = false;

    // --- DIÁLOGOS DE INTERFAZ PERSONALIZADOS ---
    const mostrarAlertaModal = (mensaje) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #141414; border: 1px solid #333; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: #e74c3c; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">⚠️ Aviso del Sistema</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <button id="alert-close-btn" style="background: #e74c3c; color: white; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Entendido</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('alert-close-btn').onclick = () => overlay.remove();
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
                <h3 style="margin-top: 0; color: #3498db; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">❓ Confirmar Acción</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="confirm-cancel-btn" style="flex: 1; background: #1a1a1a; color: white; border: 1px solid #333; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button id="confirm-ok-btn" style="flex: 1; background: #2ecc71; color: black; border: none; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('confirm-cancel-btn').onclick = () => overlay.remove();
        document.getElementById('confirm-ok-btn').onclick = () => {
            overlay.remove();
            accionConfirmar();
        };
    };

    window.cambiarTipoPrecio = (tipo) => {
        state.tipoPrecioActivo = tipo;
        renderVentas(container, state);
    };

    window.manejarBusqueda = (e) => {
        state.terminoBusqueda = e.target.value.toLowerCase();
        renderVentas(container, state);
    };

    window.cambiarFiltro = (cat) => {
        state.categoriaSeleccionada = cat;
        renderVentas(container, state);
    };

    window.actualizarDatoCliente = (e) => { state.tmpCliente = e.target.value; };
    window.actualizarCorreo = (e) => { state.tmpCorreo = e.target.value; };
    window.actualizarDocumento = (e) => { state.tmpDocumento = e.target.value; };
    window.actualizarDireccion = (e) => { state.tmpDireccion = e.target.value; };
    window.actualizarFE = (e) => { state.tmpFE = e.target.checked; };
    window.actualizarNotas = (e) => { state.tmpNotas = e.target.value; };

    // --- FUNCIÓN PARA AGREGAR DESDE LECTOR DE CÓDIGO DE BARRAS ---
    window.agregarPorCodigoBarras = (id) => {
        const prod = state.productos.find(p => p.id === id);
        if (!prod) return;

        // Por defecto al escanear, agregamos 1 unidad (o 1000g si es por libra)
        const cantidadEscaneada = prod.unidad === 'lb' ? 1000 : 1;

        const hoyMs = Date.now();
        let stockVentaMax = prod.stock;
        
        if (prod.lotes && prod.lotes.length > 0) {
            stockVentaMax = prod.lotes.reduce((sum, l) => {
                if (!l.fechaCaducidad) return sum + l.stock;
                const fCadMs = new Date(l.fechaCaducidad).getTime();
                return fCadMs > hoyMs ? sum + l.stock : sum;
            }, 0);
        }

        if (cantidadEscaneada > stockVentaMax) {
            mostrarAlertaModal(`Stock insuficiente al escanear ${prod.nombre}.`);
            return;
        }

        let precioAplicado = prod.precioDetal;
        if (state.tipoPrecioActivo === 'mayor') {
            precioAplicado = prod.precioMayor || prod.precioDetal;
        } else if (state.tipoPrecioActivo === 'alto') {
            precioAplicado = prod.precioAlto || prod.precioDetal;
        }

        let total = 0;
        let detalle = "";

        if (prod.unidad === 'lb') {
            const precioKilo = precioAplicado * 2;
            total = Math.round((cantidadEscaneada / 1000) * precioKilo);
            detalle = `${cantidadEscaneada}g`;
        } else {
            total = Math.round(cantidadEscaneada * precioAplicado);
            detalle = `${cantidadEscaneada} ud`;
        }

        state.carrito.push({ 
            ...prod, 
            tempId: Date.now() + Math.random(), 
            cantidadVendida: cantidadEscaneada, 
            cantidadDetalle: detalle,
            precioCobrado: precioAplicado,
            total 
        });
        
        renderVentas(container, state);
    };

    window.agregarAlCarrito = (id) => {
        const prod = state.productos.find(p => p.id === id);
        const input = document.getElementById(`input-${id}`);
        const valor = parseFloat(input.value);
        
        if (!valor || valor <= 0) return;

        const hoyMs = Date.now();
        let stockVentaMax = prod.stock;
        
        if (prod.lotes && prod.lotes.length > 0) {
            stockVentaMax = prod.lotes.reduce((sum, l) => {
                if (!l.fechaCaducidad) return sum + l.stock;
                const fCadMs = new Date(l.fechaCaducidad).getTime();
                return fCadMs > hoyMs ? sum + l.stock : sum;
            }, 0);
        }

        if (valor > stockVentaMax) {
            const disp = prod.unidad === 'lb' ? (stockVentaMax / 1000).toFixed(2) + " kg" : stockVentaMax + " ud aptas";
            mostrarAlertaModal(`Stock apto insuficiente para ${prod.nombre}. Disponible: ${disp}`);
            return;
        }

        let precioAplicado = prod.precioDetal;
        if (state.tipoPrecioActivo === 'mayor') {
            precioAplicado = prod.precioMayor || prod.precioDetal;
        } else if (state.tipoPrecioActivo === 'alto') {
            const inputPrecio = document.getElementById(`input-precio-${id}`);
            precioAplicado = (inputPrecio && inputPrecio.value) ? parseFloat(inputPrecio.value) : (prod.precioAlto || prod.precioDetal);
        }

        let total = 0;
        let detalle = "";

        if (prod.unidad === 'lb') {
            const precioKilo = precioAplicado * 2;
            total = Math.round((valor / 1000) * precioKilo);
            detalle = `${valor}g`;
        } else {
            total = Math.round(valor * precioAplicado);
            detalle = `${valor} ud`;
        }

        state.carrito.push({ 
            ...prod, 
            tempId: Date.now() + Math.random(), 
            cantidadVendida: valor, 
            cantidadDetalle: detalle,
            precioCobrado: precioAplicado,
            total 
        });
        
        input.value = '';
        renderVentas(container, state);
    };

    window.eliminarDelCarrito = (tempId) => {
        state.carrito = state.carrito.filter(item => item.tempId !== tempId);
        renderVentas(container, state);
    };

    // --- ESCUCHADOR GLOBAL DE LECTOR DE CÓDIGO DE BARRAS ---
    if (!window._barcodeListenerActive) {
        window._barcodeListenerActive = true;
        let barcodeBuffer = '';
        let lastKeyTime = Date.now();

        window.addEventListener('keydown', (e) => {
            if (state.moduloActivo !== 'ventas') return;

            const currentTime = Date.now();
            
            // Si el usuario presiona Enter (fin del escaneo de la pistola)
            if (e.key === 'Enter') {
                if (barcodeBuffer.length > 2) {
                    const codigoLimpio = barcodeBuffer.trim();
                    const prodEncontrado = state.productos.find(p => p.codigoBarras && p.codigoBarras.trim() === codigoLimpio);
                    if (prodEncontrado) {
                        e.preventDefault();
                        window.agregarPorCodigoBarras(prodEncontrado.id);
                    }
                }
                barcodeBuffer = '';
            } else if (e.key.length === 1) {
                // Las pistolas lectoras escriben ráfagas de caracteres en < 40ms
                if (currentTime - lastKeyTime > 80) {
                    barcodeBuffer = ''; // Demasiado lento, tipeo humano normal
                }
                barcodeBuffer += e.key;
                lastKeyTime = currentTime;
            }
        });
    }

    window.imprimirTicketGenerico = (datosVenta) => {
        const { nroFactura, fecha, cliente, notas, items, total, metodoPago, documento } = datosVenta;
        let metodoFormateado = 'CONTADO (EFECTIVO)';
        if (metodoPago === 'contado_tarjeta') metodoFormateado = 'CONTADO (TARJETA)';
        if (metodoPago === 'credito') metodoFormateado = 'FIADO (A CUENTA)';

        const ticketHTML = `
            <html>
            <head>
                <title>Factura ${nroFactura}</title>
                <style>
                    body { font-family: 'Courier New', monospace; width: 80mm; font-size: 12px; padding: 5px; margin: 0; color: #000; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; }
                    .header-info { margin-bottom: 5px; font-size: 11px; }
                    .footer { margin-top: 15px; font-size: 10px; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="center">
                    <h2 style="margin:0;">LOMOS & LOMOS</h2>
                    <p style="margin:0;">EXPRESS</p>
                    <p>Nit: 901.234.567-8</p>
                    <h3 style="margin: 5px 0;">Factura N°: ${nroFactura}</h3>
                </div>

                <div class="header-info">
                    <p><b>FECHA:</b> ${fecha}</p>
                    ${cliente ? `<p><b>CLIENTE:</b> ${cliente.toUpperCase()}</p>` : ''}
                    ${documento ? `<p><b>CC/NIT:</b> ${documento}</p>` : ''}
                    <p><b>MÉTODO:</b> <span class="bold">${metodoFormateado}</span></p>
                </div>

                <div class="divider"></div>
                <table>
                    <thead>
                        <tr>
                            <th align="left">Cant.</th>
                            <th align="left">Producto</th>
                            <th align="right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => {
                            let nombreLimpio = item.nombre.replace(/ TARIFA: VITRINA \(DETAL\)/g, '').replace(/TARIFA: VITRINA \(DETAL\)/g, '').replace(/ TARIFA: MAYOR/g, '').replace(/TARIFA: MAYOR/g, '').replace(/- VITRINA/g, '').replace(/- MAYOR/g, '').trim();
                            return `
                                <tr>
                                    <td valign="top">${item.cantidadDetalle}</td>
                                    <td valign="top">${nombreLimpio}</td>
                                    <td valign="top" align="right">$${item.total.toLocaleString()}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div class="divider"></div>
                <h3 class="center" style="font-size:1.3em;">TOTAL: $${total.toLocaleString()}</h3>
                
                ${datosVenta.montoRecibido ? `
                    <div class="divider"></div>
                    <p><b>RECIBIDO:</b> $${datosVenta.montoRecibido.toLocaleString()}</p>
                    <p><b>CAMBIO:</b> $${datosVenta.cambioDevuelto.toLocaleString()}</p>
                ` : ''}

                ${notas ? `
                    <div class="divider"></div>
                    <p><b>NOTAS:</b> ${notas}</p>
                ` : ''}

                <div class="divider" style="margin-top:10px;"></div>
                <div class="center footer">
                    <p>¡Gracias por preferirnos!<br>Carne de la mejor calidad para su mesa.</p>
                </div>
            </body>
            </html>
        `;

        const win = window.open('', '_blank', 'width=400,height=600');
        win.document.write(ticketHTML);
        win.document.close();
    };

    window.reimprimirFacturaHistorial = (id) => {
        const venta = state.ventasRealizadas.find(v => v.id === id);
        if (venta) window.imprimirTicketGenerico(venta);
        else mostrarAlertaModal("No se pudo localizar el registro de esa factura.");
    };

    window.descargarFacturaPDF = (id) => {
        const venta = state.ventasRealizadas.find(v => v.id === id);
        if (!venta) return;

        const element = document.createElement('div');
        element.style = "padding: 50px; font-family: 'Helvetica', sans-serif; color: #000; background: #fff;";
        element.innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 24px; color: #000; font-weight: 900;">FACTURA ELECTRÓNICA</h1>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 20px; color: #000; font-weight: 800;">LOMOS & LOMOS EXPRESS</h2>
                    <p style="margin: 5px 0; font-size: 12px; color: #000; font-weight: bold;">NIT: 901.234.567-8</p>
                </div>
            </div>
            <div style="margin-bottom: 30px; font-size: 14px; color: #000;">
                <p style="margin: 3px 0;"><b>Factura N°:</b> ${venta.nroFactura}</p>
                <p style="margin: 3px 0;"><b>Fecha:</b> ${venta.fecha.split(',')[0]}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                <thead>
                    <tr style="border-bottom: 2px solid #000;">
                        <th style="padding: 10px; text-align: left; font-weight: 800;">Artículo</th>
                        <th style="padding: 10px; text-align: center; font-weight: 800;">Cant</th>
                        <th style="padding: 10px; text-align: right; font-weight: 800;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${venta.items.map(i => `
                        <tr style="border-bottom: 1px solid #000;">
                            <td style="padding: 10px; font-weight: 700;">${i.nombre}</td>
                            <td style="padding: 10px; text-align: center; font-weight: 700;">${i.cantidadDetalle}</td>
                            <td style="padding: 10px; text-align: right; font-weight: 900;">$${i.total.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align: right; border-top: 3px solid #000; padding-top: 15px;">
                <h2 style="margin: 0; font-size: 24px; font-weight: 900;">TOTAL: $${venta.total.toLocaleString()}</h2>
            </div>
        `;

        html2pdf().set({
            margin: 15,
            filename: `Factura_${venta.nroFactura}_Lomos.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        }).from(element).save();
    };

    window.enviarFacturaCorreo = (id) => {
        const venta = state.ventasRealizadas.find(v => v.id === id);
        if (!venta || !venta.correo || !venta.correo.includes('@')) {
            mostrarAlertaModal("No hay un correo electrónico válido asociado a esta factura.");
            return;
        }
        window.descargarFacturaPDF(id);
        setTimeout(() => {
            window.location.href = `mailto:${venta.correo}?subject=${encodeURIComponent(`Factura N° ${venta.nroFactura}`)}&body=${encodeURIComponent(`Adjunto PDF de compra.`)}`;
        }, 1000);
    };

    window.abrirModalEfectivo = () => {
        if (state.carrito.length === 0) return;
        if (state.tmpFE && (!state.tmpCorreo || !state.tmpCorreo.includes('@'))) {
            mostrarAlertaModal("❌ Para emitir Factura Electrónica es obligatorio ingresar un correo electrónico.");
            return;
        }

        const totalVenta = state.carrito.reduce((acc, i) => acc + i.total, 0);
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: #141414; border: 1px solid #333; padding: 25px; border-radius: 16px; width: 90%; max-width: 420px; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
                <h3 style="margin-top: 0; color: #2ecc71; font-size: 1.3rem; display: flex; align-items: center; gap: 8px;">
                    💵 Calculadora de Efectivo
                </h3>
                <div style="background: #0d0d0d; border: 1px solid #222; border-radius: 10px; padding: 15px; margin: 15px 0; text-align: center;">
                    <span style="font-size: 0.8rem; color: #888; text-transform: uppercase; font-weight: bold;">Total Venta</span>
                    <div style="font-size: 2rem; font-weight: 900; color: #2ecc71; margin-top: 5px;">$${totalVenta.toLocaleString()}</div>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="font-size: 0.8rem; color: #aaa; font-weight: bold; text-transform: uppercase;">Recibido con:</label>
                    <input type="number" id="monto-recibido-input" placeholder="Ej: 80000" style="width: 100%; padding: 14px; background: #000; border: 1px solid #444; color: white; border-radius: 8px; margin-top: 6px; font-size: 1.3rem; font-weight: bold; text-align: center; outline: none;" />
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px;">
                    <button type="button" class="btn-denom" data-val="${totalVenta}" style="background: #222; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">Exacto</button>
                    <button type="button" class="btn-denom" data-val="10000" style="background: #222; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">10k</button>
                    <button type="button" class="btn-denom" data-val="20000" style="background: #222; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">20k</button>
                    <button type="button" class="btn-denom" data-val="50000" style="background: #222; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">50k</button>
                    <button type="button" class="btn-denom" data-val="100000" style="background: #222; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; grid-column: span 2;">100k</button>
                </div>
                <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 10px; padding: 15px; margin-bottom: 20px; text-align: center;">
                    <span style="font-size: 0.8rem; color: #888; text-transform: uppercase; font-weight: bold;">Cambio a Devolver</span>
                    <div id="cambio-calculado-lbl" style="font-size: 1.8rem; font-weight: 900; color: #3498db; margin-top: 5px;">$0</div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="btn-cancelar-efectivo" style="flex: 1; background: #222; color: #aaa; border: 1px solid #333; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button id="btn-confirmar-efectivo" style="flex: 1.5; background: #2ecc71; color: black; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; opacity: 0.5;" disabled>Cobrar & Imprimir</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const inputRecibido = document.getElementById('monto-recibido-input');
        const lblCambio = document.getElementById('cambio-calculado-lbl');
        const btnConfirmar = document.getElementById('btn-confirmar-efectivo');
        inputRecibido.focus();

        const actualizarCambio = () => {
            const recibido = parseFloat(inputRecibido.value) || 0;
            const cambio = recibido - totalVenta;
            if (recibido >= totalVenta) {
                lblCambio.innerText = `$${cambio.toLocaleString()}`;
                lblCambio.style.color = "#3498db";
                btnConfirmar.disabled = false;
                btnConfirmar.style.opacity = "1";
            } else {
                lblCambio.innerText = `Falta dinero ($${Math.abs(cambio).toLocaleString()})`;
                lblCambio.style.color = "#e74c3c";
                btnConfirmar.disabled = true;
                btnConfirmar.style.opacity = "0.5";
            }
        };

        inputRecibido.addEventListener('input', actualizarCambio);
        overlay.querySelectorAll('.btn-denom').forEach(btn => {
            btn.onclick = () => {
                inputRecibido.value = parseFloat(btn.dataset.val);
                actualizarCambio();
            };
        });
        document.getElementById('btn-cancelar-efectivo').onclick = () => overlay.remove();
        btnConfirmar.onclick = () => {
            const recibido = parseFloat(inputRecibido.value) || 0;
            const cambio = recibido - totalVenta;
            overlay.remove();
            window.ejecutarTransaccionVenta('contado_efectivo', recibido, cambio);
        };
    };

    window.confirmarVenta = (metodo = 'contado_efectivo') => {
        if (state.carrito.length === 0) return;
        if (metodo === 'credito' && (!state.tmpCliente || !state.tmpCliente.trim())) {
            mostrarAlertaModal("❌ Ingrese el nombre del cliente para fiares esta cuenta.");
            return;
        }
        if (metodo === 'contado_tarjeta') {
            if (state.tmpFE && (!state.tmpCorreo || !state.tmpCorreo.includes('@'))) {
                mostrarAlertaModal("❌ Para emitir Factura Electrónica es obligatorio ingresar correo electrónico.");
                return;
            }
            mostrarConfirmacionModal("¿Procesar pago por Tarjeta / Datáfono?", () => {
                window.ejecutarTransaccionVenta('contado_tarjeta', 0, 0);
            });
        } else if (metodo === 'credito') {
            const totalVenta = state.carrito.reduce((acc, i) => acc + i.total, 0);
            mostrarConfirmacionModal(`¿Cargar venta de $${totalVenta.toLocaleString()} a la cuenta de "${state.tmpCliente}"?`, () => {
                window.ejecutarTransaccionVenta('credito', 0, 0);
            });
        }
    };

    window.ejecutarTransaccionVenta = (metodoPago, montoRecibido = 0, cambioDevuelto = 0) => {
        const totalVenta = state.carrito.reduce((acc, i) => acc + i.total, 0);
        const costoTotalVenta = state.carrito.reduce((acc, item) => {
            const p = state.productos.find(prod => prod.id === item.id);
            const costoProp = (p.unidad === 'lb') ? (item.cantidadVendida / 1000) * (p.costo * 2) : item.cantidadVendida * p.costo;
            return acc + costoProp;
        }, 0);

        const datosVentaHistorial = {
            id: state.nroFacturaActual,
            nroFactura: state.nroFacturaActual,
            fecha: new Date().toLocaleString(),
            fechaISO: new Date().toISOString(),
            cliente: state.tmpCliente || "Consumidor Final",
            notas: state.tmpNotas,
            tipoTarifa: state.tipoPrecioActivo,
            metodoPago: metodoPago,
            estadoPago: metodoPago === 'credito' ? 'pendiente' : 'pagado',
            totalPendiente: metodoPago === 'credito' ? totalVenta : 0,
            items: [...state.carrito],
            total: totalVenta,
            costo: Math.round(costoTotalVenta),
            utilidad: Math.round(totalVenta - costoTotalVenta),
            esFE: state.tmpFE,
            correo: state.tmpCorreo,
            documento: state.tmpDocumento,
            direccion: state.tmpDireccion,
            montoRecibido: montoRecibido > 0 ? montoRecibido : null,
            cambioDevuelto: cambioDevuelto,
            cufe: state.tmpFE ? Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('') : null
        };

        state.ventasRealizadas.push(datosVentaHistorial);
        window.imprimirTicketGenerico(datosVentaHistorial);

        const hoyMs = Date.now();
        state.carrito.forEach(item => {
            const prod = state.productos.find(p => p.id === item.id);
            if (prod) {
                if (prod.lotes && prod.lotes.length > 0) {
                    let cantRestante = item.cantidadVendida;
                    const lotesOrd = [...prod.lotes].sort((a, b) => new Date(a.fechaCaducidad || "9999-12-31") - new Date(b.fechaCaducidad || "9999-12-31"));
                    lotesOrd.forEach(l => {
                        if (cantRestante <= 0) return;
                        if (new Date(l.fechaCaducidad).getTime() > hoyMs) {
                            if (l.stock >= cantRestante) { l.stock -= cantRestante; cantRestante = 0; }
                            else { cantRestante -= l.stock; l.stock = 0; }
                        }
                    });
                    prod.lotes = lotesOrd;
                    prod.stock = prod.lotes.reduce((sum, l) => sum + l.stock, 0);
                } else {
                    prod.stock -= item.cantidadVendida;
                }
            }
        });

        state.nroFacturaActual++;
        state.carrito = [];
        state.tmpCliente = "";
        state.tmpNotas = "";
        state.tmpCorreo = ""; 
        state.tmpDocumento = "";
        state.tmpDireccion = "";
        state.tmpFE = false;  
        
        window.refreshView();
    };

    const productosFiltrados = state.productos.filter(p => {
        const coincidenCat = (state.categoriaSeleccionada === 'TODOS') || (p.categoria === state.categoriaSeleccionada);
        const coincideNom = p.nombre.toLowerCase().includes(state.terminoBusqueda) || 
                             (p.codigoBarras && p.codigoBarras.toLowerCase().includes(state.terminoBusqueda));
        return coincidenCat && coincideNom;
    });

    const totalVenta = state.carrito.reduce((acc, i) => acc + i.total, 0);
    const hoyMs = Date.now();

    container.innerHTML = `
        <div class="module-fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 20px; flex-wrap: wrap;">
                <h1 style="margin: 0;">🥩 Panel de Ventas</h1>
                <div class="search-box" style="flex-grow: 1; max-width: 450px;">
                    <input type="text" id="search-input" 
                           placeholder="🔍 Buscar nombre o escanear código de barras..." 
                           value="${state.terminoBusqueda}" 
                           oninput="window.manejarBusqueda(event)"
                           style="width: 100%; padding: 12px 15px 12px 40px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a; color: white; outline: none;">
                </div>
            </div>

            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
                <span style="font-size: 0.85rem; color: #888; font-weight: bold; text-transform: uppercase; margin-right: 5px;">Tarifa Aplicada:</span>
                <div style="display: flex; background: #141414; padding: 4px; border-radius: 8px; border: 1px solid #2a2a2a; width: fit-content;">
                    <button onclick="window.cambiarTipoPrecio('detal')" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; background: ${state.tipoPrecioActivo === 'detal' ? 'var(--accent, #e74c3c)' : 'transparent'}; color: ${state.tipoPrecioActivo === 'detal' ? '#fff' : '#666'};">🏪 Vitrina (Detal)</button>
                    <button onclick="window.cambiarTipoPrecio('mayor')" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; background: ${state.tipoPrecioActivo === 'mayor' ? '#3498db' : 'transparent'}; color: ${state.tipoPrecioActivo === 'mayor' ? '#fff' : '#666'};">🏭 Por Mayor</button>
                    <button onclick="window.cambiarTipoPrecio('alto')" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; background: ${state.tipoPrecioActivo === 'alto' ? '#9b59b6' : 'transparent'}; color: ${state.tipoPrecioActivo === 'alto' ? '#fff' : '#666'};">✏️ Precio Editable</button>
                </div>
            </div>
            
            <div class="tabs-container">
                ${state.categorias.map(cat => `
                    <button onclick="window.cambiarFiltro('${cat}')" class="tab-btn ${cat === state.categoriaSeleccionada ? 'active' : ''}">${cat}</button>
                `).join('')}
            </div>

            <div class="pos-layout">
                <div class="product-grid">
                    ${productosFiltrados.length > 0 ? productosFiltrados.map(p => {
                        const esBajoStock = p.stock <= (p.stockMinimo || 0);
                        let esExpirado = false;
                        let esProximoVencer = false;
                        let diasRestantes = 0;
                        let stockVentaMax = p.stock;

                        if (p.lotes && p.lotes.length > 0) {
                            stockVentaMax = p.lotes.reduce((sum, l) => {
                                if (!l.fechaCaducidad) return sum + l.stock;
                                const fCadMs = new Date(l.fechaCaducidad).getTime();
                                return fCadMs > hoyMs ? sum + l.stock : sum;
                            }, 0);
                            if (stockVentaMax === 0 && p.stock > 0) esExpirado = true;
                        } else if (p.unidad === 'ud' && p.fechaCaducidad) {
                            const fCadMs = new Date(p.fechaCaducidad).getTime();
                            diasRestantes = Math.ceil((fCadMs - hoyMs) / (1000 * 60 * 60 * 24));
                            if (diasRestantes <= 0) { esExpirado = true; stockVentaMax = 0; }
                            else if (diasRestantes <= 7) esProximoVencer = true;
                        }

                        const agotado = stockVentaMax <= 0;
                        const stockText = p.unidad === 'lb' ? (p.stock/1000).toFixed(2)+'kg' : (p.lotes && p.lotes.length > 0 ? stockVentaMax + ' ud disp.' : p.stock + ' ud');
                        
                        let precioPrincipal = p.precioDetal;
                        let colorPrecio = "#2ecc71";
                        if (state.tipoPrecioActivo === 'mayor') {
                            precioPrincipal = p.precioMayor || p.precioDetal;
                            colorPrecio = "#3498db";
                        } else if (state.tipoPrecioActivo === 'alto') {
                            precioPrincipal = p.precioAlto || p.precioDetal;
                            colorPrecio = "#9b59b6";
                        }
                        
                        let textoEtiquetaSecundaria = `<span style="color: #ffffff;">Vitrina: $${p.precioDetal.toLocaleString()}</span>`;
                        if (state.tipoPrecioActivo === 'detal') {
                            textoEtiquetaSecundaria = `<span style="color: #ffffff;">Mayor: $${(p.precioMayor || p.precioDetal).toLocaleString()}</span>`;
                            if (p.precioAlto) textoEtiquetaSecundaria += ` | <span style="color: #ffffff;">Edit: $${p.precioAlto.toLocaleString()}</span>`;
                        }

                        let visualStyles = "";
                        let overlayBadge = "";
                        let disabledAttribute = "";
                        let buttonText = "AÑADIR";

                        if (esExpirado) {
                            visualStyles = "opacity: 0.45; filter: grayscale(0.85); border-color: #ff3b30;";
                            overlayBadge = `<span style="background: #ff3b30; color: white; font-size: 0.72rem; padding: 4px 8px; border-radius: 4px; font-weight: bold; position: absolute; top: 10px; left: 10px; z-index: 5;">🚫 EXPIRADO</span>`;
                            disabledAttribute = "disabled";
                            buttonText = "EXPIRADO 🚫";
                        } else if (agotado) {
                            visualStyles = "opacity: 0.5; filter: grayscale(1);";
                            disabledAttribute = "disabled style='background:#444'";
                            buttonText = "AGOTADO";
                        } else {
                            if (esBajoStock) overlayBadge += `<span style="background: #e67e22; color: white; font-size: 0.72rem; padding: 3px 6px; border-radius: 4px; font-weight: bold; position: absolute; top: 10px; left: 10px; z-index: 5;">⚠️ Stock Bajo</span>`;
                            if (esProximoVencer) overlayBadge += `<span style="background: #f1c40f; color: black; font-size: 0.72rem; padding: 3px 6px; border-radius: 4px; font-weight: bold; position: absolute; top: 10px; right: 10px; z-index: 5;">⏰ Vence: ${diasRestantes}d</span>`;
                        }

                        let nombreLimpioParaMostrar = p.nombre.replace(/ TARIFA: VITRINA \(DETAL\)/g, '').replace(/TARIFA: VITRINA \(DETAL\)/g, '').replace(/ TARIFA: MAYOR/g, '').replace(/TARIFA: MAYOR/g, '').replace(/- VITRINA/g, '').replace(/- MAYOR/g, '').trim();

                        return `
                        <div class="card" style="position: relative; ${visualStyles}">
                            ${overlayBadge}
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 5px; margin-top: ${overlayBadge ? '22px' : '0'};">
                                <h3 style="margin: 0; font-size: 1rem; line-height: 1.2;">${nombreLimpioParaMostrar}</h3>
                                <span class="tag" style="flex-shrink: 0;">${stockText}</span>
                            </div>

                            <div style="margin-top: 10px; margin-bottom: 15px;">
                                <p class="price" style="margin: 0; color: ${colorPrecio};">$${precioPrincipal.toLocaleString()} / ${p.unidad === 'lb' ? 'Lb' : 'Ud'}</p>
                                <p style="font-size: 0.8rem; color: #ffffff; margin: 6px 0 0 0; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                                    ${textoEtiquetaSecundaria}
                                </p>
                            </div>
                            
                            ${state.tipoPrecioActivo === 'alto' ? `
                                <input type="number" id="input-precio-${p.id}" value="${precioPrincipal}" placeholder="Editar Precio ($)" style="border-color: #9b59b6; background: #1a0f1c; margin-bottom: 8px;" ${esExpirado || agotado ? 'disabled' : ''}>
                            ` : ''}

                            <input type="number" id="input-${p.id}" placeholder="${p.unidad === 'lb' ? 'Gramos' : 'Cant.'}" ${esExpirado || agotado ? 'disabled' : ''}>
                            
                            <button onclick="window.agregarAlCarrito(${p.id})" class="btn-primary" ${disabledAttribute}>
                                ${buttonText}
                            </button>
                        </div>
                    `}).join('') : '<div style="grid-column: 1/-1; text-align: center; color: #555; padding: 40px;">No se encontraron productos.</div>'}
                </div>

                <!-- Resumen de Venta -->
                <div class="cart-summary" style="background: #141414; color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #2a2a2a; box-shadow: 0 5px 15px rgba(0,0,0,0.5); position: sticky; top: 15px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;">
                    <h3 style="margin-top:0; color: #ffffff; font-weight: 800; flex-shrink: 0;">Resumen de Venta</h3>
                    <div class="cart-items" style="border-bottom: 2px dashed #333; padding-bottom: 15px; margin-bottom: 15px; overflow-y: auto; max-height: 30vh; flex-shrink: 0;">
                        ${state.carrito.length === 0 ? '<p style="color:#888; text-align:center; padding-top:20px; font-weight: 500;">Seleccione productos...</p>' : state.carrito.map(item => {
                            let nombreLimpio = item.nombre.replace(/ TARIFA: VITRINA \(DETAL\)/g, '').replace(/TARIFA: VITRINA \(DETAL\)/g, '').replace(/ TARIFA: MAYOR/g, '').replace(/TARIFA: MAYOR/g, '').replace(/- VITRINA/g, '').replace(/- MAYOR/g, '').trim();
                            return `
                                <div class="cart-row" style="display: flex; justify-content: space-between; padding: 12px; background: #1a1a1a; border-radius: 8px; color: #ffffff; font-weight: 700; margin-bottom: 8px; border: 1px solid #333;">
                                    <div><b>${nombreLimpio}</b><br><small style="color: #ccc; font-weight: 600;">${item.cantidadDetalle} a $${item.precioCobrado.toLocaleString()}</small></div>
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <b>$${item.total.toLocaleString()}</b>
                                        <button onclick="window.eliminarDelCarrito(${item.tempId})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem; font-weight:bold;">✕</button>
                                    </div>
                                </div>
                            `
                        }).join('')}
                    </div>

                    <div style="margin-top: 10px;">
                        <input type="text" placeholder="Escriba o seleccione cliente..." 
                               value="${state.tmpCliente}"
                               list="clientes-registrados"
                               oninput="window.actualizarDatoCliente(event)"
                               style="width:100%; padding:10px; background:#0a0a0a; border:1px solid #333; color:#fff; margin-bottom:10px; border-radius:8px; outline:none; font-weight: 500;">
                        
                        <datalist id="clientes-registrados">
                            ${(state.clientes || []).map(c => `<option value="${c.nombre}"></option>`).join('')}
                        </datalist>
                        
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <input type="text" placeholder="Cédula o NIT..." value="${state.tmpDocumento}" oninput="window.actualizarDocumento(event)" style="flex: 1; min-width: 0; padding:10px; background:#0a0a0a; border:1px solid #333; color:#fff; border-radius:8px; outline:none; box-sizing: border-box;">
                            <input type="email" placeholder="Correo..." value="${state.tmpCorreo}" oninput="window.actualizarCorreo(event)" style="flex: 1; min-width: 0; padding:10px; background:#0a0a0a; border:1px solid #333; color:#fff; border-radius:8px; outline:none; box-sizing: border-box;">
                        </div>

                        <input type="text" placeholder="Dirección (Opcional)..." value="${state.tmpDireccion}" oninput="window.actualizarDireccion(event)" style="width:100%; padding:10px; background:#0a0a0a; border:1px solid #333; color:#fff; border-radius:8px; outline:none; margin-bottom:12px;">
                        
                        <label style="display:flex; align-items:center; gap:10px; color:#ccc; font-size:0.85rem; margin-bottom:12px; cursor:pointer; background:#1a1a1a; padding:10px; border-radius:8px; border:1px solid #222;">
                            <input type="checkbox" onchange="window.actualizarFE(event)" ${state.tmpFE ? 'checked' : ''} style="accent-color: #3498db; width: 18px; height: 18px;">
                            <span style="font-weight: bold; ${state.tmpFE ? 'color: #3498db;' : ''}">Generar Factura Electrónica (DIAN)</span>
                        </label>

                        <textarea placeholder="Observaciones..." oninput="window.actualizarNotas(event)" style="width:100%; padding:8px; background:#0a0a0a; border:1px solid #333; color:#fff; border-radius:8px; height:50px; outline:none; resize:none;">${state.tmpNotas}</textarea>
                    </div>

                    <div class="total-row" style="margin-top:15px; padding-top: 10px; border-top: 2px dashed #333;">
                        <span style="font-weight: 800; color: #fff;">TOTAL A PAGAR:</span>
                        <h2 style="margin: 0; color: #2ecc71; font-weight: 900;">$${totalVenta.toLocaleString()}</h2>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-success" style="flex: 1; padding: 12px 8px; font-weight: bold; border-radius: 8px; font-size: 0.9rem;" onclick="window.abrirModalEfectivo()" ${state.carrito.length === 0 ? 'disabled style="opacity:0.5"' : ''}>💵 EFECTIVO</button>
                            <button class="btn-primary" style="flex: 1; padding: 12px 8px; background: #3498db; font-weight: bold; border-radius: 8px; font-size: 0.9rem;" onclick="window.confirmarVenta('contado_tarjeta')" ${state.carrito.length === 0 ? 'disabled style="opacity:0.5"' : ''}>💳 TARJETA</button>
                        </div>
                        <button class="btn-primary" style="width: 100%; padding: 12px; background: #e67e22; font-weight: bold; border-radius: 8px; font-size: 0.9rem;" onclick="window.confirmarVenta('credito')" ${state.carrito.length === 0 ? 'disabled style="opacity:0.5"' : ''}>📋 FIAR (A CUENTA)</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (state.terminoBusqueda !== "") {
        const input = document.getElementById('search-input');
        if (input) {
            input.focus();
            input.setSelectionRange(state.terminoBusqueda.length, state.terminoBusqueda.length);
        }
    }
}