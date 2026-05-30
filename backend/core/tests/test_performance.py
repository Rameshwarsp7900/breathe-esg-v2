import pytest
from django.urls import reverse
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from core.models import Tenant, TenantMembership, IngestionBatch

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def performance_setup(db):
    tenant = Tenant.objects.create(name="Performance Corp", slug="perf-corp")
    user = User.objects.create_user(username="perf_analyst", password="password123")
    TenantMembership.objects.create(user=user, tenant=tenant, role="analyst")

    # Create 10 batches to make the N+1 problem visible
    for i in range(10):
        IngestionBatch.objects.create(
            tenant=tenant,
            source_type='sap_fuel',
            uploaded_by=user,
            total_rows=100,
            success_rows=100
        )
    return tenant, user

@pytest.mark.django_db
def test_dashboard_stats_query_count(api_client, performance_setup):
    tenant, user = performance_setup
    api_client.force_authenticate(user=user)

    url = f'/api/tenants/{tenant.slug}/dashboard/'

    with CaptureQueriesContext(connection) as queries:
        response = api_client.get(url)

    assert response.status_code == 200
    # Expected: ~13 queries with select_related optimization.
    # Without optimization, it was 18.
    assert len(queries) <= 13

@pytest.mark.django_db
def test_batch_list_query_count(api_client, performance_setup):
    tenant, user = performance_setup
    api_client.force_authenticate(user=user)

    url = f'/api/tenants/{tenant.slug}/batches/'

    with CaptureQueriesContext(connection) as queries:
        response = api_client.get(url)

    assert response.status_code == 200
    # Expected: 3 queries with select_related optimization.
    # Without optimization, it was 13.
    assert len(queries) <= 3
