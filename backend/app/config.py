"""
MINEARENA 1.0 — Application configuration and constants.
"""

# ──────────────────────────────────────────────
# HAPI FHIR Server
# ──────────────────────────────────────────────
HAPI_FHIR_BASE_URL: str = "https://hapi.fhir.org/baseR4"
HAPI_FHIR_TIMEOUT_MS: int = 8000

# ──────────────────────────────────────────────
# WebSocket / Simulation Tick
# ──────────────────────────────────────────────
WS_TICK_INTERVAL_BASE: float = 1.0  # seconds
SIMULATION_SPEEDS: list[int] = [1, 2, 5, 10]

# ──────────────────────────────────────────────
# LOINC Codes
# ──────────────────────────────────────────────
LOINC_CODES: dict[str, str] = {
    "HR":   "8867-4",
    "SpO2": "2708-6",
    "RR":   "9279-1",
    "SBP":  "8480-6",
    "Temp": "8310-5",
}

# ──────────────────────────────────────────────
# NEWS2 Risk Thresholds
# ──────────────────────────────────────────────
NEWS2_RISK_THRESHOLDS = {
    "LOW":        {"min": 0, "max": 4},
    "LOW_MEDIUM": "any_single_param_equals_3",
    "MEDIUM":     {"min": 5, "max": 6},
    "HIGH":       {"min": 7, "max": None},
}

# ──────────────────────────────────────────────
# Signal Quality Index (SQI) Thresholds
# ──────────────────────────────────────────────
SQI_THRESHOLDS = {
    "HR_MIN":  20,
    "HR_MAX":  300,
    "SPO2_MIN": 40,
    "TEMP_MIN": 30.0,
    "TEMP_MAX": 45.0,
    "DELTA_HR_SPIKE": 50,       # |ΔHR| > 50 in 1 second
    "SPIKE_RETURN_WINDOW": 3,   # must return within 3 seconds
    "FLATLINE_DURATION": 30,    # identical value for >30 consecutive seconds
}

# ──────────────────────────────────────────────
# Personalized Engine
# ──────────────────────────────────────────────
EMA_ALPHA: float = 0.1
Z_SCORE_ALERT_THRESHOLD: float = 2.0
Z_SCORE_SUSTAINED_READINGS: int = 3

# ──────────────────────────────────────────────
# Scenario Defaults
# ──────────────────────────────────────────────
SCENARIO_RAMP_TICKS: int = 60
