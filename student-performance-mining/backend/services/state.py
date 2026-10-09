"""
In-memory application state (one dataset + the models trained on it).
A small class is enough for a single-user local demo - no database needed.
"""
from threading import RLock

from preprocessing.cleaning import initial_working_copy, quality_report


class AppState:
    def __init__(self):
        self.lock = RLock()
        self.name = None
        self.source = None          # 'default' or 'upload'
        self.raw = None             # dataset exactly as loaded
        self.working = None         # dataset used by charts + training
        self.config = {}            # preprocessing options currently applied
        self.preprocessed = False
        self.log = []
        self.models = {}            # model key -> {"pipeline", "result", "baseline", ...}

    def load(self, df, name, source):
        with self.lock:
            self.name, self.source = name, source
            self.raw = df
            self.working = initial_working_copy(df)
            self.config = {"remove_duplicates": True, "missing_strategy": "median",
                           "fix_invalid": True, "scale": True}
            self.preprocessed, self.log, self.models = False, [], {}

    def apply_preprocessing(self, clean_df, config, log):
        with self.lock:
            self.working, self.config, self.log = clean_df, config, log
            self.preprocessed = True
            self.models = {}        # data changed -> old models are no longer valid

    @property
    def loaded(self):
        return self.raw is not None

    def raw_quality(self):
        return quality_report(self.raw)


state = AppState()
