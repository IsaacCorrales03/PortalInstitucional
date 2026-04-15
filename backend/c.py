"""
seed.py
=======
Inicialización completa de la base de datos para el CTP Pavas.

Crea:
  - Roles y permisos
  - Especialidades
  - Materias (cursos)
  - Lesson slots
  - Aulas
  - Planes académicos y técnicos
  - Profesores con disponibilidad total y materias asignadas
  - Usuario superadmin
  - Sección 10-1 con planes, especialidades y asignación de profesores por materia
"""

import secrets
import string
from datetime import time
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    ProfessorAvailabilitySlot, ProfessorCourse, ProfessorProfile,
    User, Role, Permission, UserRole, RolePermission, Specialty,
    Course, StudyPlan, StudyPlanCourse, Classroom, LessonSlot,
    Section, SectionSpecialty, SectionStudyPlan, SectionCourse,
)
from app.core.security import hash_password


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTES
# ══════════════════════════════════════════════════════════════════════════════

TECHNICAL_COURSES = {
    "Tecnologías de Información, Comunicación y Servicios",
    "Administración y Soporte a Computadoras",
    "Programación",
    "Inglés Técnico",
    "Emprendimiento",
    "Configuración y Soporte a Redes",
    "Tecnologías de la Información",
    "Gestión Contable",
    "Gestión de Tecnologías Digitales Contables",
    "Educación Física",
}

# ══════════════════════════════════════════════════════════════════════════════
# PLANES TÉCNICOS
# ══════════════════════════════════════════════════════════════════════════════

CONFIG_PLANS = [
    {
        "name": "Config y Soporte 1",
        "year": 1,
        "courses": [
            ("Tecnologías de Información, Comunicación y Servicios", 6),
            ("Administración y Soporte a Computadoras", 12),
            ("Programación", 12),
            ("Inglés Técnico", 6),
            ("Educación Física", 2),
        ],
    },
    {
        "name": "Config y Soporte 2",
        "year": 2,
        "courses": [
            ("Emprendimiento", 3),
            ("Administración y Soporte a Computadoras", 4),
            ("Configuración y Soporte a Redes", 5),
            ("Inglés Técnico", 3),
            ("Educación Física", 2),
        ],
    },
    {
        "name": "Config y Soporte 3",
        "year": 3,
        "courses": [
            ("Inglés Técnico",                          3),
            ("Tecnologías de la Información",           4),
            ("Configuración y Soporte a Redes",         5),
            ("Administración y Soporte a Computadoras", 4),
        ],
    },
]

ACCOUNTING_PLANS = [
    {
        "name": "Contabilidad 1",
        "year": 1,
        "courses": [
            ("Gestión Contable",                           18),
            ("Inglés Técnico",                              6),
            ("Educación Física",                            2),
            ("Gestión de Tecnologías Digitales Contables", 12),
        ],
    },
]

# ══════════════════════════════════════════════════════════════════════════════
# ASIGNACIÓN DE PROFESORES POR MATERIA EN LA SECCIÓN 10-1
# ══════════════════════════════════════════════════════════════════════════════

