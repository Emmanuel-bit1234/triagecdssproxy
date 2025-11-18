import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { patients } from '../db/schema.js';
import { authMiddleware } from '../auth/middleware.js';
import { eq, desc, and, or, like, sql, count, gte, lte } from 'drizzle-orm';
// Helper function to generate next patient number
async function generateNextPatientNumber() {
    try {
        // Get the highest existing patient number
        const result = await db
            .select({ patientNumber: patients.patientNumber })
            .from(patients)
            .where(sql `${patients.patientNumber} ~ '^P[0-9]+$'`) // Only numbers starting with P
            .orderBy(sql `CAST(SUBSTRING(${patients.patientNumber} FROM 2) AS INTEGER) DESC`)
            .limit(1);
        if (result.length === 0) {
            // No existing patients, start with P00000001
            return 'P00000001';
        }
        // Extract the number part and increment
        const lastNumber = parseInt(result[0].patientNumber.substring(1));
        const nextNumber = lastNumber + 1;
        // Format with leading zeros (8 digits total)
        return `P${nextNumber.toString().padStart(8, '0')}`;
    }
    catch (error) {
        console.error('Error generating patient number:', error);
        // Fallback: use timestamp-based number
        const timestamp = Date.now().toString().slice(-6);
        return `P${timestamp}`;
    }
}
const patientsRoute = new Hono();
// Create a new patient
patientsRoute.post('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();
        console.log('CREATE PATIENT - Request body:', JSON.stringify(body, null, 2));
        // Validate required fields (patientNumber is now optional)
        if (!body.firstName || !body.lastName || !body.dateOfBirth || !body.gender) {
            return c.json({
                error: 'Missing required fields: firstName, lastName, dateOfBirth, gender'
            }, 400);
        }
        // Generate patient number if not provided
        const patientNumber = body.patientNumber || await generateNextPatientNumber();
        console.log('Generated patient number:', patientNumber);
        // Validate gender
        if (!['male', 'female', 'other'].includes(body.gender)) {
            return c.json({
                error: 'Invalid gender. Must be male, female, or other'
            }, 400);
        }
        // Validate date of birth
        const dateOfBirth = new Date(body.dateOfBirth);
        if (isNaN(dateOfBirth.getTime())) {
            return c.json({
                error: 'Invalid date of birth format'
            }, 400);
        }
        // Check if custom patient number already exists (only if provided)
        if (body.patientNumber) {
            const existingPatient = await db
                .select()
                .from(patients)
                .where(eq(patients.patientNumber, body.patientNumber))
                .limit(1);
            if (existingPatient.length > 0) {
                return c.json({
                    error: 'Patient number already exists'
                }, 409);
            }
        }
        // Process notes: if provided, ensure they have proper structure with author info
        let processedNotes = null;
        if (body.notes && body.notes.length > 0) {
            processedNotes = body.notes.map(note => {
                // If note already has author info, use it; otherwise add current user as author
                if (note.author) {
                    return {
                        ...note,
                        id: note.id || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                        createdAt: note.createdAt || new Date().toISOString(),
                    };
                }
                else {
                    return {
                        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                        content: note.content,
                        author: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                        },
                        createdAt: new Date().toISOString(),
                    };
                }
            });
        }
        // Create patient
        const newPatient = await db
            .insert(patients)
            .values({
            patientNumber: patientNumber,
            firstName: body.firstName,
            lastName: body.lastName,
            dateOfBirth: dateOfBirth,
            gender: body.gender,
            phoneNumber: body.phoneNumber,
            email: body.email,
            address: body.address,
            emergencyContact: body.emergencyContact,
            medicalHistory: body.medicalHistory,
            allergies: body.allergies,
            medications: body.medications,
            insuranceInfo: body.insuranceInfo,
            notes: processedNotes,
        })
            .returning();
        return c.json({
            message: 'Patient created successfully',
            patient: newPatient[0]
        }, 201);
    }
    catch (error) {
        console.error('Error creating patient:', error);
        return c.json({ error: 'Failed to create patient' }, 500);
    }
});
// Get patient by ID
patientsRoute.get('/:id', authMiddleware, async (c) => {
    try {
        const id = parseInt(c.req.param('id'));
        if (isNaN(id)) {
            return c.json({ error: 'Invalid patient ID' }, 400);
        }
        const patient = await db
            .select()
            .from(patients)
            .where(eq(patients.id, id))
            .limit(1);
        if (patient.length === 0) {
            return c.json({ error: 'Patient not found' }, 404);
        }
        return c.json({ patient: patient[0] });
    }
    catch (error) {
        console.error('Error fetching patient:', error);
        return c.json({ error: 'Failed to fetch patient' }, 500);
    }
});
// Get patient by patient number
patientsRoute.get('/number/:patientNumber', authMiddleware, async (c) => {
    try {
        const patientNumber = c.req.param('patientNumber');
        const patient = await db
            .select()
            .from(patients)
            .where(eq(patients.patientNumber, patientNumber))
            .limit(1);
        if (patient.length === 0) {
            return c.json({ error: 'Patient not found' }, 404);
        }
        return c.json({ patient: patient[0] });
    }
    catch (error) {
        console.error('Error fetching patient:', error);
        return c.json({ error: 'Failed to fetch patient' }, 500);
    }
});
// Update patient
patientsRoute.put('/:id', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const id = parseInt(c.req.param('id'));
        const body = await c.req.json();
        console.log('UPDATE PATIENT - ID:', id, 'Request body:', JSON.stringify(body, null, 2));
        if (isNaN(id)) {
            return c.json({ error: 'Invalid patient ID' }, 400);
        }
        // Check if patient exists
        const existingPatient = await db
            .select()
            .from(patients)
            .where(eq(patients.id, id))
            .limit(1);
        if (existingPatient.length === 0) {
            return c.json({ error: 'Patient not found' }, 404);
        }
        // Validate gender if provided
        if (body.gender && !['male', 'female', 'other'].includes(body.gender)) {
            return c.json({
                error: 'Invalid gender. Must be male, female, or other'
            }, 400);
        }
        // Validate date of birth if provided
        let dateOfBirth = undefined;
        if (body.dateOfBirth) {
            dateOfBirth = new Date(body.dateOfBirth);
            if (isNaN(dateOfBirth.getTime())) {
                return c.json({
                    error: 'Invalid date of birth format'
                }, 400);
            }
        }
        // Process notes
        let processedNotes = undefined;
        // If newNote is provided, append it to existing notes
        if (body.newNote) {
            const currentNotes = existingPatient[0].notes || [];
            const newNote = {
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                content: body.newNote,
                author: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
                createdAt: new Date().toISOString(),
            };
            processedNotes = [...currentNotes, newNote];
        }
        // If notes array is provided, use it (replaces existing notes)
        else if (body.notes !== undefined) {
            if (body.notes === null || body.notes.length === 0) {
                processedNotes = null;
            }
            else {
                // Ensure all notes have proper structure
                processedNotes = body.notes.map(note => {
                    if (note.author) {
                        return {
                            ...note,
                            id: note.id || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                            createdAt: note.createdAt || new Date().toISOString(),
                        };
                    }
                    else {
                        return {
                            id: note.id || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                            content: note.content,
                            author: {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                            },
                            createdAt: note.createdAt || new Date().toISOString(),
                        };
                    }
                });
            }
        }
        // Prepare update data
        const updateData = {
            updatedAt: new Date(),
        };
        if (body.firstName)
            updateData.firstName = body.firstName;
        if (body.lastName)
            updateData.lastName = body.lastName;
        if (dateOfBirth)
            updateData.dateOfBirth = dateOfBirth;
        if (body.gender)
            updateData.gender = body.gender;
        if (body.phoneNumber !== undefined)
            updateData.phoneNumber = body.phoneNumber;
        if (body.email !== undefined)
            updateData.email = body.email;
        if (body.address !== undefined)
            updateData.address = body.address;
        if (body.emergencyContact !== undefined)
            updateData.emergencyContact = body.emergencyContact;
        if (body.medicalHistory !== undefined)
            updateData.medicalHistory = body.medicalHistory;
        if (body.allergies !== undefined)
            updateData.allergies = body.allergies;
        if (body.medications !== undefined)
            updateData.medications = body.medications;
        if (body.insuranceInfo !== undefined)
            updateData.insuranceInfo = body.insuranceInfo;
        if (processedNotes !== undefined)
            updateData.notes = processedNotes;
        const updatedPatient = await db
            .update(patients)
            .set(updateData)
            .where(eq(patients.id, id))
            .returning();
        return c.json({
            message: 'Patient updated successfully',
            patient: updatedPatient[0]
        });
    }
    catch (error) {
        console.error('Error updating patient:', error);
        return c.json({ error: 'Failed to update patient' }, 500);
    }
});
// Search patients
patientsRoute.get('/', authMiddleware, async (c) => {
    try {
        const query = c.req.query('query');
        const gender = c.req.query('gender');
        const ageMin = c.req.query('ageMin') ? parseInt(c.req.query('ageMin')) : undefined;
        const ageMax = c.req.query('ageMax') ? parseInt(c.req.query('ageMax')) : undefined;
        const hasAllergies = c.req.query('hasAllergies') === 'true';
        const hasMedications = c.req.query('hasMedications') === 'true';
        // Build search conditions
        let conditions = [];
        // Text search in name, patient number, phone, email
        if (query) {
            const searchTerm = `%${query}%`;
            conditions.push(or(like(patients.firstName, searchTerm), like(patients.lastName, searchTerm), like(patients.patientNumber, searchTerm), like(patients.phoneNumber, searchTerm), like(patients.email, searchTerm)));
        }
        // Gender filter
        if (gender) {
            conditions.push(eq(patients.gender, gender));
        }
        // Age filters
        if (ageMin !== undefined || ageMax !== undefined) {
            const now = new Date();
            if (ageMax !== undefined) {
                const minBirthDate = new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate());
                conditions.push(gte(patients.dateOfBirth, minBirthDate));
            }
            if (ageMin !== undefined) {
                const maxBirthDate = new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate());
                conditions.push(lte(patients.dateOfBirth, maxBirthDate));
            }
        }
        // Allergies filter
        if (hasAllergies) {
            conditions.push(sql `${patients.allergies} IS NOT NULL AND jsonb_array_length(${patients.allergies}) > 0`);
        }
        // Medications filter
        if (hasMedications) {
            conditions.push(sql `${patients.medications} IS NOT NULL AND jsonb_array_length(${patients.medications}) > 0`);
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        // Get all patients matching criteria
        const patientsList = await db
            .select()
            .from(patients)
            .where(whereClause)
            .orderBy(desc(patients.createdAt));
        return c.json({ patients: patientsList });
    }
    catch (error) {
        console.error('Error searching patients:', error);
        return c.json({ error: 'Failed to search patients' }, 500);
    }
});
// Get patient statistics
patientsRoute.get('/stats/overview', authMiddleware, async (c) => {
    try {
        // Total patients
        const totalPatientsResult = await db
            .select({ count: count() })
            .from(patients);
        // Gender distribution
        const genderStats = await db
            .select({
            gender: patients.gender,
            count: count(patients.id),
        })
            .from(patients)
            .groupBy(patients.gender);
        // Age groups
        const ageStats = await db
            .select({
            dateOfBirth: patients.dateOfBirth,
        })
            .from(patients);
        // Common allergies
        const allergyStats = await db
            .select({
            allergies: patients.allergies,
        })
            .from(patients)
            .where(sql `${patients.allergies} IS NOT NULL AND jsonb_array_length(${patients.allergies}) > 0`);
        // Common medications
        const medicationStats = await db
            .select({
            medications: patients.medications,
        })
            .from(patients)
            .where(sql `${patients.medications} IS NOT NULL AND jsonb_array_length(${patients.medications}) > 0`);
        // Recent registrations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentRegistrationsResult = await db
            .select({ count: count() })
            .from(patients)
            .where(gte(patients.createdAt, thirtyDaysAgo));
        // Process data
        const totalPatients = Number(totalPatientsResult[0]?.count || 0);
        // Gender distribution
        const genderDistribution = {
            male: 0,
            female: 0,
            other: 0,
        };
        genderStats.forEach(stat => {
            if (stat.gender === 'male')
                genderDistribution.male = Number(stat.count);
            else if (stat.gender === 'female')
                genderDistribution.female = Number(stat.count);
            else if (stat.gender === 'other')
                genderDistribution.other = Number(stat.count);
        });
        // Age groups
        const now = new Date();
        let pediatric = 0, adult = 0, elderly = 0;
        ageStats.forEach(stat => {
            const age = now.getFullYear() - stat.dateOfBirth.getFullYear();
            if (age <= 17)
                pediatric++;
            else if (age <= 64)
                adult++;
            else
                elderly++;
        });
        // Common allergies
        const allergyCounts = {};
        allergyStats.forEach(stat => {
            if (stat.allergies && Array.isArray(stat.allergies)) {
                stat.allergies.forEach((allergy) => {
                    allergyCounts[allergy] = (allergyCounts[allergy] || 0) + 1;
                });
            }
        });
        const commonAllergies = Object.entries(allergyCounts)
            .map(([allergy, count]) => ({ allergy, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        // Common medications
        const medicationCounts = {};
        medicationStats.forEach(stat => {
            if (stat.medications && Array.isArray(stat.medications)) {
                stat.medications.forEach((medication) => {
                    medicationCounts[medication] = (medicationCounts[medication] || 0) + 1;
                });
            }
        });
        const commonMedications = Object.entries(medicationCounts)
            .map(([medication, count]) => ({ medication, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const stats = {
            totalPatients,
            genderDistribution,
            ageGroups: {
                pediatric,
                adult,
                elderly,
            },
            commonAllergies,
            commonMedications,
            recentRegistrations: Number(recentRegistrationsResult[0]?.count || 0),
        };
        return c.json({ stats });
    }
    catch (error) {
        console.error('Error fetching patient statistics:', error);
        return c.json({ error: 'Failed to fetch patient statistics' }, 500);
    }
});
// Delete patient
patientsRoute.delete('/:id', authMiddleware, async (c) => {
    try {
        const id = parseInt(c.req.param('id'));
        if (isNaN(id)) {
            return c.json({ error: 'Invalid patient ID' }, 400);
        }
        // Check if patient exists
        const existingPatient = await db
            .select()
            .from(patients)
            .where(eq(patients.id, id))
            .limit(1);
        if (existingPatient.length === 0) {
            return c.json({ error: 'Patient not found' }, 404);
        }
        // Delete patient
        await db
            .delete(patients)
            .where(eq(patients.id, id));
        return c.json({
            message: 'Patient deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting patient:', error);
        return c.json({ error: 'Failed to delete patient' }, 500);
    }
});
export default patientsRoute;
