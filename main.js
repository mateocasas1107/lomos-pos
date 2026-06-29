import { renderVentas } from './ventas.js';
import { renderInventario } from './inventario.js';
import { renderFinanzas } from './finanzas.js';
import { renderClientes } from './clientes.js';
import { renderGastos } from './gastos.js';
import { renderDomicilios } from './domicilios.js'; // <-- Módulo estabilizado

/**
 * CONFIGURACIÓN DE PERSISTENCIA
 * Clave única para guardar todos los datos en el navegador del equipo de la carnicería.
 */
const STORAGE_KEY = 'lomos_y_lomos_express_v4_fix';

/**
 * SEGURIDAD - CLAVE DE ADMINISTRADOR
 * Aquí configuras la contraseña maestra para borrar cosas.
 */
window.CLAVE_ADMIN = "1234";

/**
 * MOTOR DE SEGURIDAD (MODAL PROTECTOR)
 * Pide la clave antes de ejecutar una acción crítica.
 */
window.verificarAccionAdmin = (accionAutorizada) => {
    const overlay = document.createElement('div');
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.85); display: flex; justify-content: center;
        align-items: center; z-index: 100000; backdrop-filter: blur(4px);
    `;
    overlay.innerHTML = `
        <div style="background: #141414; border: 1px solid #e74c3c; padding: 25px; border-radius: 12px; width: 90%; max-width: 350px; text-align: center; color: white; box-shadow: 0 10px 30px rgba(231,76,60,0.3);">
            <h3 style="margin-top: 0; color: #e74c3c; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 8px;">🔒 Acceso Restringido</h3>
            <p style="margin: 15px 0; color: #ccc; font-size: 0.9rem;">Ingrese la clave de administrador para autorizar esta acción:</p>
            <input type="password" id="admin-pass-input" placeholder="****" style="width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #333; color: white; border-radius: 8px; margin-bottom: 20px; text-align: center; font-size: 1.2rem; letter-spacing: 5px; outline: none; box-sizing: border-box;" />
            <div style="display: flex; gap: 10px;">
                <button id="admin-cancel-btn" style="flex: 1; background: #1a1a1a; color: white; border: 1px solid #333; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                <button id="admin-ok-btn" style="flex: 1; background: #e74c3c; color: white; border: none; padding: 11px; border-radius: 8px; font-weight: bold; cursor: pointer;">Autorizar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    const input = document.getElementById('admin-pass-input');
    input.focus();

    document.getElementById('admin-cancel-btn').onclick = () => overlay.remove();
    
    const validar = () => {
        if (input.value === window.CLAVE_ADMIN) {
            overlay.remove();
            accionAutorizada();
        } else {
            input.style.borderColor = '#e74c3c';
            input.value = '';
            input.placeholder = 'Clave incorrecta';
        }
    };

    document.getElementById('admin-ok-btn').onclick = validar;
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') validar(); });
};

/**
 * ESTADO INICIAL COMPLETO
 * Estructura de datos base para el primer arranque de la aplicación.
 * Contiene los valores por defecto para todos los módulos integrados.
 */
const defaultState = {
    moduloActivo: 'ventas',
    categoriaSeleccionada: 'TODOS',
    terminoBusqueda: "",
    tipoPrecioActivo: 'detal', // 'detal' (Vitrina) o 'mayor' (Por Mayor)
    nroFacturaActual: 1001,
    ventasRealizadas: [], // Historial de facturación
    categorias: [
        "TODOS", "Res", "Cerdo", "Pollo", "Pescado", "Congelados", 
        "Arepas", "Quesos, Lacteos y Refrigerados", "Charcutería", 
        "Despensa/Abarrotes", "Condimentos/Sazonadores", "Bebidas", 
        "Sección Asados", "Salsas, Dulces y Conservas", "Snacks"
    ],
    productos: [
        { id: 1, nombre: "Lomo Ancho", categoria: "Res", costo: 11000, precioDetal: 14250, precioMayor: 13000, unidad: "lb", stock: 15000, stockMinimo: 3000 },
        { id: 2, nombre: "Costilla de Cerdo", categoria: "Cerdo", costo: 7500, precioDetal: 9750, precioMayor: 8500, unidad: "lb", stock: 10000, stockMinimo: 2000 },
        { id: 3, nombre: "Chorizo Santarrosano", categoria: "Charcutería", costo: 8000, precioDetal: 16000, precioMayor: 12500, unidad: "ud", stock: 500, stockMinimo: 50, fechaCaducidad: "2026-07-10" }
    ],
    carrito: [],
    tmpCliente: "",
    tmpNotas: "",
    
    // --- ESTADO INICIAL DEL MÓDULO DE CLIENTES ---
    clientes: [
        { id: 1, nombre: "Asadero El Vecino", tipo: "juridico", telefono: "3101234567", cedula: "901234567-8", ubicacion: "Calle 80 #15-20" },
        { id: 2, nombre: "Juan Pérez", tipo: "natural", telefono: "3209876543", cedula: "1018234567", ubicacion: "Engativá Centro" }
    ],
    
    // --- ESTADO INICIAL DEL MÓDULO DE GASTOS ---
    gastos: [],
    gastosBusqueda: "",
    gastosFiltroCategoria: "TODOS",
    gastosCategorias: [
        "Arriendo de Locales",
        "Servicios Públicos (Agua/Luz/Gas)",
        "Nómina / Sueldos Empleados",
        "Empaques y Desechables",
        "Carbón y Madera (Asados)",
        "Mantenimiento de Equipos",
        "Otros Gastos Operacionales"
    ],
    
    // --- ESTADO INICIAL DEL MÓDULO DE MERMAS Y RENDIMIENTO ---
    registroMermas: [],
    subproductosAcumulados: {
        "Piel de Pollo": 0,
        "Grasa de Cerdo": 0,
        "Grasa de Res": 0,
        "Recortes de Carne (Res)": 0,
        "Recortes de Carne (Cerdo)": 0
    },

    // --- ESTADO INICIAL DOMICILIOS ---
    domicilios: []
};

