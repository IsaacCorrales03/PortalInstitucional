from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ProfessorAvailability, ProfessorCourse, ProfessorProfile, User, Role, Permission, UserRole, RolePermission, Specialty
from app.core.security import hash_password
import secrets, string


from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, Role, Permission, UserRole, RolePermission, Specialty
from app.core.security import hash_password
import secrets, string

# =========================
# COURSES (MATERIAS)
# =========================
from app.db.models import Course, StudyPlan, StudyPlanCourse

def create_courses(db: Session):
    courses = [
        "Español",
        "Matemáticas",
        "Física Matemática",
        "Estudios Sociales",
        "Educación Cívica",
        "Inglés Académico",
        "Educación Musical",
        "Educación Física",
        "Guía",
        "Ética",
        "Biología",
        "Química",
        "Psicología",
    ]

    created = {}

    for name in courses:
        course = db.query(Course).filter(Course.name == name).first()

        if not course:
            course = Course(name=name)
            db.add(course)
            db.commit()
            db.refresh(course)
            print(f"Materia creada: {name}")
        else:
            print(f"Materia ya existe: {name}")

        created[name] = course

    return created
# =========================
# STUDY PLANS (ACADÉMICOS)
# =========================
def create_academic_study_plans(db: Session, courses: dict):
    plans = [
        {
            "name": "Plan Académico 1",
            "year": 1,
            "courses": [
                "Español",
                "Matemáticas",
                "Física Matemática",
                "Estudios Sociales",
                "Educación Cívica",
                "Inglés Académico",
                "Educación Musical",
                "Educación Física",
                "Guía",
                "Ética",
            ],
        },
        {
            "name": "Plan Académico 2",
            "year": 2,
            "courses": [
                "Español",
                "Matemáticas",
                "Biología",
                "Química",
                "Psicología",
                "Estudios Sociales",
                "Educación Cívica",
                "Inglés Académico",
                "Educación Musical",
                "Educación Física",
                "Guía",
                "Ética",
            ],
        },
        {
            "name": "Plan Académico 3",
            "year": 3,
            "courses": [
                "Biología",
                "Psicología",
                "Estudios Sociales",
                "Español",
                "Química",
                "Matemáticas",
                "Inglés Académico",
                "Educación Cívica",
            ],
        },
    ]

    for plan_data in plans:
        plan = db.query(StudyPlan).filter(
            StudyPlan.name == plan_data["name"]
        ).first()

        if not plan:
            plan = StudyPlan(
                name=plan_data["name"],
                year_level=plan_data["year"],
                specialty_id=None  # académico
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)
            print(f"Plan creado: {plan.name}")
        else:
            print(f"Plan ya existe: {plan.name}")

        # Añadir materias
        for course_name in plan_data["courses"]:
            course = courses[course_name]

            exists = db.query(StudyPlanCourse).filter(
                StudyPlanCourse.study_plan_id == plan.id,
                StudyPlanCourse.course_id == course.id,
                StudyPlanCourse.part.is_(None)
            ).first()

            if not exists:
                db.add(StudyPlanCourse(
                    study_plan_id=plan.id,
                    course_id=course.id,
                    part=None  # académicas
                ))
                db.commit()
                print(f"  + {course_name}")
                
def generate_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# =========================
#           ROLES
# =========================
def create_roles(db: Session):
    roles = ["superadmin", "admin", "profesor", "estudiante"]
    created_roles = {}

    for role_name in roles:
        role = db.query(Role).filter(Role.name == role_name).first()

        if not role:
            role = Role(name=role_name, description=f"Rol {role_name}")
            db.add(role)
            db.commit()
            db.refresh(role)
            print(f"Rol creado: {role.name}")
        else:
            print(f"Rol ya existe: {role.name}")

        created_roles[role_name] = role

    return created_roles


