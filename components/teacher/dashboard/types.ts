export type LessonRow = {
  id: string;
  date: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  startTime: string;
  endTime: string;
  rosterCount: number;
};

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  authorName: string | null;
  createdAt: string;
  priority: string | null;
};
