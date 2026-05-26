"""
SAP MM60/MB51 Flat File Parser — Fuel & Combustion (Scope 1)

Format: Tab/semicolon-delimited export from SAP GUI (MM60 Material Consumption
        or MB51 Material Document List). Both German-locale and EN-locale SAP.

Handles:
  - German column headers (Werk, Menge, Mengeneinheit, Periode, etc.)
  - German decimal notation (12.450,00 → 12450.00)
  - SAP period format (2024001 = Jan 2024, 2024012 = Dec 2024)
  - German date format (DD.MM.YYYY)
  - Material group-based fuel detection
  - Plant code resolution via lookup table
  - Furnace oil, heating oil, natural gas, LPG, coal
"""

import re
import logging
import calendar
from datetime import date
from .base import decode_bytes, read_csv_flexible, normalize_decimal, safe_str, parse_date_flexible, apply_column_aliases
from .constants import (VOLUME_TO_LITERS, MASS_TO_KG, VOLUME_ENERGY_TO_KWH,
                        ENERGY_TO_KWH, FUEL_EF_PER_LITER, FUEL_EF_PER_KG, FUEL_EF_PER_M3)

logger = logging.getLogger(__name__)

# Column aliases: SAP German + English variants → canonical name
SAP_COL_ALIASES = {
    # Plant
    'Werk': 'plant', 'Plant': 'plant', 'Werks': 'plant',
    # Quantity
    'Menge': 'quantity', 'Verbrauchsmenge': 'quantity', 'Quantity': 'quantity',
    'Mengenwert': 'quantity',
    # Unit
    'Mengeneinheit': 'unit', 'ME': 'unit', 'BUn': 'unit', 'Unit': 'unit',
    'Basis-ME': 'unit', 'Basismengeneinheit': 'unit',
    # Period
    'Periode': 'period', 'Period': 'period', 'Buchungsperiode': 'period',
    # Posting date
    'Buchungsdatum': 'posting_date', 'Posting Date': 'posting_date', 'Belegdatum': 'posting_date',
    # Material
    'Material': 'material', 'Materialnummer': 'material', 'Matnr': 'material',
    # Description
    'Materialbezeichnung': 'description', 'Material Description': 'description',
    'Kurztext': 'description', 'MatDesc': 'description',
    # Material group
    'Materialgruppe': 'material_group', 'Material Group': 'material_group',
    'MatGrp': 'material_group', 'Warengruppe': 'material_group',
    # Cost centre
    'Kostenstelle': 'cost_center', 'Cost Center': 'cost_center', 'CostCtr': 'cost_center',
    # Amount / currency
    'Betrag': 'amount', 'Amount': 'amount', 'Wert': 'amount',
    'Währung': 'currency', 'Currency': 'currency', 'Waehr': 'currency',
    # Movement type
    'Bewegungsart': 'movement_type', 'Mvt': 'movement_type', 'Movement Type': 'movement_type',
    # Plant name
    'Werk Name': 'plant_name', 'Plant Name': 'plant_name', 'Werksname': 'plant_name',
}

# Keywords that identify a material as a fuel / combustible
FUEL_KEYWORDS = [
    'diesel', 'hsd', 'high speed diesel', 'petrol', 'gasoline', 'benzin',
    'erdgas', 'natural gas', 'lng', 'cng', 'lpg',
    'heizöl', 'heizoel', 'heating oil', 'fuel oil', 'furnace oil', 'furnace',
    'propan', 'propane', 'propangas', 'butan', 'butane',
    'kerosin', 'kerosene', 'jet fuel', 'aviation fuel',
    'kohle', 'coal', 'anthrazit', 'anthracite', 'koks', 'coke',
    'holz', 'biomasse', 'biogas',
]

# SAP material group prefixes commonly used for fuels/operating materials
FUEL_MATGRP_PATTERNS = [
    r'^B\d',          # Betriebsstoffe (DE)
    r'^0030',         # Fuels
    r'^0040',         # Lubricants (often co-exported)
    r'^FUEL',
    r'^ENER',
    r'^COMB',
]

# Goods issue movement types (consumption; not transfers or returns)
CONSUMPTION_MOVEMENT_TYPES = {'201', '261', '281', '291', '601'}


