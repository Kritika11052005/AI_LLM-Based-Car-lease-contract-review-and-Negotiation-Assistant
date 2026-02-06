import json
import os

RULE_PATH = os.path.join("app", "rules", "sla_rules.json")

with open(RULE_PATH, "r") as f:
    RULES = json.load(f)


def check_condition(value, condition):
    if condition == "missing":
        return value is None

    try:
        if "%" in condition:
            percent = float(condition.replace("<", "").replace(">", "").replace("%", ""))
            return value is not None and value < percent

        if "-" in condition:
            low, high = condition.split("-")
            return float(low.strip()) <= float(value) <= float(high.strip())

        if condition.startswith("<"):
            return value is not None and float(value) < float(condition[1:].strip())

        if condition.startswith(">"):
            return value is not None and float(value) > float(condition[1:].strip())

    except:
        return False

    return False


def apply_rules(sla: dict):
    flags = []

    for field, scenarios in RULES.items():
        value = sla.get(field)

        for rule in scenarios:
            if check_condition(value, rule["condition"]):
                flags.append({
                    "field": field,
                    "severity": rule["severity"],
                    "issue": rule["issue"],
                    "reason": rule["reason"],
                    "negotiation_intent": rule["negotiation_intent"]
                })

    return flags
