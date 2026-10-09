"""
Machine-learning core: build pipelines, train, evaluate, explain, predict.

A scikit-learn *Pipeline* chains: imputer -> (scaler) -> encoder -> classifier.
Because the steps live INSIDE the pipeline they are learned on training data
only, which prevents "data leakage" during cross-validation.
"""
import time

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier, export_text

from config import RANDOM_STATE, TARGET, VALID_RANGES
from preprocessing.cleaning import class_order, feature_columns

MODEL_INFO = {
    "decision_tree": {"label": "Decision Tree (C4.5-style)",
                      "description": "Splits records using attribute conditions. Entropy / information gain is used like C4.5 in WEKA's J48."},
    "naive_bayes": {"label": "Naive Bayes",
                    "description": "Probabilistic classifier based on Bayes' theorem; assumes attributes are independent."},
    "random_forest": {"label": "Random Forest",
                      "description": "Many decision trees vote together, which usually makes predictions more stable."},
    "knn": {"label": "K-Nearest Neighbors",
            "description": "Predicts from the 7 most similar students in the training data."},
}


class MLError(ValueError):
    """User-facing error (bad input, nothing trained yet ...)."""


def make_classifier(key, max_depth=4):
    if key == "decision_tree":
        # entropy = information gain (C4.5 idea); min_samples_leaf ~ J48's minNumObj
        return DecisionTreeClassifier(criterion="entropy", max_depth=max_depth,
                                      min_samples_leaf=10, random_state=RANDOM_STATE)
    if key == "naive_bayes":
        return GaussianNB()
    if key == "random_forest":
        return RandomForestClassifier(n_estimators=100, min_samples_leaf=3,
                                      random_state=RANDOM_STATE, n_jobs=-1)
    if key == "knn":
        return KNeighborsClassifier(n_neighbors=7)
    raise MLError(f"Unknown model '{key}'. Choose one of: {', '.join(MODEL_INFO)}.")


def build_pipeline(key, numeric, categorical, scale=True, max_depth=4):
    num_steps = [("impute", SimpleImputer(strategy="median"))]
    if scale and key == "knn":          # distance-based -> scaling matters
        num_steps.append(("scale", StandardScaler()))
    transformers = [("num", Pipeline(num_steps), numeric)]
    if categorical:
        transformers.append(("cat", Pipeline([
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]), categorical))
    pre = ColumnTransformer(transformers, verbose_feature_names_out=False)
    return Pipeline([("prep", pre), ("clf", make_classifier(key, max_depth))])


def _weighted(y_true, y_pred):
    p, r, f, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)
    return float(p), float(r), float(f)