SECTION_COURSE_ASSIGNMENTS = [
    # ── Académicas (compartidas A y B) ────────────────────────────────────
    ("Español",           "Martha",     None),
    ("Matemáticas",       "Diego",      None),
    ("Física Matemática", "Gaby",       None),
    ("Estudios Sociales", "Yendry",     None),
    ("Educación Cívica",  "Yendry",     None),
    ("Inglés Académico",  "Natalia",    None),
    ("Educación Musical", "Alberto",    None),
    ("Guía",              "Martha",     None),
    ("Ética",             "Josefa",     None),

    # ── Técnicas parte A (Config y Soporte) ───────────────────────────────
    ("Tecnologías de Información, Comunicación y Servicios", "Carlos M.", "A"),
    ("Administración y Soporte a Computadoras",              "Carlos M.", "A"),
    ("Programación",                                         "Keneth C.", "A"),
    ("Inglés Técnico",                                       "Lizeth O.", "A"),
    ("Educación Física",                                     "Magaly",    "A"),

    # ── Técnicas parte B (Contabilidad) ───────────────────────────────────
    ("Gestión Contable",                           "Gerardo S.", "B"),
    ("Inglés Técnico",                             "Henry F.",   "B"),
    ("Educación Física",                           "Magaly",     "B"),
    ("Gestión de Tecnologías Digitales Contables", "Gerardo S.", "B"),
]


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def generate_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def write_passwords_file(credentials: list[dict]):
    """
    credentials: lista de dicts con keys: rol, nombre, correo, password
    """
    output_path = Path("passwords.txt")

    admins    = [c for c in credentials if c["rol"] == "superadmin"]
    professors = [c for c in credentials if c["rol"] == "profesor"]

    lines = []
    lines.append("╔══════════════════════════════════════════════════════════════════════════════╗")
    lines.append("║                    CREDENCIALES DEL SISTEMA – CTP PAVAS                      ║")
    lines.append("╠══════════════════════════════════════════════════════════════════════════════╣")
    lines.append("║     Archivo confidencial. No compartir. Cambiar contraseña tras primer       ║")
    lines.append("║     inicio de sesión.                                                        ║")
    lines.append("╚══════════════════════════════════════════════════════════════════════════════╝")
    lines.append("")

    # ── Superadmin ────────────────────────────────────────────────────────────
    lines.append("━" * 78)
    lines.append(" SUPERADMIN")
    lines.append("━" * 78)
    lines.append("")
    for c in admins:
        lines.append(f"  Nombre    : {c['nombre']}")
        lines.append(f"  Correo    : {c['correo']}")
        lines.append(f"  Contraseña: {c['password']}")
        lines.append("")

    # ── Profesores ────────────────────────────────────────────────────────────
    lines.append("━" * 78)
    lines.append(" PROFESORES")
    lines.append("━" * 78)
    lines.append("")
    lines.append(f"  {'Nombre':<18} {'Correo':<38} {'Contraseña'}")
    lines.append(f"  {'─'*18} {'─'*38} {'─'*16}")
    for c in professors:
        lines.append(f"  {c['nombre']:<18} {c['correo']:<38} {c['password']}")
    lines.append("")
    lines.append("━" * 78)

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n  📄 Contraseñas guardadas en: {output_path.resolve()}")


# ══════════════════════════════════════════════════════════════════════════════
# ROLES
# ══════════════════════════════════════════════════════════════════════════════

def create_roles(db: Session) -> dict:
    print("\n── Roles ───────────────────────────────────────────────")
    role_names = ["superadmin", "admin", "profesor", "estudiante"]
    created = {}

    for name in role_names:
        role = db.query(Role).filter(Role.name == name).first()
        if not role:
            role = Role(name=name, description=f"Rol {name}")
            db.add(role)
            db.commit()
            db.refresh(role)
            print(f"  Rol creado: {name}")
        else:
            print(f"  Rol ya existe: {name}")
        created[name] = role

    return created


# ══════════════════════════════════════════════════════════════════════════════
# PERMISOS
# ══════════════════════════════════════════════════════════════════════════════

def create_permissions(db: Session, super_role: Role):
    print("\n── Permisos ────────────────────────────────────────────")
    all_permissions = {
        "manage_users":         "Gestionar usuarios del sistema",
        "manage_courses":       "Gestionar cursos",
        "manage_sections":      "Gestionar secciones",
        "manage_enrollments":   "Gestionar inscripciones",
        "assign_professors":    "Asignar profesores a secciones",
        "manage_specialties":   "Gestionar especialidades",
        "manage_permissions":   "Gestionar permisos del sistema",
        "manage_events":        "Gestionar eventos institucionales",
        "schedule_meetings":    "Programar reuniones",
        "manage_scholarships":  "Gestionar becas",
        "set_professor_status": "Actualizar estado de docentes",
        "manage_admissions":    "Gestionar admisiones",
        "view_grade_reports":   "Ver boletines de calificaciones",
        "send_announcements":   "Enviar anuncios institucionales",
    }

    for code, description in all_permissions.items():
        perm = db.query(Permission).filter(Permission.code == code).first()
        if not perm:
            perm = Permission(code=code, description=description)
            db.add(perm)
            db.commit()
            db.refresh(perm)
            print(f"  Permiso creado: {code}")
        else:
            print(f"  Permiso ya existe: {code}")

        exists = db.query(RolePermission).filter(
            RolePermission.role_id       == super_role.id,
            RolePermission.permission_id == perm.id,
        ).first()
        if not exists:
            db.add(RolePermission(role_id=super_role.id, permission_id=perm.id))
            db.commit()
            print(f"    → asignado a superadmin")


