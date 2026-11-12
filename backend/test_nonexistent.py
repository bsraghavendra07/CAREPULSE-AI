import requests

try:
    r = requests.post(
        "http://localhost:8000/api/fhir/observation",
        json={"patient_id": "P-999-NONEXISTENT", "vital_name": "heart_rate", "value": 80.0},
        timeout=60
    )
    print("Status:", r.status_code)
    data = r.json()
    print("HAPI Resource ID:", data.get("hapi_resource_id"))
    print("Patient Ref:", data.get("patient_reference"))
    print("Local Store ID:", data.get("local_store_id"))
except Exception as e:
    print("Error:", e)