# =========================
# SPECIALTIES
# =========================
def create_specialties(db: Session):
    specialties = [
        {
            "name": "Configuración y Soporte",
            "description": "La especialidad Configuración y Soporte a Redes de Comunicación y Sistemas Operativos forma técnicos capaces de instalar, configurar y mantener redes de comunicación y sistemas operativos, brindar soporte técnico, garantizar seguridad informática y resolver problemas en infraestructuras tecnológicas. Combina conocimientos de redes, sistemas operativos, programación básica y administración de TI, con enfoque práctico y orientado a soluciones reales."
        },
        {
            "name": "Contabilidad",
            "description": "La especialidad Contabilidad forma técnicos capaces de registrar, analizar e interpretar información financiera, elaborar estados contables, gestionar libros y documentos contables, y aplicar normas tributarias y de auditoría. Desarrolla competencias en manejo de software contable, análisis de costos y gestión administrativa, con enfoque práctico en la gestión financiera de empresas e instituciones."
        },
        {
            "name": "Ejecutivo Comercial y servicio al cliente",
            "description": "La especialidad Ejecutivo Comercial forma profesionales capaces de planificar, gestionar y ejecutar estrategias de ventas, captar y mantener clientes, negociar contratos y promocionar productos o servicios. Desarrolla competencias en comunicación, marketing, análisis de mercado y manejo de herramientas comerciales, con énfasis en resultados y atención al cliente."
        },
        {
            "name": "Electrónica Industrial",
            "description": "Forma técnicos capaces de diseñar, instalar, mantener y reparar sistemas electrónicos industriales, incluyendo control de maquinaria, automatización y dispositivos electrónicos. Combina conocimientos de electrónica, automatización y seguridad industrial, con enfoque práctico en entornos productivos."
        },
        {
            "name": "Administración Logística y Distribución",
            "description": "Forma profesionales capaces de planificar, organizar y supervisar procesos administrativos y logísticos, optimizar recursos, coordinar inventarios y gestionar cadenas de suministro. Desarrolla competencias en gestión empresarial, análisis de procesos y toma de decisiones."
        },
        {
            "name": "Secretariado Ejecutivo",
            "description": "Forma profesionales capaces de gestionar la comunicación y organización administrativa de empresas, manejar documentación, coordinar agendas y apoyar en la toma de decisiones. Desarrolla competencias en redacción, comunicación, atención al cliente y manejo de herramientas digitales y ofimáticas."
        },
        {
            "name": "Desarrollo Web",
            "description": "Forma técnicos capaces de diseñar, programar y mantener sitios y aplicaciones web, integrando front-end, back-end y bases de datos, con enfoque en usabilidad, rendimiento y experiencia de usuario."
        }
    ]

    for spec in specialties:
        exists = db.query(Specialty).filter(Specialty.name == spec["name"]).first()

        if not exists:
            specialty = Specialty(
                name=spec["name"],
                description=spec["description"]
            )
            db.add(specialty)
            db.commit()
            db.refresh(specialty)
            print(f"Especialidad creada: {spec['name']}")
        else:
            # actualización defensiva de descripción
            if not exists.description or exists.description != spec["description"]:
                exists.description = spec["description"]
                db.commit()
                print(f"Especialidad actualizada: {spec['name']}")
            else:
                print(f"Especialidad ya existe: {spec['name']}")
from datetime import time

