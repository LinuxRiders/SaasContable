# Spec 002 — Gestión jerárquica de roles y permisos

**Estado:** Completada  
**Dependencia:** Spec 001 y `specs/empresas/`

## 1. Objetivo

Representar roles y permisos en dos ámbitos: estudio y empresa. El estudio define plantillas reutilizables; cada empresa puede heredar, copiar o crear roles locales sin superar el límite delegado.

## 2. Modelo

- El estudio es el tenant principal.
- La empresa es un ámbito operativo dentro del estudio.
- Un rol de estudio gobierna acciones globales.
- Una asignación de empresa contiene un rol de empresa.
- La autorización efectiva requiere membresía, empresa asignada, rol y política obligatoria.

## 3. Herencia

Un rol de empresa tiene uno de estos orígenes:

- `INHERITED`: referencia una plantilla del estudio y recibe sus cambios.
- `COPIED`: copia editable, desligada de futuros cambios.
- `LOCAL`: existe solamente en una empresa.

Los roles copiados/locales solo pueden usar permisos delegables de empresa. Ningún rol puede desactivar segregación Maker–Checker, aislamiento o bloqueo de periodos cerrados.

## 4. Requisitos

- Crear y editar roles de estudio.
- Mostrar la cantidad de asignaciones que utiliza cada rol.
- Ver plantillas heredadas dentro de cada empresa.
- Copiar una plantilla como rol local.
- Crear y editar roles locales.
- Mostrar el origen de cada rol.
- Mostrar una matriz usuario × empresa con rol y alcance.
- Impedir editar una plantilla heredada desde el ámbito empresa.
- No exponer borrado destructivo de roles en este MVP.

## 5. Criterios de aceptación

- Los roles heredados aparecen automáticamente en todas las empresas.
- Copiar un rol no modifica su plantilla de origen.
- Un rol local no puede obtener permisos globales del estudio.
- La matriz coincide con el directorio y las asignaciones.
- El contexto empresa no permite editar roles de otra empresa.
