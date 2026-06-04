# Óptica AR Vision - Aplicación para GitHub Pages + Supabase

Aplicación web estática para una óptica con:

- Landing page comercial.
- Catálogo de lentes.
- Probador virtual con cámara y realidad aumentada.
- Detección facial con MediaPipe FaceMesh.
- Panel administrador para subir lentes JPG/PNG.
- Guardado permanente en Supabase Database + Supabase Storage.
- Configuración lista para subir a GitHub Pages usando `index.html` en la raíz.

---

## 1. Cómo probar en local

No necesitas instalar Node ni Vite.

Opción simple:

1. Descomprime el ZIP.
2. Abre `index.html` en el navegador.
3. Para usar cámara, es mejor abrirlo con un servidor local.

Servidor local recomendado:

```bash
python -m http.server 5500
```

Luego abre:

```text
http://localhost:5500
```

---

## 2. Cómo subir a GitHub Pages

1. Crea un repositorio en GitHub. Ejemplo:

```text
optica-ar-vision
```

2. Sube todos estos archivos a la raíz del repositorio:

```text
index.html
css/
js/
assets/
supabase/
.nojekyll
README.md
```

3. En GitHub entra a:

```text
Settings → Pages
```

4. En `Build and deployment` selecciona:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

5. Guarda los cambios.

6. GitHub generará un link similar a:

```text
https://TU-USUARIO.github.io/optica-ar-vision/
```

Ese link lo puedes mostrar al cliente.

---

## 3. Configurar Supabase para guardar lentes

### Paso 1: Crear proyecto

Entra a Supabase y crea un nuevo proyecto.

### Paso 2: Ejecutar SQL

Abre:

```text
supabase/schema.sql
```

Copia todo el contenido y ejecútalo en:

```text
Supabase → SQL Editor → New query → Run
```

Esto crea:

- Tabla `glasses`.
- Bucket `glasses-designs`.
- Policies demo para leer, subir, editar y eliminar.

### Paso 3: Copiar claves

En Supabase entra a:

```text
Project Settings → API
```

Copia:

```text
Project URL
anon public key
```

### Paso 4: Pegar claves en el proyecto

Abre:

```text
js/config.js
```

Y completa:

```js
window.OPTICA_AR_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "TU_ANON_KEY",
  SUPABASE_BUCKET: "glasses-designs",
  ADMIN_PASSCODE: "admin123",
  USE_SUPABASE: true
};
```

Sube nuevamente el archivo `js/config.js` a GitHub.

---

## 4. Acceso administrador

En la web entra a:

```text
Admin
```

Código demo:

```text
admin123
```

Puedes cambiarlo en:

```text
js/config.js
```

```js
ADMIN_PASSCODE: "nuevoCodigoSeguro"
```

Importante: este passcode es solo para demo comercial frontend. Para producción real se recomienda Supabase Auth con usuarios administradores.

---

## 5. Cómo usar el panel administrador

1. Ingresa al menú `Admin`.
2. Escribe el código administrador.
3. Sube una imagen JPG, JPEG o PNG.
4. Ingresa nombre y categoría.
5. Presiona `Guardar diseño`.
6. El archivo se guardará en Supabase Storage.
7. El registro se guardará en la tabla `glasses`.
8. El diseño aparecerá en el catálogo y en el probador AR.

Recomendación:

- Mejor resultado: PNG transparente.
- También acepta JPG con fondo blanco; el sistema intentará transformar el fondo blanco en transparencia usando Canvas.

---

## 6. Cómo usar el probador AR

1. Entra a `Catálogo`.
2. Presiona `Probar` en un lente.
3. Entra a `Probador AR`.
4. Presiona `Activar cámara`.
5. Permite acceso a la cámara.
6. Mueve tu rostro frente a la cámara.
7. Ajusta tamaño, altura, posición, rotación y opacidad.
8. Presiona `Capturar foto` para descargar una imagen.

La cámara se usa en el navegador. No se guarda video automáticamente.

---

## 7. Estructura del proyecto

```text
optica-ar-vision-github/
├─ index.html
├─ css/
│  └─ styles.css
├─ js/
│  ├─ config.js
│  └─ app.js
├─ assets/
│  └─ favicon.svg
├─ supabase/
│  └─ schema.sql
├─ .nojekyll
└─ README.md
```

---

## 8. Notas importantes

- GitHub Pages es hosting estático. No ejecuta backend propio.
- Supabase funciona como backend externo para guardar datos e imágenes.
- La `anon key` de Supabase se puede usar en frontend; la seguridad se controla con RLS.
- Las policies incluidas son de demo para facilitar la presentación al cliente.
- Para venderlo como sistema real, agrega login con Supabase Auth y restringe permisos de administrador.

---

## 9. Personalización rápida

Puedes cambiar textos, colores y nombre de marca en:

```text
index.html
css/styles.css
```

Puedes cambiar conexión y código admin en:

```text
js/config.js
```

---

## 10. Solución de problemas

### No se abre la cámara

- Usa HTTPS. GitHub Pages ya usa HTTPS.
- En local, usa `localhost` con servidor local.
- Revisa permisos del navegador.

### No se guardan los lentes

- Revisa `js/config.js`.
- Verifica que ejecutaste `supabase/schema.sql`.
- Revisa que el bucket se llame `glasses-designs`.
- Revisa las policies de Supabase.

### Se ve demo y no mis lentes

- Faltan credenciales Supabase o están incorrectas.
- Revisa consola del navegador con F12.

