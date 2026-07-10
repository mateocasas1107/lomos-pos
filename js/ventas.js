/**
 * Módulo de Ventas - Lomos & Lomos Express
 * Funcionalidades: Búsqueda global, pesaje, stock, doble tarifa (Detal/Mayorista),
 * facturación local, reimpresiones de tickets, gestión de Cuentas por Cobrar (Fiados)
 * y control sanitario multi-lote por fecha de caducidad (FIFO).
 */

export function renderVentas(container, state) {
    
    // Inicialización de variables de control en el estado si no existen
    if (state.terminoBusqueda === undefined) state.terminoBusqueda = "";
    if (state.tmpCliente === undefined) state.tmpCliente = "";
    if (state.tmpNotas === undefined) state.tmpNotas = "";
    if (state.tipoPrecioActivo === undefined) state.tipoPrecioActivo = "detal"; // 'detal' o 'mayor'
    if (state.tmpCorreo === undefined) state.tmpCorreo = ""; // Correo FE
    if (state.tmpDocumento === undefined) state.tmpDocumento = ""; // Cédula o NIT
    if (state.tmpDireccion === undefined) state.tmpDireccion = ""; // Dirección Opcional
    if (state.tmpFE === undefined) state.tmpFE = false;      // Toggle FE

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
                <h3 style="margin-top: 0; color: #e74c3c; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">⚠️ Aviso del Sistema</h3>
                <p style="margin: 15px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <button id="alert-close-btn" style="background: #e74c3c; color: white; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; transition: background 0.2s;">Entendido</button>
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

    // --- LÓGICA DE CONTROL DE TARIFAS ---
    window.cambiarTipoPrecio = (tipo) => {
        state.tipoPrecioActivo = tipo;
        renderVentas(container, state);
    };

    // --- LÓGICA DE BÚSQUEDA Y FILTRADO ---
    window.manejarBusqueda = (e) => {
        state.terminoBusqueda = e.target.value.toLowerCase();
        renderVentas(container, state);
    };

    window.cambiarFiltro = (cat) => {
        state.categoriaSeleccionada = cat;
        renderVentas(container, state);
    };

    // --- CAPTURA DE DATOS DE CLIENTE ---
    window.actualizarDatoCliente = (e) => {
        state.tmpCliente = e.target.value;
    };
    
    window.actualizarCorreo = (e) => {
        state.tmpCorreo = e.target.value;
    };

    window.actualizarDocumento = (e) => {
        state.tmpDocumento = e.target.value;
    };

    window.actualizarDireccion = (e) => {
        state.tmpDireccion = e.target.value;
    };

    window.actualizarFE = (e) => {
        state.tmpFE = e.target.checked;
    };
    
    window.actualizarNotas = (e) => {
        state.tmpNotas = e.target.value;
    };

    // --- GESTIÓN DEL CARRITO ---
    window.agregarAlCarrito = (id) => {
        const prod = state.productos.find(p => p.id === id);
        const input = document.getElementById(`input-${id}`);
        const valor = parseFloat(input.value);
        
        if (!valor || valor <= 0) return;

        // Calcular stock neto de lotes no-vencidos
        const hoyMs = Date.now();
        let stockVentaMax = prod.stock;
        
        if (prod.lotes && prod.lotes.length > 0) {
            stockVentaMax = prod.lotes.reduce((sum, l) => {
                if (!l.fechaCaducidad) return sum + l.stock;
                const fCadMs = new Date(l.fechaCaducidad).getTime();
                return fCadMs > hoyMs ? sum + l.stock : sum;
            }, 0);
        } else if (prod.unidad === 'ud' && prod.fechaCaducidad) {
            const fCadMs = new Date(prod.fechaCaducidad).getTime();
            if (fCadMs <= hoyMs) stockVentaMax = 0;
        }

        // Validación de Stock disponible libre de vencimientos
        if (valor > stockVentaMax) {
            const disp = prod.unidad === 'lb' ? (stockVentaMax / 1000).toFixed(2) + " kg" : stockVentaMax + " ud aptas";
            mostrarAlertaModal(`Stock apto insuficiente para ${prod.nombre}. Disponible no-vencido: ${disp}`);
            return;
        }

        // Determinar el precio aplicable según el tipo de cliente activo en caja
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

    /**
     * FUNCIÓN UNIVERSAL DE IMPRESIÓN
     */
    window.imprimirTicketGenerico = (datosVenta) => {
        const { nroFactura, fecha, cliente, notas, items, total, tipoTarifa, metodoPago, documento } = datosVenta;
        const metodoFormateado = metodoPago === 'credito' ? 'FIADO (A CUENTA)' : 'CONTADO / PAGADO';

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
                    <p>Nit: 52187751-5</p>
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
                
                ${notas ? `
                    <div class="divider"></div>
                    <p><b>NOTAS:</b> ${notas}</p>
                ` : ''}

                ${metodoPago === 'credito' ? `
                    <div class="divider" style="margin-top: 25px;"></div>
                    <p class="center" style="font-size: 9px;">Firma de Recibido / Compromiso Pago</p>
                    <br><br>
                    <p class="center">_______________________________</p>
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
        if (venta) {
            window.imprimirTicketGenerico(venta);
        } else {
            mostrarAlertaModal("No se pudo localizar el registro de esa factura en el historial.");
        }
    };

    // --- FUNCIONES DE FACTURACIÓN ELECTRÓNICA (PDF MINIMALISTA Y OSCURO) ---
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
                    <p style="margin: 5px 0; font-size: 12px; color: #000; font-weight: bold;">NIT: 52187751-5</p>
                </div>
            </div>

            <div style="margin-bottom: 30px; font-size: 14px; color: #000;">
                <p style="margin: 3px 0;"><b>Factura N°:</b> ${venta.nroFactura}</p>
                <p style="margin: 3px 0;"><b>Fecha:</b> ${venta.fecha.split(',')[0]}</p>
                <p style="margin: 3px 0;"><b>Método de Pago:</b> ${venta.metodoPago === 'credito' ? 'Crédito (A Cuenta)' : 'Contado'}</p>
            </div>

            <div style="margin-bottom: 30px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 15px 0; font-size: 14px; color: #000;">
                <p style="margin: 3px 0;"><b>Cliente / Razón Social:</b> ${venta.cliente || 'Consumidor Final'}</p>
                <p style="margin: 3px 0;"><b>CC o NIT:</b> ${venta.documento || 'N/A'}</p>
                <p style="margin: 3px 0;"><b>Correo:</b> ${venta.correo || 'No registrado'}</p>
                ${venta.direccion ? `<p style="margin: 3px 0;"><b>Dirección:</b> ${venta.direccion}</p>` : ''}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                <thead>
                    <tr style="border-bottom: 2px solid #000000;">
                        <th style="padding: 10px; text-align: left; color: #ffffff; font-weight: 800;">Descripción de Artículo</th>
                        <th style="padding: 10px; text-align: center; color: #ffffff; font-weight: 800;">Cant / Peso</th>
                        <th style="padding: 10px; text-align: right; color: #ffffff; font-weight: 800;">Precio Unit.</th>
                        <th style="padding: 10px; text-align: right; color: #ffffff; font-weight: 800;">Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${venta.items.map(i => {
                        let nombreLimpio = i.nombre.replace(/ TARIFA: VITRINA \(DETAL\)/g, '').replace(/TARIFA: VITRINA \(DETAL\)/g, '').replace(/ TARIFA: MAYOR/g, '').replace(/TARIFA: MAYOR/g, '').replace(/- VITRINA/g, '').replace(/- MAYOR/g, '').trim();
                        const precioUnitario = i.unidad === 'lb' ? (i.precioCobrado * 2) : i.precioCobrado;
                        const etiquetaUnidad = i.unidad === 'lb' ? ' /kg' : ' /ud';

                        return `
                        <tr style="border-bottom: 1px solid #000;">
                            <td style="padding: 10px; color: #000; font-weight: 700;">${nombreLimpio}</td>
                            <td style="padding: 10px; text-align: center; color: #000; font-weight: 700;">${i.cantidadDetalle}</td>
                            <td style="padding: 10px; text-align: right; color: #000; font-weight: 700;">$${precioUnitario.toLocaleString()}${etiquetaUnidad}</td>
                            <td style="padding: 10px; text-align: right; color: #000; font-weight: 900;">$${i.total.toLocaleString()}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>

            <div style="text-align: right; border-top: 3px solid #000; padding-top: 15px;">
                <h2 style="margin: 0; font-size: 24px; color: #000; font-weight: 900;">TOTAL A PAGAR: $${venta.total.toLocaleString()}</h2>
            </div>
            
            <div style="margin-top: 30px; background: #fff; padding: 10px; font-size: 11px; text-align: center; border: 1px solid #000; color: #000;">
                <b>CUFE:</b> ${venta.cufe || 'N/A'}
            </div>
            
            <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #000; font-weight: bold;">
                <p>Representación gráfica de factura electrónica. Documento generado por el sistema POS Lomos & Lomos Express.</p>
            </div>
        `;

        html2pdf().set({
            margin: 15,
            filename: `Factura_Electronica_${venta.nroFactura}_Lomos.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        }).from(element).save();
    };

    window.enviarFacturaCorreo = (id) => {
        const venta = state.ventasRealizadas.find(v => v.id === id);
        if (!venta) return;
        if (!venta.correo || !venta.correo.includes('@')) {
            mostrarAlertaModal("No hay un correo electrónico válido asociado a esta factura.");
            return;
        }

        window.descargarFacturaPDF(id);

        const asunto = encodeURIComponent(`Factura Electrónica N° ${venta.nroFactura} - Lomos & Lomos Express`);
        const cuerpo = encodeURIComponent(`Hola ${venta.cliente || 'Cliente'},\n\nGracias por su compra en Lomos & Lomos Express.\n\n[🔔 IMPORTANTE: Por favor, adjunta aquí el PDF que se acaba de descargar en tu computador antes de hacer clic en enviar]\n\nResumen de la operación:\n- Factura N°: ${venta.nroFactura}\n- Total Pagado: $${venta.total.toLocaleString()}\n- Código CUFE DIAN: ${venta.cufe || 'N/A'}\n\nEncontrará el documento legal detallado en el PDF adjunto a este correo.\n\nAtentamente,\nLomos & Lomos Express`);
        
        setTimeout(() => {
            window.location.href = `mailto:${venta.correo}?subject=${asunto}&body=${cuerpo}`;
        }, 1000);
    };

    // --- PROCESO DE CIERRE DE VENTA ---
    window.confirmarVenta = (metodo = 'contado') => {
        if (state.carrito.length === 0) return;

        if (state.tmpFE && (!state.tmpCorreo || !state.tmpCorreo.includes('@'))) {
            mostrarAlertaModal("❌ Para emitir una Factura Electrónica legal es obligatorio ingresar un correo electrónico válido.");
            return;
        }

        if (metodo === 'credito' && (!state.tmpCliente || !state.tmpCliente.trim())) {
            mostrarAlertaModal("❌ Por favor, ingrese el nombre del cliente para poder cargar esta venta a su cuenta.");
            return;
        }

        const totalVenta = state.carrito.reduce((acc, i) => acc + i.total, 0);

        const mensajeConfirmacion = metodo === 'credito' 
            ? `¿Desea cargar esta venta de $${totalVenta.toLocaleString()} a la cuenta de "${state.tmpCliente}"?`
            : `¿Finalizar venta y procesar pago de $${totalVenta.toLocaleString()} en efectivo/tarjeta?`;

        mostrarConfirmacionModal(mensajeConfirmacion, () => {
            const costoTotalVenta = state.carrito.reduce((acc, item) => {
                const p = state.productos.find(prod => prod.id === item.id);
                const costoProp = (p.unidad === 'lb')
                    ? (item.cantidadVendida / 1000) * (p.costo * 2)
                    : item.cantidadVendida * p.costo;
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
                metodoPago: metodo,
                estadoPago: metodo === 'credito' ? 'pendiente' : 'pagado',
                totalPendiente: metodo === 'credito' ? totalVenta : 0,
                items: [...state.carrito],
                total: totalVenta,
                costo: Math.round(costoTotalVenta),
                utilidad: Math.round(totalVenta - costoTotalVenta),
                esFE: state.tmpFE,
                correo: state.tmpCorreo,
                documento: state.tmpDocumento,
                direccion: state.tmpDireccion, // Se guarda la dirección para el PDF
                cufe: state.tmpFE ? Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('') : null
            };

            state.ventasRealizadas.push(datosVentaHistorial);

            mostrarConfirmacionModal("¿Desea imprimir el ticket físico para el cliente?", () => {
                window.imprimirTicketGenerico(datosVentaHistorial);
                finalizarLimpiezaYActualizacion();
            });

            const finalizarLimpiezaYActualizacion = () => {
                const hoyMs = Date.now();

                state.carrito.forEach(item => {
                    const prod = state.productos.find(p => p.id === item.id);
                    if (prod) {
                        if (prod.lotes && prod.lotes.length > 0) {
                            let cantidadPorDescontar = item.cantidadVendida;
                            
                            const lotesOrdenados = [...prod.lotes].sort((a, b) => {
                                const tA = new Date(a.fechaCaducidad || "9999-12-31").getTime();
                                const tB = new Date(b.fechaCaducidad || "9999-12-31").getTime();
                                return tA - tB;
                            });

                            lotesOrdenados.forEach(l => {
                                if (cantidadPorDescontar <= 0) return;
                                const fCadMs = new Date(l.fechaCaducidad).getTime();
                                if (fCadMs > hoyMs) {
                                    if (l.stock >= cantidadPorDescontar) {
                                        l.stock -= cantidadPorDescontar;
                                        cantidadPorDescontar = 0;
                                    } else {
                                        cantidadPorDescontar -= l.stock;
                                        l.stock = 0;
                                    }
                                }
                            });

                            if (cantidadPorDescontar > 0) {
                                lotesOrdenados.forEach(l => {
                                    if (cantidadPorDescontar <= 0) return;
                                    const fCadMs = new Date(l.fechaCaducidad).getTime();
                                    if (fCadMs <= hoyMs) {
                                        if (l.stock >= cantidadPorDescontar) {
                                            l.stock -= cantidadPorDescontar;
                                            cantidadPorDescontar = 0;
                                        } else {
                                            cantidadPorDescontar -= l.stock;
                                            l.stock = 0;
                                        }
                                    }
                                });
                            }

                            prod.lotes = lotesOrdenados;
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

            const botonesConfirmBody = document.querySelector('div[style*="z-index: 10000"]');
            if (botonesConfirmBody) {
                const botonCancelarImpresion = document.getElementById('confirm-cancel-btn');
                if (botonCancelarImpresion) {
                    botonCancelarImpresion.onclick = () => {
                        botonesConfirmBody.remove();
                        finalizarLimpiezaYActualizacion();
                    };
                }
            }
        });
    };

    // --- FILTRADO DE PRODUCTOS ---
    const productosFiltrados = state.productos.filter(p => {
        const coincidenCat = (state.categoriaSeleccionada === 'TODOS') || (p.categoria === state.categoriaSeleccionada);
        const coincideNom = p.nombre.toLowerCase().includes(state.terminoBusqueda);
        return coincidenCat && coincideNom;
    });

    const totalVenta = state.carrito.reduce((acc, i) => acc + i.total, 0);
    const hoyMs = Date.now();

    // --- RENDERIZADO HTML ---
    container.innerHTML = `
        <div class="module-fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 20px; flex-wrap: wrap;">
                <h1 style="margin: 0;">🥩 Panel de Ventas</h1>
                <div class="search-box" style="flex-grow: 1; max-width: 450px;">
                    <input type="text" id="search-input" 
                           placeholder="🔍 Buscar producto en ${state.categoriaSeleccionada}..." 
                           value="${state.terminoBusqueda}" 
                           oninput="window.manejarBusqueda(event)"
                           style="width: 100%; padding: 12px 15px 12px 40px; border-radius: 10px; border: 1px solid #333; background: #1a1a1a; color: white; outline: none;">
                </div>
            </div>

            <!-- Segmentador de Tarifa -->
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
                <span style="font-size: 0.85rem; color: #888; font-weight: bold; text-transform: uppercase; margin-right: 5px;">Tarifa Aplicada:</span>
                <div style="display: flex; background: #141414; padding: 4px; border-radius: 8px; border: 1px solid #2a2a2a; width: fit-content;">
                    <button onclick="window.cambiarTipoPrecio('detal')" 
                            style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; background: ${state.tipoPrecioActivo === 'detal' ? 'var(--accent, #e74c3c)' : 'transparent'}; color: ${state.tipoPrecioActivo === 'detal' ? '#fff' : '#666'};">
                        🏪 Vitrina (Detal)
                    </button>
                    <button onclick="window.cambiarTipoPrecio('mayor')" 
                            style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; background: ${state.tipoPrecioActivo === 'mayor' ? '#3498db' : 'transparent'}; color: ${state.tipoPrecioActivo === 'mayor' ? '#fff' : '#666'};">
                        🏭 Por Mayor
                    </button>
                    <button onclick="window.cambiarTipoPrecio('alto')" 
                            style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; background: ${state.tipoPrecioActivo === 'alto' ? '#9b59b6' : 'transparent'}; color: ${state.tipoPrecioActivo === 'alto' ? '#fff' : '#666'};">
                        📈 Precio Alto
                    </button>
                </div>
            </div>
            
            <div class="tabs-container">
                ${state.categorias.map(cat => `
                    <button onclick="window.cambiarFiltro('${cat}')" class="tab-btn ${cat === state.categoriaSeleccionada ? 'active' : ''}">
                        ${cat}
                    </button>
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
                            
                            if (stockVentaMax === 0 && p.stock > 0) {
                                esExpirado = true;
                            }
                        } else if (p.unidad === 'ud' && p.fechaCaducidad) {
                            const fCadMs = new Date(p.fechaCaducidad).getTime();
                            diasRestantes = Math.ceil((fCadMs - hoyMs) / (1000 * 60 * 60 * 24));
                            if (diasRestantes <= 0) {
                                esExpirado = true;
                                stockVentaMax = 0;
                            } else if (diasRestantes <= 7) {
                                esProximoVencer = true;
                            }
                        }

                        const agotado = stockVentaMax <= 0;
                        const stockText = p.unidad === 'lb' 
                            ? (p.stock/1000).toFixed(2)+'kg' 
                            : (p.lotes && p.lotes.length > 0 ? stockVentaMax + ' ud disp.' : p.stock + ' ud');
                        
                        let precioPrincipal = p.precioDetal;
                        let colorPrecio = "#2ecc71";
                        if (state.tipoPrecioActivo === 'mayor') {
                            precioPrincipal = p.precioMayor || p.precioDetal;
                            colorPrecio = "#3498db";
                        } else if (state.tipoPrecioActivo === 'alto') {
                            precioPrincipal = p.precioAlto || p.precioDetal;
                            colorPrecio = "#9b59b6";
                        }
                        
                        // *** MEJORA DE DESCRIPCIÓN: BLANCO PURO (MANTENIDO) ***
                        let textoEtiquetaSecundaria = `<span style="color: #ffffff;">Vitrina: $${p.precioDetal.toLocaleString()}</span>`;
                        if (state.tipoPrecioActivo === 'detal') {
                            textoEtiquetaSecundaria = `<span style="color: #ffffff;">Mayor: $${(p.precioMayor || p.precioDetal).toLocaleString()}</span>`;
                            if (p.precioAlto) textoEtiquetaSecundaria += ` | <span style="color: #ffffff;">Alto: $${p.precioAlto.toLocaleString()}</span>`;
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
                            if (esBajoStock) {
                                overlayBadge += `<span style="background: #e67e22; color: white; font-size: 0.72rem; padding: 3px 6px; border-radius: 4px; font-weight: bold; position: absolute; top: 10px; left: 10px; z-index: 5;">⚠️ Stock Bajo</span>`;
                            }
                            if (esProximoVencer) {
                                overlayBadge += `<span style="background: #f1c40f; color: black; font-size: 0.72rem; padding: 3px 6px; border-radius: 4px; font-weight: bold; position: absolute; top: 10px; right: 10px; z-index: 5;">⏰ Vence: ${diasRestantes}d</span>`;
                            }
                        }

                        let lotesInfoHTML = "";
                        if (p.lotes && p.lotes.length > 0) {
                            lotesInfoHTML = `
                                <div style="margin: 10px 0; font-size: 0.72rem; background: #0c0c0c; padding: 8px; border-radius: 8px; border: 1px solid #222; max-height: 85px; overflow-y: auto;">
                                    <div style="font-weight: bold; color: #666; font-size: 0.62rem; text-transform: uppercase; margin-bottom: 4px; display:flex; justify-content:space-between;">
                                        <span>Fecha Vence</span>
                                        <span>Stock</span>
                                    </div>
                            `;
                            p.lotes.forEach(l => {
                                const fCadMs = new Date(l.fechaCaducidad || "9999-12-31").getTime();
                                const dLoteRestantes = Math.ceil((fCadMs - hoyMs) / (1000 * 60 * 60 * 24));
                                let badgeColor = "#2ecc71";
                                let desc = "Ok";
                                
                                if (dLoteRestantes <= 0) {
                                    badgeColor = "#ff3b30";
                                    desc = "Exp.";
                                } else if (dLoteRestantes <= 7) {
                                    badgeColor = "#f1c40f";
                                    desc = `${dLoteRestantes}d`;
                                }

                                lotesInfoHTML += `
                                    <div style="display:flex; justify-content:space-between; color: ${badgeColor}; margin-bottom: 3px;">
                                        <span>📅 ${l.fechaCaducidad || 'Sin Fecha'} (${desc})</span>
                                        <b>${l.stock} ud</b>
                                    </div>
                                `;
                            });
                            lotesInfoHTML += `</div>`;
                        }

                        let nombreLimpioParaMostrar = p.nombre.replace(/ TARIFA: VITRINA \(DETAL\)/g, '').replace(/TARIFA: VITRINA \(DETAL\)/g, '').replace(/ TARIFA: MAYOR/g, '').replace(/TARIFA: MAYOR/g, '').replace(/- VITRINA/g, '').replace(/- MAYOR/g, '').trim();

                        return `
                        <div class="card" style="position: relative; ${visualStyles}">
                            ${overlayBadge}
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 5px; margin-top: ${overlayBadge ? '22px' : '0'};">
                                <h3 style="margin: 0; font-size: 1rem; line-height: 1.2;">${nombreLimpioParaMostrar}</h3>
                                <span class="tag" style="flex-shrink: 0;">${stockText}</span>
                            </div>
                            
                            ${lotesInfoHTML}

                            <div style="margin-top: 10px; margin-bottom: 15px;">
                                <p class="price" style="margin: 0; color: ${colorPrecio};">$${precioPrincipal.toLocaleString()} / ${p.unidad === 'lb' ? 'Lb' : 'Ud'}</p>
                                <!-- *** DESCRIPCIONES BLANCAS *** -->
                                <p style="font-size: 0.8rem; color: #ffffff; margin: 6px 0 0 0; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                                    ${textoEtiquetaSecundaria}
                                </p>
                            </div>
                            <input type="number" id="input-${p.id}" placeholder="${p.unidad === 'lb' ? 'Gramos' : 'Cant.'}" ${esExpirado || agotado ? 'disabled' : ''}>
                            <button onclick="window.agregarAlCarrito(${p.id})" class="btn-primary" ${disabledAttribute}>
                                ${buttonText}
                            </button>
                        </div>
                    `}).join('') : '<div style="grid-column: 1/-1; text-align: center; color: #555; padding: 40px;">No se encontraron productos en esta sección.</div>'}
                </div>

                <!-- *** MEJORA DE DISEÑO OSCURO RESTAURADO *** -->
                <div class="cart-summary" style="background: #141414; color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #2a2a2a; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
                    <h3 style="margin-top:0; color: #ffffff; font-weight: 800;">Resumen de Venta</h3>
                    <div class="cart-items" style="border-bottom: 2px dashed #333; padding-bottom: 15px; margin-bottom: 15px;">
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

                    <!-- Información del Cliente (Adaptado a tema oscuro) -->
                    <div style="margin-top: 15px;">
                        <input type="text" placeholder="Escriba o seleccione cliente..." 
                               value="${state.tmpCliente}"
                               list="clientes-registrados"
                               oninput="window.actualizarDatoCliente(event)"
                               style="width:100%; padding:10px; background:#0a0a0a; border:1px solid #333; color:#fff; margin-bottom:10px; border-radius:8px; outline:none; font-weight: 500;">
                        
                        <datalist id="clientes-registrados">
                            ${(state.clientes || []).map(c => `<option value="${c.nombre}"></option>`).join('')}
                        </datalist>
                        
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <input type="text" placeholder="Cédula o NIT..." 
                                   value="${state.tmpDocumento}"
                                   oninput="window.actualizarDocumento(event)"
                                   style="flex: 1; min-width: 0; padding:10px; background:#0a0a0a; border:1px solid #333; color:#fff; border-radius:8px; outline:none; font-weight: 500;">
                            
                            <input type="email" placeholder="Correo (Opcional)..." 
                                   value="${state.tmpCorreo}"
                                   oninput="window.actualizarCorreo(event)"
                                   style="flex: 1.5; min-width: 0; padding:10px; background:#0a0a0a; border:1px solid #333; color:#fff; border-radius:8px; outline:none; font-weight: 500;">
                        </div>

                        <!-- CAMPO DE DIRECCIÓN OSCURO -->
                        <input type="text" placeholder="Dirección (Opcional)..." 
                               value="${state.tmpDireccion}"
                               oninput="window.actualizarDireccion(event)"
                               style="width:100%; padding:10px; background:#0a0a0a; border:1px solid #333; color:#fff; border-radius:8px; outline:none; margin-bottom:15px; font-weight: 500;">
                        
                        <label style="display:flex; align-items:center; gap:10px; color:#ccc; font-size:0.85rem; margin-bottom:15px; cursor:pointer; background:#1a1a1a; padding:12px; border-radius:8px; border:1px solid #222; transition: 0.3s;">
                            <input type="checkbox" onchange="window.actualizarFE(event)" ${state.tmpFE ? 'checked' : ''} style="accent-color: #3498db; width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-weight: bold; ${state.tmpFE ? 'color: #3498db;' : ''}">Generar Factura Electrónica (DIAN)</span>
                        </label>

                        <textarea placeholder="Observaciones de preparación (ej: sin grasa, corte grueso)..." 
                                  oninput="window.actualizarNotas(event)"
                                  style="width:100%; padding:10px; background:#0a0a0a; border:1px solid #333; color:#fff; border-radius:8px; height:70px; font-family:sans-serif; outline:none; resize:none; font-weight: 500;">${state.tmpNotas}</textarea>
                    </div>

                    <div class="total-row" style="margin-top:20px; padding-top: 15px; border-top: 2px dashed #333;">
                        <span style="font-weight: 800; color: #fff;">TOTAL A PAGAR:</span>
                        <h2 style="margin: 0; color: #2ecc71; font-weight: 900;">$${totalVenta.toLocaleString()}</h2>
                    </div>
                    
                    <!-- Botonera de Facturación Doble -->
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn-success" style="flex: 1.2; padding: 14px 10px; font-weight: bold; border-radius: 8px;" onclick="window.confirmarVenta('contado')" ${state.carrito.length === 0 ? 'disabled style="opacity:0.5"' : ''}>
                            💵 COBRAR CONTADO
                        </button>
                        <button class="btn-primary" style="flex: 1; padding: 14px 10px; background: #e67e22; font-weight: bold; border-radius: 8px;" onclick="window.confirmarVenta('credito')" ${state.carrito.length === 0 ? 'disabled style="opacity:0.5"' : ''}>
                            📋 FIAR (A CUENTA)
                        </button>
                    </div>
                </div> <!-- Cierre de .cart-summary -->
            </div> <!-- Cierre de .pos-layout -->
        </div> <!-- Cierre de .module-fade-in -->
    `;

    // Restaurar el foco en el buscador sin perder la posición del puntero
    if (state.terminoBusqueda !== "") {
        const input = document.getElementById('search-input');
        if (input) {
            input.focus();
            input.setSelectionRange(state.terminoBusqueda.length, state.terminoBusqueda.length);
        }
    }
}