"""Server-side search / filter / sort / pagination for the Dataset Explorer table."""
import numpy as np
import pandas as pd

from config import TARGET


def query_table(df, page=1, page_size=25, search="", sort=None, order="asc", performance="", flag="all"):
    view = df.copy()
    view.insert(0, "_row", np.arange(1, len(view) + 1))
    if flag == "missing":
        view = view[df.isna().any(axis=1).values]
    elif flag == "duplicates":
        view = view[df.duplicated(keep=False).values]
    if performance:
        view = view[view[TARGET].astype(str).str.lower() == performance.lower()]
    if search:
        s = search.strip().lower()
        mask = view.astype(str).apply(lambda col: col.str.lower().str.contains(s, regex=False)).any(axis=1)
        view = view[mask]
    if sort and sort in view.columns:
        view = view.sort_values(sort, ascending=(order != "desc"), na_position="last", kind="mergesort")
    total = len(view)
    page_size = max(5, min(int(page_size), 200))
    pages = max(1, -(-total // page_size))
    page = max(1, min(int(page), pages))
    chunk = view.iloc[(page - 1) * page_size: page * page_size]
    rows = [{k: (None if pd.isna(v) else v) for k, v in rec.items()} for rec in chunk.to_dict("records")]
    return {"rows": rows, "total": total, "page": page, "pages": pages, "page_size": page_size}
