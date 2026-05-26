"""
Corporate Travel Parser — Concur / Navan CSV Export (Scope 3, Category 6)

Fixes over v1:
  - NaN distance correctly handled (math.isnan check before float comparison)
  - 'missing_distance' flag instead of 'missing_period' for cars without distance
  - JP, KR, AE etc. added to HOTEL_EF table
  - Cabin class regex improved (handles J, C, W, Y codes)
  - Rail handled as separate sub-type (not discarded as error)
  - All IATA coordinates expanded to 80 major airports
"""

import math
import logging
from .base import decode_bytes, read_csv_flexible, normalize_decimal, safe_str, parse_date_flexible, apply_column_aliases
from .constants import AVIATION_EF, LONG_HAUL_KM, HOTEL_EF, CAR_EF

logger = logging.getLogger(__name__)

# ── IATA airport coordinates (lat, lon) — 80 major airports ─────────────────
AIRPORT_COORDS = {
    # North America
    'JFK': (40.6413,-73.7781), 'LAX': (33.9425,-118.4081), 'ORD': (41.9742,-87.9073),
    'ATL': (33.6407,-84.4277), 'DFW': (32.8998,-97.0403), 'SFO': (37.6213,-122.3790),
    'MIA': (25.7959,-80.2870), 'BOS': (42.3656,-71.0096), 'SEA': (47.4502,-122.3088),
    'LAS': (36.0840,-115.1537), 'PHX': (33.4373,-112.0078), 'IAH': (29.9902,-95.3368),
    'MSP': (44.8848,-93.2223), 'DTW': (42.2124,-83.3534), 'EWR': (40.6895,-74.1745),
    'YYZ': (43.6777,-79.6248), 'YVR': (49.1947,-123.1792), 'YUL': (45.4706,-73.7408),
    'MEX': (19.4363,-99.0721), 'GRU': (23.4356,-46.4731), 'BOG': (4.7016,-74.1469),
    'SCL': (33.3930,-70.7858), 'LIM': (12.0219,-77.1143),
    # Europe
    'LHR': (51.4700,-0.4543), 'CDG': (49.0097,2.5479), 'FRA': (50.0379,8.5622),
    'AMS': (52.3086,4.7639),  'MAD': (40.4936,-3.5668), 'BCN': (41.2974,2.0833),
    'FCO': (41.8003,12.2389), 'MXP': (45.6306,8.7281),  'MUC': (48.3538,11.7861),
    'VIE': (48.1103,16.5697), 'ZRH': (47.4647,8.5492),  'CPH': (55.6180,12.6508),
    'ARN': (59.6519,17.9186), 'OSL': (60.1939,11.1004), 'HEL': (60.3172,24.9633),
    'LIS': (38.7742,-9.1342), 'DUB': (53.4273,-6.2437), 'BRU': (50.9014,4.4844),
    'WAW': (52.1657,20.9671), 'PRG': (50.1008,14.2600), 'BUD': (47.4298,19.2610),
    'IST': (41.2753,28.7519), 'SAW': (40.8986,29.3092), 'TLV': (32.0114,34.8867),
    'ATH': (37.9364,23.9445),
    # Asia-Pacific
    'SIN': (1.3644,103.9915), 'HKG': (22.3080,113.9185), 'NRT': (35.7720,140.3929),
    'HND': (35.5494,139.7798),'ICN': (37.4602,126.4407), 'PEK': (40.0799,116.6031),
    'PVG': (31.1443,121.8083),'CAN': (23.3924,113.2988), 'CTU': (30.5785,103.9471),
    'BKK': (13.6900,100.7501),'KUL': (2.7456,101.7072),  'CGK': (6.1256,106.6559),
    'MNL': (14.5086,121.0194),'SYD': (33.9399,151.1753), 'MEL': (37.6690,144.8410),
    'BNE': (27.3842,153.1175),'AKL': (37.0082,174.7850),
    # South Asia
    'BOM': (19.0896,72.8656), 'DEL': (28.5562,77.1000),  'BLR': (13.1979,77.7063),
    'HYD': (17.2313,78.4298), 'MAA': (12.9900,80.1693),  'CCU': (22.6520,88.4463),
    'AMD': (23.0772,72.6347), 'PNQ': (18.5822,73.9197),  'COK': (9.9952,76.2700),
    'CMB': (7.1808,79.8841),  'DAC': (23.8433,90.3978),  'KTM': (27.6966,85.3591),
    # Middle East & Africa
    'DXB': (25.2532,55.3657), 'AUH': (24.4330,54.6511),  'DOH': (25.2610,51.5650),
    'RUH': (24.9578,46.6989), 'CAI': (30.1219,31.4056),  'JNB': (26.1392,28.2460),
    'CPT': (33.9648,18.6017), 'NBO': (1.3192,36.9275),   'ADD': (8.9779,38.7993),
    'LOS': (6.5774,3.3214),   'CMN': (33.3675,-7.5899),
}

