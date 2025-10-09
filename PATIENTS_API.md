# Patients API Documentation

## Overview
The Patients API provides comprehensive patient management functionality including patient creation, retrieval, search, and prediction history analysis. All responses return HTTP 200 with a `success` flag indicating the operation status.

## Base URL
```
http://localhost:3000/patients
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Patient
**POST** `/patients`

Creates a new patient with auto-generated patient number. If a patient with the same name and date of birth already exists, returns the existing patient.

#### Request Body
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1985-03-15T00:00:00Z",
  "gender": "male",
  "phoneNumber": "+1234567890",
  "address": "123 Main St, City, State 12345",
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+1234567891"
  },
  "medicalHistory": ["Diabetes", "Hypertension"],
  "allergies": ["Penicillin", "Shellfish"]
}
```

#### Required Fields
- `firstName` (string)
- `lastName` (string)
- `dateOfBirth` (ISO 8601 timestamp)
- `gender` ("male" | "female" | "other")

#### Optional Fields
- `phoneNumber` (string)
- `address` (string)
- `emergencyContact` (object with name, relationship, phone)
- `medicalHistory` (array of strings)
- `allergies` (array of strings)

#### Success Response (201)
```json
{
  "success": true,
  "patient": {
    "id": 1,
    "patientNumber": "P000001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15T00:00:00Z",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "address": "123 Main St, City, State 12345",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+1234567891"
    },
    "medicalHistory": ["Diabetes", "Hypertension"],
    "allergies": ["Penicillin", "Shellfish"],
    "isActive": true,
    "createdAt": "2024-01-20T10:30:00Z",
    "updatedAt": "2024-01-20T10:30:00Z"
  }
}
```

#### Patient Already Exists Response (200)
```json
{
  "success": false,
  "exists": true,
  "patient": {
    "id": 1,
    "patientNumber": "P000001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15T00:00:00Z",
    "gender": "male",
    "isActive": true
  },
  "message": "Patient already exists",
  "code": "PATIENT_EXISTS"
}
```

### 2. Get Patient by ID
**GET** `/patients/:id`

Retrieves a patient by their database ID.

#### Success Response (200)
```json
{
  "success": true,
  "patient": {
    "id": 1,
    "patientNumber": "P000001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15T00:00:00Z",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "address": "123 Main St, City, State 12345",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+1234567891"
    },
    "medicalHistory": ["Diabetes", "Hypertension"],
    "allergies": ["Penicillin", "Shellfish"],
    "isActive": true,
    "createdAt": "2024-01-20T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z"
  }
}
```

#### Error Response (200)
```json
{
  "success": false,
  "error": "Patient not found",
  "code": "PATIENT_NOT_FOUND"
}
```

### 3. Get Patient by Patient Number
**GET** `/patients/number/:patientNumber`

Retrieves a patient by their patient number (e.g., P000001).

#### Success Response (200)
```json
{
  "success": true,
  "patient": {
    "id": 1,
    "patientNumber": "P000001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15T00:00:00Z",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "address": "123 Main St, City, State 12345",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+1234567891"
    },
    "medicalHistory": ["Diabetes", "Hypertension"],
    "allergies": ["Penicillin", "Shellfish"],
    "isActive": true,
    "createdAt": "2024-01-20T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z"
  }
}
```

### 4. Get Patient with Predictions
**GET** `/patients/:id/predictions`

Retrieves a patient along with all their prediction history and risk analysis.

#### Success Response (200)
```json
{
  "success": true,
  "patient": {
    "id": 1,
    "patientNumber": "P000001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15T00:00:00Z",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "address": "123 Main St, City, State 12345",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+1234567891"
    },
    "medicalHistory": ["Diabetes", "Hypertension"],
    "allergies": ["Penicillin", "Shellfish"],
    "isActive": true,
    "createdAt": "2024-01-20T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z",
    "totalPredictions": 5,
    "lastPrediction": "2024-01-20T14:30:00Z",
    "averagePredictionLevel": 3.2,
    "riskLevel": "moderate",
    "riskAnalysis": {
      "criticalPredictions": 0,
      "moderatePredictions": 3,
      "lowUrgencyPredictions": 2,
      "trendDirection": "improving",
      "confidenceLevel": "high"
    },
    "predictions": [
      {
        "id": 456,
        "predict": 3,
        "probs": ["0.1", "0.2", "0.6", "0.1", "0.0"],
        "inputs": {
          "Sex": 1,
          "Age": "40",
          "Arrival_mode": 1,
          "Injury": 0,
          "Mental": 0,
          "Pain": 7,
          "NRS_pain": 7,
          "SBP": "140",
          "DBP": "90",
          "HR": "85",
          "RR": "22",
          "BT": "37.2",
          "Chief_complain": "Chest pain"
        },
        "createdAt": "2024-01-20T14:30:00Z",
        "user": {
          "id": 12,
          "name": "Nurse Smith",
          "email": "nurse.smith@hospital.com"
        }
      }
    ]
  }
}
```

