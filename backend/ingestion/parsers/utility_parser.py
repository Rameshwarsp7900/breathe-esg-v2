"""
Utility Electricity Parser — Portal CSV Export (Scope 2)

Format: CSV export from utility customer portals.
Handles Green Button (NAESB standard used by PG&E, ConEd, Ameren, etc.)
and generic utility portal exports (BESCOM, MSEDCL, SP Group etc.)

Fixes over v1:
  - Grid region passed per-meter (not per-file) via meter lookup
  - Negative value flagged correctly with 'negative_value' code
  - Billing period correctly stored as period_start/period_end
  - 'UNKNOWN' facility properly handled (unknown_plant flag)
  - All unit conversions validated and extended (therms, MMBTU, GJ, etc.)
"""

import logging
from .base import decode_bytes, read_csv_flexible, normalize_decimal, safe_str, parse_date_flexible, apply_column_aliases
from .constants import ENERGY_TO_KWH, GRID_EF

logger = logging.getLogger(__name__)

UTILITY_COL_ALIASES = {
    # Green Button standard
    'DATE': 'read_date', 'Date': 'read_date', 'date': 'read_date',
    'START TIME': 'period_start_time', 'END TIME': 'period_end_time',
    'USAGE': 'quantity', 'Usage': 'quantity', 'usage': 'quantity',
    'UNITS': 'unit', 'Units': 'unit', 'units': 'unit',
    'COST': 'cost', 'Cost': 'cost', 'cost': 'cost',
    'NOTES': 'notes', 'Notes': 'notes',
    # Generic portal columns
    'Meter ID': 'meter_id', 'MeterID': 'meter_id', 'Meter': 'meter_id',
    'meter_id': 'meter_id',
    'Read Date': 'read_date', 'Reading Date': 'read_date', 'Bill Date': 'read_date',
    'Quantity': 'quantity', 'Consumption': 'quantity', 'kWh': 'quantity',
    'Unit': 'unit', 'UOM': 'unit',
    'Period Start': 'period_start', 'Billing Period Start': 'period_start',
    'Period End': 'period_end',   'Billing Period End':   'period_end',
    'Tariff': 'tariff_code', 'Rate': 'tariff_code', 'Tariff Code': 'tariff_code',
    'Facility': 'facility', 'Location': 'facility', 'Site': 'facility',
    'Account': 'account_number', 'Account Number': 'account_number',
    'Account No': 'account_number',
    'Currency': 'currency',
    'Grid Region': 'grid_region', 'Country': 'grid_region',
}

KNOWN_ENERGY_UNITS = set(ENERGY_TO_KWH.keys()) | {'kwh', 'mwh', 'therm', 'therms', 'mmbtu', 'gj'}


def _resolve_grid_ef(grid_region: str, tariff_code: str = '') -> tuple:
    """
    Returns (ef_kg_per_kwh, ef_source).
    Tariff codes containing 'solar', 'wind', 'renewable', 'green' → near-zero EF
    (market-based accounting; real deployment would verify REC certificates).
    """
    tariff_lower = tariff_code.lower()
    if any(kw in tariff_lower for kw in ('solar', 'wind', 'renewable', 'green', 'hydro')):
        return 0.0, 'Market-based: renewable tariff (unverified)'

    region = (grid_region or 'DEFAULT').upper().strip()[:2]
    ef = GRID_EF.get(region, GRID_EF['DEFAULT'])
    source = f'IEA 2023 grid factor ({region})'
    return ef, source


