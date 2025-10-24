# Patients API Documentation

This API provides comprehensive patient management functionality for the Triage CDSS system. It allows creating, updating, searching, and managing patient records with detailed medical information.

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
Create a new patient record.

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
    "policyNumber": "BC123456789"
  }
}
```

**Required Fields:**
- `firstName`: Patient's first name
- `lastName`: Patient's last name
- `dateOfBirth`: Date of birth in ISO format (YYYY-MM-DD)
- `gender`: Must be "male", "female", or "other"

**Optional Fields:**
- `patientNumber`: Custom patient identifier (if not provided, will be auto-generated as P000001, P000002, etc.)
- `phoneNumber`: Contact phone number
- `email`: Email address
- `address`: Physical address
- `emergencyContact`: Emergency contact information
- `medicalHistory`: Array of medical conditions
- `allergies`: Array of known allergies
- `medications`: Array of current medications
- `insuranceInfo`: Insurance information

**Response:**
```json
{
  "message": "Patient created successfully",
  "patient": {
    "id": 1,
    "patientNumber": "P000001",
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
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get Patient by ID
Retrieve a specific patient by their ID.

**Endpoint:** `GET /patients/:id`

**Example:**
```bash
GET /patients/1
```

**Response:**
```json
{
  "patient": {
    "id": 1,
    "patientNumber": "P001234",
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
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Get Patient by Patient Number
Retrieve a specific patient by their patient number.

**Endpoint:** `GET /patients/number/:patientNumber`

**Example:**
```bash
GET /patients/number/P001234
```

**Response:** Same as Get Patient by ID

### 4. Update Patient
Update an existing patient record.

**Endpoint:** `PUT /patients/:id`

**Request Body:** (All fields optional)
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "phoneNumber": "+1234567890",
  "email": "john.smith@email.com",
  "address": "456 Oak Ave, City, State 12345",
  "emergencyContact": {
    "name": "Jane Smith",
    "relationship": "Spouse",
    "phoneNumber": "+1234567891"
  },
  "medicalHistory": ["Diabetes", "Hypertension", "Asthma"],
  "allergies": ["Penicillin"],
  "medications": ["Metformin", "Lisinopril", "Albuterol"],
  "insuranceInfo": {
    "provider": "Aetna",
    "policyNumber": "AE987654321"
  }
}
```

**Response:**
```json
{
  "message": "Patient updated successfully",
  "patient": {
    "id": 1,
    "patientNumber": "P001234",
    "firstName": "John",
    "lastName": "Smith",
    "dateOfBirth": "1990-05-15T00:00:00.000Z",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "email": "john.smith@email.com",
    "address": "456 Oak Ave, City, State 12345",
    "emergencyContact": {
      "name": "Jane Smith",
      "relationship": "Spouse",
      "phoneNumber": "+1234567891"
    },
    "medicalHistory": ["Diabetes", "Hypertension", "Asthma"],
    "allergies": ["Penicillin"],
    "medications": ["Metformin", "Lisinopril", "Albuterol"],
    "insuranceInfo": {
      "provider": "Aetna",
      "policyNumber": "AE987654321"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:45:00.000Z"
  }
}
```

### 5. Search Patients
Search and filter patients.

**Endpoint:** `GET /patients`

**Query Parameters:**
- `query` (optional): Search in name, patient number, phone, email
- `gender` (optional): Filter by gender ("male", "female", "other")
- `ageMin` (optional): Minimum age filter
- `ageMax` (optional): Maximum age filter
- `hasAllergies` (optional): Filter patients with allergies (true/false)
- `hasMedications` (optional): Filter patients with medications (true/false)

**Examples:**
```bash
# Search by name
GET /patients?query=John

# Filter by gender and age
GET /patients?gender=male&ageMin=18&ageMax=65

# Find patients with allergies
GET /patients?hasAllergies=true
```

**Response:**
```json
{
  "patients": [
    {
      "id": 1,
      "patientNumber": "P001234",
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
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 6. Get Patient Statistics
Get overview statistics about all patients.

**Endpoint:** `GET /patients/stats/overview`

**Response:**
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

### 7. Delete Patient
Delete a patient record.

**Endpoint:** `DELETE /patients/:id`

**Example:**
```bash
DELETE /patients/1
```

**Response:**
```json
{
  "message": "Patient deleted successfully"
}
```

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
  phoneNumber?: string;
  email?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  medications?: string[];
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  createdAt: Date;
  updatedAt: Date;
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

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields: patientNumber, firstName, lastName, dateOfBirth, gender"
}
```

```json
{
  "error": "Invalid gender. Must be male, female, or other"
}
```

```json
{
  "error": "Invalid date of birth format"
}
```


### 404 Not Found
```json
{
  "error": "Patient not found"
}
```

### 409 Conflict
```json
{
  "error": "Patient number already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create patient"
}
```

## Usage Examples

### Create a New Patient
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "email": "john.doe@email.com"
  }' \
  "http://localhost:3000/patients"
```

### Update Patient Information
```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lastName": "Smith",
    "phoneNumber": "+1234567891"
  }' \
  "http://localhost:3000/patients/1"
```

### Search Patients
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/patients?query=John&gender=male"
```

### Get Patient Statistics
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/patients/stats/overview"
```

## Notes

- All timestamps are in ISO 8601 format
- Patient numbers must be unique across the system
- Age calculations are based on the current date
- Search is case-insensitive and matches partial strings
- Gender values are strictly validated
- Date of birth must be in YYYY-MM-DD format
- Emergency contact, medical history, allergies, medications, and insurance info are stored as JSON arrays/objects
- The `updatedAt` field is automatically updated on every modification
- Patient deletion is permanent and cannot be undone
- Statistics are calculated in real-time from the database
