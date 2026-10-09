"""Central settings so file paths / column names are defined in ONE place."""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATASET = BASE_DIR / "dataset" / "student_performance.csv"
UPLOAD_DIR = BASE_DIR / "dataset" / "uploads"

TARGET = "Performance"          # the class attribute we predict
ID_COL = "Student_ID"           # identifier - never used as a model feature
CLASS_PREFERRED = ["Excellent", "Good", "Average", "Poor"]   # best -> worst
MAX_UPLOAD_MB = 10
RANDOM_STATE = 42

# Plausible value ranges used to detect impossible / mistyped values.
VALID_RANGES = {
    "Attendance": (0, 100), "Internal_Marks": (0, 100), "Assignment_Marks": (0, 100),
    "Previous_Marks": (0, 100), "Practical_Marks": (0, 100), "Midterm_Marks": (0, 100),
    "Study_Hours": (0, 16), "Backlogs": (0, 20),
}