# ══════════════════════════════════════════════════════════════════════════════
# ESPECIALIDADES
# ══════════════════════════════════════════════════════════════════════════════

def create_specialties(db: Session):
    print("\n── Especialidades ──────────────────────────────────────")
    specialties = [
        {
            "name": "Configuración y Soporte",
            "description": (
                "Forma técnicos capaces de instalar, configurar y mantener redes de comunicación y "
                "sistemas operativos, brindar soporte técnico, garantizar seguridad informática y "
                "resolver problemas en infraestructuras tecnológicas."
            ),
        },
        {
            "name": "Contabilidad",
            "description": (
                "Forma técnicos capaces de registrar, analizar e interpretar información financiera, "
                "elaborar estados contables, gestionar libros y documentos contables, y aplicar "
                "normas tributarias y de auditoría."
            ),
        },
        {
            "name": "Ejecutivo Comercial y servicio al cliente",
            "description": (
                "Forma profesionales capaces de planificar, gestionar y ejecutar estrategias de ventas, "
                "captar y mantener clientes, negociar contratos y promocionar productos o servicios."
            ),
        },
        {
            "name": "Electrónica Industrial",
            "description": (
                "Forma técnicos capaces de diseñar, instalar, mantener y reparar sistemas electrónicos "
                "industriales, incluyendo control de maquinaria, automatización y dispositivos electrónicos."
            ),
        },
        {
            "name": "Administración Logística y Distribución",
            "description": (
                "Forma profesionales capaces de planificar, organizar y supervisar procesos administrativos "
                "y logísticos, optimizar recursos, coordinar inventarios y gestionar cadenas de suministro."
            ),
        },
        {
            "name": "Secretariado Ejecutivo",
            "description": (
                "Forma profesionales capaces de gestionar la comunicación y organización administrativa "
                "de empresas, manejar documentación, coordinar agendas y apoyar en la toma de decisiones."
            ),
        },
        {
            "name": "Desarrollo Web",
            "description": (
                "Forma técnicos capaces de diseñar, programar y mantener sitios y aplicaciones web, "
                "integrando front-end, back-end y bases de datos, con enfoque en usabilidad, rendimiento "
                "y experiencia de usuario."
            ),
        },
    ]

    for spec in specialties:
        exists = db.query(Specialty).filter(Specialty.name == spec["name"]).first()
        if not exists:
            db.add(Specialty(name=spec["name"], description=spec["description"]))
            db.commit()
            print(f"  Especialidad creada: {spec['name']}")
        else:
            if exists.description != spec["description"]:
                exists.description = spec["description"]
                db.commit()
                print(f"  Especialidad actualizada: {spec['name']}")
            else:
                print(f"  Especialidad ya existe: {spec['name']}")


# ══════════════════════════════════════════════════════════════════════════════
# MATERIAS
# ══════════════════════════════════════════════════════════════════════════════

