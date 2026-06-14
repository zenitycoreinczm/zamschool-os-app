"use client";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";

const localizer = momentLocalizer(moment);

const calendarEvents = [
  {
    title: "Math",
    allDay: false,
    start: new Date(2025, 1, 12, 8, 0),
    end: new Date(2025, 1, 12, 8, 45),
  },
  {
    title: "English",
    allDay: false,
    start: new Date(2025, 1, 12, 9, 0),
    end: new Date(2025, 1, 12, 9, 45),
  },
  {
    title: "Biology",
    allDay: false,
    start: new Date(2025, 1, 12, 10, 0),
    end: new Date(2025, 1, 12, 10, 45),
  },
  {
    title: "Physics",
    allDay: false,
    start: new Date(2025, 1, 12, 11, 0),
    end: new Date(2025, 1, 12, 11, 45),
  },
  {
    title: "Chemistry",
    allDay: false,
    start: new Date(2025, 1, 12, 13, 0),
    end: new Date(2025, 1, 12, 13, 45),
  },
  {
    title: "History",
    allDay: false,
    start: new Date(2025, 1, 12, 14, 0),
    end: new Date(2025, 1, 12, 14, 45),
  },
];

export default function BigCalendar() {
  const [view, setView] = useState<View>(Views.WORK_WEEK);

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  return (
    <Calendar
      localizer={localizer}
      events={calendarEvents}
      startAccessor="start"
      endAccessor="end"
      views={["work_week", "day"]}
      view={view}
      style={{ height: "98%" }}
      onView={handleOnChangeView}
      min={new Date(2025, 1, 0, 8, 0, 0)}
      max={new Date(2025, 1, 0, 17, 0, 0)}
    />
  );
}
