import requests

BACKEND_URL = "http://127.0.0.1:8000"


# ---------------- UPLOAD ----------------

def upload_contract(file):

    files = {
        "file": (file.name, file, "application/pdf")
    }

    response = requests.post(
        f"{BACKEND_URL}/upload",
        files=files
    )

    print("UPLOAD STATUS:", response.status_code)
    print("UPLOAD RESPONSE:", response.text)

    if response.status_code != 200:
        return None

    return response.json()


# ---------------- GET CONTRACT ----------------

def get_contract(contract_id):

    response = requests.get(
        f"{BACKEND_URL}/contract",
        params={"contract_id": contract_id}
    )

    print("CONTRACT STATUS:", response.status_code)
    print("CONTRACT RAW:", response.text)

    if response.status_code != 200:
        return None

    return response.json()


# ---------------- CHAT ----------------

def send_chat(contract_id, message):

    try:

        url = f"{BACKEND_URL}/chat/chat"

        print("CALLING:", url)
        print("PARAMS:", contract_id, message)

        response = requests.post(
            url,
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
