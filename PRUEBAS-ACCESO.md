# Pruebas del acceso único a Órbita
| # | Caso | Esperado |
|---|------|----------|
| 1 | Registro con nombre@gmail.com | Rechazado: "solo cuentas profesionales" (app y BD) |
| 2 | Registro con cfo@empresa.es | Alta como CLIENTE → entorno /clientes (su gestión de proyecto) |
| 3 | Login ana@tuconsultor.com | Entorno interno /consultores, menú según su rol |
| 4 | Registro con ana@tuconsultor.com | Bloqueado en app: "las cuentas de equipo entran sin registro" (si se crea vía panel, nace como consultor) |
| 5 | Consultor asignado a cliente X | Puede editar la cuenta del cliente X (admin de cuenta) |
| 6 | Consultor NO asignado a cliente Y | Ve según su rol; no administra la cuenta Y |
| 7 | alejandro@tuconsultor.com | Superadmin: entra a todo + barra "Ver como" |
