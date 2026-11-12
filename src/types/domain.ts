// Timestamps are stored as Firestore Timestamps and exposed to the UI as ISO strings.
export type ISODate = string;

import type { AnalysisResult } from "@/lib/ai/schemas/analysis";

export type ProcessingStatus =
  | "uploaded"
  | "validated"
  | "transcription_queued"
  | "transcribing"
  | "transcribed"
  | "analysis_queued"
  | "analyzing"
  | "awaiting_review"
  | "completed"
  | "failed";

export interface Recording {
  id: string;
  userId: string;
  title: string;
  audioPath: string | null; // null after the user deletes audio but keeps the transcript
  audioFormat: string;
  audioBytes: number;
  durationSeconds: number; // reported by the client; 0 when unknown
  language: string | null; // detected or user-selected recording language
  transcript: string; // original, never overwritten by AI output
  editedTranscript: string | null; // user edits live separately from the original
  summary: string | null;
  processingStatus: ProcessingStatus;
  transcriptionProvider: string | null;
  analysisProvider: string | null;
  analysis: AnalysisResult | null; // AI output awaiting (or past) user review; separate from the transcript
  processingError: string | null; // a short code, never a provider message
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type TaskStatus = "pending" | "completed";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: ISODate | null;
  category: string | null;
  requiresConfirmation: boolean;
  sourceRecordingId: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Idea {
  id: string;
  userId: string;
  title: string;
  description: string;
  tags: string[];
  category: string | null;
  favorite: boolean;
  sourceRecordingId: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}