def train_model(df, key, test_size=0.2, do_cv=True, cv_folds=10, max_depth=4, scale=True):
    """Train one model and return (pipeline, result dict, baseline dict)."""
    if test_size not in (0.2, 0.3):
        raise MLError("test_size must be 0.2 (80/20 split) or 0.3 (70/30 split).")
    steps, warnings, t0 = [], [], time.perf_counter()

    def tick(name, detail):
        steps.append({"step": name, "detail": detail, "seconds": round(time.perf_counter() - t0, 3)})

    numeric, categorical = feature_columns(df)
    data = df[df[TARGET].notna()]
    if len(data) < len(df):
        warnings.append(f"{len(df) - len(data)} row(s) without a Performance label were ignored.")
    if data[numeric + categorical].isna().any().any():
        warnings.append("The data still contains missing values (preprocessing was skipped or incomplete). "
                        "The model pipeline filled them with the median / most frequent value.")
    X, y = data[numeric + categorical], data[TARGET].astype(str)
    classes = class_order(y.unique())
    tick("Prepare data", f"{len(X)} records, {len(numeric) + len(categorical)} features, {len(classes)} classes")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=RANDOM_STATE)
    tick("Train/test split", f"{len(X_train)} training rows / {len(X_test)} test rows (stratified)")

    pipe = build_pipeline(key, numeric, categorical, scale, max_depth)
    pipe.fit(X_train, y_train)
    tick("Fit model", MODEL_INFO[key]["label"])

    y_pred = pipe.predict(X_test)
    precision, recall, f1 = _weighted(y_test, y_pred)
    _, _, macro_f1, _ = precision_recall_fscore_support(y_test, y_pred, average="macro", zero_division=0)
    p_c, r_c, f_c, s_c = precision_recall_fscore_support(y_test, y_pred, labels=classes, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=classes)
    tick("Evaluate on test set", f"accuracy {accuracy_score(y_test, y_pred):.3f}")

    cv = None
    if do_cv:
        folds = max(2, min(cv_folds, int(y.value_counts().min())))
        scores = cross_val_score(
            build_pipeline(key, numeric, categorical, scale, max_depth), X, y,
            cv=StratifiedKFold(folds, shuffle=True, random_state=RANDOM_STATE), scoring="accuracy")
        cv = {"folds": folds, "mean": float(scores.mean()), "std": float(scores.std()),
              "scores": [float(s) for s in scores]}
        if folds != cv_folds:
            warnings.append(f"Cross-validation used {folds} folds because the smallest class is small.")
        tick("Cross-validation", f"{folds}-fold mean accuracy {scores.mean():.3f}")

    imp = permutation_importance(pipe, X_test, y_test, n_repeats=5, random_state=RANDOM_STATE, scoring="accuracy")
    values = np.clip(imp.importances_mean, 0, None)
    total = values.sum() or 1.0
    importance = sorted(({"feature": c, "importance": float(v / total)} for c, v in zip(X.columns, values)),
                        key=lambda d: -d["importance"])
    tick("Feature importance", "permutation importance on the test set")

    result = {
        "model": key, "label": MODEL_INFO[key]["label"], "description": MODEL_INFO[key]["description"],
        "split": f"{int((1 - test_size) * 100)}/{int(test_size * 100)}", "test_size": test_size,
        "n_train": int(len(X_train)), "n_test": int(len(X_test)), "n_features": len(X.columns),
        "params": {"max_depth": max_depth} if key == "decision_tree" else {},
        "accuracy": float(accuracy_score(y_test, y_pred)), "precision": precision, "recall": recall,
        "f1": f1, "macro_f1": float(macro_f1),
        "per_class": [{"label": c, "precision": float(p_c[i]), "recall": float(r_c[i]),
                       "f1": float(f_c[i]), "support": int(s_c[i])} for i, c in enumerate(classes)],
        "labels": classes, "confusion_matrix": cm.tolist(), "cv": cv, "feature_importance": importance,
        "steps": steps, "warnings": warnings, "train_seconds": round(time.perf_counter() - t0, 2),
        "trained_on_rows": int(len(data)),
    }
    baseline = {**{c: float(X_train[c].median()) for c in numeric},
                **{c: str(X_train[c].mode().iloc[0]) for c in categorical}}
    return pipe, result, {"values": baseline, "numeric": numeric, "categorical": categorical, "classes": classes}


# ------------------------------------------------------------------ prediction
def validate_input(values: dict, numeric, categorical, categories):
    """Return (clean_row, errors). Missing fields are allowed but reported."""
    errors, row = [], {}
    for col in numeric:
        raw = values.get(col)
        if raw is None or str(raw).strip() == "":
            row[col] = np.nan
            continue
        try:
            v = float(raw)
        except (TypeError, ValueError):
            errors.append(f"{col} must be a number.")
            continue
        lo, hi = VALID_RANGES.get(col, (-np.inf, np.inf))
        if not np.isfinite(v) or v < lo or v > hi:
            errors.append(f"{col} must be between {lo} and {hi}.")
        row[col] = v
    for col in categorical:
        v = values.get(col)
        if v in (None, ""):
            row[col] = np.nan
        elif str(v) not in categories.get(col, []):
            errors.append(f"{col} must be one of: {', '.join(categories.get(col, []))}.")
        else:
            row[col] = str(v)
    return row, errors


