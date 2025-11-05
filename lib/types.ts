export type LessonStatus = "generating" | "generated" | "failed";

export type Lesson = {
  id: string;
  title: string;
  description: string;
  details: string;
  outline: string;
  status: LessonStatus;
  updated_at: string; // ISO
  chapters?: LessonChapter[];
};

export type LessonChapter = {
  id: string;
  title: string;
  description: string;
  details: string;
};
