# Prediction Logs API Documentation

## ✅ Prediction Logging System Complete

Your API now automatically logs all prediction requests and provides full CRUD operations for managing prediction history.

### 🗄️ Database Schema

**prediction_logs table:**
- `id` - Primary key (serial)

- `user_id` - Foreign key to users table
- `inputs` - JSONB field storing all input parameters
- `predict` - Integer prediction result
- `ktas_explained` - JSONB field storing KTAS explanation
- `probs` - JSONB array of probability scores
- `model` - String model name
- `created_at` - Timestamp of prediction

### 🔗 API Endpoints

#### **Prediction Logs CRUD**

**Base URL:** `/prediction-logs`

All endpoints require authentication (Bearer token in Authorization header).

##### 1. **GET** `/prediction-logs` - Get all prediction logs
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
- **Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "userId": 1,
      "inputs": { "Sex": 2, "Age": "20", ... },
      "predict": 2,
      "ktasExplained": { "Level": 2, "Title": "Emergency", ... },
      "probs": [1.14e-22, 0.999998, ...],
      "model": "Model 1: Bidirectional LSTM",
      "createdAt": "2024-01-01T12:00:00Z",
      "user": { "id": 1, "email": "user@example.com", "name": "John Doe" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

##### 2. **GET** `/prediction-logs/:id` - Get specific prediction log
- **Response:**
```json
{
  "log": {
    "id": 1,
    "userId": 1,
    "inputs": { ... },
    "predict": 2,
    "ktasExplained": { ... },
    "probs": [ ... ],
    "model": "Model 1: Bidirectional LSTM",
    "createdAt": "2024-01-01T12:00:00Z",
    "user": { "id": 1, "email": "user@example.com", "name": "John Doe" }
  }
}
```

##### 3. **POST** `/prediction-logs` - Create new prediction log
- **Body:**
```json
{
  "inputs": { "Sex": 2, "Age": "20", "Arrival_mode": 1, ... },
  "predict": 2,
  "ktasExplained": { "Level": 2, "Title": "Emergency", ... },
  "probs": [1.14e-22, 0.999998, ...],
  "model": "Model 1: Bidirectional LSTM"
}
```

##### 4. **PUT** `/prediction-logs/:id` - Update prediction log
- **Body:** Partial update (same structure as POST)

##### 5. **DELETE** `/prediction-logs/:id` - Delete prediction log
- **Response:**
```json
{
  "message": "Prediction log deleted successfully"
}
```

##### 6. **GET** `/prediction-logs/stats/summary` - Get prediction statistics
- **Response:**
```json
{
  "totalPredictions": 25,
  "levelDistribution": {
    "1": 5,
    "2": 8,
    "3": 7,
    "4": 3,
    "5": 2
  }
}
```

### 🔄 Automatic Logging

The `/predict` endpoint now automatically saves prediction logs:

1. **User makes prediction request** → `/predict`
2. **API calls ML model** → External ML service
3. **Response received** → ML model response
4. **Log automatically saved** → Database
5. **Response returned** → User gets prediction + confirmation

### 🧪 Testing Examples

#### **1. Make a prediction (automatically logged):**
```bash
curl -X POST http://localhost:3000/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "Sex": 2,
    "Age": "20",
    "Arrival_mode": 1,
    "Injury": 1,
    "Mental": 3,
    "Pain": 1,
    "NRS_pain": 10,
    "SBP": "200",
    "DBP": "100",
    "HR": "200",
    "RR": "35",
    "BT": "42",
    "Chief_complain": "Headache"
  }'
```

#### **2. Get all prediction logs:**
```bash
curl -X GET "http://localhost:3000/prediction-logs?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### **3. Get prediction statistics:**
```bash
curl -X GET http://localhost:3000/prediction-logs/stats/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 🔒 Security Features

- **User Isolation:** Users can only access their own prediction logs
- **Authentication Required:** All endpoints require valid JWT token
- **Input Validation:** All inputs are validated before saving
- **Error Handling:** Graceful error handling with proper HTTP status codes

### 📊 Data Structure

**Input Parameters:**
```typescript
{
  Sex: number;
  Age: string;
  Arrival_mode: number;
  Injury: number;
  Mental: number;
  Pain: number;
  NRS_pain: number;
  SBP: string;
  DBP: string;
  HR: string;
  RR: string;
  BT: string;
  Chief_complain: string;
}
```

**KTAS Explanation:**
```typescript
{
  Level: number;
  Title: string;
  Meaning: string;
  "Triage target": string;
}
```

### 🚀 React.js Integration

```javascript
// Get prediction logs
const getPredictionLogs = async (page = 1, limit = 10) => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`http://localhost:3000/prediction-logs?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
};

// Get prediction statistics
const getPredictionStats = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch('http://localhost:3000/prediction-logs/stats/summary', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
};
```

Your prediction logging system is now fully functional! 🎉
