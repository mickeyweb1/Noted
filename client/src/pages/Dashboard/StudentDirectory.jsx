import { useState, useEffect } from "react";
import { Users, Building2, Globe, ArrowLeft, Search } from "lucide-react"; // ✅ FIXED TYPO HERE
import { NavLink } from "react-router-dom";
import api from "../../utils/api";

export default function StudentDirectorys() {
  const [scope, setScope] = useState("global");
  const [directoryData, setDirectoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const response = await api.get(`/auth/directory?scope=${scope}`);
        if (response.data.success) {
          setDirectoryData(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch directory:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDirectory();
  }, [scope]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  const isSchool = directoryData?.activeScope === "school";
  const filteredStudents =
    directoryData?.students.filter((student) =>
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-4">
          <NavLink
            to="/dashboard"
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </NavLink>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Users className="w-8 h-8 text-brand" />
              Student Directory
            </h1>
            <p className="text-muted-foreground mt-1">
              {isSchool
                ? `Find study peers at ${directoryData?.userSchool}`
                : "Discover top students across the platform."}
            </p>
          </div>
        </div>

        <div className="flex bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setScope("global")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${!isSchool ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Globe className="w-4 h-4" /> Global
          </button>
          <button
            onClick={() => setScope("school")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${isSchool ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Building2 className="w-4 h-4" /> My School
          </button>
        </div>
      </div>

      {/* ✅ Friendly message if they don't have a school yet */}
      {isSchool && directoryData?.userSchool === "Global" && (
        <div className="p-8 text-center rounded-2xl bg-card border border-border border-dashed">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            You haven't joined a school yet!
          </h3>
          <p className="text-muted-foreground mb-4">
            Ask your school administrator for an invite code to join a school
            network.
          </p>
          <button
            onClick={() => setScope("global")}
            className="px-4 py-2 rounded-lg bg-brand text-brand-foreground font-medium text-sm hover:bg-brand/90"
          >
            Switch back to Global
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search students by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
        />
      </div>

      {/* Directory List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="font-display font-semibold text-foreground">
            {filteredStudents.length} Students Found
          </h2>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No students found in this view.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredStudents.map((student) => (
              <div
                key={student._id}
                className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-electric/10 flex items-center justify-center text-electric font-bold">
                    {student.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {student.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {student.level} • {student.schoolName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand">{student.xp} XP</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