def create_professors(db: Session):
    role = db.query(Role).filter(Role.name == "profesor").first()
    if not role:
        raise Exception("Rol profesor no existe")

    # mapa nombre → cursos
    data = {
        "Martha": ["Español"],
        "Marvin": ["Español"],
        "Josefa": ["Ética"],
        "Zugey": ["Química"],
        "Elke": ["Biología"],
        "Gaby": ["Física Matemática"],
        "Diego": ["Matemáticas"],
        "Raul": ["Matemáticas"],
        "Natalia": ["Inglés Académico"],
        "Thelma": ["Inglés Académico"],
        "Alberto": ["Educación Musical"],
        "Magaly": ["Educación Física"],
        "Elizabet": ["Educación Física"],
        "Yendry": ["Educación Cívica", "Estudios Sociales"],
        "Alejandro": ["Educación Cívica", "Estudios Sociales"],
        "Heidy": ["Psicología"],
    }

    # obtener cursos existentes
    courses = db.query(Course).all()
    course_map = {c.name: c for c in courses}

    missing = set()
    created_users = []

    for name, course_names in data.items():
        email = f"{name.lower()}@portal.com"

        if db.query(User).filter(User.email == email).first():
            print(f"Profesor ya existe: {email}")
            continue

        password = generate_password()

        user = User(
            email=email,
            full_name=name,
            national_id=str(secrets.randbelow(10**10)).zfill(10),
            password_hash=hash_password(password),
            is_active=True
        )
        db.add(user)
        db.flush()

        # rol
        db.add(UserRole(user_id=user.id, role_id=role.id))

        # perfil profesor
        db.add(ProfessorProfile(
            user_id=user.id,
            specialty_area=None,
            current_status="disponible"
        ))

        # disponibilidad (7am–5pm lunes a viernes)
        for day in ["lunes", "martes", "miercoles", "jueves", "viernes"]:
            db.add(ProfessorAvailability(
                professor_id=user.id,
                day_of_week=day,
                start_time=time(7, 0),
                end_time=time(17, 0),
            ))

        # asignación de cursos
        for cname in course_names:
            course = course_map.get(cname)
            if not course:
                missing.add(cname)
                continue

            db.add(ProfessorCourse(
                professor_id=user.id,
                course_id=course.id
            ))

        created_users.append((email, password))

    db.commit()

    print("\n=== PROFESORES CREADOS ===")
    for email, password in created_users:
        print(f"{email} | {password}")

    if missing:
        print("\n⚠ Materias faltantes en DB:")
        for m in sorted(missing):
            print(f"- {m}")

# =========================
# SUPERADMIN SETUP
# =========================
def create_superadmin(db: Session):
    roles = create_roles(db)
    create_specialties(db)
    courses = create_courses(db)
    create_academic_study_plans(db, courses)
    super_role = roles["superadmin"]
    create_professors(db)   
    all_permissions = {
        "manage_users": "Gestionar usuarios del sistema",
        "manage_courses": "Gestionar cursos",
        "manage_sections": "Gestionar secciones",
        "manage_enrollments": "Gestionar inscripciones",
        "assign_professors": "Asignar profesores a secciones",
        "manage_specialties": "Gestionar especialidades",
        "manage_permissions": "Gestionar permisos del sistema",
        "manage_events": "Gestionar eventos institucionales",
        "schedule_meetings": "Programar reuniones",
        "manage_scholarships": "Gestionar becas",
        "set_professor_status": "Actualizar estado de docentes",
        "manage_admissions": "Gestionar admisiones",
        "view_grade_reports": "Ver boletines de calificaciones",
        "send_announcements": "Enviar anuncios institucionales",
    }

    for code, description in all_permissions.items():
        perm = db.query(Permission).filter(Permission.code == code).first()

        if not perm:
            perm = Permission(code=code, description=description)
            db.add(perm)
            db.commit()
            db.refresh(perm)
            print(f"Permiso creado: {perm.code}")
        else:
            if not perm.description:
                perm.description = description
                db.commit()
                print(f"Descripción actualizada: {perm.code}")

        exists = db.query(RolePermission).filter(
            RolePermission.role_id == super_role.id,
            RolePermission.permission_id == perm.id
        ).first()

        if not exists:
            db.add(RolePermission(role_id=super_role.id, permission_id=perm.id))
            db.commit()
            print(f"Permiso {perm.code} asignado a superadmin")

    super_email = "superadmin@portal.com"
    user = db.query(User).filter(User.email == super_email).first()

    if not user:
        password = generate_password()

        user = User(
            email=super_email,
            full_name="Super Admin",
            national_id="0000000000",
            password_hash=hash_password(password),
            is_active=True
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"Superadmin creado: {user.email} - Contraseña: {password}")

        db.add(UserRole(user_id=user.id, role_id=super_role.id))
        db.commit()

        print(f"Rol superadmin asignado a {user.email}")
    else:
        print(f"Usuario superadmin ya existe: {user.email}")



# =========================
# MAIN
# =========================
if __name__ == "__main__":
    db = next(get_db())

    create_superadmin(db)