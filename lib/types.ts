export type LessonStatus = "generating" | "generated" | "failed";

export type Lesson = {
  id: string;
  details: string;
  outline: string;
  status: LessonStatus;
  updated_at?: string; // ISO
};


