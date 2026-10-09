# Student Performance Analytics
### Data Mining & Machine Learning Dashboard (Student Performance Prediction & Data Mining Dashboard)

A full-stack web application that predicts student academic performance (**Excellent / Good / Average / Poor**) and demonstrates the complete data-mining workflow: data collection, cleaning, visualization, classification, evaluation and prediction. It is the web equivalent of a WEKA case study (Preprocess → Classify → J48 → Cross Validation → Confusion Matrix).

> **Disclaimer:** This project is an educational data-mining system. Predictions are intended only as decision-support information and should not be used as the sole basis for academic decisions.

Nothing is hard-coded: every number, chart, tree, confusion matrix and prediction is calculated from the loaded CSV by real scikit-learn models.

---

## 1. Project overview
Teachers collect attendance, marks and study habits, but turning those into early insight is hard. This project loads a student dataset, cleans it, trains four classifiers, compares them, draws the decision tree, and predicts the performance of an individual student with a simple explanation.

## 2. Features
| Page | What it does |
|---|---|
| Dashboard | Live KPIs (students, averages, quality), class distribution, feature ranking, auto-generated insights |
| Dataset Explorer | Server-side search, sort, filter (class / missing / duplicates), pagination, data types, **CSV upload** |
| Data Preprocessing | Remove duplicates, fix impossible values, impute missing values, before/after summary, step log, feature selection |
| Data Visualization | Class distribution, attribute-vs-performance charts, correlation heatmap, box plots, scatter explorer |
| Model Training | Decision Tree, Naive Bayes, Random Forest, KNN; 80/20 or 70/30 split; k-fold cross-validation; training log |
| Model Comparison | Accuracy / Precision / Recall / F1 / CV table + chart; best model highlighted |
| Student Prediction | Form → predicted class, confidence, probabilities, influencing factors, support suggestions, whole-dataset support groups |
| Decision Tree | Real tree diagram, IF-THEN rules, importance, WEKA-style text |
| Evaluation | Live confusion matrix, per-class metrics, TP/FP/FN/TN explained, feature importance |
| About Project | WEKA equivalent, glossary, responsible use |

## 3. Data mining concepts used
Data collection · preprocessing · data cleaning · missing-value handling · duplicate detection · feature selection (mutual information) · visualization · classification · decision tree · Naive Bayes · KNN · random forest · model comparison · train/test split · cross-validation · confusion matrix · accuracy · precision · recall · F1 · prediction · feature importance / explainability.

## 4. Dataset description
`dataset/student_performance.csv` - **1,525 rows** (1,500 students + 25 deliberate duplicates), **synthetic but realistic**. See `scripts/generate_dataset.py`.

| Column | Meaning |
|---|---|
| Student_ID | Identifier (never used as a feature) |
| Attendance | % of classes attended |
| Internal_Marks, Assignment_Marks, Practical_Marks, Midterm_Marks, Previous_Marks | Marks out of 100 |
| Study_Hours | Hours studied per day |
| Class_Participation | Low / Medium / High (categorical) |
| Backlogs | Number of pending subjects |
| **Performance** | **Target class: Excellent / Good / Average / Poor** |

How it is generated: hidden *ability* and *discipline* scores drive every attribute (so attendance, study hours and marks correlate), then a weighted composite plus random noise decides the class. Noise keeps accuracy realistic (about 60-73%, not 100%). Defects injected for the preprocessing demo: ~2% missing cells, 10 impossible values (attendance 130, marks -12, 30 study hours…), 13 messy labels (`good`, `POOR `), 3 missing labels and 25 duplicate rows.

> The data is synthetic, so no real student is represented. If you use real data, anonymize it first.

## 5. Tech stack
React 18 · Vite · Tailwind CSS · Recharts · Python 3.10+ · Flask · pandas · NumPy · scikit-learn. No paid APIs; everything runs locally.

## 6. Architecture
```
Browser (React)  --fetch /api/...-->  Vite dev proxy  -->  Flask API (backend/app.py)
                                                           ├─ preprocessing/cleaning.py   load, validate, clean
                                                           ├─ models/ml.py                pipelines, train, evaluate, predict, tree export
                                                           ├─ services/analytics.py       dashboard, charts, insights, support
                                                           ├─ services/tables.py          search / sort / paginate
                                                           └─ services/state.py           current dataset + trained models (memory)
```
```
student-performance-mining/
├── backend/        app.py, config.py, models/ml.py, preprocessing/cleaning.py, services/*
├── frontend/       src/pages/*, src/components/*, api.js, context.jsx
├── dataset/        student_performance.csv
├── scripts/        generate_dataset.py, smoke_test.py
├── requirements.txt  package.json  README.md  PROJECT_EXPLANATION.md  VIVA_QUESTIONS.md
```

## 7. Installation
Requirements: **Python 3.10+**, **Node.js 18+**.