def _is_fuel(description: str, material_group: str = '') -> bool:
    text = (description + ' ' + material_group).lower()
    for kw in FUEL_KEYWORDS:
        if kw in text:
            return True
    for pat in FUEL_MATGRP_PATTERNS:
        if re.match(pat, material_group, re.IGNORECASE):
            return True
    return False


def _classify_fuel(description: str, material_group: str = '') -> str:
    text = (description + ' ' + material_group).lower()
    for kw in FUEL_KEYWORDS:
        if kw in text:
            return kw.replace(' ', '_')
    return 'unknown'


def _parse_sap_period(val: str):
    """
    Returns (period_start, period_end) dates or (None, None).
    Handles: 2024001, 001/2024, 01.2024, 2024-01, plain dates.
    """
    s = safe_str(val)
    if not s:
        return None, None

    # 2024001 → year=2024, month=1
    m = re.match(r'^(\d{4})(\d{3})$', s)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        if 1 <= month <= 12:
            last = calendar.monthrange(year, month)[1]
            return date(year, month, 1), date(year, month, last)

    # 001/2024 or 01/2024
    m = re.match(r'^(\d{1,3})[/.](\d{4})$', s)
    if m:
        month, year = int(m.group(1)), int(m.group(2))
        if 1 <= month <= 12:
            last = calendar.monthrange(year, month)[1]
            return date(year, month, 1), date(year, month, last)

    # 2024-01 or 2024/01
    m = re.match(r'^(\d{4})[-/](\d{1,2})$', s)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        if 1 <= month <= 12:
            last = calendar.monthrange(year, month)[1]
            return date(year, month, 1), date(year, month, last)

    # Full date (DD.MM.YYYY or YYYY-MM-DD, etc.)
    d = parse_date_flexible(s)
    if d:
        return d, d

    return None, None


def _normalise_unit_and_qty(raw_qty: float, raw_unit: str):
    """
    Returns (normalised_qty, si_unit, conversion_str, flags).
    Converts to liters (liquid fuels), kg (solid fuels), m3 (gas), kWh (energy).
    """
    u = raw_unit.upper().strip()
    flags = []

    if u in VOLUME_TO_LITERS:
        factor = VOLUME_TO_LITERS[u]
        return raw_qty * factor, 'liters', f"1 {u} = {factor} L", flags

    if u in MASS_TO_KG:
        factor = MASS_TO_KG[u]
        return raw_qty * factor, 'kg', f"1 {u} = {factor} kg", flags

    if u in VOLUME_ENERGY_TO_KWH:
        factor = VOLUME_ENERGY_TO_KWH[u]
        return raw_qty * factor, 'kWh', f"1 {u} = {factor} kWh", flags

    if u in ENERGY_TO_KWH:
        factor = ENERGY_TO_KWH[u]
        return raw_qty * factor, 'kWh', f"1 {u} = {factor} kWh", flags

    flags.append('unit_mismatch')
    return raw_qty, raw_unit.lower(), '', flags


def _get_ef_and_co2e(fuel_type: str, qty_norm: float, si_unit: str):
    """Returns (emission_factor, co2e_kg, ef_unit, ef_source)."""
    ft = fuel_type.lower().replace(' ', '_')

    # Liquid fuels → EF per liter
    if si_unit == 'liters':
        for key, ef in FUEL_EF_PER_LITER.items():
            if key in ft or ft in key:
                return ef, qty_norm * ef, 'kg CO2e/liter', 'IPCC AR6 / EPA AP-42'
        return 2.68, qty_norm * 2.68, 'kg CO2e/liter', 'IPCC AR6 (diesel default)'

    # Solid fuels → EF per kg
    if si_unit == 'kg':
        for key, ef in FUEL_EF_PER_KG.items():
            if key in ft or ft in key:
                return ef, qty_norm * ef, 'kg CO2e/kg', 'IPCC AR6'
        return 2.0, qty_norm * 2.0, 'kg CO2e/kg', 'IPCC AR6 (generic solid fuel)'

    # Gas by volume → EF per m3
    if si_unit == 'm3':
        for key, ef in FUEL_EF_PER_M3.items():
            if key in ft or ft in key:
                return ef, qty_norm * ef, 'kg CO2e/m3', 'IPCC AR6'
        return 2.04, qty_norm * 2.04, 'kg CO2e/m3', 'IPCC AR6 (natural gas default)'

    # Energy content → use generic combustion factor
    if si_unit == 'kWh':
        ef = 0.233  # kg CO2e/kWh for natural gas combustion
        return ef, qty_norm * ef, 'kg CO2e/kWh', 'IPCC AR6 natural gas heat'

    return None, None, '', 'Unknown'


