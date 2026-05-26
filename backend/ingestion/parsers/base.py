"""Shared utilities used by all parsers."""
import math
import io
import re
import logging
from typing import Optional
import chardet
import pandas as pd
from dateutil.parser import parse as dateparse

logger = logging.getLogger(__name__)


def detect_encoding(raw_bytes: bytes) -> str:
    result = chardet.detect(raw_bytes[:20_000])
    enc = result.get('encoding') or 'utf-8'
    # Fallback chain for common SAP encodings
    if enc.lower() in ('ascii',):
        enc = 'utf-8'
    return enc


def decode_bytes(raw_bytes: bytes) -> str:
    enc = detect_encoding(raw_bytes)
    for attempt in (enc, 'utf-8', 'latin-1', 'cp1252'):
        try:
            return raw_bytes.decode(attempt, errors='strict')
        except (UnicodeDecodeError, LookupError):
            continue
    return raw_bytes.decode('latin-1', errors='replace')


def read_csv_flexible(text: str) -> pd.DataFrame:
    """Try multiple delimiters; return first that gives >= 3 columns."""
    for sep in ('\t', ';', ',', '|'):
        try:
            df = pd.read_csv(io.StringIO(text), sep=sep, dtype=str,
                             skip_blank_lines=True, on_bad_lines='skip')
            if len(df.columns) >= 3:
                return df
        except Exception:
            continue
    raise ValueError("Could not parse file with any known delimiter (tab, semicolon, comma, pipe).")


def normalize_decimal(val) -> Optional[float]:
    """
    Handle both German (1.234,56) and standard (1234.56) decimal notation.
    Returns None if unparseable.
    """
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in ('nan', 'none', 'null', '-', ''):
        return None
    # German format: thousands sep = '.', decimal sep = ','
    if re.match(r'^\d{1,3}(\.\d{3})+(,\d+)?$', s):
        s = s.replace('.', '').replace(',', '.')
    else:
        s = s.replace(',', '')
    try:
        v = float(s)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    except ValueError:
        return None


def safe_str(val, default='') -> str:
    if val is None:
        return default
    s = str(val).strip()
    return default if s.lower() in ('nan', 'none', 'null') else s


def parse_date_flexible(val):
    """Parse a date string flexibly; return date or None."""
    s = safe_str(val)
    if not s:
        return None
    for dayfirst in (True, False):
        try:
            return dateparse(s, dayfirst=dayfirst).date()
        except Exception:
            continue
    return None


def apply_column_aliases(df: pd.DataFrame, alias_map: dict) -> pd.DataFrame:
    """Rename columns using alias_map; fallback to snake_case."""
    col_map = {}
    for col in df.columns:
        stripped = col.strip()
        if stripped in alias_map:
            col_map[col] = alias_map[stripped]
        else:
            col_map[col] = re.sub(r'[^a-z0-9_]', '_', stripped.lower()).strip('_')
    return df.rename(columns=col_map)