def create_courses(db: Session) -> dict:
    print("\n── Materias ────────────────────────────────────────────")

    course_list = [
        "Español", "Matemáticas", "Física Matemática", "Estudios Sociales",
        "Educación Cívica", "Inglés Académico", "Educación Musical",
        "Educación Física", "Guía", "Ética", "Biología", "Química", "Psicología",
        "Tecnologías de Información, Comunicación y Servicios",
        "Administración y Soporte a Computadoras",
        "Programación", "Inglés Técnico", "Emprendimiento",
        "Configuración y Soporte a Redes", "Tecnologías de la Información",
        "Gestión Contable", "Gestión de Tecnologías Digitales Contables",
    ]

    descriptions = {
        "Español":                                               "Comprensión lectora, redacción, ortografía y literatura.",
        "Matemáticas":                                           "Álgebra, geometría, funciones y resolución de problemas.",
        "Física Matemática":                                     "Aplicación de matemáticas en fenómenos físicos.",
        "Estudios Sociales":                                     "Historia, geografía y sociedad.",
        "Educación Cívica":                                      "Ciudadanía, derechos y deberes.",
        "Inglés Académico":                                      "Comprensión y producción en inglés formal.",
        "Educación Musical":                                     "Teoría musical y expresión artística.",
        "Educación Física":                                      "Actividad física, salud y deporte.",
        "Guía":                                                  "Acompañamiento académico y orientación estudiantil.",
        "Ética":                                                 "Valores, moral y toma de decisiones.",
        "Biología":                                              "Seres vivos y procesos biológicos.",
        "Química":                                               "Materia, reacciones y laboratorio.",
        "Psicología":                                            "Conducta humana y procesos mentales.",
        "Tecnologías de Información, Comunicación y Servicios":  "Fundamentos TIC y servicios digitales.",
        "Administración y Soporte a Computadoras":               "Mantenimiento y soporte técnico de equipos.",
        "Programación":                                          "Lógica, algoritmos y desarrollo de software.",
        "Inglés Técnico":                                        "Terminología técnica en inglés.",
        "Emprendimiento":                                        "Creación y gestión de proyectos.",
        "Configuración y Soporte a Redes":                       "Instalación y mantenimiento de redes.",
        "Tecnologías de la Información":                         "Sistemas informáticos y gestión tecnológica.",
        "Gestión Contable":                                      "Procesos contables y financieros.",
        "Gestión de Tecnologías Digitales Contables":            "Herramientas digitales aplicadas a contabilidad.",
    }

    specialty_course_map = {
        "Programación":                                         "Configuración y Soporte",
        "Administración y Soporte a Computadoras":              "Configuración y Soporte",
        "Configuración y Soporte a Redes":                      "Configuración y Soporte",
        "Tecnologías de la Información":                        "Configuración y Soporte",
        "Tecnologías de Información, Comunicación y Servicios": "Configuración y Soporte",
        "Gestión Contable":                                     "Contabilidad",
        "Gestión de Tecnologías Digitales Contables":           "Contabilidad",
    }

    specialties = {s.name: s.id for s in db.query(Specialty).all()}
    created = {}

    for name in course_list:
        course = db.query(Course).filter(Course.name == name).first()
        desc          = descriptions.get(name)
        spec_name     = specialty_course_map.get(name)
        specialty_id  = specialties.get(spec_name) if spec_name else None

        if not course:
            course = Course(
                name=name,
                is_technical=(name in TECHNICAL_COURSES),
                description=desc,
                specialty_id=specialty_id,
            )
            db.add(course)
            db.commit()
            db.refresh(course)
            print(f"  Materia creada: {name}")
        else:
            updated = False
            if desc and course.description != desc:
                course.description = desc
                updated = True
            if course.specialty_id != specialty_id:
                course.specialty_id = specialty_id
                updated = True
            if updated:
                db.commit()
                db.refresh(course)
                print(f"  Materia actualizada: {name}")
            else:
                print(f"  Materia ya existe: {name}")

        created[name] = course

    return created


# ══════════════════════════════════════════════════════════════════════════════
# LESSON SLOTS
# ══════════════════════════════════════════════════════════════════════════════

