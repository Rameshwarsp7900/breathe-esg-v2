from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (Tenant, TenantMembership, IngestionBatch,
                     EmissionRecord, PlantCode, EmissionFactor)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class PlantCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PlantCode
        fields = ['id', 'code', 'name', 'country', 'region', 'grid_region']


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tenant
        fields = ['id', 'name', 'slug', 'created_at', 'is_active']


class IngestionBatchSerializer(serializers.ModelSerializer):
    uploaded_by_name     = serializers.SerializerMethodField()
    source_type_display  = serializers.CharField(source='get_source_type_display', read_only=True)
    status_display       = serializers.CharField(source='get_status_display',      read_only=True)

    class Meta:
        model  = IngestionBatch
        fields = '__all__'
        read_only_fields = [
            'id', 'uploaded_at', 'processed_at', 'source_checksum',
            'total_rows', 'success_rows', 'failed_rows', 'flagged_rows', 'processing_log',
        ]

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None


class EmissionRecordSerializer(serializers.ModelSerializer):
    scope_display        = serializers.CharField(source='get_scope_display',  read_only=True)
    status_display       = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name     = serializers.SerializerMethodField()
    approved_by_name     = serializers.SerializerMethodField()
    co2e_tonnes          = serializers.SerializerMethodField()
    is_locked            = serializers.BooleanField(read_only=True)

    class Meta:
        model  = EmissionRecord
        fields = '__all__'
        read_only_fields = [
            'id', 'tenant', 'batch', 'created_at', 'updated_at',
            'raw_data_snapshot', 'source_row_ref', 'edit_history',
            'approved_by', 'approved_at', 'locked_at',
        ]

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.username if obj.reviewed_by else None

    def get_approved_by_name(self, obj):
        return obj.approved_by.username if obj.approved_by else None

    def get_co2e_tonnes(self, obj):
        if obj.co2e_kg is not None:
            return round(obj.co2e_kg / 1000, 6)
        return None


class EmissionFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmissionFactor
        fields = '__all__'


class DashboardStatsSerializer(serializers.Serializer):
    total_records   = serializers.IntegerField()
    pending_review  = serializers.IntegerField()
    flagged         = serializers.IntegerField()
    approved        = serializers.IntegerField()
    locked          = serializers.IntegerField()
    rejected        = serializers.IntegerField()
    total_co2e_kg   = serializers.FloatField()
    total_co2e_t    = serializers.FloatField()
    scope_breakdown = serializers.DictField()
    source_breakdown= serializers.DictField()
    flag_breakdown  = serializers.DictField()
    monthly_trend   = serializers.ListField()
    recent_batches  = IngestionBatchSerializer(many=True)
