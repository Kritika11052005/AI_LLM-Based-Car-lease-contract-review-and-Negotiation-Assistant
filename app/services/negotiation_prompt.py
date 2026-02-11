import json

def build_prompt(sla, risk_context, memory, user_message):

    return f"""
You are an expert car lease negotiation assistant.

Contract details:
{json.dumps(sla, indent=2)}

Risk findings:
{json.dumps(risk_context, indent=2)}

Conversation history:
{memory}

User message:
{user_message}

Give professional negotiation advice.
"""
