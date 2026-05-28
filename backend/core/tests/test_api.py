import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from core.models import Tenant, TenantMembership, IngestionBatch, EmissionRecord
import io

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data(db):
    tenant = Tenant.objects.create(name="Test Corp", slug="test-corp")
    user = User.objects.create_user(username="analyst", password="password123")
    TenantMembership.objects.create(user=user, tenant=tenant, role="analyst")
    return tenant, user

@pytest.mark.django_db
def test_ingest_file_sap(api_client, setup_data):
    tenant, user = setup_data
    api_client.force_authenticate(user=user)

    csv_content = (
        "Werk;Materialbezeichnung;Materialgruppe;Periode;Menge;Mengeneinheit;Betrag;Waehrung;Kostenstelle;Bewegungsart\n"
        "1000;Diesel;B001;2024001;1000;L;700;EUR;CC01;201"
    )
    file = io.BytesIO(csv_content.encode('utf-8'))
    file.name = 'test_sap.csv'

    # The URL for ingestion doesn't have a name in ingestion/urls.py, so we use the path
    url = f'/api/tenants/{tenant.slug}/ingest/sap_fuel/'
    response = api_client.post(url, {'file': file}, format='multipart')

    assert response.status_code == status.HTTP_201_CREATED
    assert EmissionRecord.objects.filter(tenant=tenant).count() == 1
    record = EmissionRecord.objects.first()
    assert record.raw_quantity == 1000.0
    assert record.normalized_unit == 'liters'
    assert record.co2e_kg > 0

@pytest.mark.django_db
def test_approve_record(api_client, setup_data):
    tenant, user = setup_data
    api_client.force_authenticate(user=user)

    batch = IngestionBatch.objects.create(tenant=tenant, source_type='sap_fuel')
    record = EmissionRecord.objects.create(
        tenant=tenant, batch=batch, scope='1', category='Stationary',
        source_type='sap_fuel', status='pending_review', co2e_kg=100.0
    )

    url = f'/api/tenants/{tenant.slug}/records/{record.id}/approve/'
    response = api_client.post(url)

    assert response.status_code == status.HTTP_200_OK
    record.refresh_from_db()
    assert record.status == 'approved'
    assert record.approved_by == user

@pytest.mark.django_db
def test_lock_record(api_client, setup_data):
    tenant, user = setup_data
    api_client.force_authenticate(user=user)

    batch = IngestionBatch.objects.create(tenant=tenant, source_type='sap_fuel')
    record = EmissionRecord.objects.create(
        tenant=tenant, batch=batch, scope='1', category='Stationary',
        source_type='sap_fuel', status='approved', co2e_kg=100.0
    )

    url = f'/api/tenants/{tenant.slug}/records/{record.id}/lock/'
    response = api_client.post(url)

    assert response.status_code == status.HTTP_200_OK
    record.refresh_from_db()
    assert record.status == 'locked'
    assert record.locked_at is not None
