# Portal Institucional - TODO

## Descripción
Sistema institucional con múltiples roles (estudiante, profesor, administrativo) que gestiona asistencia, horarios, evaluaciones, comunicación y un chatbot académico.

---

# ROADMAP GENERAL

## Fase 1: Base del sistema
- [x] Configurar entorno (Python, FastAPI, PostgreSQL)
- [x] Estructura modular del proyecto
- [x] Configurar Docker
- [x] Configurar Alembic

---

## Fase 2: Backend Core

### Autenticación
- [x] Implementar login (JWT)
- [x] Middleware de roles
- [x] Protección de rutas

### Usuarios
- [x] CRUD usuarios
- [x] Sistema de roles

### Cursos y Secciones
- [x] Crear cursos
- [x] Crear secciones
- [x] Inscribir estudiantes
- [x] Asignar profesores

---

## Fase 3: Núcleo Académico

### Horarios
- [x] CRUD horarios
- [ ] Lógica de clase actual

### Asistencia
- [ ] Registro de asistencia
- [ ] Cálculo de tardías
- [ ] Reportes mensuales

### Grupos
- [ ] Crear grupos
- [ ] Asignar estudiantes

---

## Fase 4: Funcionalidades Avanzadas

### Evaluaciones
- [ ] Crear quizzes/prácticas
- [ ] Guardar respuestas
- [ ] Relación con cursos

### Circulares
- [ ] Crear anuncios
- [ ] Filtrar por roles
- [ ] Visualización

---

## Fase 5: Frontend

### Base
- [ ] Configurar Next.js
- [ ] Layout general

### Autenticación
- [ ] UI login
- [ ] Manejo de sesión

### Dashboard Estudiante
- [ ] Ver horario
- [ ] Ver clase actual
- [ ] Ver noticias
- [ ] Ver grupos

### Dashboard Profesor
- [ ] Tomar asistencia
- [ ] Crear grupos
- [ ] Crear evaluaciones

### Dashboard Administrativo
- [ ] Subir circulares
- [ ] Ver reportes
- [ ] Ver tardías

---

## Fase 6: ChatBot (IA)

### Base
- [ ] Crear microservicio FastAPI
- [ ] Endpoint `/chat`

### IA
- [ ] Integración con LLM
- [ ] Manejo de prompts

### Contexto
- [ ] Integrar cursos
- [ ] Integrar evaluaciones
- [ ] Integrar historial

### Funcionalidad
- [ ] Responder preguntas
- [ ] Generar quizzes
- [ ] Explicar contenido

### Optimización
- [ ] Cache con Redis
- [ ] Reducción de tokens

---

## Fase 7: Integración

- [ ] Conectar frontend con backend
- [ ] Conectar backend con chatbot
- [ ] Validar flujos completos

---

## Fase 8: Testing

- [ ] Pruebas de autenticación
- [ ] Pruebas por roles
- [ ] Validación de asistencia
- [ ] Validación de horarios
- [ ] Testing chatbot

---

## Fase 9: Deploy

- [ ] Docker Compose completo
- [ ] Configurar servidor (VPS o cloud)
- [ ] Configurar CI/CD
- [ ] Deploy final

---

# PRIORIDADES

## Alta
- Auth
- Usuarios
- Cursos
- Asistencia

## Media
- Evaluaciones
- Grupos
- Circulares

## Baja (pero crítica en valor)
- ChatBot

---

# ENTREGABLES

## Versión 1 (MVP)
- Backend completo
- Frontend funcional
- Sin chatbot

## Versión 2
- ChatBot integrado
- Sistema completo

---

# NOTAS

- No mezclar lógica en routers
- Mantener separación modular estricta
- No integrar chatbot hasta tener backend estable
- Priorizar funcionalidad sobre perfección visual



# Pendientes:
reparar el loader de apploader (se ve mal)
añadir becas + formulario de aplicante para becas
añadir avisos personales
(usuario)
comenzar con profesor +++