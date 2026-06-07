import re


def derive_initials(name: str | None) -> str:
    if not name:
        return ""

    parts = re.findall(r"[A-Za-z0-9]+", name)
    initials: list[str] = []
    for part in parts:
        if len(part) <= 3 and part.upper() == part:
            initials.append(part)
        else:
            initials.append(part[0])
    return "".join(initials).upper()[:20]


def display_initials(initials: str | None, fallback_name: str | None) -> str | None:
    cleaned = (initials or "").strip()
    if cleaned:
        return cleaned
    derived = derive_initials(fallback_name)
    return derived or None
