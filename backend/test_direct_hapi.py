import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(timeout=15.0) as client:
        print("1. Testing GET CapabilityStatement...")
        try:
            r0 = await client.get("https://hapi.fhir.org/baseR4/metadata", headers={"Accept": "application/fhir+json"})
            print(f"Metadata Status: {r0.status_code}")
        except Exception as e:
            print(f"Metadata failed: {e}")

        print("2. Testing PUT Patient/P-001...")
        try:
            pat = {
                "resourceType": "Patient",
                "id": "P-001",
                "name": [{"family": "Thompson", "given": ["Robert"]}]
            }
            r1 = await client.put("https://hapi.fhir.org/baseR4/Patient/P-001", json=pat, headers={"Content-Type": "application/fhir+json"})
            print(f"PUT Patient Status: {r1.status_code}")
            print(f"PUT Patient Response: {r1.text[:200]}")
        except Exception as e:
            print(f"PUT Patient failed: {e}")

        print("3. Testing POST Observation...")
        try:
            obs = {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                    "coding": [{"system": "http://loinc.org", "code": "8867-4", "display": "Heart rate"}]
                },
                "valueQuantity": {
                    "value": 82.0,
                    "unit": "/min",
                    "system": "http://unitsofmeasure.org",
                    "code": "/min"
                }
            }
            r2 = await client.post("https://hapi.fhir.org/baseR4/Observation", json=obs, headers={"Content-Type": "application/fhir+json"})
            print(f"POST Obs Status: {r2.status_code}")
            print(f"POST Obs Response: {r2.text[:200]}")
            if r2.status_code == 201:
                obs_id = r2.json().get("id")
                print(f"Captured Obs ID: {obs_id}")
                r3 = await client.get(f"https://hapi.fhir.org/baseR4/Observation/{obs_id}", headers={"Accept": "application/fhir+json"})
                print(f"GET Obs Status: {r3.status_code}")
                print(f"GET Obs JSON id: {r3.json().get('id')}")
        except Exception as e:
            print(f"POST Obs failed: {e}")

asyncio.run(test())

