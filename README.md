# Barbers API 🔪

API REST para la aplicación Barbers App, construida con Node.js + Express + MySQL.

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita el archivo .env con tus datos de MySQL

# 3. Iniciar en desarrollo
npm run dev

# 4. Iniciar en producción
npm start
```

## Endpoints

### 🔐 Autenticación (`/api/auth`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/check-email` | Verificar si correo existe |

### 👤 Usuarios (`/api/usuarios`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/usuarios/perfil` | ✅ | Ver mi perfil |
| PUT | `/api/usuarios/perfil` | ✅ | Actualizar perfil |
| GET | `/api/usuarios/barberos` | ❌ | Listar barberos |

### 📅 Citas (`/api/citas`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/citas` | ✅ | Mis citas |
| POST | `/api/citas` | ✅ | Crear cita |
| PUT | `/api/citas/:id/status` | ✅ | Cambiar status |
| PUT | `/api/citas/:id/reagendar` | ✅ | Reagendar |

### 🛍️ Productos (`/api/productos`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/productos` | ❌ | Listar productos |
| POST | `/api/productos` | ✅ | Crear producto |
| PUT | `/api/productos/:id` | ✅ | Editar producto |
| DELETE | `/api/productos/:id` | ✅ | Eliminar producto |
| POST | `/api/productos/orden` | ✅ | Procesar compra |

### ✂️ Servicios (`/api/servicios`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/servicios/:barbero_id` | ❌ | Ver servicios de barbero |
| POST | `/api/servicios` | ✅ | Crear servicio |
| PUT | `/api/servicios/:id` | ✅ | Editar servicio |
| DELETE | `/api/servicios/:id` | ✅ | Eliminar servicio |

### ⭐ Extras
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/calificaciones` | ✅ | Calificar servicio |
| GET | `/api/favoritos` | ✅ | Mis favoritos |
| POST | `/api/favoritos` | ✅ | Agregar favorito |
| DELETE | `/api/favoritos/:barbero_id` | ✅ | Eliminar favorito |

## Uso del token

Después de login/register recibes un `token`. Úsalo así en cada request protegido:

```
Authorization: Bearer <tu_token_aqui>
```

## Ejemplo de registro

```json
POST /api/auth/register
{
  "nombre": "Carlos",
  "apellido": "García",
  "correo": "carlos@email.com",
  "password": "MiPass123!",
  "rol": "cliente"
}
```

## Ejemplo de login

```json
POST /api/auth/login
{
  "correo": "carlos@email.com",
  "password": "MiPass123!"
}
```
