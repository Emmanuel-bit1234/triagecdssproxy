import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { patients, predictionLogs, users } from '../db/schema.js';
import { authMiddleware } from '../auth/middleware.js';
import { eq, desc, and, or, ilike, gte, lte, sql, count, avg, max, min } from 'drizzle-orm';
import type { AuthVariables } from '../types/auth.js';
import type { 
  Patient, 
  NewPatient, 
  PatientWithPredictions, 
  PatientSearchResult, 
  PatientExistsResponse,
  PredictionLogWithUser,
  ERROR_CODES
} from '../types/patients.js';

const patientsRoute = new Hono<{ Variables: AuthVariables }>();

// Helper function to get next patient number
const getNextPatientNumber = async (): Promise<string> => {
  const result = await db
    .select({ maxNumber: sql<string>`MAX(CAST(SUBSTRING(patient_number, 2) AS INTEGER))` })
    .from(patients);
  
  const nextNumber = Number(result[0]?.maxNumber || 0) + 1;
  return `P${nextNumber.toString().padStart(6, '0')}`;
};

// Helper function to check if patient already exists
const checkPatientExists = async (firstName: string, lastName: string, dateOfBirth: Date): Promise<Patient | null> => {
  const existingPatient = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.firstName, firstName),
        eq(patients.lastName, lastName),
        eq(patients.dateOfBirth, dateOfBirth)
      )
    )
    .limit(1);
  
  if (existingPatient.length > 0) {
    const patient = existingPatient[0];
    return {
      ...patient,
      phoneNumber: patient.phoneNumber || undefined,
      address: patient.address || undefined,
      gender: patient.gender as 'male' | 'female' | 'other',
      emergencyContact: patient.emergencyContact as any,
      medicalHistory: patient.medicalHistory as string[],
      allergies: patient.allergies as string[],
    };
  }
  
  return null;
};

// POST /patients - Create new patient
patientsRoute.post('/', authMiddleware, async (c) => {
  try {
    const patientData: NewPatient = await c.req.json();
    
    // Check if patient already exists
    const existingPatient = await checkPatientExists(
      patientData.firstName,
      patientData.lastName,
      patientData.dateOfBirth
    );
    
    if (existingPatient) {
      return c.json({
        success: false,
        exists: true,
        patient: existingPatient,
        message: 'Patient already exists',
        code: 'PATIENT_EXISTS'
      } as PatientExistsResponse, 200);
    }
    
    // Generate next patient number
    const patientNumber = await getNextPatientNumber();
    
    // Create patient
    const newPatient = await db.insert(patients).values({
      patientNumber,
      ...patientData,
    }).returning();
    
    return c.json({
      success: true,
      patient: newPatient[0]
    }, 200);
  } catch (error) {
    console.error('Error creating patient:', error);
    return c.json({
      success: false,
      error: 'Failed to create patient',
      code: 'SERVER_ERROR'
    }, 200);
  }
});

// GET /patients/:id - Get patient by ID
patientsRoute.get('/:id', authMiddleware, async (c) => {
  try {
    const patientId = parseInt(c.req.param('id'));
    
    if (isNaN(patientId)) {
      return c.json({
        success: false,
        error: 'Invalid patient ID',
        code: 'INVALID_PATIENT_ID'
      }, 200);
    }
    
    const patient = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.isActive, true)))
      .limit(1);
    
    if (patient.length === 0) {
      return c.json({
        success: false,
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND'
      }, 200);
    }
    
    return c.json({
      success: true,
      patient: patient[0]
    }, 200);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch patient',
      code: 'SERVER_ERROR'
    }, 200);
  }
});

// GET /patients/number/:patientNumber - Get patient by patient number
patientsRoute.get('/number/:patientNumber', authMiddleware, async (c) => {
  try {
    const patientNumber = c.req.param('patientNumber');
    
    const patient = await db
      .select()
      .from(patients)
      .where(and(eq(patients.patientNumber, patientNumber), eq(patients.isActive, true)))
      .limit(1);
    
    if (patient.length === 0) {
      return c.json({
        success: false,
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND'
      }, 200);
    }
    
    return c.json({
      success: true,
      patient: patient[0]
    }, 200);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch patient',
      code: 'SERVER_ERROR'
    }, 200);
  }
});

