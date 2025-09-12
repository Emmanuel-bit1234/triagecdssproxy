# Nurse Reports API - Usage Examples

This document provides practical examples of how to use the Nurse Reports API endpoints.

## Prerequisites

1. Start the server: `npm run dev`
2. Ensure you have test data in your database (nurses and prediction logs)
3. Get an authentication token by logging in

## Example 1: Basic Daily Report

```bash
# Get a daily report for nurse ID 1 on January 15, 2024
curl -X GET "http://localhost:3000/nurse-reports/1?date=2024-01-15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "report": {
    "nurse": {
      "id": 1,
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@hospital.com"
    },
    "period": {
      "type": "daily",
      "date": "2024-01-15",
      "from": "2024-01-15T00:00:00.000Z",
      "to": "2024-01-16T00:00:00.000Z"
    },
    "summary": {
      "totalPatients": 23,
      "averagePredictionLevel": 3.1,
      "mostCommonLevel": 3,
      "levelDistribution": {
        "1": 1,
        "2": 4,
        "3": 12,
        "4": 5,
        "5": 1
      },
      "criticalPatients": 5,
      "moderatePatients": 12,
      "lowUrgencyPatients": 6
    }
    // ... more detailed metrics
  }
}
```

## Example 2: Overall Report with Name Verification

```bash
# Get overall report for nurse with name verification
curl -X GET "http://localhost:3000/nurse-reports/1?name=Dr.%20Sarah%20Johnson" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Example 3: Get All Nurses

```bash
# Get list of all nurses with their statistics
curl -X GET "http://localhost:3000/nurse-reports/nurses/list" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "nurses": [
    {
      "id": 1,
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@hospital.com",
      "totalPatients": 156,
      "lastActivity": "2024-01-15T16:30:00.000Z"
    },
    {
      "id": 2,
      "name": "Dr. Michael Chen",
      "email": "michael.chen@hospital.com",
      "totalPatients": 142,
      "lastActivity": "2024-01-15T15:45:00.000Z"
    }
  ]
}
```

## Example 4: Compare Two Nurses

```bash
# Compare nurses 1 and 2 for a specific day
curl -X GET "http://localhost:3000/nurse-reports/compare/1/2?date=2024-01-15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Example 5: JavaScript/Node.js Usage

```javascript
const axios = require('axios');

class NurseReportsAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getNurseReport(nurseId, options = {}) {
    const params = new URLSearchParams();
    if (options.date) params.append('date', options.date);
    if (options.name) params.append('name', options.name);
    
    const url = `${this.baseURL}/nurse-reports/${nurseId}${params.toString() ? '?' + params.toString() : ''}`;
    
    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get nurse report: ${error.response?.data?.error || error.message}`);
    }
  }

  async getAllNurses() {
    try {
      const response = await axios.get(`${this.baseURL}/nurse-reports/nurses/list`, { headers: this.headers });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get nurses list: ${error.response?.data?.error || error.message}`);
    }
  }

  async compareNurses(nurseId1, nurseId2, date = null) {
    const params = date ? `?date=${date}` : '';
    try {
      const response = await axios.get(`${this.baseURL}/nurse-reports/compare/${nurseId1}/${nurseId2}${params}`, { headers: this.headers });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to compare nurses: ${error.response?.data?.error || error.message}`);
    }
  }
}

