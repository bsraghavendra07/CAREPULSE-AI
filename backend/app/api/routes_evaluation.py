"""
CAREPULSE 1.0 — Evaluation & Benchmark API Routes (/api/evaluation).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.core.benchmark_evaluator import PerformanceBenchmarkReport, run_comparative_benchmark
from app.core.cds_alert_generator import CDSAlert, cds_alert_generator

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])


class MotionNoiseTestRequest(BaseModel):
    patient_id: str = "P-001"
    drop_vital: str = "oxygen_saturation"
    drop_value: float = 70.0


@router.get("/benchmark", response_model=PerformanceBenchmarkReport)
async def get_performance_benchmark() -> PerformanceBenchmarkReport:
    """Retrieve comparative benchmark evaluation comparing Fixed-Threshold vs Intelligent Monitoring."""
    return run_comparative_benchmark()


@router.post("/run-benchmark", response_model=PerformanceBenchmarkReport)
async def rerun_performance_benchmark() -> PerformanceBenchmarkReport:
    """Re-run scenario replays across wearable simulation and BIDMC physiological streams."""
    return run_comparative_benchmark()


@router.get("/cds-alerts", response_model=List[CDSAlert])
async def list_cds_alerts(patient_id: Optional[str] = None, limit: int = 50) -> List[CDSAlert]:
    """Retrieve recent Clinical Decision-Support alerts (WATCH, REVIEW, URGENT)."""
    return cds_alert_generator.get_recent_alerts(patient_id=patient_id, limit=limit)
