import { pgTable, serial, varchar, timestamp, text, integer, jsonb, real, boolean } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export const patients = pgTable('patients', {
    id: serial('id').primaryKey(),
    patientNumber: varchar('patient_number', { length: 20 }).notNull().unique(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    dateOfBirth: timestamp('date_of_birth').notNull(),
    gender: varchar('gender', { length: 10 }).notNull(), // 'male', 'female', 'other'
    phoneNumber: varchar('phone_number', { length: 20 }),
    address: text('address'),
    emergencyContact: jsonb('emergency_contact'), // { name, relationship, phone }
    medicalHistory: jsonb('medical_history'), // Array of strings
    allergies: jsonb('allergies'), // Array of strings
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export const predictionLogs = pgTable('prediction_logs', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    patientId: integer('patient_id').references(() => patients.id), // New field
    patientNumber: varchar('patient_number', { length: 255 }).notNull(), // Keep for backward compatibility
    inputs: jsonb('inputs').notNull(),
    predict: integer('predict').notNull(),
    ktasExplained: jsonb('ktas_explained').notNull(),
    probs: jsonb('probs').notNull(),
    model: varchar('model', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