// GET /patients/:id/predictions - Get patient with predictions and risk analysis
patientsRoute.get('/:id/predictions', authMiddleware, async (c) => {
  try {
    const patientId = parseInt(c.req.param('id'));
    
    if (isNaN(patientId)) {
      return c.json({
        success: false,
        error: 'Invalid patient ID',
        code: 'INVALID_PATIENT_ID'
      }, 200);
    }
    
    // Get patient
    const patient = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.isActive, true)))
      .limit(1);
    
    if (patient.length === 0) {
      return c.json({
        success: false,
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND'
      }, 200);
    }
    
    // Get all predictions for this patient
    const predictions = await db
      .select({
        id: predictionLogs.id,
        predict: predictionLogs.predict,
        probs: predictionLogs.probs,
        inputs: predictionLogs.inputs,
        createdAt: predictionLogs.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(predictionLogs)
      .innerJoin(users, eq(predictionLogs.userId, users.id))
      .where(eq(predictionLogs.patientId, patientId))
      .orderBy(desc(predictionLogs.createdAt));
    
    // Get prediction statistics
    const stats = await db
      .select({
        totalPredictions: count(predictionLogs.id),
        avgPrediction: avg(predictionLogs.predict),
        lastPrediction: max(predictionLogs.createdAt),
      })
      .from(predictionLogs)
      .where(eq(predictionLogs.patientId, patientId));
    
    // Get prediction level distribution
    const levelDistribution = await db
      .select({
        level: predictionLogs.predict,
        count: count(predictionLogs.id),
      })
      .from(predictionLogs)
      .where(eq(predictionLogs.patientId, patientId))
      .groupBy(predictionLogs.predict);
    
    // Calculate risk level based on predictions
    const levelDist: Record<number, number> = {};
    levelDistribution.forEach(stat => {
      levelDist[stat.level] = Number(stat.count);
    });
    
    const criticalPredictions = (levelDist[1] || 0) + (levelDist[2] || 0);
    const moderatePredictions = levelDist[3] || 0;
    const lowUrgencyPredictions = (levelDist[4] || 0) + (levelDist[5] || 0);
    
    // Determine risk level
    let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (criticalPredictions > 0) {
      riskLevel = 'critical';
    } else if (moderatePredictions > 0) {
      riskLevel = 'moderate';
    } else if (lowUrgencyPredictions > 0) {
      riskLevel = 'low';
    }
    
    // Calculate trend direction (simplified)
    const recentPredictions = predictions.slice(0, 3);
    const olderPredictions = predictions.slice(3, 6);
    const recentAvg = recentPredictions.length > 0 ? recentPredictions.reduce((sum, p) => sum + p.predict, 0) / recentPredictions.length : 0;
    const olderAvg = olderPredictions.length > 0 ? olderPredictions.reduce((sum, p) => sum + p.predict, 0) / olderPredictions.length : 0;
    
    let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAvg < olderAvg) {
      trendDirection = 'improving';
    } else if (recentAvg > olderAvg) {
      trendDirection = 'declining';
    }
    
    // Calculate confidence level
    const totalPredictions = Number(stats[0]?.totalPredictions || 0);
    let highConfidence = 0, mediumConfidence = 0, lowConfidence = 0;
    
    predictions.forEach(prediction => {
      const probs = prediction.probs as string[];
      const maxProb = Math.max(...probs.map(p => parseFloat(p)));
      if (maxProb > 0.8) highConfidence++;
      else if (maxProb >= 0.5) mediumConfidence++;
      else lowConfidence++;
    });
    
    let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
    if (highConfidence > totalPredictions * 0.7) {
      confidenceLevel = 'high';
    } else if (mediumConfidence > totalPredictions * 0.5) {
      confidenceLevel = 'medium';
    }
    
    const patientWithPredictions: PatientWithPredictions = {
      ...patient[0],
      phoneNumber: patient[0].phoneNumber || undefined,
      address: patient[0].address || undefined,
      gender: patient[0].gender as 'male' | 'female' | 'other',
      emergencyContact: patient[0].emergencyContact as any,
      medicalHistory: patient[0].medicalHistory as string[],
      allergies: patient[0].allergies as string[],
      predictions: predictions.map(p => ({
        id: p.id,
        userId: p.user.id,
        patientNumber: patient[0].patientNumber,
        inputs: p.inputs as any,
        predict: p.predict,
        ktasExplained: {} as any, // Will be populated from actual data
        probs: p.probs as string[],
        model: '', // Will be populated from actual data
        createdAt: p.createdAt,
        user: p.user,
      })),
      totalPredictions: totalPredictions,
      lastPrediction: stats[0]?.lastPrediction || undefined,
      averagePredictionLevel: Number(stats[0]?.avgPrediction || 0),
      riskLevel,
      riskAnalysis: {
        criticalPredictions,
        moderatePredictions,
        lowUrgencyPredictions,
        trendDirection,
        confidenceLevel,
      },
    };
    
    return c.json({
      success: true,
      patient: patientWithPredictions
    }, 200);
  } catch (error) {
    console.error('Error fetching patient predictions:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch patient predictions',
      code: 'SERVER_ERROR'
    }, 200);
  }
});

