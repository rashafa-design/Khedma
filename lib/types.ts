export type UserRole = "worker" | "client" | "admin";
export type Locale = "ar" | "en";

export interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string;
  phone_number: string | null;
  preferred_locale: Locale;
  created_at: string;
  updated_at: string;
}

export interface ProfessionRow {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  created_at: string;
}

export interface TaskTypeRow {
  id: string;
  profession_id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  created_at: string;
}

export type WorkerAvailability = "available" | "unavailable";
export type WorkerStatus = "pending_review" | "approved" | "rejected";

export interface WorkerProfileRow {
  id: string;
  user_id: string;
  profession_id: string;
  nationality: string;
  years_experience: number;
  photo_path: string | null;
  id_document_path: string;
  availability: WorkerAvailability;
  status: WorkerStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}
