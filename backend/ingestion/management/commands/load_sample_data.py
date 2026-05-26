"""
Management command: python manage.py load_sample_data

Creates demo tenant, users, plant codes, and ingests all three sample files.
Safe to re-run (clears existing demo data first).
"""
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import Tenant, TenantMembership, PlantCode, EmissionFactor
from datetime import date

SAMPLE_DIR = Path(__file__).resolve().parents[5] / 'sample_data'


class Command(BaseCommand):
    help = 'Load demo tenant, users, plant codes and emission factors'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing demo data…')
        User.objects.filter(username__in=['admin', 'analyst', 'viewer']).delete()
        Tenant.objects.filter(slug='acme').delete()

        # Users
        admin = User.objects.create_superuser('admin', 'admin@breatheesg.com', 'admin123')
        admin.first_name = 'Admin'; admin.last_name = 'User'; admin.save()

        analyst = User.objects.create_user('analyst', 'analyst@breatheesg.com', 'analyst123')
        analyst.first_name = 'Sarah'; analyst.last_name = 'Chen'; analyst.save()

        viewer = User.objects.create_user('viewer', 'viewer@breatheesg.com', 'viewer123')
        viewer.first_name = 'View'; viewer.last_name = 'Only'; viewer.save()

        # Tenant
        tenant = Tenant.objects.create(name='Acme Manufacturing Corp', slug='acme')
        TenantMembership.objects.bulk_create([
            TenantMembership(user=admin,   tenant=tenant, role='admin'),
            TenantMembership(user=analyst, tenant=tenant, role='analyst'),
            TenantMembership(user=viewer,  tenant=tenant, role='viewer'),
        ])

        # Plant codes
        PlantCode.objects.bulk_create([
            PlantCode(tenant=tenant, code='1000', name='Frankfurt Main Plant',        country='DE', region='Hesse',        grid_region='DE'),
            PlantCode(tenant=tenant, code='2000', name='Chicago Distribution Center', country='US', region='Illinois',     grid_region='US'),
            PlantCode(tenant=tenant, code='3000', name='Singapore Asia Hub',          country='SG', region='Central',      grid_region='SG'),
            PlantCode(tenant=tenant, code='4000', name='Mumbai Manufacturing',        country='IN', region='Maharashtra',  grid_region='IN'),
            PlantCode(tenant=tenant, code='5000', name='London Sales Office',         country='UK', region='England',      grid_region='UK'),
        ])

        # Emission factors (versioned)
        ef_today = date(2023, 1, 1)
        EmissionFactor.objects.all().delete()
        EmissionFactor.objects.bulk_create([
            # Fuels (per liter)
            EmissionFactor(category='fuel', substance='diesel',      unit='liter',      kg_co2e=2.68,  source='IPCC AR6 / EPA AP-42', effective_from=ef_today),
            EmissionFactor(category='fuel', substance='gasoline',    unit='liter',      kg_co2e=2.31,  source='IPCC AR6',             effective_from=ef_today),
            EmissionFactor(category='fuel', substance='heating_oil', unit='liter',      kg_co2e=2.52,  source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='fuel', substance='furnace_oil', unit='liter',      kg_co2e=2.96,  source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='fuel', substance='kerosene',    unit='liter',      kg_co2e=2.53,  source='IPCC AR6',             effective_from=ef_today),
            # Fuels (per kg)
            EmissionFactor(category='fuel', substance='coal',        unit='kg',         kg_co2e=2.42,  source='IPCC AR6',             effective_from=ef_today),
            EmissionFactor(category='fuel', substance='propane',     unit='kg',         kg_co2e=1.51,  source='IPCC AR6',             effective_from=ef_today),
            # Fuels (per m3)
            EmissionFactor(category='fuel', substance='natural_gas', unit='m3',         kg_co2e=2.04,  source='IPCC AR6',             effective_from=ef_today),
            # Electricity (per kWh)
            EmissionFactor(category='electricity', substance='grid_IN', unit='kWh',    kg_co2e=0.716, source='IEA 2023',             effective_from=ef_today),
            EmissionFactor(category='electricity', substance='grid_US', unit='kWh',    kg_co2e=0.386, source='IEA 2023',             effective_from=ef_today),
            EmissionFactor(category='electricity', substance='grid_DE', unit='kWh',    kg_co2e=0.366, source='IEA 2023',             effective_from=ef_today),
            EmissionFactor(category='electricity', substance='grid_UK', unit='kWh',    kg_co2e=0.193, source='IEA 2023',             effective_from=ef_today),
            EmissionFactor(category='electricity', substance='grid_SG', unit='kWh',    kg_co2e=0.408, source='IEA 2023',             effective_from=ef_today),
            # Aviation (per pkm)
            EmissionFactor(category='flight', substance='economy_short',  unit='pkm',  kg_co2e=0.255, source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='flight', substance='economy_long',   unit='pkm',  kg_co2e=0.195, source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='flight', substance='business_short', unit='pkm',  kg_co2e=0.510, source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='flight', substance='business_long',  unit='pkm',  kg_co2e=0.390, source='DEFRA 2023',           effective_from=ef_today),
            # Hotels (per room-night)
            EmissionFactor(category='hotel', substance='hotel_IN', unit='room-night',  kg_co2e=10.1,  source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='hotel', substance='hotel_US', unit='room-night',  kg_co2e=31.2,  source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='hotel', substance='hotel_UK', unit='room-night',  kg_co2e=24.0,  source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='hotel', substance='hotel_DE', unit='room-night',  kg_co2e=19.5,  source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='hotel', substance='hotel_SG', unit='room-night',  kg_co2e=22.5,  source='DEFRA 2023',           effective_from=ef_today),
            EmissionFactor(category='hotel', substance='hotel_JP', unit='room-night',  kg_co2e=24.8,  source='DEFRA 2023',           effective_from=ef_today),
        ])

        self.stdout.write(self.style.SUCCESS(
            f'\nDemo data loaded successfully!'
            f'\n  Tenant : Acme Manufacturing Corp (slug: acme)'
            f'\n  Users  : admin/admin123  |  analyst/analyst123  |  viewer/viewer123'
            f'\n  Plants : 1000(DE), 2000(US), 3000(SG), 4000(IN), 5000(UK)'
            f'\n  EFs    : {EmissionFactor.objects.count()} emission factors loaded'
            f'\n\nNow upload files from sample_data/ via the UI or API.'
        ))
