import requests

BACKEND_URL = "http://127.0.0.1:8000"


# ---------------- UPLOAD CONTRACT ----------------

def upload_contract(file):

    files = {
        "file": (file.name, file, "application/pdf")
    }

    try:

        response = requests.post(
            f"{BACKEND_URL}/upload",
            files=files
        )

        print("UPLOAD STATUS:", response.status_code)
        print("UPLOAD RESPONSE:", response.text)

        if response.status_code != 200:
            return None

        data = response.json()

        return {
            "contract_id": data.get("contract_id")
        }

    except Exception as e:

        print("UPLOAD ERROR:", str(e))
        return None


# ---------------- GET CONTRACT ----------------

def get_contract(contract_id):

    try:

        response = requests.get(
            f"{BACKEND_URL}/contract",
            params={"contract_id": contract_id}
        )

        print("CONTRACT STATUS:", response.status_code)
        print("CONTRACT RESPONSE:", response.text)

        if response.status_code != 200:
            return None

        return response.json()

    except Exception as e:

        print("CONTRACT ERROR:", str(e))
        return None


# ---------------- CHAT ----------------

def send_chat(contract_id, message):

    try:

        response = requests.post(
            f"{BACKEND_URL}/chat/chat",
            params={
                "contract_id": contract_id,
                "message": message
            }
        )

        print("CHAT STATUS:", response.status_code)
        print("CHAT RESPONSE:", response.text)

        if response.status_code != 200:
            return None

        data = response.json()

        return data.get("reply")

    except Exception as e:

        print("CHAT ERROR:", str(e))
        return None