# Guía de Uso de Guards de Autorización

Este documento explica las diferencias críticas entre `InstanceGuard` y `GlobalGuard`,
y cómo la elección del guard afecta el comportamiento de los permisos.

---

## Resumen Ejecutivo

| Guard           | Uso Principal                                            | Evalúa Condiciones ABAC |
| --------------- | -------------------------------------------------------- | ----------------------- |
| `InstanceGuard` | Endpoints que operan sobre un recurso específico (`:id`) | ✅ Sí                   |
| `GlobalGuard`   | Endpoints sin recurso específico (crear, listar)         | ❌ No                   |

> [!CAUTION]
> **Elegir el guard incorrecto puede crear vulnerabilidades de seguridad.**
> Un permiso con condiciones solo se evalúa correctamente con `InstanceGuard`.

---

## El Problema: Un Permiso, Dos Comportamientos

Dado el siguiente permiso en la base de datos:

```sql
INSERT INTO "Permission" (action, subject, conditions)
VALUES ('update', 'User', '{"id": "{{id}}"}');
```

Este permiso tiene la condición `{"id": "{{id}}"}`, que se interpola al ID del usuario
autenticado. **El comportamiento cambia según el guard utilizado:**

### Con `InstanceGuard` (Comportamiento Correcto para Ownership)

```typescript
@Patch(':id')
@UseGuards(InstanceGuard)
@CheckInstance({ action: ActionEnum.update, subject: 'User' })
update(@Param('id') id: number, @Body() dto: UpdateUserDto) {
  return this.userService.update(id, dto);
}
```

**Flujo de evaluación:**

1. Se carga el recurso `User` con `id = 10` desde la BD
2. Se construye la condición: `{ id: 5 }` (ID del usuario autenticado)
3. CASL compara: `¿{ id: 10 } coincide con { id: 5 }?`
4. **Resultado: DENEGADO** (solo puede editar su propio perfil)

### Con `GlobalGuard` (Sin Verificación de Ownership)

```typescript
@Patch(':id')
@UseGuards(GlobalGuard)
@CheckGlobal((ability) => ability.can(ActionEnum.update, 'User'))
update(@Param('id') id: number, @Body() dto: UpdateUserDto) {
  return this.userService.update(id, dto);
}
```

**Flujo de evaluación:**

1. NO se carga ningún recurso de la BD
2. CASL evalúa: `¿Existe alguna regla que permita 'update' sobre 'User'?`
3. **Resultado: PERMITIDO** (la condición no se evalúa porque no hay instancia)

---

## Cuándo Usar Cada Guard

### `InstanceGuard` + `@CheckInstance`

Úsalo cuando el endpoint opera sobre **un recurso específico identificado por ID**
y necesitas verificar ownership u otras condiciones basadas en atributos.

**Ejemplos:**

- `PATCH /users/:id` - Editar un usuario específico
- `DELETE /posts/:id` - Eliminar un post específico
- `GET /orders/:id` - Ver detalles de una orden (si hay restricciones)

```typescript
@Patch(':id')
@UseGuards(InstanceGuard)
@CheckInstance({ action: ActionEnum.update, subject: 'User' })
update(@Param('id') id: number) { ... }
```

### `GlobalGuard` + `@CheckGlobal`

Úsalo cuando el endpoint **no opera sobre una instancia específica** o cuando
la verificación de permisos no depende de atributos del recurso.

**Ejemplos:**

- `POST /posts` - Crear un nuevo post
- `GET /users` - Listar todos los usuarios
- `GET /admin/dashboard` - Acceder al panel de administración

```typescript
@Post()
@UseGuards(GlobalGuard)
@CheckGlobal((ability) => ability.can(ActionEnum.create, 'Post'))
create(@Body() dto: CreatePostDto) { ... }
```

---

## Diagrama de Decisión

```
¿El endpoint tiene :id en la ruta?
         │
    ┌────┴────┐
    │         │
   SÍ        NO
    │         │
    ▼         ▼
¿Necesitas verificar     GlobalGuard
ownership o condiciones   (sin instancia)
basadas en atributos?
    │
    ▼
   SÍ ──────► InstanceGuard
    │
   NO ──────► GlobalGuard (pero considera si realmente necesitas el :id)
```

---

## Anti-Patrones a Evitar

### ❌ Usar GlobalGuard para endpoints con ownership

```typescript
// ⚠️ PELIGROSO: Cualquier usuario puede editar cualquier perfil
@Patch(':id')
@UseGuards(GlobalGuard)
@CheckGlobal((ability) => ability.can(ActionEnum.update, 'User'))
update(@Param('id') id: number) { ... }
```

