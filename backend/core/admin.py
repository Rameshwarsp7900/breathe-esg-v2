from django.contrib import admin
from .models import Tenant, TenantMembership, IngestionBatch, EmissionRecord, PlantCode, EmissionFactor

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['name','slug','is_active','created_at']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(TenantMembership)
class TenantMembershipAdmin(admin.ModelAdmin):
    list_display = ['user','tenant','role','joined_at']
    list_filter  = ['role','tenant']

@admin.register(EmissionRecord)
class EmissionRecordAdmin(admin.ModelAdmin):
    list_display  = ['tenant','scope','category','co2e_kg','status','activity_date','location']
    list_filter   = ['scope','status','source_type','tenant']
    search_fields = ['location','raw_description','category','plant_code']
    readonly_fields = ['raw_data_snapshot','edit_history','source_row_ref','created_at','updated_at']

@admin.register(IngestionBatch)
class IngestionBatchAdmin(admin.ModelAdmin):
    list_display  = ['tenant','source_type','status','total_rows','success_rows','failed_rows','uploaded_at']
    list_filter   = ['source_type','status','tenant']
    readonly_fields = ['source_checksum','processing_log','processed_at']

@admin.register(PlantCode)
class PlantCodeAdmin(admin.ModelAdmin):
    list_display = ['tenant','code','name','country','grid_region']

@admin.register(EmissionFactor)
class EmissionFactorAdmin(admin.ModelAdmin):
    list_display = ['category','substance','unit','kg_co2e','source','effective_from','effective_to']
    list_filter  = ['category']
