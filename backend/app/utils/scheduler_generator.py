"""
scheduler_generator.py
======================
Módulo generador de horarios para el CTP Pavas — OR-Tools CP-SAT.

Modelo conjunto A+B para una sección.

Expone únicamente funciones y utilidades; todos los datos (cursos, profesores,
aulas, planes de estudio, secciones) se definen en el script que lo invoca.

Reglas duras implementadas:
  1. Bloques técnicos: tamaños 3 o 6, iniciando en 0,3,6,9.
     Excepción: Ed. Física = bloque de 2, inicio libre.
  2. Bloques académicos: tamaños 1-3, máximo 1 bloque por materia por día.
  3. Un slot tiene máximo una materia por parte.
  4. Un profesor no puede estar en dos slots al mismo tiempo.
  5. Exactamente las lecciones requeridas por materia por parte.
  6. Un profesor solo puede ser asignado en slots donde su disponibilidad lo permite.
  7. Un único profesor por materia (exclusividad de profesor).
  8. Un aula solo puede usarse en slots donde su disponibilidad lo permite.

Reglas de sincronización A↔B:
  9. Académicas (incluyendo Ed. Física): bloque IDÉNTICO en A y B.
  10. Técnicas: los slots coinciden en A y B, el contenido puede diferir.

Reglas de aulas:
  11. Ed. Física → solo Gimnasio.
  12. Materias académicas → Aulas Verdes o Aula Especial.
  13. Materias técnicas → Laboratorios o Aulas Naranja.
  14. Dos grupos no pueden usar el mismo aula al mismo tiempo.
  15. Académicas/Ed.Física → A y B comparten aula.
      Técnicas propias → cada parte tiene su propio aula.
  16. Disponibilidad de aula respetada slot a slot.

Reglas blandas:
  1. Distribuir materias académicas uniformemente en la semana.
  2. Minimizar huecos entre bloques en el día.
"""

import sys
from ortools.sat.python import cp_model


# ── Constantes ────────────────────────────────────────────────────────────────

NDAYS   = 5
NBLOCKS = 12
DIAS    = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
INICIOS_TECNICOS = [0, 3, 6, 9]


# ══════════════════════════════════════════════════════════════════════════════
# UTILIDADES DE DISPONIBILIDAD
# ══════════════════════════════════════════════════════════════════════════════

def disponibilidad_total() -> list[list[int]]:
    """Disponible en todos los slots (5 días × 12 lecciones)."""
    return [[1] * NBLOCKS for _ in range(NDAYS)]


def disponibilidad_dias(dias_disponibles: list[int]) -> list[list[int]]:
    """
    Disponible únicamente en los días indicados, todas las lecciones.

    Parámetros
    ----------
    dias_disponibles : lista de enteros 0-4 (0=Lunes … 4=Viernes)
    """
    mapa = [[0] * NBLOCKS for _ in range(NDAYS)]
    for d in dias_disponibles:
        mapa[d] = [1] * NBLOCKS
    return mapa


def disponibilidad_bloques(rangos: dict[int, list[tuple[int, int]]]) -> list[list[int]]:
    """
    Disponible solo en los rangos de lecciones indicados por día.

    Parámetros
    ----------
    rangos : dict {dia: [(inicio, fin), ...]}
        inicio y fin son inclusivos, base-0.

    Ejemplo
    -------
    {0: [(0, 5), (9, 11)], 2: [(3, 8)]}
    """
    mapa = [[0] * NBLOCKS for _ in range(NDAYS)]
    for d, rangos_dia in rangos.items():
        for ini, fin in rangos_dia:
            for b in range(ini, fin + 1):
                if 0 <= b < NBLOCKS:
                    mapa[d][b] = 1
    return mapa


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS INTERNOS
# ══════════════════════════════════════════════════════════════════════════════

def _prof_disponible_en_bloque(
    disponibilidad_prof: dict[int, list[list[int]]],
    prof_id: int, d: int, b_ini: int, tam: int
) -> bool:
    """True si el profesor tiene disponibilidad en todos los slots del bloque."""
    mapa = disponibilidad_prof[prof_id]
    return all(mapa[d][b_ini + offset] == 1 for offset in range(tam))


