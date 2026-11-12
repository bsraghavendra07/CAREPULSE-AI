"""Final End-to-End System Validation Suite for MINEARENA 1.0 (PS-03).
Covers all 8 phases with automated, rigorous assertions against real endpoints,
live HAPI FHIR, simulation replayers, and clinical engines.
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
import httpx

from app.main import app
from app.core.news2 import calculate_news2, RiskLevel
from app.core.personalized import PersonalizedEngine
from app.core.artifact_detector import ArtifactDetector
from app.fhir.mapper import create_observation, create_bundle, LOINC_CODES, _UCUM_CODES
from app.fhir.hapi_client import HAPIFHIRClient
from app.fhir.local_store import LocalFHIRStore
from app.simulation.bidmc_replayer import BIDMCReplayer
from app.simulation.wearable_simulator import WearableSimulator
from app.simulation.scenarios import ScenarioEngine

VALIDATION_DATA = {
    "started_at": datetime.now(timezone.utc).isoformat(),
    "phases": {},
    "overall_summary": {},
}


async def run_final_validation():
    print("==========================================================================")
    print("STARTING MINEARENA 1.0 FINAL END-TO-END SYSTEM VALIDATION (PHASES 1 - 8)")
    print("==========================================================================")

    total_checks = 0
    passed_checks = 0

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            hapi_client = HAPIFHIRClient("https://hapi.fhir.org/baseR4", timeout_ms=8000)

            # -------------------------------------------------------------
            # PHASE 1: PATIENT PROFILES
            # -------------------------------------------------------------
            print("\n--- PHASE 1: PATIENT PROFILES ---")
            p1_res = {}
            r_pts = await client.get("/api/patients/")
            pts = r_pts.json() if r_pts.status_code == 200 else []
            
            c1_count = len(pts) == 5
            total_checks += 1
            if c1_count: passed_checks += 1
            p1_res["five_profiles_loaded"] = {"pass": c1_count, "count": len(pts)}

            expected_pids = ["P-001", "P-002", "P-003", "P-004", "P-005"]
            pids_loaded = [p["id"] for p in pts]
            c1_pids = set(expected_pids) == set(pids_loaded)
            total_checks += 1
            if c1_pids: passed_checks += 1
            p1_res["patient_ids_match"] = {"pass": c1_pids, "ids": pids_loaded}

            # Medical conditions & medications
            p2_profile = next((p for p in pts if p["id"] == "P-002"), {})
            c1_copd_scale2 = p2_profile.get("scale2_prescribed") is True
            total_checks += 1
            if c1_copd_scale2: passed_checks += 1
            p1_res["p002_scale2_prescribed"] = {"pass": c1_copd_scale2, "value": p2_profile.get("scale2_prescribed")}

            c1_baselines = all("baseline" in p and "heart_rate" in p["baseline"] for p in pts)
            total_checks += 1
            if c1_baselines: passed_checks += 1
            p1_res["patient_specific_monitoring_config"] = {"pass": c1_baselines}

            VALIDATION_DATA["phases"]["phase1_patient_profiles"] = p1_res
            print(f"Phase 1 complete: {sum(1 for v in p1_res.values() if v.get('pass'))}/{len(p1_res)} passed")

            # -------------------------------------------------------------
            # PHASE 2: DATA INGESTION
            # -------------------------------------------------------------
            print("\n--- PHASE 2: DATA INGESTION ---")
            p2_res = {}
            # BIDMC Replay
            replayer = BIDMCReplayer("app/data/bidmc/bidmc_sample_vitals.csv")
            gen = replayer.replay(speed_factor=10)
            sample_bidmc = await anext(gen)
            c2_bidmc = (
                "hr" in sample_bidmc and sample_bidmc["hr"]["source"] == "BIDMC" and
                "spo2" in sample_bidmc and sample_bidmc["spo2"]["source"] == "BIDMC" and
                "rr" in sample_bidmc and sample_bidmc["rr"]["source"] == "BIDMC"
            )
            total_checks += 1
            if c2_bidmc: passed_checks += 1
            p2_res["bidmc_replay_hr_spo2_rr"] = {
                "pass": c2_bidmc,
                "hr": sample_bidmc.get("hr"),
                "spo2": sample_bidmc.get("spo2"),
                "rr": sample_bidmc.get("rr"),
            }

            # Accelerated playback test
            r_spd = await client.post("/api/simulation/speed", json={"factor": 5})
            c2_speed = r_spd.status_code == 200 and r_spd.json().get("speed_factor") == 5
            total_checks += 1
            if c2_speed: passed_checks += 1
            p2_res["accelerated_playback_control"] = {"pass": c2_speed, "factor": r_spd.json().get("speed_factor")}

            # Virtual wearable simulator (drift, simulated temp, BP)
            sim = WearableSimulator({"baseline_hr": 75, "baseline_spo2": 97, "baseline_rr": 16, "baseline_sbp": 120, "baseline_temp": 36.8})
            sim_vitals = sim.generate_vitals(bidmc_data=sample_bidmc)
            c2_sim_temp = (
                "temp" in sim_vitals and
                sim_vitals["temp"]["source"] == "SIMULATED" and
                35.0 <= sim_vitals["temp"]["value"] <= 39.0
            )
            total_checks += 1
            if c2_sim_temp: passed_checks += 1
            p2_res["simulated_temperature"] = {
                "pass": c2_sim_temp,
                "temp_value": sim_vitals["temp"]["value"],
                "source": sim_vitals["temp"]["source"],
            }

            # Artifact detection: spikes, probe removal, motion noise
            art_detector = ArtifactDetector()
            # Spikes
            spike_eval = art_detector.evaluate({"hr": 140, "spo2": 97, "temp": 36.8}, {"hr": 70, "spo2": 97, "temp": 36.8}, motion_injected=False)
            # Motion noise
            motion_eval = art_detector.evaluate({"hr": 80, "spo2": 90, "temp": 36.8}, {"hr": 78, "spo2": 96, "temp": 36.8}, motion_injected=True)
            # Probe removal flatline
            probe_eval = art_detector.evaluate({"hr": 0, "spo2": 0, "temp": 20.0}, None, motion_injected=False)

            c2_art = spike_eval.artifact_detected and motion_eval.artifact_detected and probe_eval.artifact_detected and probe_eval.status == "LOW"
            total_checks += 1
            if c2_art: passed_checks += 1
            p2_res["drift_spikes_motion_probe_removal"] = {
                "pass": c2_art,
                "spike_flagged": spike_eval.artifact_detected,
                "motion_flagged": motion_eval.artifact_detected,
                "probe_removal_status": probe_eval.status,
            }

            VALIDATION_DATA["phases"]["phase2_data_ingestion"] = p2_res
            print(f"Phase 2 complete: {sum(1 for v in p2_res.values() if v.get('pass'))}/{len(p2_res)} passed")

            # -------------------------------------------------------------
            # PHASE 3: CLINICAL ENGINE
            # -------------------------------------------------------------
            print("\n--- PHASE 3: CLINICAL ENGINE ---")
            p3_res = {}
            # NEWS2 Scale 1 vs Scale 2 for COPD Patient (SpO2 = 89%)
            copd_input = {"hr": 76, "spo2": 89, "rr": 16, "sbp": 120, "temp": 36.8, "acvpu": "A"}
            news_s1 = calculate_news2(copd_input, scale2_prescribed=False, supplemental_oxygen=False)
            news_s2 = calculate_news2(copd_input, scale2_prescribed=True, supplemental_oxygen=False)
            c3_scales = (news_s1.sub_scores.get("spo2") == 3 and news_s2.sub_scores.get("spo2") == 0)
            total_checks += 1
            if c3_scales: passed_checks += 1
            p3_res["news2_scale1_vs_scale2"] = {
                "pass": c3_scales,
                "scale1_spo2_pts": news_s1.sub_scores.get("spo2"),
                "scale2_spo2_pts": news_s2.sub_scores.get("spo2"),
            }

            # Red Score Detection (extreme tachycardia HR = 135 bpm)
            red_input = {"hr": 135, "spo2": 98, "rr": 16, "sbp": 120, "temp": 36.8, "acvpu": "A"}
            res_red = calculate_news2(red_input, scale2_prescribed=False, supplemental_oxygen=False)
            c3_red = res_red.has_red_score and res_red.red_score_parameter == "hr" and res_red.triage_tier == "WATCH"
            total_checks += 1
            if c3_red: passed_checks += 1
            p3_res["red_score_detection"] = {
                "pass": c3_red,
                "has_red_score": res_red.has_red_score,
                "red_param": res_red.red_score_parameter,
                "triage_tier": res_red.triage_tier,
            }

            # Rolling baselines & Personalization Z-scores
            pers_engine = PersonalizedEngine()
            for h in [70, 74, 71, 73, 72, 70, 74, 72, 71, 73]:
                pers_engine.update("P-001", {"hr": h, "spo2": 98, "rr": 16})
            pers_eval = pers_engine.get_assessment("P-001", {"hr": 112, "spo2": 98, "rr": 16})
            c3_pers = pers_eval.baseline.get("hr") is not None and pers_eval.z_scores.get("hr", 0) > 2.0
            total_checks += 1
            if c3_pers: passed_checks += 1
            p3_res["personalized_rolling_baseline_and_zscore"] = {
                "pass": c3_pers,
                "baseline_hr": pers_eval.baseline.get("hr"),
                "z_score_hr": pers_eval.z_scores.get("hr"),
                "is_advisory": pers_eval.is_advisory_alert,
            }

            # Ensure genuine deterioration is NOT rejected
            genuine_desat = art_detector.evaluate({"hr": 88, "spo2": 85, "temp": 36.8}, {"hr": 80, "spo2": 96, "temp": 36.8}, motion_injected=False)
            c3_genuine = not genuine_desat.artifact_detected
            total_checks += 1
            if c3_genuine: passed_checks += 1
            p3_res["genuine_deterioration_not_rejected"] = {
                "pass": c3_genuine,
                "artifact_flagged": genuine_desat.artifact_detected,
                "status": genuine_desat.status,
            }

            VALIDATION_DATA["phases"]["phase3_clinical_engine"] = p3_res
            print(f"Phase 3 complete: {sum(1 for v in p3_res.values() if v.get('pass'))}/{len(p3_res)} passed")

            # -------------------------------------------------------------
            # PHASE 4: FHIR INTEGRATION & HAPI
            # -------------------------------------------------------------
            print("\n--- PHASE 4: FHIR INTEGRATION & HAPI ---")
            p4_res = {}
            # Test live ingestion of all 4 vitals
            fhir_vitals_test = [
                ("heart_rate", 86.0, "8867-4", "/min", "P-001"),
                ("oxygen_saturation", 95.0, "2708-6", "%", "P-002"),
                ("respiratory_rate", 19.0, "9279-1", "/min", "P-003"),
                ("body_temperature", 37.4, "8310-5", "Cel", "P-004"),
            ]
            all_fhir_ok = True
            hapi_retrievals = []

            for vname, val, expected_loinc, expected_ucum, pid in fhir_vitals_test:
                r_ingest = await client.post("/api/fhir/observation", json={
                    "patient_id": pid,
                    "vital_name": vname,
                    "value": val,
                })
                ok_ingest = r_ingest.status_code == 201
                body = r_ingest.json() if ok_ingest else {}
                hapi_id = body.get("hapi_resource_id")
                
                # Check live retrieval from HAPI
                retrieved_ok = False
                if hapi_id:
                    hapi_fetch = await hapi_client.get_resource("Observation", str(hapi_id))
                    if hapi_fetch and hapi_fetch.get("id") == str(hapi_id):
                        retrieved_ok = True
                        hapi_retrievals.append({"vital": vname, "hapi_id": hapi_id, "status": "200 OK"})

                if not (ok_ingest and retrieved_ok and body.get("loinc_code") == expected_loinc):
                    all_fhir_ok = False

            total_checks += 1
            if all_fhir_ok: passed_checks += 1
            p4_res["live_hapi_fhir_storage_and_retrieval"] = {
                "pass": all_fhir_ok,
                "retrieved_observations": hapi_retrievals,
            }

            # Verify local fallback
            local_store = LocalFHIRStore()
            dummy_obs = create_observation("P-001", "heart_rate", 80.0, "/min", datetime.now(timezone.utc).isoformat(), "SIMULATED")
            loc_id = local_store.store(dummy_obs)
            loc_retrieved = local_store.get("Observation", loc_id)
            c4_loc = loc_retrieved is not None and loc_retrieved.get("id") == loc_id
            total_checks += 1
            if c4_loc: passed_checks += 1
            p4_res["local_fallback_store_verified"] = {"pass": c4_loc, "stored_id": loc_id}

            VALIDATION_DATA["phases"]["phase4_fhir"] = p4_res
            print(f"Phase 4 complete: {sum(1 for v in p4_res.values() if v.get('pass'))}/{len(p4_res)} passed")

            # -------------------------------------------------------------
            # PHASE 5: ALERT MANAGEMENT
            # -------------------------------------------------------------
            print("\n--- PHASE 5: ALERT MANAGEMENT ---")
            p5_res = {}
            # Test all 4 Triage Tiers: ROUTINE, WATCH, REVIEW, URGENT
            res_routine = calculate_news2({"hr": 70, "spo2": 98, "rr": 16, "sbp": 120, "temp": 36.8, "acvpu": "A"}, scale2_prescribed=False, supplemental_oxygen=False)
            res_watch = calculate_news2({"hr": 135, "spo2": 98, "rr": 16, "sbp": 120, "temp": 36.8, "acvpu": "A"}, scale2_prescribed=False, supplemental_oxygen=False)
            res_review = calculate_news2({"hr": 115, "spo2": 94, "rr": 22, "sbp": 120, "temp": 36.8, "acvpu": "A"}, scale2_prescribed=False, supplemental_oxygen=False)
            res_urgent = calculate_news2({"hr": 135, "spo2": 88, "rr": 28, "sbp": 85, "temp": 39.5, "acvpu": "V"}, scale2_prescribed=False, supplemental_oxygen=False)

            c5_tiers = (
                res_routine.triage_tier == "ROUTINE" and
                res_watch.triage_tier == "WATCH" and
                res_review.triage_tier == "REVIEW" and
                res_urgent.triage_tier == "URGENT"
            )
            total_checks += 1
            if c5_tiers: passed_checks += 1
            p5_res["triage_tiers_verified"] = {
                "pass": c5_tiers,
                "routine": res_routine.triage_tier,
                "watch": res_watch.triage_tier,
                "review": res_review.triage_tier,
                "urgent": res_urgent.triage_tier,
            }

            # Alert explanations & clinical actions
            c5_actions = bool(res_urgent.alert_reason) and bool(res_urgent.clinical_action)
            total_checks += 1
            if c5_actions: passed_checks += 1
            p5_res["alert_explanations_and_actions"] = {
                "pass": c5_actions,
                "reason": res_urgent.alert_reason,
                "action": res_urgent.clinical_action,
            }

            # Separation of Device Connectivity vs Clinical Alert
            c5_device = probe_eval.status == "LOW" and not genuine_desat.artifact_detected
            total_checks += 1
            if c5_device: passed_checks += 1
            p5_res["device_alert_separated_from_clinical"] = {
                "pass": c5_device,
                "device_note": probe_eval.note,
            }

            # Suggested Specialty for Review (Clinical Decision Support)
            from app.core.specialty_recommender import recommend_specialty
            spec_resp = recommend_specialty(calculate_news2({"hr": 75, "spo2": 88, "rr": 16, "sbp": 120, "temp": 37.0}, False, False), {"hr": 75, "spo2": 88, "rr": 16, "sbp": 120, "temp": 37.0}, "HIGH")
            spec_card = recommend_specialty(calculate_news2({"hr": 135, "spo2": 98, "rr": 16, "sbp": 120, "temp": 37.0}, False, False), {"hr": 135, "spo2": 98, "rr": 16, "sbp": 120, "temp": 37.0}, "HIGH")
            spec_temp = recommend_specialty(calculate_news2({"hr": 75, "spo2": 98, "rr": 16, "sbp": 120, "temp": 39.4}, False, False), {"hr": 75, "spo2": 98, "rr": 16, "sbp": 120, "temp": 39.4}, "HIGH")
            spec_multi = recommend_specialty(calculate_news2({"hr": 128, "spo2": 95, "rr": 28, "sbp": 88, "temp": 39.4}, False, False), {"hr": 128, "spo2": 95, "rr": 28, "sbp": 88, "temp": 39.4}, "HIGH")
            spec_norm = recommend_specialty(calculate_news2({"hr": 72, "spo2": 98, "rr": 15, "sbp": 120, "temp": 36.8}, False, False), {"hr": 72, "spo2": 98, "rr": 15, "sbp": 120, "temp": 36.8}, "HIGH")
            spec_artifact = recommend_specialty(calculate_news2({"hr": 0, "spo2": 0, "rr": 0, "sbp": 0, "temp": 36.8}, False, False), {"hr": 0, "spo2": 0, "rr": 0, "sbp": 0, "temp": 36.8}, "LOW")

            c5_spec = (
                spec_resp.suggested_specialty == "Pulmonology" and
                spec_card.suggested_specialty == "Cardiology" and
                spec_temp.suggested_specialty == "Internal Medicine" and
                spec_multi.suggested_specialty == "General Medicine" and
                spec_norm.is_applicable is False and
                spec_artifact.is_applicable is False
            )
            total_checks += 1
            if c5_spec: passed_checks += 1
            p5_res["suggested_specialty_clinical_decision_support"] = {
                "pass": c5_spec,
                "resp_specialty": spec_resp.suggested_specialty,
                "cardiac_specialty": spec_card.suggested_specialty,
                "internal_med_specialty": spec_temp.suggested_specialty,
                "multi_vital_specialty": spec_multi.suggested_specialty,
                "normal_suppressed": not spec_norm.is_applicable,
                "artifact_suppressed": not spec_artifact.is_applicable,
            }

            VALIDATION_DATA["phases"]["phase5_alert_management"] = p5_res
            print(f"Phase 5 complete: {sum(1 for v in p5_res.values() if v.get('pass'))}/{len(p5_res)} passed")

            # -------------------------------------------------------------
            # PHASE 6: SCENARIO TESTING (All 6 Scenarios)
            # -------------------------------------------------------------
            print("\n--- PHASE 6: SCENARIO TESTING ---")
            p6_res = {}
            scenarios = [
                ("sepsis", "P-003"),
                ("copd_exacerbation", "P-002"),
                ("cardiac_decompensation", "P-001"),
                ("motion_artifact", "P-004"),
                ("sensor_disconnect", "P-001"),
                ("normal_recovery", "P-005"),
            ]
            all_sc_ok = True
            sc_details = {}

            for sc_id, pid in scenarios:
                r_trig = await client.post("/api/scenarios/trigger", json={"patient_id": pid, "scenario": sc_id})
                r_act = await client.get("/api/scenarios/active")
                is_active = r_act.json().get(pid) == sc_id
                r_clr = await client.post("/api/scenarios/clear", json={"patient_id": pid})
                
                sc_details[sc_id] = {
                    "patient_id": pid,
                    "trigger_status": r_trig.status_code,
                    "activated": is_active,
                    "clear_status": r_clr.status_code,
                }
                if not (r_trig.status_code == 200 and is_active and r_clr.status_code == 200):
                    all_sc_ok = False

            total_checks += 1
            if all_sc_ok: passed_checks += 1
            p6_res["all_six_scenarios_verified"] = {
                "pass": all_sc_ok,
                "scenarios": sc_details,
            }

            VALIDATION_DATA["phases"]["phase6_scenarios"] = p6_res
            print(f"Phase 6 complete: {sum(1 for v in p6_res.values() if v.get('pass'))}/{len(p6_res)} passed")

            # -------------------------------------------------------------
            # PHASE 7: PERFORMANCE EVALUATION
            # -------------------------------------------------------------
            print("\n--- PHASE 7: PERFORMANCE EVALUATION ---")
            p7_res = {}
            r_perf = await client.get("/api/report/performance")
            perf_json = r_perf.json() if r_perf.status_code == 200 else {}
            
            has_alerts_per_day = "alerts_per_patient_day" in perf_json
            has_artifacts = "artifact_flags" in perf_json
            has_latency = "detection_latency" in perf_json
            has_ticks = "total_ticks" in perf_json

            c7_perf = has_alerts_per_day and has_artifacts and has_latency and has_ticks
            total_checks += 1
            if c7_perf: passed_checks += 1
            p7_res["runtime_performance_metrics"] = {
                "pass": c7_perf,
                "alerts_per_patient_day": perf_json.get("alerts_per_patient_day"),
                "total_monitored_patient_days": perf_json.get("total_monitored_patient_days"),
                "artifact_flags": perf_json.get("artifact_flags"),
                "total_ticks": perf_json.get("total_ticks"),
                "news2_alerts_fired": perf_json.get("news2_alerts_fired"),
            }

            VALIDATION_DATA["phases"]["phase7_performance"] = p7_res
            print(f"Phase 7 complete: {sum(1 for v in p7_res.values() if v.get('pass'))}/{len(p7_res)} passed")

            # -------------------------------------------------------------
            # PHASE 8: FINAL VERIFICATION & SYSTEM HEALTH
            # -------------------------------------------------------------
            print("\n--- PHASE 8: FINAL VERIFICATION & SYSTEM HEALTH ---")
            p8_res = {}
            
            # 8.1 API endpoints health
            r_root = await client.get("/")
            c8_root = r_root.status_code == 200 and r_root.json().get("status") == "operational"
            total_checks += 1
            if c8_root: passed_checks += 1
            p8_res["backend_root_health"] = {"pass": c8_root, "status": r_root.json().get("status")}

            # 8.2 Telemetry history endpoint
            r_thist = await client.get("/api/telemetry/P-001/history")
            c8_hist = r_thist.status_code == 200
            total_checks += 1
            if c8_hist: passed_checks += 1
            p8_res["telemetry_history_stream"] = {"pass": c8_hist, "records_buffered": len(r_thist.json()) if c8_hist else 0}

            VALIDATION_DATA["phases"]["phase8_final_verification"] = p8_res
            print(f"Phase 8 complete: {sum(1 for v in p8_res.values() if v.get('pass'))}/{len(p8_res)} passed")

    # Overall Summary
    VALIDATION_DATA["overall_summary"] = {
        "total_checks": total_checks,
        "passed_checks": passed_checks,
        "failed_checks": total_checks - passed_checks,
        "pass_rate_percent": round((passed_checks / total_checks) * 100, 1),
        "status": "ALL CHECKS PASSED (100%)" if passed_checks == total_checks else f"PARTIAL ({passed_checks}/{total_checks})",
        "finished_at": datetime.now(timezone.utc).isoformat(),
    }

    with open("final_validation_output.json", "w", encoding="utf-8") as f:
        json.dump(VALIDATION_DATA, f, indent=2)

    print("\n==========================================================================")
    print(f"FINAL VALIDATION RESULT: {passed_checks}/{total_checks} PASSED ({VALIDATION_DATA['overall_summary']['pass_rate_percent']}%)")
    print("==========================================================================")


if __name__ == "__main__":
    asyncio.run(run_final_validation())