def create_lesson_slots(db: Session):
    print("\n── Lesson Slots ────────────────────────────────────────")
    schedule = [
        (1,  time(7, 0),   time(7, 40)),
        (2,  time(7, 40),  time(8, 20)),
        (3,  time(8, 20),  time(9, 0)),
        (4,  time(9, 0),   time(9, 40)),
        (5,  time(9, 40),  time(10, 20)),
        (6,  time(10, 20), time(11, 0)),
        (7,  time(11, 0),  time(11, 40)),
        (8,  time(11, 40), time(12, 20)),
        (9,  time(12, 20), time(13, 0)),
        (10, time(13, 0),  time(13, 40)),
        (11, time(13, 40), time(14, 20)),
        (12, time(14, 20), time(15, 0)),
    ]

    for number, start, end in schedule:
        exists = db.query(LessonSlot).filter(LessonSlot.number == number).first()
        if not exists:
            db.add(LessonSlot(number=number, start_time=start, end_time=end))
            print(f"  Slot L{number}: {start}–{end}")
        else:
            print(f"  Slot L{number}: ya existe")

    db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# AULAS
# ══════════════════════════════════════════════════════════════════════════════

def create_classrooms(db: Session):
    print("\n── Aulas ───────────────────────────────────────────────")
    bases = [
        {"prefix": "Aula Naranja",        "type": "naranja",     "capacity": 30},
        {"prefix": "Aula Verde",          "type": "verde",       "capacity": 30},
        {"prefix": "Laboratorio Naranja", "type": "lab_naranja", "capacity": 25},
        {"prefix": "Laboratorio Verde",   "type": "lab_verde",   "capacity": 25},
    ]

    for base in bases:
        for i in range(1, 7):
            name = f"{base['prefix']} {i}"
            if not db.query(Classroom).filter(Classroom.name == name).first():
                db.add(Classroom(
                    name=name,
                    type=base["type"],
                    capacity=base["capacity"],
                    is_active=True,
                ))
                print(f"  Aula creada: {name}")
            else:
                print(f"  Aula ya existe: {name}")

    for data in [
        {"name": "Gimnasio",      "type": "gimnasio", "capacity": 50},
        {"name": "Aula Especial", "type": "especial", "capacity": 20},
    ]:
        if not db.query(Classroom).filter(Classroom.name == data["name"]).first():
            db.add(Classroom(name=data["name"], type=data["type"],
                             capacity=data["capacity"], is_active=True))
            print(f"  Aula creada: {data['name']}")
        else:
            print(f"  Aula ya existe: {data['name']}")

    db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# PLANES ACADÉMICOS
# ══════════════════════════════════════════════════════════════════════════════

def create_academic_study_plans(db: Session, courses: dict):
    print("\n── Planes académicos ───────────────────────────────────")
    plans = [
        {
            "name": "Plan Académico 1",
            "year": 1,
            "courses": [
                ("Español",           3),
                ("Matemáticas",       3),
                ("Física Matemática", 6),
                ("Estudios Sociales", 2),
                ("Educación Cívica",  1),
                ("Inglés Académico",  4),
                ("Educación Musical", 1),
                ("Guía",              1),
                ("Ética",             1),
            ],
        },
        {
            "name": "Plan Académico 2",
            "year": 2,
            "courses": [
                ("Español",           4),
                ("Matemáticas",       5),
                ("Biología",          3),
                ("Química",           3),
                ("Psicología",        2),
                ("Estudios Sociales", 3),
                ("Educación Cívica",  2),
                ("Inglés Académico",  3),
                ("Educación Musical", 2),
                ("Guía",              1),
                ("Ética",             1),
            ],
        },
        {
            "name": "Plan Académico 3",
            "year": 3,
            "courses": [
                ("Biología",          3),
                ("Psicología",        2),
                ("Estudios Sociales", 3),
                ("Español",           4),
                ("Química",           3),
                ("Matemáticas",       5),
                ("Inglés Académico",  3),
                ("Educación Cívica",  2),
            ],
        },
    ]

    for plan_data in plans:
        plan = db.query(StudyPlan).filter(StudyPlan.name == plan_data["name"]).first()
        if not plan:
            plan = StudyPlan(
                name=plan_data["name"],
                year_level=plan_data["year"],
                specialty_id=None,
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)
            print(f"  Plan creado: {plan.name}")
        else:
            print(f"  Plan ya existe: {plan.name}")

        for course_name, weekly_lessons in plan_data["courses"]:
            course = courses[course_name]
            exists = db.query(StudyPlanCourse).filter(
                StudyPlanCourse.study_plan_id == plan.id,
                StudyPlanCourse.course_id     == course.id,
            ).first()
            if not exists:
                db.add(StudyPlanCourse(
                    study_plan_id=plan.id,
                    course_id=course.id,
                    weekly_lessons=weekly_lessons,
                ))
                db.commit()
                print(f"    + {course_name} ({weekly_lessons} lec/sem)")
            elif exists.weekly_lessons != weekly_lessons:
                exists.weekly_lessons = weekly_lessons
                db.commit()
                print(f"    ~ {course_name} actualizado a {weekly_lessons} lec/sem")
            else:
                print(f"    · {course_name} ya existe")


