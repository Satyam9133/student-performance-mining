"""
Data preprocessing / cleaning (Data-Mining step B, C, D, E).

Everything here is plain pandas so it is easy to explain:
    load_csv -> validate -> quality_report -> preprocess
"""
import numpy as np
import pandas as pd
from pandas.api.types import is_numeric_dtype

from config import CLASS_PREFERRED, ID_COL, TARGET, VALID_RANGES


class DataError(ValueError):
    """Raised when the dataset is unusable. The message is shown to the user."""


# ------------------------------------------------------------------ loading
def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Trim column names and map 'performance' / 'student_id' to canonical names."""
    df = df.copy()
    df.columns = [str(c).strip().replace(" ", "_") for c in df.columns]
    lower = {c.lower(): c for c in df.columns}
    rename = {}
    if "performance" in lower and lower["performance"] != TARGET:
        rename[lower["performance"]] = TARGET
    if "student_id" in lower and lower["student_id"] != ID_COL:
        rename[lower["student_id"]] = ID_COL
    return df.rename(columns=rename)


def coerce_numeric_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Text columns that are really numbers (e.g. '78', 'N/A') become numeric."""
    df = df.copy()
    for col in df.columns:
        if col in (ID_COL, TARGET) or is_numeric_dtype(df[col]):
            continue
        converted = pd.to_numeric(df[col], errors="coerce")
        if df[col].notna().sum() and converted.notna().sum() >= 0.9 * df[col].notna().sum():
            df[col] = converted
    return df


def normalise_labels(series: pd.Series) -> pd.Series:
    """' good ' / 'GOOD' / 'good' -> 'Good'. Blank labels become NaN."""
    def fix(v):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return np.nan
        text = str(v).strip()
        return np.nan if text.lower() in ("", "nan", "none", "null") else text.title()
    return series.astype(object).map(fix)


def load_csv(source) -> pd.DataFrame:
    """Read a CSV (path or file object) and validate it."""
    try:
        df = pd.read_csv(source)
    except Exception as exc:  # malformed / empty / binary file
        raise DataError(f"Could not read the file as CSV: {exc}") from exc
    df = coerce_numeric_columns(normalise_columns(df))
    validate_dataset(df)
    return df


def validate_dataset(df: pd.DataFrame) -> None:
    if TARGET not in df.columns:
        raise DataError(f"The CSV must contain a '{TARGET}' column (the class to predict). "
                        f"Columns found: {', '.join(map(str, df.columns))}.")
    if len(df) < 50:
        raise DataError(f"The dataset has only {len(df)} rows. At least 50 are needed.")
    if len(feature_columns(df)[0]) < 2:
        raise DataError("At least 2 numeric feature columns are required besides the ID and Performance.")
    counts = normalise_labels(df[TARGET]).value_counts()
    if len(counts) < 2:
        raise DataError("The Performance column must contain at least 2 different classes.")
    if counts.min() < 10:
        raise DataError(f"Class '{counts.idxmin()}' has only {counts.min()} rows. "
                        "Each class needs at least 10 rows for train/test split and cross-validation.")


# ------------------------------------------------------------------ helpers
def feature_columns(df: pd.DataFrame):
    """Return (numeric_cols, categorical_cols) - ID and target are excluded."""
    cols = [c for c in df.columns if c not in (ID_COL, TARGET)]
    numeric = [c for c in cols if is_numeric_dtype(df[c])]
    categorical = [c for c in cols if c not in numeric]
    return numeric, categorical


def class_order(labels) -> list:
    """Best -> worst class order. Known labels first, any others alphabetically."""
    labels = list(dict.fromkeys(labels))
    known = [c for c in CLASS_PREFERRED if c in labels]
    return known + sorted(c for c in labels if c not in known)


def invalid_mask(df: pd.DataFrame) -> pd.DataFrame:
    """True where a value is outside its plausible range (e.g. attendance 130)."""
    mask = pd.DataFrame(False, index=df.index, columns=df.columns)
    for col, (lo, hi) in VALID_RANGES.items():
        if col in df.columns and is_numeric_dtype(df[col]):
            mask[col] = (df[col] < lo) | (df[col] > hi)
    return mask


