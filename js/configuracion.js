/**
 * Módulo de Configuración - Lomos & Lomos Express
 * Permite personalizar la apariencia de la aplicación (Temas),
 * el nombre del negocio y los emojis de la barra lateral.
 */

export function renderConfiguracion(container, state) {
    // --- TEMAS PREDEFINIDOS (OPCIÓN A) ---
    const temas = [
        {
            id: 'tema-lomos',
            nombre: 'Rojo Lomos (Por Defecto)',
            colores: {
                bgPrimary: '#0a0a0a',
                bgSecondary: '#141414',
                cardBg: '#1c1c1c',
                accent: '#e74c3c',
                textMain: '#ffffff',
                textMuted: '#888888',
                border: '#2a2a2a'
            }
        },
        {
            id: 'tema-oceano',
            nombre: 'Océano (Azul/Gris)',
            colores: {
                bgPrimary: '#0f172a',
                bgSecondary: '#1e293b',
                cardBg: '#334155',
                accent: '#3b82f6',
                textMain: '#f8fafc',
                textMuted: '#94a3b8',
                border: '#475569'
            }
        },
        {
            id: 'tema-bosque',
            nombre: 'Bosque (Verde Oscuro)',
            colores: {
                bgPrimary: '#052e16',
                bgSecondary: '#14532d',
                cardBg: '#166534',
                accent: '#22c55e',
                textMain: '#f0fdf4',
                textMuted: '#86efac',
                border: '#15803d'
            }
        },
        {
            id: 'tema-claro',
            nombre: 'Luminoso (Modo Claro)',
            colores: {
                bgPrimary: '#f8fafc',
                bgSecondary: '#ffffff',
                cardBg: '#f1f5f9',
                accent: '#e74c3c',
                textMain: '#0f172a',
                textMuted: '#64748b',
                border: '#e2e8f0'
            }
        }
    ];

    // Inicializar configuración en el estado si no existe o si faltan propiedades
    if (!state.configuracion) {
        state.configuracion = {
            temaActivo: 'tema-lomos',
            nombreEmpresa: 'Lomos & Lomos',
            emojis: {
                ventas: '🛒',
                inventario: '📦',
                finanzas: '📊',
                clientes: '👥',
                gastos: '💸',
                domicilios: '🛵',
                configuracion: '⚙️'
            }
        };
    } else {
        if (!state.configuracion.nombreEmpresa) state.configuracion.nombreEmpresa = 'Lomos & Lomos';
        if (!state.configuracion.emojis) {
            state.configuracion.emojis = {
                ventas: '🛒', inventario: '📦', finanzas: '📊', clientes: '👥', gastos: '💸', domicilios: '🛵', configuracion: '⚙️'
            };
        }
    }

    // --- FUNCIONES DE INTERFAZ Y LÓGICA ---

    const mostrarAlerta = (mensaje) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background: var(--card-bg, #1c1c1c); border: 1px solid var(--border, #333); padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; color: var(--text-main, white); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0; color: var(--accent, #e74c3c); font-size: 1.2rem;">✅ Actualizado</h3>
                <p style="margin: 15px 0; color: var(--text-muted, #ccc); line-height: 1.5; font-size: 0.95rem;">${mensaje}</p>
                <button id="conf-alert-btn" style="background: var(--accent, #e74c3c); color: white; border: none; padding: 11px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Entendido</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('conf-alert-btn').onclick = () => overlay.remove();
    };

    window.aplicarTema = (idTema) => {
        const tema = temas.find(t => t.id === idTema);
        if (!tema) return;

        state.configuracion.temaActivo = idTema;
        window.saveData();

        const root = document.documentElement;
        root.style.setProperty('--bg-primary', tema.colores.bgPrimary);
        root.style.setProperty('--bg-secondary', tema.colores.bgSecondary);
        root.style.setProperty('--card-bg', tema.colores.cardBg);
        root.style.setProperty('--accent', tema.colores.accent);
        root.style.setProperty('--text-main', tema.colores.textMain);
        root.style.setProperty('--text-muted', tema.colores.textMuted);
        root.style.setProperty('--border', tema.colores.border);

        renderConfiguracion(container, state);
        mostrarAlerta(`Tema cambiado a: ${tema.nombre}`);
    };

    window.guardarNombreEmpresa = () => {
        const inputElem = document.getElementById('conf-nombre-empresa');
        if (!inputElem) return;
        const nuevoNombre = inputElem.value.trim();
        
        if (nuevoNombre) {
            state.configuracion.nombreEmpresa = nuevoNombre;
            window.saveData();
            
            const logoElement = document.querySelector('.logo');
            if (logoElement) {
                logoElement.innerText = nuevoNombre;
            }
            
            mostrarAlerta("Nombre de la empresa actualizado correctamente.");
        } else {
            mostrarAlerta("El nombre de la empresa no puede estar vacío.");
        }
    };

    window.guardarEmojis = () => {
        const vVentas = document.getElementById('emoji-ventas');
        const vInventario = document.getElementById('emoji-inventario');
        const vFinanzas = document.getElementById('emoji-finanzas');
        const vClientes = document.getElementById('emoji-clientes');
        const vGastos = document.getElementById('emoji-gastos');
        const vDomicilios = document.getElementById('emoji-domicilios');
        const vConfiguracion = document.getElementById('emoji-configuracion');

        if (!vVentas || !vInventario) return;

        state.configuracion.emojis = {
            ventas: vVentas.value.trim() || '🛒',
            inventario: vInventario.value.trim() || '📦',
            finanzas: vFinanzas.value.trim() || '📊',
            clientes: vClientes.value.trim() || '👥',
            gastos: vGastos.value.trim() || '💸',
            domicilios: vDomicilios.value.trim() || '🛵',
            configuracion: vConfiguracion.value.trim() || '⚙️'
        };
        
        window.saveData();

        // Actualizar el menú lateral en tiempo real
        const menuItems = document.querySelectorAll('.sidebar li');
        menuItems.forEach(li => {
            const onclickAttr = li.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/'([^']+)'/);
                if (match && match[1]) {
                    const moduleName = match[1];
                    const emojiCustom = state.configuracion.emojis[moduleName];
                    if (emojiCustom) {
                        const textoLimpio = li.innerText.replace(/^[^\w\s]+/, '').trim();
                        li.innerText = `${emojiCustom} ${textoLimpio}`;
                    }
                }
            }
        });

        mostrarAlerta("Emojis del menú actualizados correctamente.");
    };

    // --- RENDERIZADO DEL MÓDULO ---
    container.innerHTML = `
        <div class="module-fade-in" style="padding: 10px; color: var(--text-main);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h1 style="margin: 0;">⚙️ Configuración del Sistema</h1>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                
                <!-- SECCIÓN TEMAS VISUALES -->
                <div style="background: var(--bg-secondary); padding: 25px; border-radius: 12px; border: 1px solid var(--border);">
                    <h3 style="margin-top: 0; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
                        🎨 Temas Visuales
                    </h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Selecciona la paleta de colores para la interfaz de la aplicación.</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${temas.map(tema => `
                            <button onclick="window.aplicarTema('${tema.id}')" 
                                style="
                                    display: flex; justify-content: space-between; align-items: center;
                                    padding: 15px; border-radius: 8px; cursor: pointer; transition: 0.2s;
                                    background: ${tema.colores.bgPrimary};
                                    border: 2px solid ${state.configuracion.temaActivo === tema.id ? tema.colores.accent : tema.colores.border};
                                    color: ${tema.colores.textMain};
                                ">
                                <span style="font-weight: bold;">${tema.nombre}</span>
                                <div style="display: flex; gap: 5px;">
                                    <div style="width: 20px; height: 20px; border-radius: 50%; background: ${tema.colores.bgSecondary}; border: 1px solid #000;"></div>
                                    <div style="width: 20px; height: 20px; border-radius: 50%; background: ${tema.colores.accent}; border: 1px solid #000;"></div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- SECCIÓN PERSONALIZACIÓN DE MARCA Y MENÚ -->
                <div style="display: flex; flex-direction: column; gap: 30px;">
                    
                    <!-- NOMBRE DE LA EMPRESA -->
                    <div style="background: var(--bg-secondary); padding: 25px; border-radius: 12px; border: 1px solid var(--border);">
                        <h3 style="margin-top: 0; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
                            🏢 Identidad del Negocio
                        </h3>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Cambia el nombre principal que aparece en la esquina superior izquierda de la aplicación.</p>
                        
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="conf-nombre-empresa" value="${state.configuracion.nombreEmpresa}" placeholder="Nombre de tu negocio" style="flex: 1; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border); color: var(--text-main); border-radius: 8px; outline: none;">
                            <button onclick="window.guardarNombreEmpresa()" class="btn-primary" style="padding: 12px 20px;">Guardar</button>
                        </div>
                    </div>

                    <!-- EMOJIS DEL MENÚ -->
                    <div style="background: var(--bg-secondary); padding: 25px; border-radius: 12px; border: 1px solid var(--border);">
                        <h3 style="margin-top: 0; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
                            ✨ Emojis del Menú Lateral
                        </h3>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Personaliza los iconos (emojis) que acompañan a cada sección en la barra lateral.</p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                            ${Object.keys(state.configuracion.emojis).map(mod => `
                                <div>
                                    <label style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px;">${mod}</label>
                                    <input type="text" id="emoji-${mod}" value="${state.configuracion.emojis[mod]}" style="width: 100%; padding: 10px; background: var(--bg-primary); border: 1px solid var(--border); color: var(--text-main); border-radius: 8px; outline: none; text-align: center; font-size: 1.2rem;">
                                </div>
                            `).join('')}
                        </div>
                        <button onclick="window.guardarEmojis()" class="btn-primary" style="width: 100%;">Actualizar Emojis</button>
                    </div>

                </div>

            </div>
        </div>
    `;
}