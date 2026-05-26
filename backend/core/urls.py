from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(
    r'tenants/(?P<tenant_slug>[\w-]+)/records',
    views.EmissionRecordViewSet,
    basename='records',
)
router.register(
    r'tenants/(?P<tenant_slug>[\w-]+)/batches',
    views.IngestionBatchViewSet,
    basename='batches',
)
router.register(
    r'tenants/(?P<tenant_slug>[\w-]+)/plants',
    views.PlantCodeViewSet,
    basename='plants',
)
router.register(r'emission-factors', views.EmissionFactorViewSet, basename='ef')

urlpatterns = [
    path('auth/csrf/',   views.csrf_view),
    path('auth/login/',  views.login_view),
    path('auth/logout/', views.logout_view),
    path('auth/me/',     views.me_view),
    path('tenants/<slug:tenant_slug>/dashboard/', views.dashboard_stats),
    path('', include(router.urls)),
]