def _aula_disponible_en_bloque(
    aulas: dict[str, dict],
    aula_key: str, d: int, b_ini: int, tam: int
) -> bool:
    """True si el aula está disponible en todos los slots del bloque."""
    mapa = aulas[aula_key]["disponibilidad"]
    return all(mapa[d][b_ini + offset] == 1 for offset in range(tam))


def _profs_para_materia(
    cursos: dict, profesores: dict, id_m: int
) -> list[int]:
    """IDs de profesores que pueden impartir la materia indicada."""
    nombre = cursos[id_m]["Nombre"]
    return [pid for pid, p in profesores.items() if nombre in p["Materias"]]


def _profs_validos(
    cursos: dict, profesores: dict,
    secciones_config: dict, seccion_id: str, id_m: int
) -> list[int]:
    """
    IDs de profesores válidos para una materia dentro de una sección.
    La materia 'Guía' usa exclusivamente al profesor-guía de la sección.
    """
    if cursos[id_m]["Nombre"] == "Guía":
        return [secciones_config[seccion_id]["profesor_guia"]]
    return _profs_para_materia(cursos, profesores, id_m)


def _materias_de_parte(
    plan_estudio: dict, secciones_config: dict,
    seccion_id: str, parte: str
) -> dict[int, int]:
    """
    Devuelve {id_materia: lecciones_requeridas} para una parte de una sección,
    combinando todos los planes de estudio que le corresponden.
    """
    reqs: dict[int, int] = {}
    for pid in secciones_config[seccion_id]["partes"][parte]:
        for id_m, cant in plan_estudio[pid]["courses"]:
            reqs[id_m] = reqs.get(id_m, 0) + cant
    return reqs


def _tamanios_validos(
    cursos: dict, id_m: int, cant_total: int
) -> list[int]:
    """Tamaños de bloque permitidos para la materia según su tipo."""
    if id_m == 8:                           # Educación Física: siempre 2
        return [2]
    if cursos[id_m]["es_tecnica"]:
        return [t for t in [3, 6] if t <= cant_total]
    return [t for t in [1, 2, 3] if t <= cant_total]


def _inicios_validos(
    cursos: dict, id_m: int, tam: int
) -> list[int]:
    """Posiciones de inicio válidas para un bloque de tamaño `tam`."""
    if cursos[id_m]["es_tecnica"] and id_m != 8:
        return [b for b in INICIOS_TECNICOS if b + tam <= NBLOCKS]
    return list(range(NBLOCKS - tam + 1))


def _aulas_validas_para_materia(
    cursos: dict, aulas: dict, aulas_idx: dict,
    id_m: int, d: int, b_ini: int, tam: int
) -> list[int]:
    """
    Índices numéricos de las aulas permitidas para la materia,
    filtradas además por disponibilidad en el bloque (d, b_ini, tam).
    """
    if id_m == 8:
        tipos_ok = ("gimnasio",)
    elif cursos[id_m]["es_tecnica"]:
        tipos_ok = ("lab_verde", "lab_naranja", "naranja")
    else:
        tipos_ok = ("verde", "especial")

    return [
        aulas_idx[k]
        for k, v in aulas.items()
        if v["tipo"] in tipos_ok
        and _aula_disponible_en_bloque(aulas, k, d, b_ini, tam)
    ]


# ══════════════════════════════════════════════════════════════════════════════
# CONSTRUCCIÓN DEL MODELO CP-SAT
# ══════════════════════════════════════════════════════════════════════════════

