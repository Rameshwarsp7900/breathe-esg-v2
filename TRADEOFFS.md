# Technical Tradeoffs - Breathe ESG

## 1. Semantic Deduplication
**What I didn't build**: Logic to detect if a record has been uploaded twice under different filenames or with slightly different dates.
**Why**: We implemented **SHA-256 binary deduplication** at the file level. Semantic deduplication (detecting "Duplicate Suspects") is complex and risks deleting legitimate high-frequency transactions. I opted to add a `duplicate_suspect` flag code for analysts to use manually instead of an automated system that might fail.

## 2. Dynamic Emission Factor Recalculation
**What I didn't build**: A system that automatically updates `co2e_kg` for existing records if a reference `EmissionFactor` is updated.
**Why**: In carbon accounting, **reproducibility is paramount**. A record's value must represent the state of knowledge at the time of ingestion/approval. Recalculating historical data without a versioned audit lock can invalidate previous years' disclosures.

## 3. Real-time PDF Scraping
**What I didn't build**: A PDF parser for utility bills.
**Why**: PDF layouts change frequently across thousands of utilities. In a 4-day sprint, the ROI on a robust PDF scraper is low. I chose to focus on **Green Button CSV** support, which is a standardized format used by major utilities.

## 4. Multi-Factor Authentication (MFA)
**What I didn't build**: MFA or SSO integration.
**Why**: For a prototype, standard Django Token Auth is sufficient to demonstrate RBAC and multi-tenancy. Security hardening is a "Day 2" task.

## 5. Bulk EF Management UI
**What I didn't build**: A full management interface for the `EmissionFactor` table.
**Why**: Admins can use the Django Admin for this. I prioritized the **Analyst Review Queue** as it is the core workflow mentioned in the PM requirements.
