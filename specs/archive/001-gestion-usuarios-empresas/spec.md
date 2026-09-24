# Spec 001 — Adaptación de gestión de usuarios y empresas al flujo actual

**Estado:** Completada  
**Dependencia:** `specs/empresas/`  
**Alcance:** MVP frontend, sin backend

## 1. Problema

El nuevo pull ya implementa Login → Panel del estudio → Empresa activa. La entrega anterior de usuarios y empresas creó un segundo modelo de estudio, cartera y empresas que duplica ese flujo. Se debe adaptar lo útil de esa entrega a la navegación oficial y retirar lo redundante.

## 2. Objetivo

Completar la gestión de usuarios sobre las empresas oficiales del `AccountingContext`, manteniendo una sola sesión, una sola cartera y dos ámbitos claros:

- **Estudio:** usuarios internos, invitaciones, roles globales y asignación de empresas.
- **Empresa activa:** usuarios asignados, roles de empresa y permisos efectivos.

## 3. Fuera de alcance

- Rehacer login, registro inicial o creación del estudio.
- Crear otra cartera o lista paralela de empresas.
- Backend, correo, IAM o 2FA reales.
- Router, TypeScript, Material UI u otro UI kit.
- Refactor de módulos contables ajenos.

## 4. Requisitos

### RF-001 — Integración con el flujo existente

El login actual continúa abriendo el Panel del estudio. `empresaActiva === null` representa el ámbito estudio y una empresa activa representa el ámbito empresa. Salir de empresa no cierra sesión.

### RF-002 — Directorio del estudio

El panel global permite listar, buscar e invitar usuarios, mostrar su rol global, estado y empresas asignadas. Una invitación inicia en `PENDIENTE`; no crea un usuario operativo automáticamente.

### RF-003 — Asignaciones

Un usuario puede tener acceso a cero, una o varias empresas, con un rol distinto en cada una. Tener membresía del estudio no concede acceso automático a toda la cartera, salvo un rol global con alcance total explícito.

### RF-004 — Cartera filtrada

Los usuarios sin alcance total ven únicamente las empresas asignadas. El administrador del estudio puede ver toda la cartera.

### RF-005 — Administración dentro de empresa

Al ingresar a una empresa aparecen opciones para consultar usuarios y roles de esa empresa. Las acciones se limitan al ámbito activo.

### RF-006 — Baja parcial

Revocar una asignación elimina únicamente el acceso a esa empresa. Suspender la membresía del estudio bloquea todos los accesos del estudio, conservando historial.

## 5. Criterios de aceptación

- Login y alta de empresa existentes siguen funcionando.
- No se muestra el antiguo asistente de creación de estudio/titular.
- No existe una segunda cartera en el módulo de accesos.
- Admin ve todas las empresas; el usuario Maker de prueba ve solo sus empresas asignadas.
- El estudio puede invitar una persona y asignarle empresas.
- Dentro de una empresa se muestran solo sus usuarios asignados.
- La interfaz compila sin Material UI.
- `npm run build` finaliza correctamente.