def _construir_modelo(
    seccion_id: str,
    cursos: dict,
    profesores: dict,
    plan_estudio: dict,
    secciones_config: dict,
    aulas: dict,
    aulas_lista: list[str],
    aulas_idx: dict[str, int],
    disponibilidad_prof: dict[int, list[list[int]]],
):
    """
    Construye y devuelve (model, solver_data) con todas las variables y
    restricciones del modelo CP-SAT para la sección indicada.
    """
    model = cp_model.CpModel()

    partes = list(secciones_config[seccion_id]["partes"].keys())
    reqs: dict[str, dict[int, int]] = {
        p: _materias_de_parte(plan_estudio, secciones_config, seccion_id, p)
        for p in partes
    }

    ids_A = set(reqs["A"].keys())
    ids_B = set(reqs["B"].keys())

    compartidas = {
        id_m for id_m in ids_A & ids_B
        if not cursos[id_m]["es_tecnica"] or id_m == 8
    }
    tec_A = {id_m for id_m in ids_A if cursos[id_m]["es_tecnica"] and id_m != 8}
    tec_B = {id_m for id_m in ids_B if cursos[id_m]["es_tecnica"] and id_m != 8}

    # ── Variables de bloques ──────────────────────────────────────────────────
    bloques_comp: dict[int, list] = {id_m: [] for id_m in compartidas}
    bloques_tec: dict[str, dict[int, list]] = {
        "A": {id_m: [] for id_m in tec_A},
        "B": {id_m: [] for id_m in tec_B},
    }

    cobertura: dict[str, dict[tuple, list]] = {
        p: {(d, b): [] for d in range(NDAYS) for b in range(NBLOCKS)}
        for p in partes
    }

    # Variables de aula: una por bloque
    aula_comp: dict[int, dict[tuple, object]] = {id_m: {} for id_m in compartidas}
    aula_tec: dict[str, dict[int, dict[tuple, object]]] = {
        p: {id_m: {} for id_m in bloques_tec[p]} for p in partes
    }

    # ── Generar bloques compartidos (académicas + Ed. Física) ─────────────────
    for id_m in compartidas:
        cant = reqs["A"][id_m]
        for ip in _profs_validos(cursos, profesores, secciones_config, seccion_id, id_m):
            for d in range(NDAYS):
                for tam in _tamanios_validos(cursos, id_m, cant):
                    for b_ini in _inicios_validos(cursos, id_m, tam):
                        if not _prof_disponible_en_bloque(disponibilidad_prof, ip, d, b_ini, tam):
                            continue
                        validas = _aulas_validas_para_materia(
                            cursos, aulas, aulas_idx, id_m, d, b_ini, tam
                        )
                        if not validas:
                            continue
                        var = model.new_bool_var(
                            f"comp_m{id_m}_p{ip}_d{d}_b{b_ini}_t{tam}"
                        )
                        av = model.new_int_var_from_domain(
                            cp_model.Domain.from_values(validas),
                            f"aula_comp_m{id_m}_p{ip}_d{d}_b{b_ini}_t{tam}",
                        )
                        bloques_comp[id_m].append((var, ip, d, b_ini, tam))
                        aula_comp[id_m][(ip, d, b_ini, tam)] = (var, av)
                        for offset in range(tam):
                            cobertura["A"][d, b_ini + offset].append((var, id_m, ip))
                            cobertura["B"][d, b_ini + offset].append((var, id_m, ip))

    # ── Generar bloques técnicos propios ──────────────────────────────────────
    for parte in partes:
        for id_m in bloques_tec[parte]:
            cant = reqs[parte][id_m]
            for ip in _profs_validos(cursos, profesores, secciones_config, seccion_id, id_m):
                for d in range(NDAYS):
                    for tam in _tamanios_validos(cursos, id_m, cant):
                        for b_ini in _inicios_validos(cursos, id_m, tam):
                            if not _prof_disponible_en_bloque(
                                disponibilidad_prof, ip, d, b_ini, tam
                            ):
                                continue
                            validas = _aulas_validas_para_materia(
                                cursos, aulas, aulas_idx, id_m, d, b_ini, tam
                            )
                            if not validas:
                                continue
                            var = model.new_bool_var(
                                f"tec_{parte}_m{id_m}_p{ip}_d{d}_b{b_ini}_t{tam}"
                            )
                            av = model.new_int_var_from_domain(
                                cp_model.Domain.from_values(validas),
                                f"aula_tec_{parte}_m{id_m}_p{ip}_d{d}_b{b_ini}_t{tam}",
                            )
                            bloques_tec[parte][id_m].append((var, ip, d, b_ini, tam))
                            aula_tec[parte][id_m][(ip, d, b_ini, tam)] = (var, av)
                            for offset in range(tam):
                                cobertura[parte][d, b_ini + offset].append((var, id_m, ip))

    # ── Restricciones duras ───────────────────────────────────────────────────

    # R1. Máximo 1 materia por slot por parte
    for parte in partes:
        for d in range(NDAYS):
            for b in range(NBLOCKS):
                sv = [v for v, _, _ in cobertura[parte][d, b]]
                if sv:
                    model.add(sum(sv) <= 1)

    # R2a. Lecciones exactas — compartidas
    for id_m in compartidas:
        cant = reqs["A"][id_m]
        terminos = [var * tam for var, _, _, _, tam in bloques_comp[id_m]]
        model.add(sum(terminos) == cant)

    # R2b. Lecciones exactas — técnicas propias
    for parte in partes:
        for id_m, cant in reqs[parte].items():
            if id_m in bloques_tec[parte]:
                terminos = [var * tam for var, _, _, _, tam in bloques_tec[parte][id_m]]
                model.add(sum(terminos) == cant)

    # R3. Un profesor no puede estar en dos slots simultáneamente
    cobertura_prof: dict[tuple, list] = {}
    for id_m in compartidas:
        for var, ip, d, b_ini, tam in bloques_comp[id_m]:
            for offset in range(tam):
                cobertura_prof.setdefault((ip, d, b_ini + offset), []).append(var)
    for parte in partes:
        for id_m in bloques_tec[parte]:
            for var, ip, d, b_ini, tam in bloques_tec[parte][id_m]:
                for offset in range(tam):
                    cobertura_prof.setdefault((ip, d, b_ini + offset), []).append(var)
    for vars_slot in cobertura_prof.values():
        if len(vars_slot) > 1:
            model.add(sum(vars_slot) <= 1)

    # R4. Máximo 1 bloque por materia por día (garantiza contigüidad)
    for id_m in compartidas:
        for d in range(NDAYS):
            vd = [var for var, _, dd, _, _ in bloques_comp[id_m] if dd == d]
            if vd:
                model.add(sum(vd) <= 1)
    for parte in partes:
        for id_m in bloques_tec[parte]:
            for d in range(NDAYS):
                vd = [var for var, _, dd, _, _ in bloques_tec[parte][id_m] if dd == d]
                if vd:
                    model.add(sum(vd) <= 1)

    # R4b. Un único profesor por materia (exclusividad)
    for id_m in compartidas:
        profs = list({ip for _, ip, _, _, _ in bloques_comp[id_m]})
        if len(profs) <= 1:
            continue
        prof_activo = {}
        for ip in profs:
            pa = model.new_bool_var(f"prof_activo_m{id_m}_p{ip}")
            prof_activo[ip] = pa
            for var in [v for v, p, _, _, _ in bloques_comp[id_m] if p == ip]:
                model.add_implication(var, pa)
        model.add(sum(prof_activo.values()) == 1)

    for parte in partes:
        for id_m in bloques_tec[parte]:
            profs = list({ip for _, ip, _, _, _ in bloques_tec[parte][id_m]})
            if len(profs) <= 1:
                continue
            prof_activo = {}
            for ip in profs:
                pa = model.new_bool_var(f"prof_activo_tec_{parte}_m{id_m}_p{ip}")
                prof_activo[ip] = pa
                for var in [v for v, p, _, _, _ in bloques_tec[parte][id_m] if p == ip]:
                    model.add_implication(var, pa)
            model.add(sum(prof_activo.values()) == 1)

    # R5. Sincronización de slots técnicos A↔B
    slot_tec: dict[str, dict[tuple, object]] = {p: {} for p in partes}
    for parte in partes:
        for d in range(NDAYS):
            for b in range(NBLOCKS):
                tec_vars = [
                    var
                    for id_m in bloques_tec[parte]
                    for var, _, dd, b_ini, tam in bloques_tec[parte][id_m]
                    if dd == d and b_ini <= b < b_ini + tam
                ]
                v = model.new_bool_var(f"slot_tec_{parte}_d{d}_b{b}")
                if tec_vars:
                    model.add(sum(tec_vars) >= v)
                    model.add_bool_or(tec_vars + [v.negated()])
                else:
                    model.add(v == 0)
                slot_tec[parte][d, b] = v
    for d in range(NDAYS):
        for b in range(NBLOCKS):
            model.add(slot_tec["A"][d, b] == slot_tec["B"][d, b])

    # R6. Conflictos de aula: dos bloques activos no pueden compartir aula
    slot_aulas: dict[tuple, list] = {
        (d, b): [] for d in range(NDAYS) for b in range(NBLOCKS)
    }
    for id_m in compartidas:
        for var, ip, d, b_ini, tam in bloques_comp[id_m]:
            bv, av = aula_comp[id_m][(ip, d, b_ini, tam)]
            for offset in range(tam):
                slot_aulas[d, b_ini + offset].append((bv, av))
    for parte in partes:
        for id_m in bloques_tec[parte]:
            for var, ip, d, b_ini, tam in bloques_tec[parte][id_m]:
                bv, av = aula_tec[parte][id_m][(ip, d, b_ini, tam)]
                for offset in range(tam):
                    slot_aulas[d, b_ini + offset].append((bv, av))
    for entradas in slot_aulas.values():
        n = len(entradas)
        for i in range(n):
            for j in range(i + 1, n):
                bv_i, av_i = entradas[i]
                bv_j, av_j = entradas[j]
                model.add(av_i != av_j).only_enforce_if([bv_i, bv_j])

    # ── Restricciones blandas ─────────────────────────────────────────────────
    penalties = []

    # P1. Distribuir académicas uniformemente en la semana
    for id_m in compartidas:
        cant = reqs["A"][id_m]
        if cant <= 1:
            continue
        dias_activos = []
        for d in range(NDAYS):
            vd = [var for var, _, dd, _, _ in bloques_comp[id_m] if dd == d]
            if not vd:
                continue
            da = model.new_bool_var(f"da_m{id_m}_d{d}")
            model.add(sum(vd) >= da)
            model.add_bool_or(vd + [da.negated()])
            dias_activos.append(da)
        if dias_activos:
            dias_usados = model.new_int_var(0, NDAYS, f"du_m{id_m}")
            model.add(dias_usados == sum(dias_activos))
            deficit = model.new_int_var(0, NDAYS, f"def_m{id_m}")
            model.add(deficit >= min(cant, NDAYS) - dias_usados)
            penalties.append(deficit)

    # P2. Minimizar huecos en el día
    for parte in partes:
        ocupado: dict[tuple, object] = {}
        for d in range(NDAYS):
            for b in range(NBLOCKS):
                sv = [v for v, _, _ in cobertura[parte][d, b]]
                v = model.new_bool_var(f"ocp_{parte}_d{d}_b{b}")
                if sv:
                    model.add(sum(sv) >= v)
                    model.add_bool_or(sv + [v.negated()])
                else:
                    model.add(v == 0)
                ocupado[d, b] = v
        for d in range(NDAYS):
            for b in range(1, NBLOCKS - 1):
                hueco = model.new_bool_var(f"hueco_{parte}_d{d}_b{b}")
                model.add_bool_and([
                    ocupado[d, b - 1],
                    ocupado[d, b].negated(),
                    ocupado[d, b + 1],
                ]).only_enforce_if(hueco)
                model.add_bool_or([
                    ocupado[d, b - 1].negated(),
                    ocupado[d, b],
                    ocupado[d, b + 1].negated(),
                ]).only_enforce_if(hueco.negated())
                penalties.append(hueco)

    if penalties:
        model.minimize(sum(penalties))

    # ── Empaquetar datos que necesitará el extractor de resultados ────────────
    solver_data = {
        "partes":        partes,
        "reqs":          reqs,
        "compartidas":   compartidas,
        "bloques_comp":  bloques_comp,
        "bloques_tec":   bloques_tec,
        "aula_comp":     aula_comp,
        "aula_tec":      aula_tec,
        "penalties":     penalties,
    }

    return model, solver_data