# ══════════════════════════════════════════════════════════════════════════════
# PLANES TÉCNICOS
# ══════════════════════════════════════════════════════════════════════════════

def create_specialty_plans(db: Session, courses: dict, specialty_name: str, plans: list):
    print(f"\n── Planes técnicos: {specialty_name} ──────────────────")
    specialty = db.query(Specialty).filter(Specialty.name == specialty_name).first()
    if not specialty:
        raise Exception(f"Especialidad no encontrada: {specialty_name}")

    for plan_data in plans:
        plan = db.query(StudyPlan).filter(StudyPlan.name == plan_data["name"]).first()
        if not plan:
            plan = StudyPlan(
                name=plan_data["name"],
                year_level=plan_data["year"],
                specialty_id=specialty.id,
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)
            print(f"  Plan creado: {plan.name}")
        else:
            print(f"  Plan ya existe: {plan.name}")

        for cname, weekly_lessons in plan_data["courses"]:
            course = courses.get(cname)
            if not course:
                print(f"    ⚠ Curso no encontrado: {cname}")
                continue

            exists = db.query(StudyPlanCourse).filter(
                StudyPlanCourse.study_plan_id == plan.id,
                StudyPlanCourse.course_id     == course.id,
            ).first()
            if not exists:
                db.add(StudyPlanCourse(
                    study_plan_id=plan.id,
                    course_id=course.id,
                    weekly_lessons=weekly_lessons,
                ))
                db.commit()
                print(f"    + {cname} ({weekly_lessons} lec/sem)")
            elif exists.weekly_lessons != weekly_lessons:
                exists.weekly_lessons = weekly_lessons
                db.commit()
                print(f"    ~ {cname} actualizado a {weekly_lessons} lec/sem")
            else:
                print(f"    · {cname} ya existe")


# ══════════════════════════════════════════════════════════════════════════════
# PROFESORES
# ══════════════════════════════════════════════════════════════════════════════

