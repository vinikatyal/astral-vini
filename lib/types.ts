export type Lesson = {
  id: string;
  lessonId: string; // front end temp UID to match with back end
  details: string;
  outline: string;
  status: LessonStatus;
  updated_at?: string; // ISO
  code?: string; // TSX source code of the lesson
};


export type LessonStatus = "generating" | "generated" | "failed";