// GET /patients/search - Search patients by name or patient number
patientsRoute.get('/search', authMiddleware, async (c) => {
  try {
    const query = c.req.query('q') || '';
    
    if (!query.trim()) {
      return c.json({
        success: false,
        error: 'Search query is required',
        code: 'SEARCH_QUERY_REQUIRED'
      }, 200);
    }
    
    // Search by name or patient number
    const searchResults = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.isActive, true),
          or(
            ilike(patients.firstName, `%${query}%`),
            ilike(patients.lastName, `%${query}%`),
            ilike(patients.patientNumber, `%${query}%`),
            ilike(sql`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`, `%${query}%`)
          )
        )
      )
      .orderBy(patients.lastName, patients.firstName);
    
    // Get total count
    const totalCount = await db
      .select({ count: count(patients.id) })
      .from(patients)
      .where(
        and(
          eq(patients.isActive, true),
          or(
            ilike(patients.firstName, `%${query}%`),
            ilike(patients.lastName, `%${query}%`),
            ilike(patients.patientNumber, `%${query}%`),
            ilike(sql`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`, `%${query}%`)
          )
        )
      );
    
    const total = Number(totalCount[0]?.count || 0);
    
    const result: PatientSearchResult = {
      success: true,
      patients: searchResults.map(patient => ({
        ...patient,
        phoneNumber: patient.phoneNumber || undefined,
        address: patient.address || undefined,
        gender: patient.gender as 'male' | 'female' | 'other',
        emergencyContact: patient.emergencyContact as any,
        medicalHistory: patient.medicalHistory as string[],
        allergies: patient.allergies as string[],
      })),
      total,
    };
    
    return c.json(result, 200);
  } catch (error) {
    console.error('Error searching patients:', error);
    return c.json({
      success: false,
      error: 'Failed to search patients',
      code: 'SERVER_ERROR'
    }, 200);
  }
});

// PUT /patients/:id - Update patient
patientsRoute.put('/:id', authMiddleware, async (c) => {
  try {
    const patientId = parseInt(c.req.param('id'));
    const updateData: Partial<NewPatient> = await c.req.json();
    
    if (isNaN(patientId)) {
      return c.json({
        success: false,
        error: 'Invalid patient ID',
        code: 'INVALID_PATIENT_ID'
      }, 200);
    }
    
    // Check if patient exists
    const existingPatient = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.isActive, true)))
      .limit(1);
    
    if (existingPatient.length === 0) {
      return c.json({
        success: false,
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND'
      }, 200);
    }
    
    // Update patient
    const updatedPatient = await db
      .update(patients)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, patientId))
      .returning();
    
    return c.json({
      success: true,
      patient: updatedPatient[0]
    }, 200);
  } catch (error) {
    console.error('Error updating patient:', error);
    return c.json({
      success: false,
      error: 'Failed to update patient',
      code: 'SERVER_ERROR'
    }, 200);
  }
});

// DELETE /patients/:id - Soft delete patient
patientsRoute.delete('/:id', authMiddleware, async (c) => {
  try {
    const patientId = parseInt(c.req.param('id'));
    
    if (isNaN(patientId)) {
      return c.json({
        success: false,
        error: 'Invalid patient ID',
        code: 'INVALID_PATIENT_ID'
      }, 200);
    }
    
    // Soft delete patient
    const deletedPatient = await db
      .update(patients)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, patientId))
      .returning();
    
    if (deletedPatient.length === 0) {
      return c.json({
        success: false,
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND'
      }, 200);
    }
    
    return c.json({
      success: true,
      message: 'Patient deleted successfully'
    }, 200);
  } catch (error) {
    console.error('Error deleting patient:', error);
    return c.json({
      success: false,
      error: 'Failed to delete patient',
      code: 'SERVER_ERROR'
    }, 200);
  }
});

export default patientsRoute;