def parse_utility_file(raw_bytes: bytes, filename: str = '',
                       country: str = 'DEFAULT',
                       meter_country_map: dict = None) -> tuple:
    """
    Parse utility portal CSV.
    meter_country_map: {meter_id: country_code} for per-meter grid factors.
    Returns (records, errors).
    """
    meter_country_map = meter_country_map or {}
    text = decode_bytes(raw_bytes)

    # Strip Green Button comment lines
    lines = [l for l in text.splitlines() if not l.startswith('#')]
    text = '\n'.join(lines)

    try:
        df = read_csv_flexible(text)
    except ValueError as e:
        return [], [{'row': 0, 'error': str(e), 'raw': ''}]

    df = apply_column_aliases(df, UTILITY_COL_ALIASES)
    df = df.dropna(how='all').reset_index(drop=True)

    records, errors = [], []

    for idx, row in df.iterrows():
        row_num = idx + 2
        raw = {k: safe_str(v) for k, v in row.to_dict().items()}

        # Quantity
        raw_qty = normalize_decimal(row.get('quantity'))
        if raw_qty is None:
            errors.append({'row': row_num, 'error': 'Missing or unparseable quantity', 'raw': str(raw)})
            continue

        raw_unit = safe_str(row.get('unit', 'kWh')).strip()
        unit_key = raw_unit.upper().replace('/', '').strip()

        # Detect natural gas sub-metering (MMBTU, therms, M3, SCF) → Scope 1
        GAS_UNITS = {'MMBTU', 'THERM', 'THERMS', 'M3', 'NM3', 'CBM', 'SCF', 'MCF'}
        is_gas = unit_key in GAS_UNITS
        scope = '1' if is_gas else '2'
        category = 'Stationary Combustion (Gas Sub-metering)' if is_gas else 'Purchased Electricity'

        # Unit → kWh
        kwh_factor = None
        for k, v in ENERGY_TO_KWH.items():
            if k.upper() == unit_key:
                kwh_factor = v
                break

        flags = []
        if kwh_factor is None:
            flags.append('unit_mismatch')
            kwh_factor = 1.0  # best-effort

        qty_kwh = raw_qty * kwh_factor

        # Flags
        if raw_qty < 0:
            flags.append('negative_value')
        if qty_kwh > 5_000_000:
            flags.append('outlier_value')

        # Dates
        read_date   = parse_date_flexible(row.get('read_date') or row.get('date'))
        period_start_val = parse_date_flexible(row.get('period_start')) or read_date
        period_end_val   = parse_date_flexible(row.get('period_end'))

        if not read_date and not period_start_val:
            flags.append('missing_period')

        # Location
        facility = safe_str(row.get('facility') or row.get('account_number') or row.get('meter_id', ''))
        meter_id = safe_str(row.get('meter_id', ''))

        if not facility or facility.upper() in ('UNKNOWN', 'N/A', ''):
            flags.append('unknown_plant')

        # Grid emission factor
        row_grid = safe_str(row.get('grid_region', '')) or country
        meter_grid = meter_country_map.get(meter_id, '')
        effective_grid = meter_grid or row_grid or country
        tariff = safe_str(row.get('tariff_code', ''))
        ef, ef_source = _resolve_grid_ef(effective_grid, tariff)

        co2e = abs(qty_kwh) * ef  # absolute value; flag handles sign

        conv_str = f"1 {raw_unit} = {kwh_factor} kWh" if kwh_factor != 1.0 else ''

        records.append({
            'scope': scope,
            'category': category,
            'source_type': 'utility_electricity',
            'raw_quantity': raw_qty,
            'raw_unit': raw_unit,
            'raw_description': f"Grid electricity – {facility or meter_id}",
            'raw_period': safe_str(row.get('read_date', '')),
            'quantity_norm': round(qty_kwh, 4),
            'normalized_unit': 'kWh',
            'conversion_applied': conv_str,
            'activity_date': read_date or period_start_val,
            'period_start': period_start_val,
            'period_end': period_end_val,
            'location': facility,
            'plant_code': meter_id,
            'country': effective_grid[:2].upper() if effective_grid else '',
            'emission_factor': ef,
            'emission_factor_unit': 'kg CO2e/kWh',
            'emission_factor_source': ef_source,
            'co2e_kg': round(co2e, 4),
            'source_row_ref': str(row_num),
            'raw_data_snapshot': raw,
            'flag_codes': flags,
            'source_specific': {
                'meter_id': meter_id,
                'account_number': safe_str(row.get('account_number', '')),
                'tariff_code': tariff,
                'cost': safe_str(row.get('cost', '')),
                'currency': safe_str(row.get('currency', '')),
                'grid_region': effective_grid,
            },
        })

    return records, errors