# ══════════════════════════════════════════════════════════════════════════════
# EXTRACCIÓN DE RESULTADOS
# ══════════════════════════════════════════════════════════════════════════════

def _extraer_horarios(
    solver: cp_model.CpSolver,
    solver_data: dict,
    cursos: dict,
    profesores: dict,
    aulas: dict,
    aulas_lista: list[str],
) -> dict[str, dict]:
    """
    Lee los valores del solver y devuelve {parte: {dia: {leccion: entry}}}.
    entry = {materia, profesor, prof_id, es_tecnica, aula}
    """
    partes       = solver_data["partes"]
    compartidas  = solver_data["compartidas"]
    bloques_comp = solver_data["bloques_comp"]
    bloques_tec  = solver_data["bloques_tec"]
    aula_comp    = solver_data["aula_comp"]
    aula_tec     = solver_data["aula_tec"]

    horarios = {
        p: {dia: {b + 1: None for b in range(NBLOCKS)} for dia in DIAS}
        for p in partes
    }

    for id_m in compartidas:
        for var, ip, d, b_ini, tam in bloques_comp[id_m]:
            if solver.value(var) != 1:
                continue
            _, av = aula_comp[id_m][(ip, d, b_ini, tam)]
            nombre_aula = aulas[aulas_lista[solver.value(av)]]["Nombre"]
            entry = {
                "materia":    cursos[id_m]["Nombre"],
                "profesor":   profesores[ip]["Nombre"],
                "prof_id":    ip,
                "es_tecnica": cursos[id_m]["es_tecnica"],
                "aula":       nombre_aula,
            }
            for offset in range(tam):
                for p in partes:
                    horarios[p][DIAS[d]][b_ini + offset + 1] = entry

    for parte in partes:
        for id_m in bloques_tec[parte]:
            for var, ip, d, b_ini, tam in bloques_tec[parte][id_m]:
                if solver.value(var) != 1:
                    continue
                _, av = aula_tec[parte][id_m][(ip, d, b_ini, tam)]
                nombre_aula = aulas[aulas_lista[solver.value(av)]]["Nombre"]
                for offset in range(tam):
                    horarios[parte][DIAS[d]][b_ini + offset + 1] = {
                        "materia":    cursos[id_m]["Nombre"],
                        "profesor":   profesores[ip]["Nombre"],
                        "prof_id":    ip,
                        "es_tecnica": cursos[id_m]["es_tecnica"],
                        "aula":       nombre_aula,
                    }

    return horarios


