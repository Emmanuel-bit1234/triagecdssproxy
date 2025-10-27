# API Updates - Dashboard Queries & Patient Visits

## Overview
This document outlines the recent API changes for patient visit tracking and updated dashboard queries that now use the `patients` table instead of parsing JSON fields.

---

## 🆕 New Endpoint: Get Patient Visits

### Endpoint
```
GET /prediction-logs/patient/:patientNumber
```

### Description
Retrieves all ED visits/triage records for a specific patient by their patient number. Returns all visits ordered by most recent first.

### Authentication
Required: Yes (Bearer token)

### Parameters
- **patientNumber** (path parameter): The patient's unique number (e.g., "P00001234")

### Request Example
```bash
GET /prediction-logs/patient/P00001234
Authorization: Bearer <token>
```

### Response Structure
```json
{
  "patientNumber": "P00001234",
  "totalVisits": 3,
  "visits": [
    {
      "id": 156,
      "userId": 3,
      "patientNumber": "P00001234",
      "inputs": {
        "Sex": 2,
        "Age": "45",
        "Arrival_mode": 1,
        "Injury": 0,
        "Mental": 0,
        "Pain": 8,
        "NRS_pain": 8,
        "SBP": "140",
        "DBP": "90",
        "HR": "95",
        "RR": "18",
        "BT": "37.2",
        "Chief_complain": "Severe chest pain"
      },
      "predict": 2,
      "ktasExplained": {
        "Level": 2,
        "Title": "Resuscitation",
        "Meaning": "Immediate life-threatening condition",
        "Triage_target": "Immediate assessment within 10 minutes"
      },
      "probs": ["0.05", "0.85", "0.08", "0.02", "0.00"],
      "model": "model1",
      "createdAt": "2024-01-15T14:32:18.123Z",
      "user": {
        "id": 3,
        "email": "nurse.johnson@hospital.com",
        "name": "Sarah Johnson"
      }
    }
  ]
}
```

### Usage in Frontend
When a user clicks on a patient record, call this endpoint to display their full visit history:

```javascript
// Example: Fetch patient visits
const fetchPatientVisits = async (patientNumber) => {
  const response = await fetch(
    `/prediction-logs/patient/${patientNumber}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  return data.visits; // Array of all visits for this patient
};
```

---

## 📊 Updated Dashboard Queries

### 1. Patient Gender Distribution

#### Endpoint
```
GET /prediction-logs/stats/patient-gender
```

#### What Changed
- **Before**: Extracted gender from `inputs.Sex` (JSON field, 1=female, 2=male)
- **After**: Now reads directly from `patients.gender` (string: 'male', 'female', 'other')

#### Response Format
*Note: Structure remains the same for backward compatibility*

```json
{
  "male": 45,
  "female": 52,
  "other": 3,
  "total": 100
}
```

#### Frontend Impact
✅ **No changes required** - The response format is identical

---

### 2. Nurse Reports

#### Endpoint
```
GET /nurse-reports/:nurseId
GET /nurse-reports/:nurseId?date=YYYY-MM-DD
```

#### What Changed in Gender Distribution
- **Before**: Extracted from `inputs.Sex` JSON field (numeric)
- **After**: Uses `patients.gender` table (string values)

#### What Changed in Age Distribution
- **Before**: Extracted from `inputs.Age` JSON field
- **After**: Calculated from `patients.dateOfBirth` (age groups: pediatric, adult, elderly)

#### Response Structure
*Note: The response structure has NOT changed*

```json
{
  "report": {
    "nurse": {
      "id": 3,
      "name": "Sarah Johnson",
      "email": "nurse.johnson@hospital.com"
    },
    "period": {
      "type": "daily",
      "date": "2024-01-15"
    },
    "summary": {
      "totalPatients": 25,
      "averagePredictionLevel": 3.2,
      "mostCommonLevel": 3,
      "levelDistribution": { "1": 2, "2": 5, "3": 12, "4": 4, "5": 2 },
      "criticalPatients": 7,
      "moderatePatients": 12,
      "lowUrgencyPatients": 6
    },
    "demographics": {
      "genderDistribution": {
        "male": 12,
        "female": 13,
        "other": 0
      },
      "ageGroups": {
        "pediatric": 5,
        "adult": 15,
        "elderly": 5
      },
      "arrivalModeDistribution": {
        "1": 10,
        "2": 12,
        "3": 3
      }
    },
    // ... rest of report unchanged
  }
}
```

#### Frontend Impact
✅ **No changes required** - The response format is identical

---

## 🔧 Technical Details

### Database Schema
The following tables are now being used:

**`patients` table:**
```sql
- id (serial)
- patientNumber (varchar, unique)
- firstName (varchar)
- lastName (varchar)
- dateOfBirth (timestamp)
- gender (varchar) -- 'male', 'female', 'other'
- ... other fields
```

**`prediction_logs` table:**
```sql
- id (serial)
- user_id (integer, FK -> users)
- patient_id (integer, FK -> patients) -- New!
- patient_number (varchar) -- Used for joins
- inputs (jsonb)
- predict (integer)
- ktas_explained (jsonb)
- probs (jsonb)
- model (varchar)
- created_at (timestamp)
```

### Join Logic
All updated queries now use `LEFT JOIN` between `prediction_logs` and `patients` tables via `patient_number`:

```sql
LEFT JOIN patients 
  ON prediction_logs.patient_number = patients.patient_number
```

---

## ✅ Migration Status

- ✅ No database migration needed (schema already up-to-date)
- ✅ Backward compatible response formats
- ✅ All queries successfully updated
- ✅ Build completed without errors

---

## 📝 Summary for Frontend Developers

### New Feature
1. **Patient Visits Endpoint**: Get complete visit history for any patient by patient number

### No Breaking Changes
- All existing endpoints continue to work
- Response formats remain the same
- No code changes required in existing frontend implementations

### Optional Enhancement
You can now display complete visit history by implementing the new patient visits endpoint when users click on patient records.

---

## 🧪 Testing the Changes

### Test Patient Visits Endpoint
```bash
curl -X GET /prediction-logs/patient/P00001234 \
  -H "Authorization: Bearer <your-token>"
```

### Test Updated Gender Distribution
```bash
curl -X GET /prediction-logs/stats/patient-gender \
  -H "Authorization: Bearer <your-token>"
```

Expected response should show gender distribution from the patients table.

---

## 📌 Notes

- The `other` gender option was added to all gender distribution queries for completeness
- Age calculations now use actual date of birth instead of potentially inconsistent input data
- All queries maintain the same response structure for seamless frontend integration