### 5. Search Patients
**GET** `/patients/search?q=query`

Searches patients by name or patient number.

#### Query Parameters
- `q` (required) - Search query string

#### Success Response (200)
```json
{
  "success": true,
  "patients": [
    {
      "id": 1,
      "patientNumber": "P000001",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1985-03-15T00:00:00Z",
      "gender": "male",
      "phoneNumber": "+1234567890",
      "address": "123 Main St, City, State 12345",
      "emergencyContact": {
        "name": "Jane Doe",
        "relationship": "Spouse",
        "phone": "+1234567891"
      },
      "medicalHistory": ["Diabetes", "Hypertension"],
      "allergies": ["Penicillin", "Shellfish"],
      "isActive": true,
      "createdAt": "2024-01-20T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  ],
  "total": 1
}
```

#### Error Response (200)
```json
{
  "success": false,
  "error": "Search query is required",
  "code": "SEARCH_QUERY_REQUIRED"
}
```

### 6. Update Patient
**PUT** `/patients/:id`

Updates an existing patient's information.

#### Request Body
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1987654321",
  "address": "456 New Street, City, State 12345",
  "medicalHistory": ["Diabetes", "Hypertension", "Previous heart surgery"],
  "allergies": ["Penicillin", "Shellfish", "Latex"]
}
```

#### Success Response (200)
```json
{
  "success": true,
  "patient": {
    "id": 1,
    "patientNumber": "P000001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1985-03-15T00:00:00Z",
    "gender": "male",
    "phoneNumber": "+1987654321",
    "address": "456 New Street, City, State 12345",
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+1234567891"
    },
    "medicalHistory": ["Diabetes", "Hypertension", "Previous heart surgery"],
    "allergies": ["Penicillin", "Shellfish", "Latex"],
    "isActive": true,
    "createdAt": "2024-01-20T10:30:00Z",
    "updatedAt": "2024-01-20T16:30:00Z"
  }
}
```

### 7. Delete Patient
**DELETE** `/patients/:id`

Soft deletes a patient (sets isActive to false).

#### Success Response (200)
```json
{
  "success": true,
  "message": "Patient deleted successfully"
}
```

## Risk Level Calculation

The risk level is calculated based on prediction results:

- **Critical**: Has predictions with level 1-2 (immediate/very urgent)
- **Moderate**: Has predictions with level 3 (urgent)
- **Low**: Has predictions with level 4-5 (less urgent/standard)

## Risk Analysis Components

- `criticalPredictions`: Count of level 1-2 predictions
- `moderatePredictions`: Count of level 3 predictions
- `lowUrgencyPredictions`: Count of level 4-5 predictions
- `trendDirection`: "improving" | "stable" | "declining" (based on recent vs older predictions)
- `confidenceLevel`: "high" | "medium" | "low" (based on prediction confidence scores)

## Error Codes

- `PATIENT_NOT_FOUND`: Patient with specified ID/number not found
- `INVALID_PATIENT_ID`: Invalid patient ID format
- `SEARCH_QUERY_REQUIRED`: Search query parameter missing
- `PATIENT_EXISTS`: Patient with same name and DOB already exists
- `SERVER_ERROR`: Internal server error

## Patient Number Format

Patient numbers are auto-generated in the format `P000001`, `P000002`, etc., starting from 1 and incrementing sequentially.

## Data Types

- **Dates**: ISO 8601 format (e.g., "2024-01-20T10:30:00Z")
- **Gender**: "male" | "female" | "other"
- **Emergency Contact**: Object with name, relationship, phone
- **Medical History**: Array of strings
- **Allergies**: Array of strings
- **Prediction Inputs**: JSON object with patient assessment data
