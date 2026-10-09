"""
generate_dataset.py
-------------------
Creates dataset/student_performance.csv - a SYNTHETIC but realistic student
academic-performance dataset (1,500 students + a few deliberate defects).

How the data is built (so you can explain it in your viva):
1. Every student gets a hidden "academic ability" and "discipline" score drawn
   from a normal distribution. These are never saved in the CSV.
2. Visible attributes (attendance, study hours, marks ...) are generated from
   those hidden scores PLUS random noise, so they correlate with each other
   the way they do in real classrooms.
3. A weighted composite score (+ noise) decides the final Performance class.
   The noise means no model can reach 100% accuracy - just like real data.
4. Finally we inject realistic data-quality problems (missing values,
   duplicates, impossible values, messy labels) so that the Data Preprocessing
   page has real work to do.

Run:  python scripts/generate_dataset.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 42
N_STUDENTS = 1500
OUT_FILE = Path(__file__).resolve().parent.parent / "dataset" / "student_performance.csv"

rng = np.random.default_rng(SEED)


def clip(x, lo, hi):
    return np.clip(x, lo, hi)


# ---- 1. hidden traits ------------------------------------------------------
ability = rng.normal(0, 1, N_STUDENTS)
discipline = 0.5 * ability + rng.normal(0, 0.9, N_STUDENTS)

# ---- 2. visible attributes -------------------------------------------------
attendance = clip(76 + 9 * discipline + rng.normal(0, 6, N_STUDENTS), 35, 100)
study_hours = clip(4.5 + 1.3 * (0.5 * ability + 0.6 * discipline) + rng.normal(0, 0.9, N_STUDENTS), 0.3, 11)
previous = clip(65 + 11 * ability + rng.normal(0, 6, N_STUDENTS), 25, 99)
internal = clip(64 + 7 * ability + 0.08 * (attendance - 76) + 1.2 * (study_hours - 4.5)
                + rng.normal(0, 6, N_STUDENTS), 15, 100)
assignment = clip(68 + 5 * discipline + 3 * ability + rng.normal(0, 8, N_STUDENTS), 10, 100)
practical = clip(70 + 6 * ability + rng.normal(0, 8, N_STUDENTS), 20, 100)
midterm = clip(60 + 9 * ability + 0.1 * (attendance - 76) + rng.normal(0, 7, N_STUDENTS), 10, 100)
backlogs = clip(rng.poisson(np.exp(-1.0 - 0.7 * ability)), 0, 6)

part_score = 0.6 * discipline + 0.4 * ability + rng.normal(0, 0.8, N_STUDENTS)
low_cut, high_cut = np.quantile(part_score, [0.30, 0.70])
participation = np.where(part_score < low_cut, "Low", np.where(part_score < high_cut, "Medium", "High"))

# ---- 3. target class -------------------------------------------------------
composite = (0.18 * attendance + 0.22 * internal + 0.14 * assignment + 0.12 * (study_hours * 9)
             + 0.14 * previous + 0.08 * practical + 0.12 * midterm - 2.5 * backlogs
             + rng.normal(0, 4, N_STUDENTS))
c_poor, c_avg, c_good = np.quantile(composite, [0.15, 0.50, 0.85])
performance = np.where(composite < c_poor, "Poor",
                np.where(composite < c_avg, "Average",
                  np.where(composite < c_good, "Good", "Excellent")))

df = pd.DataFrame({
    "Student_ID": [f"STU{i:04d}" for i in range(1, N_STUDENTS + 1)],
    "Attendance": attendance.round(1),
    "Internal_Marks": internal.round(1),
    "Assignment_Marks": assignment.round(1),
    "Study_Hours": study_hours.round(1),
    "Previous_Marks": previous.round(1),
    "Practical_Marks": practical.round(1),
    "Midterm_Marks": midterm.round(1),
    "Class_Participation": participation,
    "Backlogs": backlogs.astype(int),
    "Performance": performance,
})

# ---- 4. inject realistic defects -------------------------------------------
feature_cols = ["Attendance", "Internal_Marks", "Assignment_Marks", "Study_Hours",
                "Previous_Marks", "Practical_Marks", "Midterm_Marks", "Class_Participation"]

# 4a. ~2% of cells missing (random)
for col in feature_cols:
    idx = rng.choice(N_STUDENTS, size=int(0.02 * N_STUDENTS), replace=False)
    df.loc[idx, col] = np.nan

# 4b. impossible values (typing mistakes)
df.loc[rng.choice(N_STUDENTS, 4, replace=False), "Attendance"] = [105.0, 112.0, 130.0, 101.5]
df.loc[rng.choice(N_STUDENTS, 3, replace=False), "Internal_Marks"] = [-5.0, -12.0, 140.0]
df.loc[rng.choice(N_STUDENTS, 3, replace=False), "Study_Hours"] = [24.0, 30.0, 18.5]

# 4c. messy class labels (case / spaces) and a few missing labels
messy = rng.choice(N_STUDENTS, 12, replace=False)
df.loc[messy[:6], "Performance"] = df.loc[messy[:6], "Performance"].str.lower()
df.loc[messy[6:], "Performance"] = df.loc[messy[6:], "Performance"].str.upper() + " "
df.loc[rng.choice(N_STUDENTS, 3, replace=False), "Performance"] = np.nan

# 4d. exact duplicate rows (same record entered twice)
dupes = df.sample(25, random_state=SEED)
df = pd.concat([df, dupes], ignore_index=True)

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(OUT_FILE, index=False)

print(f"Saved {len(df)} rows x {df.shape[1]} columns -> {OUT_FILE}")
print("Missing cells :", int(df.isna().sum().sum()))
print("Duplicate rows:", int(df.duplicated().sum()))
print(df["Performance"].str.strip().str.title().value_counts(dropna=False).to_string())
