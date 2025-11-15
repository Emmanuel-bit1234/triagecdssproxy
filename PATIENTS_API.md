# Patient Management API Documentation

Complete guide to the Patient Management API for the Triage CDSS system. This API provides comprehensive patient record management including personal information, medical history, and clinical notes.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Create Patient](#1-create-patient)
  - [Get Patient by ID](#2-get-patient-by-id)
  - [Get Patient by Patient Number](#3-get-patient-by-patient-number)
  - [Update Patient](#4-update-patient)
  - [Search Patients](#5-search-patients)
  - [Get Patient Statistics](#6-get-patient-statistics)
  - [Delete Patient](#7-delete-patient)
- [Notes Feature](#notes-feature)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)

---

## Overview

The Patient Management API allows healthcare providers to:
- Create and manage patient records
- Store comprehensive medical information
- Add clinical notes (nurse/doctor notes) with automatic author tracking
- Search and filter patients
- View patient statistics

**Base URL:**
```
http://localhost:3000/patients
```

---

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  "http://localhost:3000/patients"
```

---

## Endpoints

### 1. Create Patient

Create a new patient record with optional initial notes.

**Endpoint:** `POST /patients`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "phoneNumber": "+1234567890",
  "email": "john.doe@email.com",
  "address": "123 Main St, City, State 12345",
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phoneNumber": "+1234567891"
  },
  "medicalHistory": ["Diabetes", "Hypertension"],
  "allergies": ["Penicillin", "Shellfish"],
  "medications": ["Metformin", "Lisinopril"],
  "insuranceInfo": {
    "provider": "Blue Cross",
    "policyNumber": "BC123456789",
    "groupNumber": "GRP001"
  },
  "notes": [
    {
      "content": "Patient arrived via ambulance. Initial assessment completed."
    }
  ]
}
```

**Required Fields:**
- `firstName` (string): Patient's first name
- `lastName` (string): Patient's last name
- `dateOfBirth` (string): Date of birth in ISO format (YYYY-MM-DD)
- `gender` (string): Must be `"male"`, `"female"`, or `"other"`

**Optional Fields:**
- `patientNumber` (string): Custom patient identifier. If not provided, auto-generated as P00000001, P00000002, etc.
- `phoneNumber` (string): Contact phone number
- `email` (string): Email address
- `address` (string): Physical address
- `emergencyContact` (object): Emergency contact information
  - `name` (string): Contact name
  - `relationship` (string): Relationship to patient
  - `phoneNumber` (string): Contact phone number
- `medicalHistory` (array): Array of medical conditions
- `allergies` (array): Array of known allergies
- `medications` (array): Array of current medications
- `insuranceInfo` (object): Insurance information
  - `provider` (string): Insurance provider name
  - `policyNumber` (string): Policy number
  - `groupNumber` (string, optional): Group number
- `notes` (array): Array of initial clinical notes (see [Notes Feature](#notes-feature) section)

**Response (201 Created):**
```json
{
  "message": "Patient created successfully",
  "patient": {
    "id": 1,
    "patientNumber": "P00000001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "email": "john.doe@email.com",
    "address": "123 Main St, City, State 12345",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phoneNumber": "+1234567891"
    },
    "medicalHistory": ["Diabetes", "Hypertension"],
    "allergies": ["Penicillin", "Shellfish"],
    "medications": ["Metformin", "Lisinopril"],
    "insuranceInfo": {
      "provider": "Blue Cross",
      "policyNumber": "BC123456789",
      "groupNumber": "GRP001"
    },
    "notes": [
      {
        "id": "1705312200000-abc123def",
        "content": "Patient arrived via ambulance. Initial assessment completed.",
        "author": {
          "id": 1,
          "name": "Dr. Sarah Johnson",
          "email": "sarah.johnson@hospital.com"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Notes:**
- Patient number is auto-generated if not provided (format: P00000001, P00000002, etc.)
- If notes are provided, author information is automatically added from the authenticated user
- Notes can be provided with just `content` - the system will add `id`, `author`, and `createdAt` automatically

---

### 2. Get Patient by ID

Retrieve a specific patient by their database ID.

**Endpoint:** `GET /patients/:id`

**Path Parameters:**
- `id` (integer): Patient database ID

**Example:**
```bash
GET /patients/1
```

**Response (200 OK):**
```json
{
  "patient": {
    "id": 1,
    "patientNumber": "P00000001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "email": "john.doe@email.com",
    "address": "123 Main St, City, State 12345",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phoneNumber": "+1234567891"
    },
    "medicalHistory": ["Diabetes", "Hypertension"],
    "allergies": ["Penicillin", "Shellfish"],
    "medications": ["Metformin", "Lisinopril"],
    "insuranceInfo": {
      "provider": "Blue Cross",
      "policyNumber": "BC123456789"
    },
    "notes": [
      {
        "id": "1705312200000-abc123def",
        "content": "Patient arrived via ambulance. Initial assessment completed.",
        "author": {
          "id": 1,
          "name": "Dr. Sarah Johnson",
          "email": "sarah.johnson@hospital.com"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "1705315800000-xyz789ghi",
        "content": "Follow-up appointment scheduled for next week.",
        "author": {
          "id": 2,
          "name": "Nurse Mary Smith",
          "email": "mary.smith@hospital.com"
        },
        "createdAt": "2024-01-15T11:30:00.000Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid patient ID
- `404 Not Found`: Patient not found

---

### 3. Get Patient by Patient Number

Retrieve a specific patient by their patient number.

**Endpoint:** `GET /patients/number/:patientNumber`

**Path Parameters:**
- `patientNumber` (string): Patient number (e.g., P00000001)

**Example:**
```bash
GET /patients/number/P00000001
```

**Response:** Same structure as Get Patient by ID

**Error Responses:**
- `404 Not Found`: Patient not found

---

### 4. Update Patient

Update an existing patient record. Supports partial updates - only include fields you want to change.

**Endpoint:** `PUT /patients/:id`

**Path Parameters:**
- `id` (integer): Patient database ID

**Request Body:** (All fields optional)
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+1234567891",
  "newNote": "Patient condition improved. Discharge planned for tomorrow."
}
```

**Two Ways to Add/Update Notes:**

**Option 1: Append a New Note (Recommended)**
```json
{
  "newNote": "Patient condition improved. Discharge planned for tomorrow."
}
```
- Appends a new note to existing notes
- Automatically adds author (current user), ID, and timestamp
- Simplest way to add a note

**Option 2: Replace Entire Notes Array**
```json
{
  "notes": [
    {
      "id": "1705312200000-abc123def",
      "content": "Existing note",
      "author": {
        "id": 1,
        "name": "Dr. Sarah Johnson",
        "email": "sarah.johnson@hospital.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "content": "New note - author will be auto-filled"
    }
  ]
}
```
- Replaces all existing notes
- If author info is missing, current user is used

**Response (200 OK):**
```json
{
  "message": "Patient updated successfully",
  "patient": {
    "id": 1,
    "patientNumber": "P00000001",
    "firstName": "John",
    "lastName": "Smith",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "gender": "male",
    "phoneNumber": "+1234567891",
    "email": "john.doe@email.com",
    "address": "123 Main St, City, State 12345",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phoneNumber": "+1234567891"
    },
    "medicalHistory": ["Diabetes", "Hypertension"],
    "allergies": ["Penicillin", "Shellfish"],
    "medications": ["Metformin", "Lisinopril"],
    "insuranceInfo": {
      "provider": "Blue Cross",
      "policyNumber": "BC123456789"
    },
    "notes": [
      {
        "id": "1705312200000-abc123def",
        "content": "Patient arrived via ambulance. Initial assessment completed.",
        "author": {
          "id": 1,
          "name": "Dr. Sarah Johnson",
          "email": "sarah.johnson@hospital.com"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "1705319800000-new123note",
        "content": "Patient condition improved. Discharge planned for tomorrow.",
        "author": {
          "id": 2,
          "name": "Nurse Mary Smith",
          "email": "mary.smith@hospital.com"
        },
        "createdAt": "2024-01-15T12:30:00.000Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:30:00.000Z"
  }
}
```

**Notes:**
- Only include fields you want to update
- `updatedAt` is automatically set to current timestamp
- If `newNote` is provided, it's appended to existing notes
- If `notes` array is provided, it replaces all existing notes
- Author information is automatically added from authenticated user if missing

**Error Responses:**
- `400 Bad Request`: Invalid patient ID or invalid gender/date format
- `404 Not Found`: Patient not found

---

### 5. Search Patients

Search and filter patients with various criteria.

**Endpoint:** `GET /patients`

**Query Parameters:**
- `query` (string, optional): Search in name, patient number, phone, email (case-insensitive, partial match)
- `gender` (string, optional): Filter by gender (`"male"`, `"female"`, `"other"`)
- `ageMin` (integer, optional): Minimum age filter
- `ageMax` (integer, optional): Maximum age filter
- `hasAllergies` (boolean, optional): Filter patients with allergies (`true`/`false`)
- `hasMedications` (boolean, optional): Filter patients with medications (`true`/`false`)

**Examples:**
```bash
# Search by name
GET /patients?query=John

# Filter by gender and age range
GET /patients?gender=male&ageMin=18&ageMax=65

# Find patients with allergies
GET /patients?hasAllergies=true

# Combined search
GET /patients?query=Smith&gender=female&ageMin=30&hasAllergies=true
```

**Response (200 OK):**
```json
{
  "patients": [
    {
      "id": 1,
      "patientNumber": "P00000001",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "gender": "male",
      "phoneNumber": "+1234567890",
      "email": "john.doe@email.com",
      "address": "123 Main St, City, State 12345",
      "emergencyContact": {
        "name": "Jane Doe",
        "relationship": "Spouse",
        "phoneNumber": "+1234567891"
      },
      "medicalHistory": ["Diabetes", "Hypertension"],
      "allergies": ["Penicillin", "Shellfish"],
      "medications": ["Metformin", "Lisinopril"],
      "insuranceInfo": {
        "provider": "Blue Cross",
        "policyNumber": "BC123456789"
      },
      "notes": [
        {
          "id": "1705312200000-abc123def",
          "content": "Initial assessment completed",
          "author": {
            "id": 1,
            "name": "Dr. Sarah Johnson",
            "email": "sarah.johnson@hospital.com"
          },
          "createdAt": "2024-01-15T10:30:00.000Z"
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Notes:**
- Results are ordered by creation date (newest first)
- All filters can be combined
- Search is case-insensitive and matches partial strings
- Returns empty array if no patients match criteria

---

### 6. Get Patient Statistics

Get comprehensive statistics about all patients in the system.

**Endpoint:** `GET /patients/stats/overview`

**Response (200 OK):**
```json
{
  "stats": {
    "totalPatients": 150,
    "genderDistribution": {
      "male": 75,
      "female": 70,
      "other": 5
    },
    "ageGroups": {
      "pediatric": 25,
      "adult": 100,
      "elderly": 25
    },
    "commonAllergies": [
      {
        "allergy": "Penicillin",
        "count": 45
      },
      {
        "allergy": "Shellfish",
        "count": 30
      },
      {
        "allergy": "Latex",
        "count": 20
      }
    ],
    "commonMedications": [
      {
        "medication": "Metformin",
        "count": 35
      },
      {
        "medication": "Lisinopril",
        "count": 30
      },
      {
        "medication": "Atorvastatin",
        "count": 25
      }
    ],
    "recentRegistrations": 15
  }
}
```

**Statistics Breakdown:**
- `totalPatients`: Total number of patients in the system
- `genderDistribution`: Count by gender (male, female, other)
- `ageGroups`: Count by age category
  - `pediatric`: Ages 0-17
  - `adult`: Ages 18-64
  - `elderly`: Ages 65+
- `commonAllergies`: Top 10 most common allergies with counts
- `commonMedications`: Top 10 most common medications with counts
- `recentRegistrations`: Number of patients registered in the last 30 days

**Notes:**
- Statistics are calculated in real-time from the database
- Age calculations are based on current date
- Common allergies/medications are sorted by frequency

---

### 7. Delete Patient

Permanently delete a patient record.

**Endpoint:** `DELETE /patients/:id`

**Path Parameters:**
- `id` (integer): Patient database ID

**Example:**
```bash
DELETE /patients/1
```

**Response (200 OK):**
```json
{
  "message": "Patient deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid patient ID
- `404 Not Found`: Patient not found

**⚠️ Warning:**
- Patient deletion is permanent and cannot be undone
- All associated data (notes, medical history, etc.) will be deleted

---

## Notes Feature

The notes feature allows nurses and doctors to add clinical notes to patient records. Notes are automatically tracked with author information and timestamps.

### Note Structure

```typescript
interface PatientNote {
  id: string;                    // Unique identifier (auto-generated)
  content: string;                // Note text content
  author: {                       // Author information (auto-filled)
    id: number;                   // User ID
    name: string;                  // User name
    email: string;                 // User email
  };
  createdAt: string;              // ISO timestamp (auto-generated)
}
```

### Adding Notes

**When Creating a Patient:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "notes": [
    {
      "content": "Initial assessment completed. Patient stable."
    }
  ]
}
```

**When Updating a Patient (Simple Method):**
```json
{
  "newNote": "Follow-up examination completed. Patient responding well to treatment."
}
```

**When Updating a Patient (Full Control):**
```json
{
  "notes": [
    {
      "id": "existing-note-id",
      "content": "Updated note content",
      "author": {
        "id": 1,
        "name": "Dr. Smith",
        "email": "dr.smith@hospital.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "content": "New note - author auto-filled"
    }
  ]
}
```

### Notes Behavior

1. **Automatic Author Tracking**: If you provide only `content`, the system automatically adds:
   - Author information from the authenticated user (nurse/doctor)
   - Unique ID
   - Current timestamp

2. **Note Preservation**: When using `newNote`, existing notes are preserved and the new note is appended.

3. **Note Replacement**: When using `notes` array, all existing notes are replaced with the provided array.

4. **Viewing Notes**: Notes are automatically included when retrieving patient records via GET endpoints.

### Best Practices

- Use `newNote` for quick note additions during patient updates
- Use `notes` array when you need to manage the entire notes collection
- Notes are ordered chronologically (oldest first)
- Each note is immutable once created (edit by replacing the entire array)

---

## Data Models

### Patient Object

```typescript
interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  } | null;
  medicalHistory: string[] | null;
  allergies: string[] | null;
  medications: string[] | null;
  insuranceInfo: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  } | null;
  notes: PatientNote[] | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Patient Note Object

```typescript
interface PatientNote {
  id: string;
  content: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string; // ISO date string
}
```

### Emergency Contact Object

```typescript
interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
}
```

### Insurance Information Object

```typescript
interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
}
```

---

## Error Handling

### 400 Bad Request

**Missing Required Fields:**
```json
{
  "error": "Missing required fields: firstName, lastName, dateOfBirth, gender"
}
```

**Invalid Gender:**
```json
{
  "error": "Invalid gender. Must be male, female, or other"
}
```

**Invalid Date Format:**
```json
{
  "error": "Invalid date of birth format"
}
```

**Invalid Patient ID:**
```json
{
  "error": "Invalid patient ID"
}
```

### 401 Unauthorized

**Missing Token:**
```json
{
  "error": "Authorization token required"
}
```

**Invalid Token:**
```json
{
  "error": "Invalid or expired token"
}
```

### 404 Not Found

**Patient Not Found:**
```json
{
  "error": "Patient not found"
}
```

### 409 Conflict

**Duplicate Patient Number:**
```json
{
  "error": "Patient number already exists"
}
```

### 500 Internal Server Error

**Server Error:**
```json
{
  "error": "Failed to create patient"
}
```

or

```json
{
  "error": "Failed to update patient"
}
```

---

## Usage Examples

### Create a New Patient

```bash
curl -X POST \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "email": "john.doe@email.com",
    "notes": [
      {
        "content": "Initial patient registration. All vital signs normal."
      }
    ]
  }' \
  "http://localhost:3000/patients"
```

### Create Patient with Full Information

```bash
curl -X POST \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "dateOfBirth": "1985-03-20",
    "gender": "female",
    "phoneNumber": "+1987654321",
    "email": "jane.smith@email.com",
    "address": "456 Oak Avenue, City, State 54321",
    "emergencyContact": {
      "name": "John Smith",
      "relationship": "Husband",
      "phoneNumber": "+1987654322"
    },
    "medicalHistory": ["Hypertension", "Asthma"],
    "allergies": ["Penicillin", "Dust"],
    "medications": ["Albuterol", "Lisinopril"],
    "insuranceInfo": {
      "provider": "Aetna",
      "policyNumber": "AE123456789",
      "groupNumber": "GRP002"
    },
    "notes": [
      {
        "content": "Patient presents with chest pain. ECG ordered."
      }
    ]
  }' \
  "http://localhost:3000/patients"
```

### Get Patient by ID

```bash
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/patients/1"
```

### Get Patient by Patient Number

```bash
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/patients/number/P00000001"
```

### Update Patient Information

```bash
curl -X PUT \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lastName": "Smith",
    "phoneNumber": "+1234567891"
  }' \
  "http://localhost:3000/patients/1"
```

### Add a Note to Patient (Simple Method)

```bash
curl -X PUT \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newNote": "Patient condition improved. Discharge planned for tomorrow."
  }' \
  "http://localhost:3000/patients/1"
```

### Update Patient with Multiple Changes

```bash
curl -X PUT \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "medications": ["Metformin", "Lisinopril", "Aspirin"],
    "allergies": ["Penicillin"],
    "newNote": "Medication updated. Patient tolerating well."
  }' \
  "http://localhost:3000/patients/1"
```

### Search Patients

```bash
# Search by name
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/patients?query=John"

# Filter by gender and age
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/patients?gender=male&ageMin=18&ageMax=65"

# Find patients with allergies
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/patients?hasAllergies=true"

# Combined search
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/patients?query=Smith&gender=female&ageMin=30&hasAllergies=true"
```

### Get Patient Statistics

```bash
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/patients/stats/overview"
```

### Delete Patient

```bash
curl -X DELETE \
  -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/patients/1"
```

---

## Important Notes

### General

- All timestamps are in ISO 8601 format (UTC)
- Patient numbers must be unique across the system
- Age calculations are based on the current date
- Search is case-insensitive and matches partial strings
- Gender values are strictly validated (`male`, `female`, `other`)
- Date of birth must be in `YYYY-MM-DD` format
- Emergency contact, medical history, allergies, medications, and insurance info are stored as JSON arrays/objects
- The `updatedAt` field is automatically updated on every modification
- Patient deletion is permanent and cannot be undone
- Statistics are calculated in real-time from the database

### Notes Feature

- Notes are automatically enriched with author information from the authenticated user
- Each note gets a unique ID and timestamp when created
- Notes are stored chronologically (oldest first)
- Use `newNote` for quick additions, `notes` array for full control
- Notes cannot be individually edited - replace the entire array to modify
- Author information cannot be changed after note creation

### Patient Number Generation

- Auto-generated patient numbers follow the format: `P00000001`, `P00000002`, etc.
- Numbers are sequential and based on the highest existing number
- Custom patient numbers can be provided but must be unique
- If generation fails, a timestamp-based fallback is used

### Backward Compatibility

- The API is fully backward compatible
- Existing code without notes functionality will continue to work
- Notes field is optional in all requests
- If notes are not provided, the field is set to `null`

---

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
