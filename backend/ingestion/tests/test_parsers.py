import pytest
from ingestion.parsers.base import normalize_decimal, parse_date_flexible, read_csv_flexible
from datetime import date

def test_normalize_decimal():
    # Standard formats
    assert normalize_decimal("1234.56") == 1234.56
    assert normalize_decimal("1,234.56") == 1234.56
    assert normalize_decimal(1234.56) == 1234.56

    # German/European formats
    assert normalize_decimal("1.234,56") == 1234.56
    assert normalize_decimal("1234,56") == 1234.56
    assert normalize_decimal("1 234,56") == 1234.56

    # Edge cases
    assert normalize_decimal("") is None
    assert normalize_decimal("NaN") is None
    assert normalize_decimal("-") is None
    assert normalize_decimal("abc") is None

def test_parse_date_flexible():
    # ISO
    assert parse_date_flexible("2024-01-31") == date(2024, 1, 31)

    # German
    assert parse_date_flexible("31.01.2024") == date(2024, 1, 31)

    # US
    assert parse_date_flexible("01/31/2024") == date(2024, 1, 31)

    # Mixed
    assert parse_date_flexible("2024/01/31") == date(2024, 1, 31)

    # Invalid
    assert parse_date_flexible("not-a-date") is None
    assert parse_date_flexible("") is None

def test_read_csv_flexible():
    csv_comma = "col1,col2,col3\n1,2,3"
    df_comma = read_csv_flexible(csv_comma)
    assert len(df_comma.columns) == 3

    csv_semi = "col1;col2;col3\n1;2;3"
    df_semi = read_csv_flexible(csv_semi)
    assert len(df_semi.columns) == 3

    csv_tab = "col1\tcol2\tcol3\n1\t2\t3"
    df_tab = read_csv_flexible(csv_tab)
    assert len(df_tab.columns) == 3

    # Hostile with junk
    csv_junk = "\ufeff\n\r  col1,col2,col3\n1,2,3"
    df_junk = read_csv_flexible(csv_junk)
    assert len(df_junk.columns) == 3
