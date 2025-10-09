import { pgTable, serial, varchar, timestamp, text, integer, jsonb, real } from 'drizzle-orm/pg-core';

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
  patientNumber: varchar('patient_number', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  dateOfBirth: timestamp('date_of_birth').notNull(),
  gender: varchar('gender', { length: 20 }).notNull().$type<'male' | 'female' | 'other'>(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  emergencyContact: jsonb('emergency_contact').$type<{
    name: string;
    relationship: string;
    phoneNumber: string;
  } | null>(),
  medicalHistory: jsonb('medical_history').$type<string[] | null>(),
  allergies: jsonb('allergies').$type<string[] | null>(),
  medications: jsonb('medications').$type<string[] | null>(),
  insuranceInfo: jsonb('insurance_info').$type<{
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  } | null>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const predictionLogs = pgTable('prediction_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  patientId: integer('patient_id').references(() => patients.id),
  patientNumber: varchar('patient_number', { length: 255 }).notNull(),
  inputs: jsonb('inputs').notNull(),
  predict: integer('predict').notNull(),
  ktasExplained: jsonb('ktas_explained').notNull(),
  probs: jsonb('probs').notNull(),
  model: varchar('model', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PredictionLog = typeof predictionLogs.$inferSelect;
export type NewPredictionLog = typeof predictionLogs.$inferInsert;
