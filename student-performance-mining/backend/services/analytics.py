"""
Dataset analytics: dashboard numbers, chart data, auto-generated insights,
feature ranking and academic-support suggestions.
Every number is calculated from the CURRENT working dataset.
"""
import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif

from config import ID_COL, RANDOM_STATE, TARGET
from preprocessing.cleaning import class_order, feature_columns, quality_report


def labelled(df):
    """Rows that have a class label."""
    return df[df[TARGET].notna()]


def rank_series(df, classes):
    """Performance as a number: worst class = 0 ... best class = n-1 (used for correlation)."""
    rank = {c: len(classes) - 1 - i for i, c in enumerate(classes)}
    return df[TARGET].map(rank).astype(float)


def strength_word(r):
    a = abs(r)
    return "strong" if a >= 0.5 else "moderate" if a >= 0.3 else "weak" if a >= 0.1 else "very little"


# ------------------------------------------------------------------ dashboard
def dashboard(df):
    data = labelled(df)
    numeric, _ = feature_columns(df)
    classes = class_order(data[TARGET].unique())
    counts = data[TARGET].value_counts()
    distribution = [{"label": c, "count": int(counts.get(c, 0)),
                     "pct": round(100 * counts.get(c, 0) / len(data), 1)} for c in classes]
    top = classes[0]
    top_rows = data[data[TARGET] == top]
    best = {"label": top, "count": int(len(top_rows)), "pct": distribution[0]["pct"],
            "averages": {c: round(float(top_rows[c].mean()), 1) for c in numeric[:4] if top_rows[c].notna().any()}}
    means = {c: round(float(df[c].mean()), 2) for c in numeric if df[c].notna().any()}
    q = quality_report(df)
    return {"total_students": int(len(df)), "labelled_students": int(len(data)), "means": means,
            "distribution": distribution, "best_category": best, "quality": q,
            "feature_ranking": feature_ranking(df)}


def feature_ranking(df):
    """Feature selection: how much information each attribute gives about Performance."""
    data = labelled(df)
    numeric, categorical = feature_columns(df)
    cols = numeric + categorical
    X = pd.DataFrame(index=data.index)
    for c in numeric:
        X[c] = data[c].fillna(data[c].median())
    for c in categorical:
        X[c] = pd.factorize(data[c].fillna("Unknown"))[0]
    classes = class_order(data[TARGET].unique())
    y = data[TARGET].astype(str)
    mi = mutual_info_classif(X, y, discrete_features=[c in categorical for c in cols], random_state=RANDOM_STATE)
    rank = rank_series(data, classes)
    out = []
    for c, m in zip(cols, mi):
        corr = float(X[c].corr(rank)) if c in numeric else None
        out.append({"feature": c, "mutual_info": float(m), "correlation": corr})
    top = max((o["mutual_info"] for o in out), default=1) or 1
    for o in out:
        o["score"] = o["mutual_info"] / top
    return sorted(out, key=lambda o: -o["mutual_info"])


# ------------------------------------------------------------------ charts
def _box(s):
    s = s.dropna()
    if s.empty:
        return None
    q1, med, q3 = (float(x) for x in s.quantile([0.25, 0.5, 0.75]))
    iqr = q3 - q1
    low = float(s[s >= q1 - 1.5 * iqr].min())
    high = float(s[s <= q3 + 1.5 * iqr].max())
    return {"min": low, "q1": q1, "median": med, "q3": q3, "max": high,
            "outliers": int(((s < low) | (s > high)).sum()), "mean": float(s.mean()), "count": int(len(s))}


def visualizations(df):
    data = labelled(df)
    numeric, _ = feature_columns(df)
    classes = class_order(data[TARGET].unique())
    counts = data[TARGET].value_counts()
    class_stats = {}
    for col in numeric:
        rows = []
        for c in classes:
            b = _box(data.loc[data[TARGET] == c, col])
            if b:
                rows.append({"label": c, **b})
        class_stats[col] = rows
    sample = data.sample(min(500, len(data)), random_state=RANDOM_STATE)
    scatter = [{**{c: (None if pd.isna(r[c]) else float(r[c])) for c in numeric}, "Performance": r[TARGET]}
               for _, r in sample.iterrows()]
    corr_df = data[numeric].copy()
    corr_df["Performance (rank)"] = rank_series(data, classes)
    corr = corr_df.corr()
    return {"classes": classes, "numeric": numeric,
            "distribution": [{"label": c, "count": int(counts.get(c, 0))} for c in classes],
            "class_stats": class_stats, "scatter": scatter,
            "correlation": {"labels": list(corr.columns), "matrix": [[None if pd.isna(v) else round(float(v), 3) for v in row] for row in corr.values]}}


