"""Integration test for all FastAPI endpoints using httpx AsyncClient."""

import asyncio
import httpx
from app.main import app

async def run_api_tests():
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            # 1. Root
            r = await client.get("/")
            assert r.status_code == 200, f"Root failed: {r.status_code}"
            print("PASS: GET / ->", r.json())

            # 2. Patients list
            r = await client.get("/api/patients/")
            assert r.status_code == 200, f"List patients failed: {r.status_code}"
            patients = r.json()
            assert len(patients) == 5, f"Expected 5 patients, got {len(patients)}"
            print(f"PASS: GET /api/patients/ returned {len(patients)} profiles")

            # 3. Patient detail
            r = await client.get("/api/patients/P-002")
            assert r.status_code == 200, f"P-002 failed: {r.status_code}"
            p2 = r.json()
            assert p2["scale2_prescribed"] is True, "P-002 must have Scale 2"
            print("PASS: GET /api/patients/P-002 ->", p2["name"], "Scale 2:", p2["scale2_prescribed"])

            # 4. Trigger scenario
            r = await client.post("/api/scenarios/trigger", json={"patient_id": "P-003", "scenario": "sepsis"})
            assert r.status_code == 200, f"Trigger failed: {r.status_code}"
            print("PASS: POST /api/scenarios/trigger ->", r.json()["scenario"])

            # 5. Check active scenarios
            r = await client.get("/api/scenarios/active")
            assert r.status_code == 200, f"Active scenarios failed: {r.status_code}"
            active = r.json()
            assert active.get("P-003") == "sepsis"
            print("PASS: GET /api/scenarios/active ->", active)

            # Wait for 2 ticks to accumulate in background loop
            await asyncio.sleep(2.5)

            # 6. Performance report
            r = await client.get("/api/report/performance")
            assert r.status_code == 200, f"Report failed: {r.status_code}"
            rep = r.json()
            assert "total_ticks" in rep
            assert rep["total_ticks"] > 0
            assert "news2_alerts_fired" in rep
            print("PASS: GET /api/report/performance -> Live computed ticks:", rep["total_ticks"])

            # 7. FHIR Bundle
            r = await client.get("/api/fhir/patient/P-001/bundle")
            assert r.status_code == 200, f"FHIR Bundle failed: {r.status_code}"
            bundle = r.json()
            assert bundle["resourceType"] == "Bundle"
            print(f"PASS: GET /api/fhir/patient/P-001/bundle -> Bundle with {bundle.get('total', 0)} entries")

            # 8. Clear scenario
            r = await client.post("/api/scenarios/clear", json={"patient_id": "P-003"})
            assert r.status_code == 200
            print("PASS: POST /api/scenarios/clear")

    print("\nALL API ENDPOINTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_api_tests())
