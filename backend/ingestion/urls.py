from django.urls import path
from .views import IngestFileView

urlpatterns = [
    path('tenants/<slug:tenant_slug>/ingest/<str:source_type>/', IngestFileView.as_view()),
]
