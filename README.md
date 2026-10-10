# MrGlass - Galeria de Trabajos

PWA (Progressive Web App) de portafolio para **MrGlass**, vidrieria y aluminio en Chillan.
Permite al administrador subir fotos de trabajos realizados y a los visitantes navegar la galeria,
filtrar por categoria y contactar directamente por WhatsApp para cotizar.

---

## Stack tecnologico

- HTML5 + CSS3 + JavaScript vanilla (sin frameworks)
- [Supabase](https://supabase.com/) para Auth + base de datos PostgreSQL + Storage de imagenes
- Service Worker para funcionamiento offline (PWA instalable)
- Manifest para instalacion en Android/iOS/desktop

---

## Estructura del proyecto

```
mrglass-galeria/
|-- index.html              Estructura de la pagina
|-- style.css               Estilos (paleta morado premium + dorado)
|-- script.js               Logica (Auth, CRUD, filtros, lightbox, QR)
|-- manifest.json           Configuracion PWA
|-- service-worker.js       Cache offline
|-- icon.svg                Icono PWA (vectorial, escalable)
|-- supabase-migration.sql  Script SQL para configurar Supabase
|-- .nojekyll               Evita procesamiento Jekyll en GitHub Pages
|-- robots.txt              SEO
|-- README.md               Este archivo
```

---

## Configuracion en Supabase (PASO OBLIGATORIO)

### 1. Crear cuenta y proyecto

1. Entra a https://supabase.com y crea una cuenta gratuita
2. Crea un nuevo proyecto, anota la URL y la `anon/public` key

### 2. Ejecutar la migracion SQL

1. En el dashboard de tu proyecto ve a **SQL Editor**
2. Crea un new query
3. Copia y pega todo el contenido de `supabase-migration.sql`
4. Click en **RUN**

Esto creara:
- La tabla `trabajos` con la columna `categoria`
- Politicas RLS (lectura publica, escritura solo autenticada)
- El bucket publico `galeria-trabajos`
- Un trigger para actualizar `updated_at` automaticamente

### 3. Crear usuario administrador

1. Ve a **Authentication > Users**
2. Click en **Add user**
3. Ingresa el correo (ej: `alberto.dacruz.r@outlook.com`) y una contrasena segura
4. Marca "Auto Confirm User" para evitar tener que verificar email
5. Guarda

### 4. Verificar las claves en script.js

En `script.js` lineas 7-8, verifica que coincidan con tu proyecto:

```javascript
const SUPABASE_URL = 'https://emtddcurmnmvbhgysldh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_...';
```

> **Importante**: La `publishable key` es segura para tenerla en el cliente **SIEMPRE Y CUANDO**
> tengas RLS activado (paso 2). Si RLS esta desactivado, cualquiera podria escribir en tu base de datos.

---

## Como usar

### Vista cliente (visitante)

- Navega la galeria con flechas del teclado o botones `<` `>`
- Click en una imagen para abrir el lightbox con zoom
- Filtra por categoria con los chips superiores
- Click en "Cotizar" en cualquier trabajo para abrir WhatsApp con mensaje prellenado
- Boton flotante de WhatsApp abajo a la derecha

### Modo administrador

Tres formas de entrar:

1. **Atajo de teclado**: `Ctrl + Shift + A` (recomendado, no deja rastro en la URL)
2. **Boton "Acceso"** discreto en el footer abajo a la derecha
3. **URL**: agregar `?admin=1` a la direccion

Una vez en modo admin:

1. Inicia sesion con tu correo y contrasena de Supabase
2. Sube trabajos con titulo, categoria, descripcion e imagen (drag & drop soportado)
3. Elimina trabajos con el boton `x` que aparece en cada card al hacer hover
4. Genera QR de la URL publica para imprimir o compartir
5. Cierra sesion cuando termines

---

## Seguridad implementada

- **CSP (Content Security Policy)**: bloquea scripts externos no autorizados
- **XSS protection**: los datos de Supabase se insertan con `textContent`, nunca con `innerHTML`
- **Validacion MIME**: solo se aceptan JPG, PNG y WEBP (max 8MB)
- **RLS en Supabase**: lectura publica, escritura solo autenticada
- **Rollback en upload**: si el insert a la tabla falla, se borra la imagen subida a Storage
- **Transaccion en delete**: se borra el archivo de Storage antes que la fila de la DB
- **Headers de seguridad**: X-Content-Type-Options, Referrer-Policy, frame-ancestors none
- **Session storage**: el modo admin se mantiene en sessionStorage, no en URL compartible
- **Confirm modal**: reemplaza `confirm()` nativo con un modal accesible

---

## Deploy en GitHub Pages

1. Crea un repositorio en GitHub (ej: `mrglass-galeria`)
2. Sube todos los archivos del proyecto:

```bash
git init
git add .
git commit -m "Galeria MrGlass lista para produccion"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mrglass-galeria.git
git push -u origin main
```

3. En GitHub ve a **Settings > Pages**
4. Source: **Deploy from a branch**
5. Branch: `main` / folder: `/ (root)`
6. Save

En 1-2 minutos tu sitio estara en:
```
https://TU_USUARIO.github.io/mrglass-galeria/
```

> El archivo `.nojekyll` evita que GitHub Pages procese los archivos con Jekyll,
> lo que podria romper nombres de archivos con guion bajo.

### URL publica para QR

Una vez deployado, copia la URL `https://TU_USUARIO.github.io/mrglass-galeria/`
y usala en el panel de QR del modo admin. **No uses localhost ni 127.0.0.1** porque
esos QR solo funcionarian en tu computador.

---

## Dominio personalizado (opcional)

Si quieres usar `mrglass.cl` o similar:

1. Compra el dominio en NIC Chile o un registrar
2. En GitHub: **Settings > Pages > Custom domain**
3. Configura los DNS de tu dominio con los registros CNAME que GitHub te indique
4. Espera 24-48 horas para propagacion

---

## Datos del negocio configurados

- **Nombre**: MrGlass - Vidrieria y aluminio a medida
- **Direccion**: Los Copihues 786, Chillan
- **WhatsApp**: +569 8634 1138
- **Email**: alberto.dacruz.r@outlook.com
- **Horario**:
  - Lunes a viernes: 9:00 - 17:30 hrs (de corrido)
  - Sabado: 9:00 - 13:00 hrs
  - Domingo: cerrado

Para cambiar cualquiera de estos datos, edita:
- `index.html`: secciones hero, contacto y footer
- `script.js`: constante `WHATSAPP_NUMBER`

---

## Desarrollo local

No requiere build. Abre `index.html` en tu navegador.

Para desarrollo con hot reload, puedes usar cualquier servidor estatico:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Luego abre http://localhost:8000

---

## Roadmap (mejoras futuras sugeridas)

- [ ] Antes/después slider en cada trabajo
- [ ] Estadisticas de visitas por foto
- [ ] Edicion inline de trabajos (sin borrar + re-subir)
- [ ] Reordenar por arrastre
- [ ] Subida multiple (varias fotos por trabajo)
- [ ] Dark mode toggle
- [ ] Testimonios de clientes
- [ ] Sitemap.xml dinamico
- [ ] Schema.org JSON-LD para LocalBusiness (SEO)

---

## Soporte

Si encuentras problemas, revisa la consola del navegador (F12) para ver errores especificos.
Los errores comunes estan documentados en el codigo con mensajes en español amigables.
