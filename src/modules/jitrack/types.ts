/**
 * Typy specyficzne dla modułu JITRACK
 * 
 * WAŻNE: Wszystkie typy związane z jitrack są zdefiniowane TYLKO tutaj.
 * Żadne inne moduły nie powinny ich importować!
 */

/** Dane wyekstrahowane z Jiry do eksportu do JITRACK */
export interface JiraIssueData {
  issueKey: string;
  summary: string;
  project: string;
  url: string;
  estimatedHours: number | null;
}

/** Konfiguracja połączenia z JITRACK */
export interface JitrackConfig {
  ports: number[];
  authTokenKey: string;
}

/** Wynik operacji eksportu */
export interface ExportResult {
  success: boolean;
  message?: string;
  issueKey?: string;
}

/** Domyślna konfiguracja */
export const DEFAULT_CONFIG: JitrackConfig = {
  ports: [8765, 8766, 8767, 8768, 8769],
  authTokenKey: 'jitrack_token'
};