def quality_report(df: pd.DataFrame) -> dict:
    """Summary of data-quality problems. Used for the before/after comparison."""
    numeric, categorical = feature_columns(df)
    n_rows, n_cols = df.shape
    missing = df.isna().sum()
    invalid = invalid_mask(df).sum()
    duplicates = int(df.duplicated().sum())
    labels = df[TARGET]
    inconsistent = int((labels.notna() & (labels.astype(object) != normalise_labels(labels))).sum())
    total_cells = max(n_rows * n_cols, 1)
    bad_cells = int(missing.sum()) + int(invalid.sum()) + duplicates * n_cols + inconsistent
    score = round(100 * (1 - min(bad_cells / total_cells, 1)), 1)
    return {
        "records": int(n_rows), "attributes": int(n_cols),
        "missing_total": int(missing.sum()),
        "missing_by_column": {c: int(v) for c, v in missing.items()},
        "duplicates": duplicates,
        "invalid_total": int(invalid.sum()),
        "invalid_by_column": {c: int(v) for c, v in invalid.items() if v},
        "inconsistent_labels": inconsistent,
        "missing_target": int(labels.isna().sum()),
        "numeric_columns": numeric, "categorical_columns": categorical,
        "id_column": ID_COL if ID_COL in df.columns else None, "target_column": TARGET,
        "quality_score": score,
        "quality_label": "Excellent" if score >= 98 else "Good" if score >= 95 else "Fair" if score >= 90 else "Poor",
    }


def column_details(df: pd.DataFrame) -> list:
    out = []
    for col in df.columns:
        role = "ID" if col == ID_COL else "Class" if col == TARGET else \
               "Numeric" if is_numeric_dtype(df[col]) else "Categorical"
        out.append({"name": col, "dtype": str(df[col].dtype), "role": role,
                    "missing": int(df[col].isna().sum()), "unique": int(df[col].nunique())})
    return out


# ------------------------------------------------------------------ pipeline
def initial_working_copy(raw: pd.DataFrame) -> pd.DataFrame:
    """Working data right after load: only class labels are standardised."""
    df = raw.copy()
    df[TARGET] = normalise_labels(df[TARGET])
    return df


def preprocess(raw: pd.DataFrame, remove_duplicates=True, missing_strategy="median", fix_invalid=True):
    """
    Always starts from the RAW data so the result is reproducible.
    Returns (clean_df, log) where log lists every step with its effect.
    """
    if missing_strategy not in ("median", "mean", "drop", "none"):
        raise DataError("missing_strategy must be one of: median, mean, drop, none.")
    df, log = raw.copy(), []

    def add(step, detail):
        log.append({"step": step, "detail": detail, "rows": int(len(df))})

    # 1. standardise labels
    fixed = int((df[TARGET].notna() & (df[TARGET].astype(object) != normalise_labels(df[TARGET]))).sum())
    df[TARGET] = normalise_labels(df[TARGET])
    add("Standardise class labels", f"{fixed} label(s) such as 'good' or 'POOR ' converted to a consistent form.")

    # 2. rows without a class cannot be used for supervised learning
    n = int(df[TARGET].isna().sum())
    df = df[df[TARGET].notna()]
    add("Remove rows with missing class", f"{n} row(s) removed because Performance was blank.")

    # 3. duplicates
    if remove_duplicates:
        n = int(df.duplicated().sum())
        df = df.drop_duplicates()
        add("Remove duplicate records", f"{n} exact duplicate row(s) removed (first copy kept).")
    else:
        add("Remove duplicate records", "Skipped.")

    # 4. impossible values -> treated as missing
    if fix_invalid:
        mask = invalid_mask(df)
        n = int(mask.values.sum())
        df = df.mask(mask)
        add("Fix impossible values", f"{n} out-of-range value(s) (e.g. attendance > 100) set to missing.")
    else:
        add("Fix impossible values", "Skipped.")

    # 5. missing values
    numeric, categorical = feature_columns(df)
    n_missing = int(df[numeric + categorical].isna().sum().sum())
    if missing_strategy == "drop":
        df = df.dropna(subset=numeric + categorical)
        add("Handle missing values", f"{n_missing} missing cell(s): rows containing them were dropped.")
    elif missing_strategy in ("mean", "median"):
        for col in numeric:
            fill = df[col].mean() if missing_strategy == "mean" else df[col].median()
            df[col] = df[col].fillna(round(float(fill), 2))
        for col in categorical:
            if df[col].notna().any():
                df[col] = df[col].fillna(df[col].mode().iloc[0])
        add("Handle missing values", f"{n_missing} missing cell(s) filled "
            f"({missing_strategy} for numbers, most frequent value for categories).")
    else:
        add("Handle missing values", f"Skipped - {n_missing} missing cell(s) remain "
            "(the model pipeline will still impute them internally).")

    add("Exclude Student_ID from features", "An identifier carries no academic signal, so it is never given to models.")
    add("Encode & scale", "Categorical columns are one-hot encoded; numbers are standardised only for KNN (inside the model pipeline).")
    return df.reset_index(drop=True), log