// Usage example
async function example() {
  const api = new NurseReportsAPI('http://localhost:3000', 'YOUR_JWT_TOKEN');
  
  try {
    // Get all nurses
    const nurses = await api.getAllNurses();
    console.log('Available nurses:', nurses.nurses.map(n => `${n.name} (ID: ${n.id})`));
    
    // Get daily report for first nurse
    const dailyReport = await api.getNurseReport(nurses.nurses[0].id, { 
      date: '2024-01-15' 
    });
    console.log(`Daily patients: ${dailyReport.report.summary.totalPatients}`);
    
    // Get overall report
    const overallReport = await api.getNurseReport(nurses.nurses[0].id);
    console.log(`Total patients: ${overallReport.report.summary.totalPatients}`);
    
    // Compare two nurses
    if (nurses.nurses.length >= 2) {
      const comparison = await api.compareNurses(nurses.nurses[0].id, nurses.nurses[1].id);
      console.log(`Patient difference: ${comparison.comparison.summary.totalPatientsDiff}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

example();
```

## Example 6: Python Usage

```python
import requests
import json
from datetime import datetime

class NurseReportsAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_nurse_report(self, nurse_id, date=None, name=None):
        params = {}
        if date:
            params['date'] = date
        if name:
            params['name'] = name
        
        url = f"{self.base_url}/nurse-reports/{nurse_id}"
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_all_nurses(self):
        url = f"{self.base_url}/nurse-reports/nurses/list"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def compare_nurses(self, nurse_id1, nurse_id2, date=None):
        params = {'date': date} if date else {}
        url = f"{self.base_url}/nurse-reports/compare/{nurse_id1}/{nurse_id2}"
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

# Usage example
def main():
    api = NurseReportsAPI('http://localhost:3000', 'YOUR_JWT_TOKEN')
    
    try:
        # Get all nurses
        nurses = api.get_all_nurses()
        print(f"Found {len(nurses['nurses'])} nurses")
        
        # Get daily report
        today = datetime.now().strftime('%Y-%m-%d')
        daily_report = api.get_nurse_report(1, date=today)
        print(f"Patients today: {daily_report['report']['summary']['totalPatients']}")
        
        # Get overall report
        overall_report = api.get_nurse_report(1)
        print(f"Total patients: {overall_report['report']['summary']['totalPatients']}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
```

## Example 7: React/Frontend Usage

```jsx
import React, { useState, useEffect } from 'react';

const NurseReports = () => {
  const [nurses, setNurses] = useState([]);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [report, setReport] = useState(null);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('authToken'); // Get from your auth system

  useEffect(() => {
    fetchNurses();
  }, []);

  const fetchNurses = async () => {
    try {
      const response = await fetch('http://localhost:3000/nurse-reports/nurses/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setNurses(data.nurses);
    } catch (error) {
      console.error('Error fetching nurses:', error);
    }
  };

  const fetchReport = async (nurseId, reportDate = null) => {
    setLoading(true);
    try {
      const url = reportDate 
        ? `http://localhost:3000/nurse-reports/${nurseId}?date=${reportDate}`
        : `http://localhost:3000/nurse-reports/${nurseId}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setReport(data.report);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNurseSelect = (nurseId) => {
    setSelectedNurse(nurseId);
    fetchReport(nurseId, date || null);
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
    if (selectedNurse) {
      fetchReport(selectedNurse, newDate || null);
    }
  };

  return (
    <div className="nurse-reports">
      <h2>Nurse Reports</h2>
      
      <div className="controls">
        <select 
          value={selectedNurse || ''} 
          onChange={(e) => handleNurseSelect(parseInt(e.target.value))}
        >
          <option value="">Select a nurse</option>
          {nurses.map(nurse => (
            <option key={nurse.id} value={nurse.id}>
              {nurse.name} ({nurse.totalPatients} patients)
            </option>
          ))}
        </select>
        
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          placeholder="Select date for daily report (leave empty for overall)"
        />
      </div>

      {loading && <p>Loading report...</p>}
      
      {report && (
        <div className="report">
          <h3>{report.nurse.name} - {report.period.type} Report</h3>
          <div className="summary">
            <p>Total Patients: {report.summary.totalPatients}</p>
            <p>Average Level: {report.summary.averagePredictionLevel}</p>
            <p>Critical Patients: {report.summary.criticalPatients}</p>
          </div>
          {/* Add more report details as needed */}
        </div>
      )}
    </div>
  );
};

export default NurseReports;
```

## Running the Test Script

To test the API endpoints, run the provided test script:

```bash
# Make sure the server is running first
npm run dev

# In another terminal, run the test
node test-nurse-reports.js
```

This will test all the major endpoints and show you the results.

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Nurse not found
- `500 Internal Server Error`: Server-side error

Always check the response status and handle errors appropriately in your client code.