def parse_sap_file(raw_bytes: bytes, filename: str = '', plant_lookup: dict = None) -> tuple:
    """
    Parse SAP MM60/MB51 flat file.
    plant_lookup: {code: {'name': str, 'country': str, 'grid_region': str}}
    Returns (records: list[dict], errors: list[dict])
    """
    plant_lookup = plant_lookup or {}
    text = decode_bytes(raw_bytes)

    try:
        df = read_csv_flexible(text)
    except ValueError as e:
        return [], [{'row': 0, 'error': str(e), 'raw': ''}]

    df = apply_column_aliases(df, SAP_COL_ALIASES)
    df = df.dropna(how='all').reset_index(drop=True)

    records, errors = [], []

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed + header row
        raw = {k: safe_str(v) for k, v in row.to_dict().items()}

        # Movement type filter — only consumption postings
        mvt = safe_str(row.get('movement_type', ''))
        if mvt and mvt not in CONSUMPTION_MOVEMENT_TYPES:
            continue

        description   = safe_str(row.get('description') or row.get('material', ''))
        material_group = safe_str(row.get('material_group', ''))

        if not _is_fuel(description, material_group):
            continue

        # Parse quantity
        raw_qty = normalize_decimal(row.get('quantity'))
        if raw_qty is None:
            errors.append({'row': row_num, 'error': 'Missing or unparseable quantity', 'raw': str(raw)})
            continue

        raw_unit = safe_str(row.get('unit', '')).upper()
        if not raw_unit:
            raw_unit = 'UNKNOWN'

        plant = safe_str(row.get('plant', ''))
        period_str = safe_str(row.get('period') or row.get('posting_date', ''))
        cost_center = safe_str(row.get('cost_center', ''))

        flags = []
        if raw_qty < 0:
            flags.append('negative_value')
        if raw_unit == 'UNKNOWN':
            flags.append('missing_unit')

        period_start, period_end = _parse_sap_period(period_str)
        if not period_start:
            flags.append('missing_period')

        # Resolve plant
        plant_info = plant_lookup.get(plant, {})
        location   = plant_info.get('name', plant) or plant
        country    = plant_info.get('country', '')
        if plant and not plant_info:
            flags.append('unknown_plant')

        # Normalise units
        qty_norm, si_unit, conv_str, unit_flags = _normalise_unit_and_qty(abs(raw_qty), raw_unit)
        flags.extend(unit_flags)

        # Emission factor + CO2e
        fuel_type = _classify_fuel(description, material_group)
        ef, co2e, ef_unit, ef_source = _get_ef_and_co2e(fuel_type, qty_norm, si_unit)

        # Outlier detection — >500,000 normalised units is suspicious
        if qty_norm and qty_norm > 500_000:
            flags.append('outlier_value')

        records.append({
            'scope': '1',
            'category': 'Stationary Combustion',
            'source_type': 'sap_fuel',
            'raw_quantity': raw_qty,
            'raw_unit': raw_unit,
            'raw_description': description,
            'raw_period': period_str,
            'quantity_norm': round(qty_norm, 4) if qty_norm is not None else None,
            'normalized_unit': si_unit,
            'conversion_applied': conv_str,
            'activity_date': period_start,
            'period_start': period_start,
            'period_end': period_end,
            'location': location,
            'plant_code': plant,
            'country': country,
            'cost_center': cost_center,
            'emission_factor': ef,
            'emission_factor_unit': ef_unit,
            'emission_factor_source': ef_source,
            'co2e_kg': round(co2e, 4) if co2e is not None else None,
            'source_row_ref': str(row_num),
            'raw_data_snapshot': raw,
            'flag_codes': flags,
            'source_specific': {
                'material_number': safe_str(row.get('material', '')),
                'material_group': material_group,
                'fuel_type': fuel_type,
                'plant_code_raw': plant,
                'movement_type': mvt,
                'amount': safe_str(row.get('amount', '')),
                'currency': safe_str(row.get('currency', '')),
            },
        })

    return records, errors
