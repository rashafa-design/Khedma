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
