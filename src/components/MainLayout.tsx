import { Outlet } from "react-router-dom";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile } from "@/services/firestore";
import { Loader2 } from "lucide-react";

const MainLayout = () => {
  const { user } = useAuth();
  const [loggedInUserProfile, setLoggedInUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const profile = await getProfile(user.uid);
        setLoggedInUserProfile(profile);
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (loading || !loggedInUserProfile) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left sidebar */}
      <LeftSidebar
        currentPage="profile" // or you can make this dynamic
        userProfile={loggedInUserProfile}
        collapsed={leftCollapsed}
        onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)}
        onNavigate={(page) => console.log("Navigate to:", page)}
      />

      {/* Middle content */}
      <main className="flex-1 overflow-x-auto">
        <Outlet />
      </main>

      {/* Right sidebar */}
      <RightSidebar
        collapsed={rightCollapsed}
        onToggleCollapse={() => setRightCollapsed(!rightCollapsed)}
        onViewProfile={(id) => console.log("View profile:", id)}
      />
    </div>
  );
};

export default MainLayout;