```bash
# from the project root (student-performance-mining/)
python -m venv .venv
# Windows (PowerShell):  .venv\Scripts\Activate.ps1
# Windows (cmd):         .venv\Scripts\activate.bat
# macOS / Linux:         source .venv/bin/activate
pip install -r requirements.txt

npm --prefix frontend install
```
(Optional) regenerate the dataset: `python scripts/generate_dataset.py`

## 8. How to run the backend
```bash
python backend/app.py
```
API at http://127.0.0.1:5000 (check `http://127.0.0.1:5000/api/health`).

## 9. How to run the frontend
In a **second terminal**:
```bash
npm --prefix frontend run dev
```
Open http://localhost:5173.

Run both with one command (after `npm install` in the root once): `npm install && npm run dev`.

Quick backend check without a browser: `python scripts/smoke_test.py`.

## 10. Dataset format (for your own CSV)
Required: a `Performance` column (class labels) and at least 2 numeric attribute columns, ≥ 50 rows, ≥ 10 rows per class. Optional: `Student_ID`. Extra numeric or text columns are used automatically (text columns are one-hot encoded). Known columns (Attendance, Internal_Marks…) get range checks; unknown columns are still handled.

## 11. Machine learning workflow
1. **Load** CSV, validate, standardise column names.
2. **Preprocess** (always from the raw data): standardise labels → drop unlabeled rows → remove duplicates → mark impossible values as missing → impute (median/mean) or drop.
3. **Pipeline** per model: median imputer → (StandardScaler for KNN only) → one-hot encoder → classifier. Steps live inside the pipeline, so cross-validation has no data leakage.
4. **Split** stratified 80/20 or 70/30 (`random_state=42`).
5. **Train** on the training set, **evaluate** on the test set.
6. **Cross-validate** with stratified k-fold on the whole cleaned dataset.
7. **Explain**: permutation importance (accuracy drop when an attribute is shuffled), tree rules, per-prediction occlusion test.
8. **Predict** one student; confidence = probability of the predicted class.

## 12. Algorithms used
| Algorithm | Notes |
|---|---|
| Decision Tree (main) | `DecisionTreeClassifier(criterion="entropy", min_samples_leaf=10, max_depth=4 by default)` - entropy/information gain as in C4.5 |
| Naive Bayes | `GaussianNB` |
| Random Forest | 100 trees |
| KNN | k = 7, standardised inputs |

**WEKA connection:** J48 is WEKA's implementation of the C4.5 decision-tree approach. scikit-learn's tree is *not* literally J48 (it is a CART-style binary tree); it is configured to behave similarly. Results can differ from WEKA.

## 13. Evaluation metrics
Accuracy = correct / total. Precision = TP / (TP + FP). Recall = TP / (TP + FN). F1 = 2·P·R / (P + R). Precision, recall and F1 on the dashboard are *weighted averages* across classes; the Evaluation page also shows each class. Confusion matrix rows = actual class, columns = predicted class.

Typical results on the bundled data (single run, will vary slightly if you change settings): Random Forest ≈ 73%, Naive Bayes ≈ 72%, KNN ≈ 70%, Decision Tree (depth 4) ≈ 60%. A single shallow tree is less accurate but is the only model that gives readable rules.

## 14. Screenshots
_Add your screenshots here:_ `docs/dashboard.png`, `docs/decision-tree.png`, `docs/confusion-matrix.png`, `docs/prediction.png`

## 15. Future scope
Real anonymised college data · hyper-parameter tuning · SHAP explanations · semester-wise trend tracking · login and roles for teachers · saving models and uploads to SQLite · exporting reports as PDF · class-imbalance handling (SMOTE).

## 16. Limitations
- Bundled data is synthetic; real classrooms are messier.
- Predictions are statistical and can be wrong; they must be reviewed by humans.
- Correlation is not causation: "study hours ↔ performance" does not prove cause.
- One dataset and in-memory state (single user, resets on backend restart).
- Class labels are coarse; tree depth is limited for readability.

## Troubleshooting
| Problem | Fix |
|---|---|
| Page shows "Cannot reach the backend" | Start `python backend/app.py` in another terminal; port 5000 must be free |
| `ModuleNotFoundError` | Activate the virtual environment and run `pip install -r requirements.txt` |
| `npm` not found | Install Node.js LTS from nodejs.org, then reopen the terminal |
| PowerShell blocks `Activate.ps1` | Run `Set-ExecutionPolicy -Scope Process Bypass` then activate again |
| Port 5000 busy (macOS AirPlay) | Turn off AirPlay Receiver, or change the port in `backend/app.py` and `frontend/vite.config.js` |
| Port 5173 busy | Vite chooses another port and prints it; open that URL |
| Charts empty after upload | Check the CSV has `Performance` and numeric columns; read the red message on the Dataset page |
| Fonts look different offline | Fonts load from Google Fonts; the app falls back to system fonts automatically |
| Models disappeared | Re-applying preprocessing or uploading data resets models by design - train again |