def create_professors(db: Session) -> list[dict]:
    """Retorna lista de credenciales generadas."""
    print("\n── Profesores ──────────────────────────────────────────")
    role = db.query(Role).filter(Role.name == "profesor").first()
    if not role:
        raise Exception("Rol 'profesor' no existe. Ejecuta create_roles() primero.")

    base_data = {
        "Martha":     ["Español"],
        "Marvin":     ["Español"],
        "Josefa":     ["Ética"],
        "Zugey":      ["Química"],
        "Elke":       ["Biología"],
        "Gaby":       ["Física Matemática"],
        "Diego":      ["Matemáticas"],
        "Raul":       ["Matemáticas"],
        "Natalia":    ["Inglés Académico"],
        "Thelma":     ["Inglés Académico"],
        "Alberto":    ["Educación Musical"],
        "Magaly":     ["Educación Física"],
        "Elizabet":   ["Educación Física"],
        "Yendry":     ["Educación Cívica", "Estudios Sociales"],
        "Alejandro":  ["Educación Cívica", "Estudios Sociales"],
        "Heidy":      ["Psicología"],
        "Carlos M.":  [
            "Tecnologías de Información, Comunicación y Servicios",
            "Administración y Soporte a Computadoras",
            "Programación", "Emprendimiento",
            "Configuración y Soporte a Redes",
            "Tecnologías de la Información",
        ],
        "Keneth C.":  [
            "Tecnologías de Información, Comunicación y Servicios",
            "Administración y Soporte a Computadoras",
            "Programación", "Emprendimiento",
            "Configuración y Soporte a Redes",
            "Tecnologías de la Información",
        ],
        "William M.": [
            "Tecnologías de Información, Comunicación y Servicios",
            "Administración y Soporte a Computadoras",
            "Programación", "Emprendimiento",
            "Configuración y Soporte a Redes",
            "Tecnologías de la Información",
        ],
        "Rebecca T.": [
            "Tecnologías de Información, Comunicación y Servicios",
            "Administración y Soporte a Computadoras",
            "Programación", "Emprendimiento",
            "Configuración y Soporte a Redes",
            "Tecnologías de la Información",
        ],
        "Lizeth O.":  ["Inglés Técnico"],
        "Henry F.":   ["Inglés Técnico"],
        "Gerardo S.": ["Gestión Contable", "Gestión de Tecnologías Digitales Contables"],
    }

    course_map    = {c.name: c for c in db.query(Course).all()}
    credentials   = []

    for name, course_names in base_data.items():
        email = f"{name.lower().replace(' ', '_').replace('.', '')}@portal.com"

        if db.query(User).filter(User.email == email).first():
            print(f"  Profesor ya existe: {name}")
            continue

        password = generate_password()
        user = User(
            email=email,
            full_name=name,
            national_id=str(secrets.randbelow(10**10)).zfill(10),
            password_hash=hash_password(password),
            is_active=True,
        )
        db.add(user)
        db.flush()

        db.add(UserRole(user_id=user.id, role_id=role.id))
        db.add(ProfessorProfile(user_id=user.id, current_status="disponible"))

        for day in range(5):
            for lesson in range(1, 13):
                db.add(ProfessorAvailabilitySlot(
                    professor_id=user.id,
                    day_of_week=day,
                    lesson_number=lesson,
                ))

        for cname in course_names:
            course = course_map.get(cname)
            if course:
                db.add(ProfessorCourse(professor_id=user.id, course_id=course.id))
            else:
                print(f"    ⚠ Curso no encontrado para {name}: {cname}")

        db.commit()
        credentials.append({"rol": "profesor", "nombre": name, "correo": email, "password": password})
        print(f"  Profesor creado: {name}")

    return credentials


# ══════════════════════════════════════════════════════════════════════════════
# SUPERADMIN
# ══════════════════════════════════════════════════════════════════════════════