# ══════════════════════════════════════════════════════════════════════════════
# FUNCIÓN PRINCIPAL: RESOLVER UNA SECCIÓN
# ══════════════════════════════════════════════════════════════════════════════

def resolver_seccion(
    seccion_id: str,
    cursos: dict,
    profesores: dict,
    plan_estudio: dict,
    secciones_config: dict,
    aulas: dict,
    disponibilidad_prof: dict[int, list[list[int]]],
    *,
    tiempo_limite: float = 120.0,
    num_workers: int = 8,
    verbose: bool = False,
) -> tuple[dict | None, dict | None]:
    """
    Resuelve el horario conjunto A+B para la sección indicada.

    Parámetros
    ----------
    seccion_id         : clave de secciones_config, p.ej. "10-1"
    cursos             : dict de cursos {id: {Nombre, es_tecnica}}
    profesores         : dict de profesores {id: {Nombre, Materias}}
    plan_estudio       : dict de planes {id: {name, courses}}
    secciones_config   : dict de secciones {id: {partes, profesor_guia}}
    aulas              : dict de aulas {key: {tipo, Nombre, disponibilidad}}
    disponibilidad_prof: dict {prof_id: mapa 5×12}
    tiempo_limite      : segundos máximos para el solver (default 120)
    num_workers        : hilos del solver (default 8)
    verbose            : imprimir progreso del solver (default False)

    Retorna
    -------
    (horario_A, horario_B) — None, None si no hay solución.
    """
    aulas_lista = list(aulas.keys())
    aulas_idx   = {k: i for i, k in enumerate(aulas_lista)}

    model, solver_data = _construir_modelo(
        seccion_id, cursos, profesores, plan_estudio,
        secciones_config, aulas, aulas_lista, aulas_idx,
        disponibilidad_prof,
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = tiempo_limite
    solver.parameters.num_search_workers  = num_workers
    solver.parameters.log_search_progress = verbose

    status = solver.solve(model)

    partes = solver_data["partes"]

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        print(f"\n[!] Sin solución para {seccion_id}. "
              f"Status: {solver.status_name(status)}")
        return None, None

    horarios = _extraer_horarios(
        solver, solver_data, cursos, profesores, aulas, aulas_lista
    )

    penalties    = solver_data["penalties"]
    penval       = int(solver.objective_value) if penalties else 0

    print(f"\n{'=' * 70}")
    print(f"  Sección {seccion_id} — modelo conjunto A+B")
    print(f"  Status     : {solver.status_name(status)}")
    print(f"  Tiempo     : {solver.wall_time:.3f}s")
    print(f"  Penaliz.   : {penval}")
    print(f"{'=' * 70}")



    return horarios["A"], horarios["B"]


# ══════════════════════════════════════════════════════════════════════════════
# IMPRESIÓN Y VERIFICACIÓN
# ══════════════════════════════════════════════════════════════════════════════

def imprimir_horario(horario: dict) -> None:
    """Imprime el horario de una parte en formato tabla."""
    col = 30
    print(f"{'Lec':<5}", end="")
    for dia in DIAS:
        print(f"{dia:<{col}}", end="")
    print()
    print("-" * (5 + col * NDAYS))

    for b in range(1, NBLOCKS + 1):
        print(f"{b:<5}", end="")
        for dia in DIAS:
            entry = horario[dia][b]
            if entry is None:
                cell = "---"
            else:
                tag       = "[T]" if entry["es_tecnica"] else "[A]"
                mat_short = entry["materia"][:14]
                ala_short = entry["aula"][:13]
                cell      = f"{tag} {mat_short} | {ala_short}"[:col - 1]
            print(f"{cell:<{col}}", end="")
        print()

    errores = _verificar_contigüidad(horario)
    if errores:
        print("Errores de contigüidad:")
        for e in errores:
            print(e)
    else:
        print("  Contigüidad OK.")


def _verificar_contigüidad(horario: dict) -> list[str]:
    """Retorna lista de errores de contigüidad de bloques."""
    errores = []
    for dia in DIAS:
        por_materia: dict[str, list] = {}
        for b in range(1, NBLOCKS + 1):
            e = horario[dia][b]
            if e:
                por_materia.setdefault(e["materia"], []).append(b)
        for mat, blqs in por_materia.items():
            for i in range(len(blqs) - 1):
                if blqs[i + 1] != blqs[i] + 1:
                    errores.append(
                        f"  [!] {dia} '{mat}' fragmentada: {blqs}"
                    )
                    break
    return errores



def verificar_sincronizacion(horA: dict, horB: dict) -> None:
    """Verifica que A y B estén correctamente sincronizados."""
    errores = []
    for dia in DIAS:
        for b in range(1, NBLOCKS + 1):
            eA = horA[dia][b]
            eB = horB[dia][b]
            tA = eA["es_tecnica"] if eA else False
            tB = eB["es_tecnica"] if eB else False

            if tA != tB:
                errores.append(
                    f"  [!] {dia} L{b}: A={'TEC' if tA else 'AC/vacío'} "
                    f"B={'TEC' if tB else 'AC/vacío'} — no sincronizado"
                )
            if eA and eB and not eA["es_tecnica"] and not eB["es_tecnica"]:
                if eA["materia"] != eB["materia"] or eA["profesor"] != eB["profesor"]:
                    errores.append(
                        f"  [!] {dia} L{b}: académica difiere — "
                        f"A={eA['materia']}/{eA['profesor']} "
                        f"B={eB['materia']}/{eB['profesor']}"
                    )
            if eA and eB and eA["es_tecnica"] and eB["es_tecnica"]:
                if eA.get("materia") == "Educación Física" or eB.get("materia") == "Educación Física":
                    if eA["materia"] != eB["materia"] or eA["profesor"] != eB["profesor"]:
                        errores.append(
                            f"  [!] {dia} L{b}: Ed. Física difiere entre A y B"
                        )
    print()
    if errores:
        print("Errores de sincronización A↔B:")
        for e in errores:
            print(e)
    else:
        print("  Sincronización A↔B OK:")
        print("  - Académicas y Ed. Física idénticas en ambos grupos.")
        print("  - Slots técnicos coinciden en ambos grupos.")


def verificar_disponibilidad(
    horarios: dict,
    partes: list[str],
    profesores: dict,
    disponibilidad_prof: dict[int, list[list[int]]],
) -> None:
    """Verifica que ningún profesor esté asignado fuera de su disponibilidad."""
    errores = []
    for parte in partes:
        for d_idx, dia in enumerate(DIAS):
            for b in range(1, NBLOCKS + 1):
                entry = horarios[parte][dia][b]
                if entry is None:
                    continue
                pid = entry["prof_id"]
                if disponibilidad_prof[pid][d_idx][b - 1] == 0:
                    errores.append(
                        f"  [!] Parte {parte} | {dia} L{b}: "
                        f"{profesores[pid]['Nombre']} asignado fuera de disponibilidad"
                    )
    if errores:
        print("\nErrores de disponibilidad:")
        for e in errores:
            print(e)
    else:
        print("  Disponibilidad OK: ningún profesor asignado fuera de su horario permitido.")


def verificar_aulas(
    horarios: dict,
    partes: list[str],
    aulas: dict,
) -> None:
    """
    Verifica:
    - Ningún aula ocupada por dos grupos distintos en el mismo slot.
    - El tipo de aula es correcto para el tipo de materia.
    """
    errores = []

    uso_aula: dict[tuple, list] = {}
    for parte in partes:
        for dia in DIAS:
            for b in range(1, NBLOCKS + 1):
                entry = horarios[parte][dia][b]
                if entry is None:
                    continue
                clave = (dia, b, entry["aula"])
                uso_aula.setdefault(clave, []).append((parte, entry["materia"]))

    for (dia, b, nombre_aula), ocupantes in uso_aula.items():
        materias = list({m for _, m in ocupantes})
        if len(materias) > 1:
            errores.append(
                f"  [!] {dia} L{b}: aula '{nombre_aula}' usada por "
                f"{ocupantes} — CONFLICTO"
            )

    for parte in partes:
        for dia in DIAS:
            for b in range(1, NBLOCKS + 1):
                entry = horarios[parte][dia][b]
                if entry is None:
                    continue
                nombre_aula_asignada = entry["aula"]
                clave_aula = next(
                    (k for k, v in aulas.items() if v["Nombre"] == nombre_aula_asignada),
                    None,
                )
                if clave_aula is None:
                    errores.append(f"  [!] Aula desconocida '{nombre_aula_asignada}'")
                    continue
                tipo            = aulas[clave_aula]["tipo"]
                materia_nombre  = entry["materia"]
                es_tec          = entry["es_tecnica"]

                if materia_nombre == "Educación Física":
                    if tipo != "gimnasio":
                        errores.append(
                            f"  [!] Parte {parte} | {dia} L{b}: "
                            f"Ed. Física en aula incorrecta '{nombre_aula_asignada}'"
                        )
                elif es_tec:
                    if tipo not in ("lab_verde", "lab_naranja", "naranja"):
                        errores.append(
                            f"  [!] Parte {parte} | {dia} L{b}: "
                            f"Técnica '{materia_nombre}' en aula incorrecta '{nombre_aula_asignada}'"
                        )
                else:
                    if tipo not in ("verde", "especial"):
                        errores.append(
                            f"  [!] Parte {parte} | {dia} L{b}: "
                            f"Académica '{materia_nombre}' en aula incorrecta '{nombre_aula_asignada}'"
                        )
    print()
    if errores:
        print("Errores de aulas:")
        for e in errores:
            print(e)
    else:
        print("  Aulas OK: tipos correctos y sin conflictos de ocupación.")


def verificar_disponibilidad_aulas(
    horarios: dict,
    partes: list[str],
    aulas: dict,
) -> None:
    """Verifica que ningún aula haya sido asignada fuera de su disponibilidad."""
    errores = []
    for parte in partes:
        for d_idx, dia in enumerate(DIAS):
            for b in range(1, NBLOCKS + 1):
                entry = horarios[parte][dia][b]
                if entry is None:
                    continue
                nombre_aula_asignada = entry["aula"]
                clave_aula = next(
                    (k for k, v in aulas.items() if v["Nombre"] == nombre_aula_asignada),
                    None,
                )
                if clave_aula is None:
                    continue
                mapa = aulas[clave_aula]["disponibilidad"]
                if mapa[d_idx][b - 1] == 0:
                    errores.append(
                        f"  [!] Parte {parte} | {dia} L{b}: "
                        f"aula '{nombre_aula_asignada}' asignada fuera de su disponibilidad"
                    )
    if errores:
        print("\nErrores de disponibilidad de aulas:")
        for e in errores:
            print(e)
    else:
        print(
            "  Disponibilidad de aulas OK: "
            "ninguna aula asignada fuera de su horario permitido."
        )
