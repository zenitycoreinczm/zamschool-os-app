"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Loader2, MoreHorizontal } from "lucide-react";

import { ChartFrame } from "@/components/charts/ChartFrame";

type AttendancePoint = {
  name: string;
  present: number;
  absent: number;
};

export default function AttendanceChart() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadAttendance = async () => {
      try {
        const response = await fetch("/api/admin/attendance/summary?range=week", {
          cache: "no-store",
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (cancelled) return;

        setRows(Array.isArray(payload?.data?.rows) ? payload.data.rows : []);
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading attendance chart:", error);
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAttendance();

    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo<AttendancePoint[]>(() => {
    const points = [
      { name: "Mon", present: 0, absent: 0 },
      { name: "Tue", present: 0, absent: 0 },
      { name: "Wed", present: 0, absent: 0 },
      { name: "Thu", present: 0, absent: 0 },
      { name: "Fri", present: 0, absent: 0 },
    ];

    for (const row of rows) {
      const dateValue = String(row?.date || "").trim();
      if (!dateValue) continue;

      const day = new Date(dateValue).getDay();
      const targetIndex = day >= 1 && day <= 5 ? day - 1 : -1;
      if (targetIndex < 0) continue;

      const status = String(row?.status || "").toUpperCase();
      if (status === "ABSENT") {
        points[targetIndex].absent += 1;
      } else if (status) {
        points[targetIndex].present += 1;
      }
    }

    return points;
  }, [rows]);
  const hasData = data.some((item) => item.present > 0 || item.absent > 0);

  return (
    <div className="bg-white rounded-[22px] w-full h-full min-h-[320px] p-5 flex flex-col shadow-sm border border-slate-100">
      <div className="flex justify-between items-center">
        <h1 className="text-[2rem] font-bold text-slate-900">Attendance</h1>
        <MoreHorizontal className="w-5 h-5 text-gray-400" />
      </div>
      <div className="mt-2 h-[280px] min-h-[220px] w-full min-w-0">
        {loading ? (
          <div className="h-full grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : !hasData ? (
          <div className="h-full grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center px-6">
            <div>
              <p className="text-sm font-medium text-slate-600">No attendance records yet</p>
              <p className="mt-1 text-xs text-slate-400">Weekly attendance trends will appear after roll calls are submitted.</p>
            </div>
          </div>
        ) : (
          <ChartFrame minHeight={280}>
            {(size) => (
            <BarChart width={size.width} height={size.height} data={data} barSize={18} margin={{ top: 12, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#e8ebf1" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis axisLine={false} tick={{ fill: "#d1d5db" }} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", borderColor: "#eef2f7" }}
              />
              <Legend
                align="left"
                verticalAlign="top"
                wrapperStyle={{ paddingTop: "0px", paddingBottom: "24px", fontSize: "13px" }}
              />
              <Bar
                dataKey="present"
                fill="#f9d86d"
                legendType="circle"
                radius={[12, 12, 0, 0]}
              />
              <Bar
                dataKey="absent"
                fill="#bde9fb"
                legendType="circle"
                radius={[12, 12, 0, 0]}
              />
            </BarChart>
            )}
          </ChartFrame>
        )}
      </div>
    </div>
  );
}