# ------------------------------------------------------------------ automatic insights
def insights(df):
    """Plain-English findings. Wording and numbers both depend on the data."""
    data = labelled(df)
    numeric, _ = feature_columns(df)
    classes = class_order(data[TARGET].unique())
    rank = rank_series(data, classes)
    top_classes = classes[: max(1, len(classes) // 2)]
    top_label = " or ".join(top_classes)
    is_top = data[TARGET].isin(top_classes)
    out = []

    corrs = []
    for c in numeric:
        pair = pd.concat([data[c], rank], axis=1).dropna()
        if len(pair) > 10 and pair[c].std() > 0:
            corrs.append((c, float(pair[c].corr(pair.iloc[:, 1])), len(pair)))
    for c, r, n in sorted(corrs, key=lambda t: -abs(t[1])):
        direction = "positive" if r > 0 else "negative"
        out.append({"kind": "correlation", "feature": c, "value": round(r, 3),
                    "text": f"{c.replace('_', ' ')} has a {strength_word(r)} {direction} relationship with performance level "
                            f"(correlation r = {r:.2f}, {n} students)."})

    if "Attendance" in data and "Internal_Marks" in data:
        m = float(data["Attendance"].median())
        hi, lo = data.loc[data["Attendance"] >= m, "Internal_Marks"].mean(), data.loc[data["Attendance"] < m, "Internal_Marks"].mean()
        word = "higher" if hi - lo > 1 else "lower" if lo - hi > 1 else "a similar"
        out.insert(0, {"kind": "group", "text": f"Students with attendance of {m:.0f}% or more have {word} average internal marks "
                       f"({hi:.1f} vs {lo:.1f} for the rest)."})

    if "Study_Hours" in data:
        m = float(data["Study_Hours"].median())
        a, b = 100 * is_top[data["Study_Hours"] >= m].mean(), 100 * is_top[data["Study_Hours"] < m].mean()
        out.append({"kind": "group", "text": f"{a:.0f}% of students who study {m:.1f}+ hours/day reach {top_label}, "
                    f"compared with {b:.0f}% of students who study less."})

    if "Assignment_Marks" in data:
        means = [(c, data.loc[data[TARGET] == c, "Assignment_Marks"].mean()) for c in classes]
        means = [(c, v) for c, v in means if not np.isnan(v)]
        if len(means) > 1:
            out.append({"kind": "group", "text": f"Average assignment marks range from {means[-1][1]:.1f} ({means[-1][0]}) "
                        f"to {means[0][1]:.1f} ({means[0][0]})."})

    ranking = feature_ranking(df)
    if ranking:
        out.append({"kind": "feature", "text": f"{ranking[0]['feature'].replace('_', ' ')} carries the most information about "
                    f"performance (highest mutual information), followed by "
                    f"{', '.join(r['feature'].replace('_', ' ') for r in ranking[1:3])}."})
    out.append({"kind": "caution", "text": "These are statistical associations in this dataset. Correlation does not imply causation."})
    return out


# ------------------------------------------------------------------ academic support
SUGGESTIONS = {
    "Attendance": "Improve attendance", "Study_Hours": "Increase daily study hours",
    "Assignment_Marks": "Focus on assignments and submit them on time",
    "Previous_Marks": "Review weak topics from previous semesters",
    "Internal_Marks": "Prepare more for internal assessments", "Practical_Marks": "Spend more time on practical / lab work",
    "Midterm_Marks": "Revise midterm topics", "Backlogs": "Plan to clear pending backlogs",
}


def support_category(label, classes):
    """Temporary decision-support group - NOT a permanent label."""
    i = classes.index(label) if label in classes else len(classes) - 1
    if i == 0:
        return "Performing Well"
    return "On Track" if i < -(-len(classes) // 2) else "Needs Attention"


class Benchmarks:
    """What a Good/Excellent student typically looks like in this dataset."""

    def __init__(self, df):
        data = labelled(df)
        self.numeric, _ = feature_columns(df)
        self.classes = class_order(data[TARGET].unique())
        top = data[data[TARGET].isin(self.classes[: max(1, len(self.classes) // 2)])]
        rank = rank_series(data, self.classes)
        self.mean = {c: float(top[c].mean()) for c in self.numeric}
        self.std = {c: float(data[c].std() or 1) for c in self.numeric}
        self.sign = {c: (1 if (data[c].corr(rank) or 0) >= 0 else -1) for c in self.numeric}

    def weak_areas(self, values, limit=3):
        gaps = []
        for c in self.numeric:
            v = values.get(c)
            if v is None or pd.isna(v):
                continue
            gap = self.sign[c] * (self.mean[c] - float(v)) / self.std[c]
            if gap > 0.25:
                gaps.append({"feature": c, "value": float(v), "benchmark": round(self.mean[c], 1),
                             "suggestion": SUGGESTIONS.get(c, f"Work on {c.replace('_', ' ').lower()}"), "gap": gap})
        return sorted(gaps, key=lambda g: -g["gap"])[:limit]