### ❌ Usar InstanceGuard sin :id en la ruta

```typescript
// ⚠️ ERROR: InstanceGuard espera un parámetro :id
@Post()
@UseGuards(InstanceGuard)
@CheckInstance({ action: ActionEnum.create, subject: 'Post' })
create() { ... }  // Fallará: no hay resourceId
```

---

## Ventaja del Diseño Actual

Con este diseño, **un solo permiso puede servir para múltiples casos de uso**,
dependiendo del guard elegido:

| Permiso                              | Guard Usado     | Comportamiento              |
| ------------------------------------ | --------------- | --------------------------- |
| `update:User` con `{"id": "{{id}}"}` | `InstanceGuard` | Solo edita su propio perfil |
| `update:User` con `{"id": "{{id}}"}` | `GlobalGuard`   | Edita cualquier perfil      |

Esto **reduce la necesidad de crear permisos duplicados** como:

- `update:User:self`
- `update:User:any`

La responsabilidad recae en el desarrollador al elegir el guard correcto.

---

## Lógica de Condiciones: AND vs OR

CASL tiene reglas específicas sobre cómo evalúa múltiples condiciones.
Entender esto es crucial para diseñar permisos correctamente.

### Múltiples Campos en UN Permiso = AND

Si defines un permiso con múltiples campos en `conditions`:

```json
{
  "authorId": "{{id}}",
  "isPublished": true
}
```

CASL evalúa como **AND** (deben cumplirse TODAS):

```
¿authorId == userId? AND ¿isPublished == true?
```

**Ejemplo:**

```sql
INSERT INTO Permission (action, subject, conditions)
VALUES ('update', 'Post', '{"authorId": "{{id}}", "isPublished": true}');
```

| Post | authorId | isPublished | Usuario 5 puede editar?   |
| ---- | -------- | ----------- | ------------------------- |
| A    | 5        | true        | ✅ Sí (ambas cumplen)     |
| B    | 5        | false       | ❌ No (no está publicado) |
| C    | 3        | true        | ❌ No (no es autor)       |

### Múltiples Permisos con Misma Acción/Subject = OR

Si un usuario tiene **múltiples permisos** para la misma acción/subject
(por tener varios roles o grants directos):

```sql
-- Permiso A: Solo posts propios
(1, 'update', 'Post', '{"authorId": "{{id}}"}')

-- Permiso B: Cualquier post publicado
(2, 'update', 'Post', '{"isPublished": true}')
```

CASL evalúa como **OR** (basta con que cumpla UNA):

```
¿authorId == userId? OR ¿isPublished == true?
```

**Resultado:** El usuario puede editar sus propios posts (aunque no estén publicados)
O cualquier post publicado (aunque no sea el autor).

### Tabla Resumen de Comportamiento

| Escenario                                           | Lógica            | Ejemplo                                                         |
| --------------------------------------------------- | ----------------- | --------------------------------------------------------------- |
| Múltiples campos en `conditions` de UN permiso      | AND               | `{"authorId": "{{id}}", "status": "draft"}`                     |
| UN usuario con MÚLTIPLES permisos para misma acción | OR                | Rol A da `update:Post` propio, Rol B da `update:Post` publicado |
| Permiso con condiciones + Guard diferente           | Depende del guard | Ver sección anterior                                            |

### Implicación para el Diseño de Permisos

Esta lógica permite diseños flexibles:

```
┌─────────────────────────────────────────────────────────────────┐
│ Rol: AUTHOR                                                     │
│   └── Permiso: update:Post + {"authorId": "{{id}}"}             │
│       Puede editar SOLO sus posts                               │
├─────────────────────────────────────────────────────────────────┤
│ Rol: EDITOR                                                     │
│   └── Permiso: update:Post + {"isPublished": true}              │
│       Puede editar CUALQUIER post publicado                     │
├─────────────────────────────────────────────────────────────────┤
│ Rol: SENIOR_EDITOR (tiene ambos permisos)                       │
│   ├── Permiso: update:Post + {"authorId": "{{id}}"}             │
│   └── Permiso: update:Post + {"isPublished": true}              │
│       Puede editar sus posts (publicados o no)                  │
│       O cualquier post publicado (sea o no el autor)            │
└─────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> Por esta razón, el modelo `Permission` **NO tiene** constraint
> `@@unique([action, subject])`. Esto permite crear múltiples permisos
> con la misma acción/subject pero diferentes condiciones para lograr
> comportamiento OR cuando se asignan a un mismo usuario.
