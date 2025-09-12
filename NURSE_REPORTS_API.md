# Nurse Reports API Documentation

This API provides comprehensive reporting functionality for nurses in the Triage CDSS system. It allows generating detailed reports for individual nurses, both daily and overall, with extensive analytics and insights.

## Base URL
```
http://localhost:3000/nurse-reports
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get Nurse Report
Generate a detailed report for a specific nurse.

**Endpoint:** `GET /nurse-reports/:nurseId`

**Query Parameters:**
- `date` (optional): Date in YYYY-MM-DD format for daily report
- `name` (optional): Nurse name for verification

**Examples:**
```bash
# Overall report for nurse ID 1
GET /nurse-reports/1

# Daily report for nurse ID 1 on 2024-01-15
GET /nurse-reports/1?date=2024-01-15

# Report with name verification
GET /nurse-reports/1?name=John%20Doe&date=2024-01-15
```

**Response Structure:**
```json
{
  "report": {
    "nurse": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@hospital.com"
    },
    "period": {
      "type": "daily",
      "date": "2024-01-15",
      "from": "2024-01-15T00:00:00.000Z",
      "to": "2024-01-16T00:00:00.000Z"
    },
    "summary": {
      "totalPatients": 25,
      "averagePredictionLevel": 3.2,
      "mostCommonLevel": 3,
      "levelDistribution": {
        "1": 2,
        "2": 3,
        "3": 12,
        "4": 6,
        "5": 2
      },
      "criticalPatients": 5,
      "moderatePatients": 12,
      "lowUrgencyPatients": 8
    },
    "demographics": {
      "genderDistribution": {
        "male": 15,
        "female": 10
      },
      "ageGroups": {
        "pediatric": 3,
        "adult": 18,
        "elderly": 4
      },
      "arrivalModeDistribution": {
        "1": 5,
        "2": 15,
        "3": 5
      }
    },
    "performance": {
      "averagePredictionTime": "45 minutes",
      "predictionAccuracy": 85,
      "busiestHour": 14,
      "leastBusyHour": 3
    },
    "insights": {
      "topChiefComplaints": [
        {
          "complaint": "Chest pain",
          "count": 8
        },
        {
          "complaint": "Shortness of breath",
          "count": 5
        }
      ],
      "painLevelDistribution": {
        "1": 2,
        "2": 3,
        "3": 5,
        "4": 8,
        "5": 7
      },
      "vitalSignsRanges": {
        "bloodPressure": {
          "min": 90,
          "max": 180,
          "avg": 125
        },
        "heartRate": {
          "min": 60,
          "max": 120,
          "avg": 85
        },
        "respiratoryRate": {
          "min": 12,
          "max": 28,
          "avg": 18
        },
        "bodyTemperature": {
          "min": 36.1,
          "max": 39.2,
          "avg": 37.2
        }
      },
      "riskFactors": {
        "highBloodPressure": 3,
        "highHeartRate": 2,
        "highTemperature": 1,
        "highPainScore": 7
      }
    },
    "trends": {
      "hourlyDistribution": {
        "8": 3,
        "9": 5,
        "10": 4,
        "14": 8,
        "15": 5
      },
      "predictionConfidence": {
        "high": 18,
        "medium": 6,
        "low": 1
      }
    }
  }
}
```

### 2. Get All Nurses List
Retrieve a list of all nurses with their basic statistics.

**Endpoint:** `GET /nurse-reports/nurses/list`

**Response:**
```json
{
  "nurses": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@hospital.com",
      "totalPatients": 150,
      "lastActivity": "2024-01-15T16:30:00.000Z"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane.smith@hospital.com",
      "totalPatients": 120,
      "lastActivity": "2024-01-15T15:45:00.000Z"
    }
  ]
}
```

### 3. Compare Two Nurses
Generate a comparative report between two nurses.

**Endpoint:** `GET /nurse-reports/compare/:nurseId1/:nurseId2`

**Query Parameters:**
- `date` (optional): Date for daily comparison

**Example:**
```bash
# Compare nurses 1 and 2 overall
GET /nurse-reports/compare/1/2

# Compare nurses 1 and 2 for a specific day
GET /nurse-reports/compare/1/2?date=2024-01-15
```

**Response:**
```json
{
  "comparison": {
    "nurse1": { /* Full nurse report for nurse 1 */ },
    "nurse2": { /* Full nurse report for nurse 2 */ },
    "summary": {
      "totalPatientsDiff": 5,
      "avgLevelDiff": 0.3,
      "criticalPatientsDiff": 2
    }
  }
}
```

## Report Metrics Explained

### Summary Metrics
- **totalPatients**: Total number of patients triaged by the nurse
- **averagePredictionLevel**: Average KTAS level assigned (1-5)
- **mostCommonLevel**: Most frequently assigned KTAS level
- **levelDistribution**: Breakdown of patients by KTAS level
- **criticalPatients**: Patients with KTAS levels 1-2 (immediate/emergent)
- **moderatePatients**: Patients with KTAS level 3 (urgent)
- **lowUrgencyPatients**: Patients with KTAS levels 4-5 (less urgent/non-urgent)

### Demographics
- **genderDistribution**: Male vs female patient counts
- **ageGroups**: Patients categorized by age (pediatric: 0-17, adult: 18-64, elderly: 65+)
- **arrivalModeDistribution**: How patients arrived (ambulance, walk-in, etc.)

### Performance Metrics
- **averagePredictionTime**: Time span of predictions (first to last)
- **predictionAccuracy**: Percentage of high-confidence predictions
- **busiestHour**: Hour with most patient activity
- **leastBusyHour**: Hour with least patient activity

### Insights
- **topChiefComplaints**: Most common patient complaints
- **painLevelDistribution**: Distribution of pain scores (1-10)
- **vitalSignsRanges**: Min, max, and average vital signs
- **riskFactors**: Count of patients with concerning vital signs

### Trends
- **hourlyDistribution**: Patient count by hour of day
- **predictionConfidence**: Distribution of prediction confidence levels

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid nurse ID"
}
```

### 404 Not Found
```json
{
  "error": "Nurse not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to generate nurse report"
}
```

## Usage Examples

### Daily Report for Specific Nurse
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/nurse-reports/1?date=2024-01-15"
```

### Overall Report with Name Verification
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/nurse-reports/1?name=John%20Doe"
```

### Get All Nurses
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/nurse-reports/nurses/list"
```

### Compare Two Nurses
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/nurse-reports/compare/1/2?date=2024-01-15"
```

## Notes

- All timestamps are in ISO 8601 format
- KTAS levels range from 1 (immediate) to 5 (non-urgent)
- Pain scores range from 1 (no pain) to 10 (severe pain)
- Gender codes: 1 = Male, 2 = Female
- Arrival mode codes vary by hospital system
- Confidence scores are derived from prediction probabilities
- Reports are generated in real-time from the database
