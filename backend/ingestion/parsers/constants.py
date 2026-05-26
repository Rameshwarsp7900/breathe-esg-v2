"""
Shared emission factors and unit conversions.
All emission factors are in kg CO2e per unit.
Sources: IPCC AR6 WG1, DEFRA 2023, IEA 2023, EPA AP-42.
"""

# ── Unit → SI conversions ──────────────────────────────────────────────────────
VOLUME_TO_LITERS = {
    'L': 1.0, 'LT': 1.0, 'LTR': 1.0, 'LITER': 1.0, 'LITERS': 1.0,
    'ML': 0.001,
    'GAL': 3.78541,   # US gallon
    'USGAL': 3.78541,
    'UKGAL': 4.54609, # Imperial gallon
    'BBL': 158.987,   # barrel
}
MASS_TO_KG = {
    'KG': 1.0, 'KGS': 1.0,
    'G': 0.001, 'GR': 0.001,
    'T': 1000.0, 'MT': 1000.0, 'TONNE': 1000.0, 'TON': 907.185,  # US ton
    'LB': 0.453592, 'LBS': 0.453592,
}
ENERGY_TO_KWH = {
    'KWH': 1.0, 'kwh': 1.0,
    'MWH': 1000.0, 'mwh': 1000.0,
    'GWH': 1_000_000.0,
    'GJ': 277.778,
    'MJ': 0.277778,
    'MMBTU': 293.071,
    'THERM': 29.3071, 'THERMS': 29.3071,
    'BTU': 0.000293071,
}
VOLUME_ENERGY_TO_KWH = {
    'M3': 10.55,    # Natural gas m³ → kWh (calorific value, EU avg)
    'NM3': 10.55,   # Normalised m³
    'CBM': 10.55,
    'SCF': 0.2931,  # Standard cubic feet (US natural gas)
    'MCF': 293.1,   # Thousand cubic feet
}

# ── Fuel emission factors (kg CO2e per liter unless stated) ───────────────────
# Source: IPCC AR6 Table 2.2 / EPA AP-42 / DEFRA 2023
FUEL_EF_PER_LITER = {
    'diesel':       2.68,
    'hsd':          2.68,   # High Speed Diesel (India)
    'petrol':       2.31,
    'gasoline':     2.31,
    'unleaded':     2.31,
    'heating_oil':  2.52,
    'heizoel':      2.52,
    'fuel_oil':     2.96,   # Heavy fuel oil
    'furnace_oil':  2.96,
    'kerosene':     2.53,
    'kerosin':      2.53,
    'jet_fuel':     2.53,
    'lpg':          1.63,   # per liter (liquid)
}
FUEL_EF_PER_KG = {
    'coal':         2.42,
    'anthracite':   2.55,
    'lignite':      1.10,
    'coke':         3.17,
    'propane':      1.51,
    'propangas':    1.51,
    'butane':       1.54,
    'butan':        1.54,
    'wood':         0.015,   # biogenic — near zero net
}
FUEL_EF_PER_M3 = {
    'natural_gas':  2.04,
    'erdgas':       2.04,
    'lng':          2.75,
    'cng':          2.04,
    'biogas':       0.0,     # biogenic
}

# ── Electricity grid emission factors (kg CO2e per kWh) — IEA 2023 ───────────
GRID_EF = {
    'IN': 0.716, 'US': 0.386, 'DE': 0.366, 'UK': 0.193,
    'SG': 0.408, 'AU': 0.790, 'FR': 0.052, 'CN': 0.581,
    'CA': 0.130, 'JP': 0.472, 'BR': 0.075, 'ZA': 0.928,
    'NL': 0.270, 'SE': 0.008, 'NO': 0.026, 'FI': 0.086,
    'KR': 0.415, 'MX': 0.440, 'ID': 0.756, 'TH': 0.513,
    'MY': 0.585, 'PH': 0.534, 'VN': 0.364, 'AE': 0.408,
    'SA': 0.748, 'EG': 0.471, 'NG': 0.431,
    'DEFAULT': 0.450,
}

# ── Aviation emission factors (kg CO2e per passenger-km) — DEFRA 2023 ─────────
# Short-haul < 3700 km, long-haul >= 3700 km
AVIATION_EF = {
    'economy':  {'short': 0.255, 'long': 0.195},
    'premium':  {'short': 0.330, 'long': 0.295},
    'business': {'short': 0.510, 'long': 0.390},
    'first':    {'short': 0.765, 'long': 0.585},
    'unknown':  {'short': 0.255, 'long': 0.195},
}
LONG_HAUL_KM = 3700

# ── Hotel emission factors (kg CO2e per room-night) — DEFRA 2023 ─────────────
HOTEL_EF = {
    'US': 31.2, 'UK': 24.0, 'DE': 19.5, 'IN': 10.1,
    'SG': 22.5, 'AU': 38.2, 'FR': 18.4, 'CN': 28.6,
    'JP': 24.8, 'CA': 16.3, 'BR': 12.1, 'ZA': 42.0,
    'AE': 30.1, 'TH': 18.9, 'MY': 21.4, 'KR': 26.1,
    'DEFAULT': 25.0,
}

# ── Car rental emission factors (kg CO2e per km) — DEFRA 2023 ────────────────
CAR_EF = {
    'mini':     0.109,
    'small':    0.121,
    'compact':  0.143,
    'economy':  0.143,
    'midsize':  0.171,
    'standard': 0.171,
    'fullsize': 0.196,
    'full':     0.196,
    'suv':      0.248,
    'van':      0.280,
    'luxury':   0.280,
    'electric': 0.053,
    'ev':       0.053,
    'hybrid':   0.106,
    'unknown':  0.171,
}