def create_superadmin_user(db: Session, super_role: Role) -> list[dict]:
    """Retorna lista de credenciales generadas."""
    print("\n── Usuario superadmin ──────────────────────────────────")
    super_email = "superadmin@portal.com"
    user = db.query(User).filter(User.email == super_email).first()
    credentials = []

    if not user:
        password = generate_password()
        user = User(
            email=super_email,
            full_name="Super Admin",
            national_id="0000000000",
            password_hash=hash_password(password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.add(UserRole(user_id=user.id, role_id=super_role.id))
        db.commit()
        print(f"  Superadmin creado: {super_email}")
        print(f"  Contraseña:        {password}")
        credentials.append({"rol": "superadmin", "nombre": "Super Admin", "correo": super_email, "password": password})
    else:
        print(f"  Superadmin ya existe: {super_email}")

    return credentials


# ══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 10-1
# ══════════════════════════════════════════════════════════════════════════════

def create_sections(db: Session):
    print("\n── Sección 10-1 ────────────────────────────────────────")

    section = db.query(Section).filter(Section.name == "10-1").first()
    if not section:
        guide = db.query(User).filter(User.full_name == "Martha").first()
        section = Section(
            name="10-1",
            academic_year="2025",
            guide_professor_id=guide.id if guide else None,
        )
        db.add(section)
        db.commit()
        db.refresh(section)
        print(f"  Sección creada: 10-1 (guía: {'Martha' if guide else 'sin asignar'})")
    else:
        print("  Sección ya existe: 10-1")

    specialty_a = db.query(Specialty).filter(Specialty.name == "Configuración y Soporte").first()
    specialty_b = db.query(Specialty).filter(Specialty.name == "Contabilidad").first()

    for part, specialty in [("A", specialty_a), ("B", specialty_b)]:
        if not specialty:
            print(f"  ⚠ Especialidad no encontrada para parte {part}")
            continue
        exists = db.query(SectionSpecialty).filter(
            SectionSpecialty.section_id   == section.id,
            SectionSpecialty.specialty_id == specialty.id,
            SectionSpecialty.part         == part,
        ).first()
        if not exists:
            db.add(SectionSpecialty(
                section_id=section.id,
                specialty_id=specialty.id,
                part=part,
            ))
            print(f"  Especialidad parte {part}: {specialty.name}")
        else:
            print(f"  Especialidad parte {part} ya existe: {specialty.name}")

    db.commit()

    plan_config = [
        ("Plan Académico 1",   "A"),
        ("Plan Académico 1",   "B"),
        ("Config y Soporte 1", "A"),
        ("Contabilidad 1",     "B"),
    ]

    for plan_name, part in plan_config:
        plan = db.query(StudyPlan).filter(StudyPlan.name == plan_name).first()
        if not plan:
            print(f"  ⚠ Plan no encontrado: {plan_name}")
            continue

        exists = db.query(SectionStudyPlan).filter(
            SectionStudyPlan.section_id    == section.id,
            SectionStudyPlan.study_plan_id == plan.id,
            SectionStudyPlan.part          == part,
        ).first()
        if not exists:
            db.add(SectionStudyPlan(
                section_id=section.id,
                study_plan_id=plan.id,
                part=part,
            ))
            print(f"  Plan '{plan_name}' → part={part}")
        else:
            print(f"  Plan '{plan_name}' part={part} ya existe")

    db.commit()

    course_map    = {c.name: c for c in db.query(Course).all()}
    professor_map = {u.full_name: u for u in db.query(User).all()}

    for course_name, prof_name, part in SECTION_COURSE_ASSIGNMENTS:
        course    = course_map.get(course_name)
        professor = professor_map.get(prof_name)

        if not course:
            print(f"  ⚠ Curso no encontrado: {course_name}")
            continue
        if not professor:
            print(f"  ⚠ Profesor no encontrado: {prof_name}")
            continue

        exists = db.query(SectionCourse).filter(
            SectionCourse.section_id   == section.id,
            SectionCourse.course_id    == course.id,
            SectionCourse.section_part == part,
        ).first()
        if not exists:
            db.add(SectionCourse(
                section_id=section.id,
                course_id=course.id,
                professor_id=professor.id,
                section_part=part,
            ))
            print(f"  SectionCourse [{part or 'común'}] {course_name} → {prof_name}")
        else:
            print(f"  SectionCourse [{part or 'común'}] {course_name} ya existe")

    db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def run_seed(db: Session):
    roles = create_roles(db)
    create_permissions(db, roles["superadmin"])
    create_specialties(db)
    courses = create_courses(db)
    create_lesson_slots(db)
    create_classrooms(db)
    create_academic_study_plans(db, courses)
    create_specialty_plans(db, courses, "Configuración y Soporte", CONFIG_PLANS)
    create_specialty_plans(db, courses, "Contabilidad", ACCOUNTING_PLANS)

    all_credentials = []
    all_credentials += create_professors(db)
    all_credentials += create_superadmin_user(db, roles["superadmin"])

    if all_credentials:
        write_passwords_file(all_credentials)

    create_sections(db)
    print("\n✅ Seed completo.\n")


if __name__ == "__main__":
    db = next(get_db())
    try:
        run_seed(db)
    finally:
        db.close()