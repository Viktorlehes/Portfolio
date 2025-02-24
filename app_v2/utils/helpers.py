def safe_get(d, keys, default=None):
    """Safely retrieve a nested value from a dictionary"""
    for key in keys:
        if d is None or not isinstance(d, dict):
            return default
        d = d.get(key)
    return d if d is not None else default

def safe_float(value, precision=None):
    """Convert value to float with optional rounding"""
    try:
        f_value = float(value)
        return round(f_value, precision) if precision is not None else f_value
    except (TypeError, ValueError):
        return 0