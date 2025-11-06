export type LessonStatus = "generating" | "generated" | "failed";

export type Lesson = {
  id: string;
  lessonId: string; // front end temp UID to match with back end
  details: string;
  outline: string;
  status: LessonStatus;
  updated_at?: string; // ISO
};


