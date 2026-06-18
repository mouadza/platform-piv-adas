from django.utils import timezone

from admin_config.models.results import StepValidation
from admin_config.services.gamme_parser import parse_gamme


FINAL_COTATIONS = {
    "OK",
    "NOK",
    "NOK_mineur",
    "NOK Mineur",
    "Non_cote",
    "Non_cot\u00e9",
    "Non_cot\u00c3\u00a9",
}


def _get_ev_code_from_bloc(bloc):
    for cell in bloc.get("ev_row") or []:
        value = cell.get("value")
        if value:
            return str(value).strip()

    return None


def _get_step_code_from_row(row):
    for cell in row.get("cells") or []:
        if cell.get("field") == "Nom (Steps)":
            value = cell.get("value")
            return str(value).strip() if value else None

    return None


def _has_cotation_select(row):
    return any(
        str(cell.get("field") or "").startswith("Cotation")
        and cell.get("type") == "select"
        for cell in row.get("cells") or []
    )


def _normalize_cotation(cotation):
    return str(cotation or "").strip().replace("NOK mineur", "NOK_mineur")


def _is_final_cotation(cotation):
    return _normalize_cotation(cotation) in FINAL_COTATIONS


def _as_local_date(value):
    if not value:
        return None

    if timezone.is_aware(value):
        return timezone.localtime(value).date()

    return value.date()


def _build_step_plan_from_file(gamme):
    if not gamme.fichier_gamme:
        return [], {}

    parsed = parse_gamme(gamme.fichier_gamme.path)

    if parsed.get("error"):
        return [], {}

    ev_order = []
    steps_by_ev = {}

    for bloc in parsed.get("blocs") or []:
        ev_code = _get_ev_code_from_bloc(bloc)
        if not ev_code:
            continue

        steps = []

        for row in bloc.get("rows") or []:
            if not _has_cotation_select(row):
                continue

            step_code = _get_step_code_from_row(row)

            if step_code and step_code not in steps:
                steps.append(step_code)

        if steps:
            ev_order.append(ev_code)
            steps_by_ev[ev_code] = steps

    return ev_order, steps_by_ev


def _build_step_plan_from_history(gamme):
    ev_order = []
    steps_by_ev = {}

    validations = StepValidation.objects.filter(gamme=gamme).order_by(
        "created_at",
        "id",
    )

    for validation in validations:
        ev_code = validation.ev_code or "UNKNOWN_EV"
        step_code = validation.step_code

        if not step_code:
            continue

        if ev_code not in steps_by_ev:
            ev_order.append(ev_code)
            steps_by_ev[ev_code] = []

        if step_code not in steps_by_ev[ev_code]:
            steps_by_ev[ev_code].append(step_code)

    return ev_order, steps_by_ev


def _get_step_plan(gamme):
    ev_order, steps_by_ev = _build_step_plan_from_file(gamme)

    if not steps_by_ev:
        ev_order, steps_by_ev = _build_step_plan_from_history(gamme)

    return ev_order, steps_by_ev


def _iter_relevant_validations(gamme, ev_order, steps_by_ev, newest_first=False):
    ordering = ("-created_at", "-id") if newest_first else ("created_at", "id")

    for validation in StepValidation.objects.filter(gamme=gamme).order_by(
        *ordering
    ):
        ev_code = validation.ev_code or "UNKNOWN_EV"
        step_code = validation.step_code

        if ev_code not in steps_by_ev or step_code not in steps_by_ev[ev_code]:
            continue

        yield ev_code, step_code, validation


def _build_latest_cotations(gamme, ev_order, steps_by_ev):
    latest_cotations = {ev_code: {} for ev_code in ev_order}

    for ev_code, step_code, validation in _iter_relevant_validations(
        gamme,
        ev_order,
        steps_by_ev,
        newest_first=True,
    ):
        latest_cotations[ev_code].setdefault(step_code, validation.cotation)

    return latest_cotations


def calculate_gamme_validation_dates(gamme):
    ev_order, steps_by_ev = _get_step_plan(gamme)

    if not ev_order:
        return None, None

    latest_cotations = {ev_code: {} for ev_code in ev_order}
    first_completed_at = {}

    for ev_code, step_code, validation in _iter_relevant_validations(
        gamme,
        ev_order,
        steps_by_ev,
    ):
        latest_cotations[ev_code][step_code] = validation.cotation

        if ev_code in first_completed_at:
            continue

        if all(
            _is_final_cotation(latest_cotations[ev_code].get(step))
            for step in steps_by_ev[ev_code]
        ):
            first_completed_at[ev_code] = validation.created_at

    first_ev = ev_order[0]
    last_ev = ev_order[-1]

    date_debut = _as_local_date(first_completed_at.get(first_ev))
    date_fin = _as_local_date(first_completed_at.get(last_ev))

    return date_debut, date_fin


def get_gamme_ev_validation_completion(gamme):
    ev_order, steps_by_ev = _get_step_plan(gamme)
    latest_cotations = _build_latest_cotations(gamme, ev_order, steps_by_ev)

    incomplete = {}

    for ev_code in ev_order:
        missing_steps = [
            step
            for step in steps_by_ev[ev_code]
            if not _is_final_cotation(latest_cotations[ev_code].get(step))
        ]

        if missing_steps:
            incomplete[ev_code] = missing_steps

    return {
        "all_validated": bool(ev_order) and not incomplete,
        "ev_order": ev_order,
        "incomplete": incomplete,
    }


def compute_ev_result_from_cotations(cotations):
    if not cotations or any(not _is_final_cotation(cotation) for cotation in cotations):
        return "IN_PROGRESS"

    normalized_cotations = [_normalize_cotation(cotation) for cotation in cotations]

    if "NOK" in normalized_cotations:
        return "NOK"

    if "NOK_mineur" in normalized_cotations:
        return "NOK_mineur"

    return "OK"


def get_gamme_ev_results(gamme):
    ev_order, steps_by_ev = _get_step_plan(gamme)
    latest_cotations = _build_latest_cotations(gamme, ev_order, steps_by_ev)

    return {
        ev_code: compute_ev_result_from_cotations(
            [latest_cotations[ev_code].get(step) for step in steps_by_ev[ev_code]]
        )
        for ev_code in ev_order
    }


def are_all_gamme_evs_validated(gamme):
    return get_gamme_ev_validation_completion(gamme)["all_validated"]


def sync_gamme_validation_dates(gamme, overwrite=True):
    date_debut, date_fin = calculate_gamme_validation_dates(gamme)

    if not overwrite:
        date_debut = gamme.date_debut or date_debut
        date_fin = gamme.date_fin or date_fin

    if gamme.date_debut == date_debut and gamme.date_fin == date_fin:
        return gamme

    gamme.date_debut = date_debut
    gamme.date_fin = date_fin
    gamme.save(update_fields=["date_debut", "date_fin"])

    return gamme