TRAVEL_COL_ALIASES = {
    'Employee Name': 'employee', 'Employee ID': 'employee_id',
    'Department': 'department', 'Cost Center': 'cost_center',
    'Trip Start Date': 'trip_start', 'Travel Start Date': 'trip_start',
    'Trip End Date': 'trip_end',   'Travel End Date':   'trip_end',
    'Travel Type': 'travel_type', 'Expense Type': 'travel_type', 'Type': 'travel_type',
    'Origin Airport': 'origin_airport', 'Departure Airport': 'origin_airport',
    'Origin': 'origin_airport',
    'Destination Airport': 'dest_airport', 'Arrival Airport': 'dest_airport',
    'Destination': 'dest_airport',
    'Origin City': 'origin_city', 'Departure City': 'origin_city',
    'Destination City': 'dest_city', 'Arrival City': 'dest_city',
    'Booking Class': 'booking_class', 'Class': 'booking_class', 'Cabin': 'booking_class',
    'Distance (km)': 'distance_km', 'Distance': 'distance_km',
    'Distance (mi)': 'distance_mi',
    'Amount': 'amount', 'Total Amount': 'amount', 'Cost': 'amount',
    'Currency': 'currency', 'Vendor': 'vendor', 'Airline': 'vendor',
    'Nights': 'nights', 'Hotel Nights': 'nights', 'Number of Nights': 'nights',
    'Country': 'dest_country', 'Hotel Country': 'dest_country',
    'Destination Country': 'dest_country', 'Origin Country': 'origin_country',
    'Vehicle Type': 'vehicle_type', 'Car Type': 'vehicle_type', 'Car Class': 'vehicle_type',
    'Distance Unit': 'distance_unit',
}


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6_371.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    a = math.sin(Δφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(Δλ/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _iata_distance_km(iata1: str, iata2: str) -> float | None:
    c1 = AIRPORT_COORDS.get((iata1 or '').upper().strip()[:4])
    c2 = AIRPORT_COORDS.get((iata2 or '').upper().strip()[:4])
    if c1 and c2:
        return round(_haversine_km(*c1, *c2), 1)
    return None


def _classify_travel_type(val: str) -> str:
    v = val.lower()
    if any(x in v for x in ('air', 'flight', 'fly', 'plane', 'airline')):      return 'flight'
    if any(x in v for x in ('hotel', 'accommodation', 'lodging', 'motel')):    return 'hotel'
    if any(x in v for x in ('car', 'rental', 'auto', 'taxi', 'uber', 'lyft', 'ground', 'vehicle')): return 'car'
    if any(x in v for x in ('rail', 'train', 'amtrak', 'eurostar', 'bullet')): return 'rail'
    return 'unknown'


def _classify_cabin(val: str) -> str:
    if not val:
        return 'unknown'
    v = val.strip().lower()
    # IATA booking codes: J/C/D = Business, F/A = First, W/S = Premium Economy, Y/M/B = Economy
    if v in ('j','c','d','i','z'):            return 'business'
    if v in ('f','a','p'):                    return 'first'
    if v in ('w','s','e') or 'premium' in v:  return 'premium'
    if any(x in v for x in ('business','biz','exec','club')): return 'business'
    if any(x in v for x in ('first','f class')):               return 'first'
    return 'economy'


def _get_distance(row) -> tuple:
    """Returns (distance_km, source_str). Tries file then IATA computation."""
    # Try explicit km column
    dist_str = safe_str(row.get('distance_km', ''))
    if dist_str:
        v = normalize_decimal(dist_str)
        if v is not None and not math.isnan(v) and v > 0:
            return v, 'provided_km'

    # Try miles column
    dist_mi_str = safe_str(row.get('distance_mi', ''))
    if dist_mi_str:
        v = normalize_decimal(dist_mi_str)
        if v is not None and not math.isnan(v) and v > 0:
            return v * 1.60934, 'provided_mi_converted'

    # Compute from IATA codes
    origin = safe_str(row.get('origin_airport', ''))[:4].upper()
    dest   = safe_str(row.get('dest_airport',   ''))[:4].upper()
    d = _iata_distance_km(origin, dest)
    if d:
        return d, f'computed_iata({origin}→{dest})'

    return None, 'unknown'


def parse_travel_file(raw_bytes: bytes, filename: str = '') -> tuple:
    """
    Parse Concur/Navan travel CSV.
    Returns (records, errors).
    """
    text = decode_bytes(raw_bytes)
    try:
        df = read_csv_flexible(text)
    except ValueError as e:
        return [], [{'row': 0, 'error': str(e), 'raw': ''}]

    df = apply_column_aliases(df, TRAVEL_COL_ALIASES)
    df = df.dropna(how='all').reset_index(drop=True)

    records, errors = [], []

    for idx, row in df.iterrows():
        row_num = idx + 2
        raw = {k: safe_str(v) for k, v in row.to_dict().items()}

        travel_type_raw = safe_str(row.get('travel_type', ''))
        travel_type = _classify_travel_type(travel_type_raw)

        trip_start = parse_date_flexible(row.get('trip_start'))
        trip_end   = parse_date_flexible(row.get('trip_end'))
        employee   = safe_str(row.get('employee', ''))
        dept       = safe_str(row.get('department', ''))
        vendor     = safe_str(row.get('vendor', ''))

        base = {
            'activity_date': trip_start,
            'period_start':  trip_start,
            'period_end':    trip_end,
            'source_row_ref': str(row_num),
            'raw_data_snapshot': raw,
        }

        try:
            if travel_type == 'flight':
                flags = []
                origin = safe_str(row.get('origin_airport', ''))[:4].upper()
                dest   = safe_str(row.get('dest_airport',   ''))[:4].upper()
                cabin  = _classify_cabin(safe_str(row.get('booking_class', '')))

                dist_km, dist_src = _get_distance(row)

                if not dist_km:
                    flags.append('missing_distance')

                if not trip_start:
                    flags.append('missing_period')

                dist_class = 'long' if (dist_km or 0) >= LONG_HAUL_KM else 'short'
                ef = AVIATION_EF.get(cabin, AVIATION_EF['unknown'])[dist_class]
                co2e = round(dist_km * ef, 4) if dist_km else None

                records.append({**base,
                    'scope': '3', 'category': 'Business Air Travel', 'source_type': 'travel_flights',
                    'raw_quantity': dist_km, 'raw_unit': 'km',
                    'raw_description': f"{origin} → {dest} ({cabin})",
                    'raw_period': str(trip_start or ''),
                    'quantity_norm': dist_km, 'normalized_unit': 'km', 'conversion_applied': '',
                    'location': safe_str(row.get('origin_city', origin)),
                    'emission_factor': ef,
                    'emission_factor_unit': f'kg CO2e/pkm ({cabin}, {dist_class}-haul)',
                    'emission_factor_source': 'DEFRA 2023 aviation factors',
                    'co2e_kg': co2e, 'flag_codes': flags,
                    'source_specific': {
                        'origin_airport': origin, 'dest_airport': dest,
                        'cabin_class': cabin, 'distance_km': dist_km,
                        'distance_source': dist_src,
                        'employee': employee, 'department': dept, 'vendor': vendor,
                    },
                })

            elif travel_type == 'hotel':
                flags = []
                nights_raw = normalize_decimal(row.get('nights', '1'))
                nights = nights_raw if nights_raw and nights_raw > 0 else 1
                if not nights_raw:
                    flags.append('missing_period')

                dest_country = safe_str(row.get('dest_country', 'DEFAULT')).upper()[:2]
                if not dest_country:
                    dest_country = 'DEFAULT'

                ef      = HOTEL_EF.get(dest_country, HOTEL_EF['DEFAULT'])
                co2e    = round(nights * ef, 4)
                loc     = safe_str(row.get('dest_city', '')) or safe_str(row.get('dest_airport', ''))

                if not trip_start:
                    flags.append('missing_period')

                records.append({**base,
                    'scope': '3', 'category': 'Business Travel – Hotels', 'source_type': 'travel_hotels',
                    'raw_quantity': nights, 'raw_unit': 'room-nights',
                    'raw_description': f"Hotel – {vendor or 'Unknown'} ({dest_country})",
                    'raw_period': str(trip_start or ''),
                    'quantity_norm': nights, 'normalized_unit': 'room-nights', 'conversion_applied': '',
                    'location': loc, 'country': dest_country,
                    'emission_factor': ef,
                    'emission_factor_unit': 'kg CO2e/room-night',
                    'emission_factor_source': f'DEFRA 2023 hotel ({dest_country})',
                    'co2e_kg': co2e, 'flag_codes': flags,
                    'source_specific': {
                        'nights': nights, 'dest_country': dest_country,
                        'vendor': vendor, 'employee': employee, 'department': dept,
                    },
                })

            elif travel_type == 'car':
                flags = []
                dist_km, dist_src = _get_distance(row)

                if not dist_km:
                    flags.append('missing_distance')
                if not trip_start:
                    flags.append('missing_period')

                vehicle_raw = safe_str(row.get('vehicle_type', '')).lower()
                ef_key = next((k for k in CAR_EF if k in vehicle_raw), 'unknown')
                ef     = CAR_EF[ef_key]
                co2e   = round(dist_km * ef, 4) if dist_km else None

                records.append({**base,
                    'scope': '3', 'category': 'Business Travel – Ground Transport',
                    'source_type': 'travel_ground',
                    'raw_quantity': dist_km, 'raw_unit': 'km',
                    'raw_description': f"Car rental – {vehicle_raw or 'unknown class'}",
                    'raw_period': str(trip_start or ''),
                    'quantity_norm': dist_km, 'normalized_unit': 'km', 'conversion_applied': '',
                    'location': safe_str(row.get('origin_city', '')),
                    'emission_factor': ef,
                    'emission_factor_unit': 'kg CO2e/km',
                    'emission_factor_source': f'DEFRA 2023 car ({ef_key})',
                    'co2e_kg': co2e, 'flag_codes': flags,
                    'source_specific': {
                        'vehicle_class': ef_key, 'vehicle_raw': vehicle_raw,
                        'distance_km': dist_km, 'distance_source': dist_src,
                        'vendor': vendor, 'employee': employee, 'department': dept,
                    },
                })

            elif travel_type == 'rail':
                flags = []
                dist_km, dist_src = _get_distance(row)
                # Rail EF: ~0.041 kg CO2e/pkm (Eurostar/UK rail average, DEFRA 2023)
                ef   = 0.041
                co2e = round(dist_km * ef, 4) if dist_km else None
                if not dist_km:
                    flags.append('missing_distance')

                records.append({**base,
                    'scope': '3', 'category': 'Business Travel – Rail',
                    'source_type': 'travel_ground',
                    'raw_quantity': dist_km, 'raw_unit': 'km',
                    'raw_description': f"Rail – {vendor or 'Unknown'}",
                    'raw_period': str(trip_start or ''),
                    'quantity_norm': dist_km, 'normalized_unit': 'km', 'conversion_applied': '',
                    'location': safe_str(row.get('origin_city', '')),
                    'emission_factor': ef,
                    'emission_factor_unit': 'kg CO2e/pkm',
                    'emission_factor_source': 'DEFRA 2023 rail',
                    'co2e_kg': co2e, 'flag_codes': flags,
                    'source_specific': {
                        'distance_km': dist_km, 'distance_source': dist_src,
                        'vendor': vendor, 'employee': employee,
                    },
                })

            else:
                errors.append({
                    'row': row_num,
                    'error': f"Unrecognised travel type: '{travel_type_raw}'",
                    'raw': str(raw),
                })

        except Exception as e:
            logger.exception("Travel parser row %s", row_num)
            errors.append({'row': row_num, 'error': str(e), 'raw': str(raw)})

    return records, errors