def predict_one(entry, row: dict):
    """Predict one student and explain the result with a simple 'occlusion' test."""
    pipe, meta = entry["pipeline"], entry["baseline"]
    cols = meta["numeric"] + meta["categorical"]
    X = pd.DataFrame([row], columns=cols)
    proba = pipe.predict_proba(X)[0]
    classes = list(pipe.classes_)
    best = int(np.argmax(proba))
    label = classes[best]

    # Occlusion: replace ONE feature at a time by the typical (median/mode) value.
    # If the probability of the predicted class drops, that feature was pushing towards it.
    factors = []
    for col in cols:
        if pd.isna(row.get(col)):
            continue
        alt = dict(row)
        alt[col] = meta["values"][col]
        p_alt = pipe.predict_proba(pd.DataFrame([alt], columns=cols))[0][best]
        delta = float(proba[best] - p_alt)
        size = abs(delta)
        factors.append({
            "feature": col, "value": row[col], "typical": meta["values"][col], "effect": delta,
            "strength": "Strong" if size >= 0.15 else "Moderate" if size >= 0.05 else "Slight",
            "direction": "supports" if delta > 0.005 else "works against" if delta < -0.005 else "neutral",
        })
    factors.sort(key=lambda f: -abs(f["effect"]))
    return {
        "prediction": label, "confidence": float(proba[best]),
        "probabilities": [{"label": c, "probability": float(p)} for c, p in zip(classes, proba)],
        "factors": factors,
        "missing_inputs": [c for c in cols if pd.isna(row.get(c))],
    }


# ------------------------------------------------------------------ decision tree export
def export_tree(pipe, classes_note=None):
    """Convert the fitted sklearn tree into JSON (nodes), IF-THEN rules and WEKA-style text."""
    pre, clf = pipe.named_steps["prep"], pipe.named_steps["clf"]
    names = list(pre.get_feature_names_out())
    cat_lookup = {}
    if "cat" in pre.named_transformers_:
        enc = pre.named_transformers_["cat"].named_steps["onehot"]
        cat_cols = pre.transformers_[1][2]
        for col, cats in zip(cat_cols, enc.categories_):
            for c in cats:
                cat_lookup[f"{col}_{c}"] = (col, str(c))
    t, classes = clf.tree_, list(clf.classes_)

    def describe(feature, thr, left):
        if feature in cat_lookup:
            col, cat = cat_lookup[feature]
            return f"{col} {'≠' if left else '='} {cat}"
        return f"{feature} {'≤' if left else '>'} {thr:.1f}"

    def dist(i):
        v = t.value[i][0]
        v = v / v.sum()
        return {c: float(x) for c, x in zip(classes, v)}

    def node(i):
        d = dist(i)
        top = max(d, key=d.get)
        base = {"samples": int(t.n_node_samples[i]), "distribution": d, "majority": top, "purity": d[top]}
        if t.children_left[i] == -1:
            return {**base, "leaf": True, "class": top}
        f, thr = names[t.feature[i]], float(t.threshold[i])
        return {**base, "leaf": False, "feature": cat_lookup.get(f, (f,))[0], "threshold": thr,
                "condition": describe(f, thr, True), "left": node(t.children_left[i]),
                "right": node(t.children_right[i])}

    rules = []

    def walk(i, bounds, cats):
        if t.children_left[i] == -1:
            d = dist(i)
            top = max(d, key=d.get)
            conds = []
            for col, (lo, hi) in bounds.items():
                if lo is not None and hi is not None:
                    conds.append(f"{lo:.1f} < {col} ≤ {hi:.1f}")
                elif lo is not None:
                    conds.append(f"{col} > {lo:.1f}")
                else:
                    conds.append(f"{col} ≤ {hi:.1f}")
            conds += cats
            rules.append({"conditions": conds, "class": top, "samples": int(t.n_node_samples[i]), "confidence": d[top]})
            return
        f, thr = names[t.feature[i]], float(t.threshold[i])
        for child, left in ((t.children_left[i], True), (t.children_right[i], False)):
            if f in cat_lookup:
                walk(child, bounds, cats + [describe(f, thr, left)])
            else:
                b = {k: list(v) for k, v in bounds.items()}
                lo, hi = b.get(f, [None, None])
                b[f] = [lo, thr if hi is None else min(hi, thr)] if left else [thr if lo is None else max(lo, thr), hi]
                walk(child, {k: tuple(v) for k, v in b.items()}, cats)

    walk(0, {}, [])
    rules.sort(key=lambda r: -r["samples"])
    importances = sorted(({"feature": n, "importance": float(v)} for n, v in zip(names, clf.feature_importances_) if v > 0),
                         key=lambda d: -d["importance"])
    return {"tree": node(0), "rules": rules, "depth": int(clf.get_depth()), "leaves": int(clf.get_n_leaves()),
            "classes": classes, "text": export_text(clf, feature_names=names, decimals=1),
            "feature_importance": importances}