/**
 * CARGAR ESTADO
 * Recupera el archivo guardado en el navegador y migra de manera segura las propiedades.
 */
const loadState = () => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            
            // Garantizar que existan las colecciones esenciales
            if (!parsed.ventasRealizadas) parsed.ventasRealizadas = [];
            if (!parsed.nroFacturaActual) parsed.nroFacturaActual = 1001;
            if (!parsed.tipoPrecioActivo) parsed.tipoPrecioActivo = 'detal';
            if (!parsed.carrito) parsed.carrito = [];
            if (parsed.tmpCliente === undefined) parsed.tmpCliente = "";
            if (parsed.tmpNotas === undefined) parsed.tmpNotas = "";
            
            if (parsed.categorias && !parsed.categorias.includes("TODOS")) {
                parsed.categorias.unshift("TODOS");
            }
            
            if (parsed.productos) {
                parsed.productos = parsed.productos.map(p => {
                    if (p.precio !== undefined) {
                        p.precioDetal = p.precio;
                        p.precioMayor = p.precio;
                        delete p.precio;
                    }
                    if (p.precioDetal === undefined) p.precioDetal = p.precioMayor || 0;
                    if (p.precioMayor === undefined) p.precioMayor = p.precioDetal || 0;
                    if (p.costo === undefined) p.costo = 0;
                    if (p.stockMinimo === undefined) p.stockMinimo = p.unidad === 'lb' ? 2000 : 15;
                    if (p.fechaCaducidad === undefined) p.fechaCaducidad = "";
                    return p;
                });
            }

            if (!parsed.clientes) parsed.clientes = defaultState.clientes;
            if (!parsed.gastos) parsed.gastos = [];
            if (!parsed.gastosCategorias) parsed.gastosCategorias = defaultState.gastosCategorias;
            if (parsed.gastosFiltroCategoria === undefined) parsed.gastosFiltroCategoria = "TODOS";
            if (parsed.gastosBusqueda === undefined) parsed.gastosBusqueda = "";

            if (!parsed.registroMermas) parsed.registroMermas = [];
            if (!parsed.subproductosAcumulados) {
                parsed.subproductosAcumulados = { ...defaultState.subproductosAcumulados };
            }

            // Sincronización segura de Domicilios
            if (!parsed.domicilios) parsed.domicilios = [];

            return parsed;
        } catch (e) {
            console.error("Error al analizar el LocalStorage. Iniciando con base limpia:", e);
            return defaultState;
        }
    }
    return defaultState;
};

// Inicialización de la variable de estado global
window.state = loadState();

/**
 * GUARDAR DATOS
 * Serializa y almacena el estado completo.
 */
window.saveData = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.state));
};

/**
 * NAVEGACIÓN Y ENRUTAMIENTO DE MÓDULOS
 */
window.showModule = (module) => {
    window.state.moduloActivo = module;
    window.saveData();

    // Actualizar dinámicamente el estilo activo del menú
    document.querySelectorAll('.sidebar li').forEach(li => {
        li.classList.remove('active');
        const text = li.innerText.toLowerCase();
        
        if (module === 'ventas' && text.includes('ventas')) li.classList.add('active');
        if (module === 'inventario' && text.includes('inventario')) li.classList.add('active');
        if (module === 'finanzas' && text.includes('finanzas')) li.classList.add('active');
        if (module === 'clientes' && text.includes('clientes')) li.classList.add('active');
        if (module === 'gastos' && text.includes('gastos')) li.classList.add('active');
        if (module === 'domicilios' && text.includes('domicilios')) li.classList.add('active');
    });

    const container = document.getElementById('app-container');
    if (!container) return;

    // Renderizado seguro
    try {
        switch (module) {
            case 'ventas': renderVentas(container, window.state); break;
            case 'inventario': renderInventario(container, window.state); break;
            case 'finanzas': renderFinanzas(container, window.state); break;
            case 'clientes': renderClientes(container, window.state); break;
            case 'gastos': renderGastos(container, window.state); break;
            case 'domicilios': renderDomicilios(container, window.state); break;
            default: renderVentas(container, window.state);
        }
    } catch (error) {
        console.error(`Fallo crítico al renderizar el módulo [${module}]:`, error);
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #e74c3c;">
                <h2>⚠️ Error en la visualización</h2>
                <p>Ocurrió un inconveniente al cargar el módulo de <b>${module}</b>.</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 15px; width: auto; padding: 10px 20px;">
                    🔄 Recargar Sistema POS
                </button>
            </div>
        `;
    }
};

/**
 * RECARGAR VISTA FISICA
 */
window.refreshView = () => {
    window.saveData();
    window.showModule(window.state.moduloActivo);
};

// Evento que inicia la ejecución de la app
document.addEventListener('DOMContentLoaded', () => {
    // Intenta arrancar en el módulo activo, si falla va a ventas
    window.showModule(window.state.moduloActivo || 'ventas');
});