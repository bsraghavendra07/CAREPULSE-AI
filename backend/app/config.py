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
# Signal Quality Index (SQI) & Vital Validation Ranges
# ──────────────────────────────────────────────
VITAL_VALIDATION_RANGES = {
    "spo2": {"min": 0.0, "max": 100.0, "plausible_min": 50.0, "plausible_max": 100.0},
    "heart_rate": {"min": 0.0, "max": 280.0, "plausible_min": 30.0, "plausible_max": 220.0},
    "respiratory_rate": {"min": 0.0, "max": 80.0, "plausible_min": 4.0, "plausible_max": 60.0},
    "body_temperature": {"min": 25.0, "max": 45.0, "plausible_min": 32.0, "plausible_max": 42.5},
    "systolic_bp": {"min": 30.0, "max": 300.0, "plausible_min": 50.0, "plausible_max": 260.0},
}

SQI_THRESHOLDS = {
    "HR_MIN":  20,
    "HR_MAX":  300,
    "SPO2_MIN": 40,
    "TEMP_MIN": 30.0,
    "TEMP_MAX": 45.0,
    "DELTA_HR_SPIKE": 50,       # |ΔHR| > 50 in 1 second
    "DELTA_SPO2_JUMP": 25,      # |ΔSpO2| > 25 in 1 second (impossible physiological jump)
    "SPIKE_RETURN_WINDOW": 3,   # must return within 3 seconds
    "FLATLINE_DURATION": 15,    # identical value for >=15 consecutive ticks
    "NEAR_FLATLINE_WINDOW": 10, # window size for near-flatline check
    "NEAR_FLATLINE_VAR": 0.02,  # variance threshold for suspiciously constant signal
    "OSCILLATION_COUNT": 3,     # rapid direction switches within 5 ticks
}

# ──────────────────────────────────────────────
# Personalized Engine & Gradual Deterioration
# ──────────────────────────────────────────────
EMA_ALPHA: float = 0.1
Z_SCORE_ALERT_THRESHOLD: float = 2.0
Z_SCORE_SUSTAINED_READINGS: int = 3

# Gradual Deterioration Rolling Baseline Thresholds
GRADUAL_DETERIORATION_WINDOW: int = 10         # Number of historical ticks in rolling window
GRADUAL_DETERIORATION_MIN_READINGS: int = 5    # Minimum readings before computing trend
GRADUAL_DETERIORATION_SPO2_DROP: float = 3.0   # Drop in SpO2 (%) from baseline to trigger deterioration
GRADUAL_DETERIORATION_HR_RISE: float = 15.0    # Rise in HR (bpm) from baseline
GRADUAL_DETERIORATION_RR_RISE: float = 4.0     # Rise in RR (/min) from baseline
GRADUAL_DETERIORATION_CONSECUTIVE_DECLINE: int = 4  # Consecutive downward steps

# ──────────────────────────────────────────────
# Scenario Defaults
# ──────────────────────────────────────────────
SCENARIO_RAMP_TICKS: int = 60
