"""
smoke_test.py - checks the whole backend workflow without starting a server:
Dataset -> Preprocessing -> Visualization -> Training -> Evaluation -> Prediction

Run:  python scripts/smoke_test.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
import app as api  # noqa: E402  (loads the default dataset on import)

c = api.app.test_client()


def get(url):
    r = c.get(url)
    assert r.status_code == 200, f"GET {url} -> {r.status_code} {r.get_json()}"
    return r.get_json()


def post(url, body):
    r = c.post(url, json=body)
    assert r.status_code == 200, f"POST {url} -> {r.status_code} {r.get_json()}"
    return r.get_json()


s = get("/api/statistics")
print(f"1. Dataset        : {s['total_students']} students, quality {s['quality']['quality_score']}%")
p = post("/api/preprocess", {})
b, a = p["before"], p["after"]
print(f"2. Preprocessing  : {b['records']} -> {a['records']} rows, missing {b['missing_total']} -> {a['missing_total']}, duplicates {b['duplicates']} -> {a['duplicates']}")
v = get("/api/visualizations")
print(f"3. Visualization  : {len(v['numeric'])} attributes, {len(v['scatter'])} scatter points")
t = post("/api/train", {"model": "all", "test_size": 0.2, "cv_folds": 10})
for r in t["results"]:
    print(f"4. Trained        : {r['label']:<28} accuracy {r['accuracy']:.3f}  F1 {r['f1']:.3f}  CV {r['cv']['mean']:.3f}")
cm = get("/api/confusion-matrix?model=decision_tree")
print(f"5. Confusion matrix rows: {cm['matrix']}")
tree = get("/api/decision-tree")
print(f"   Tree depth {tree['depth']}, {tree['leaves']} leaves. First rule: IF {' AND '.join(tree['rules'][0]['conditions'])} THEN {tree['rules'][0]['class']}")
pred = post("/api/predict", {"model": "decision_tree", "features": {
    "Attendance": 88, "Internal_Marks": 78, "Assignment_Marks": 80, "Study_Hours": 6, "Previous_Marks": 76,
    "Practical_Marks": 75, "Midterm_Marks": 70, "Class_Participation": "High", "Backlogs": 0}})
print(f"6. Prediction     : {pred['prediction']} (confidence {pred['confidence']:.0%}), group: {pred['support_category']}")
bad = c.post("/api/predict", json={"model": "decision_tree", "features": {"Attendance": 150}})
assert bad.status_code == 422
print("7. Validation     : invalid input correctly rejected (HTTP 422)")
print("\nAll checks passed.")
