import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { Loading } from "@/components/common/Loading";

// Lazy-loaded routes
const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })));
const AccommodationList = lazy(() =>
  import("@/pages/accommodation/AccommodationList").then((m) => ({ default: m.AccommodationList }))
);
const AccommodationDetail = lazy(() =>
  import("@/pages/accommodation/AccommodationDetail").then((m) => ({ default: m.AccommodationDetail }))
);
const RoommatesList = lazy(() =>
  import("@/pages/roommates/RoommatesList").then((m) => ({ default: m.RoommatesList }))
);
const ShopsList = lazy(() =>
  import("@/pages/shops/ShopsList").then((m) => ({ default: m.ShopsList }))
);
const ShopDetail = lazy(() =>
  import("@/pages/shops/ShopDetail").then((m) => ({ default: m.ShopDetail }))
);
const Login = lazy(() => import("@/pages/Login").then((m) => ({ default: m.Login })));
const Register = lazy(() => import("@/pages/Register").then((m) => ({ default: m.Register })));

// Dashboard routes (Protected)
const DashboardOverview = lazy(() =>
  import("@/pages/dashboard/DashboardOverview").then((m) => ({ default: m.DashboardOverview }))
);
const DashboardAccommodation = lazy(() =>
  import("@/pages/dashboard/DashboardAccommodation").then((m) => ({ default: m.DashboardAccommodation }))
);
const DashboardRoommates = lazy(() =>
  import("@/pages/dashboard/DashboardRoommates").then((m) => ({ default: m.DashboardRoommates }))
);
const DashboardBusinesses = lazy(() =>
  import("@/pages/dashboard/DashboardBusinesses").then((m) => ({ default: m.DashboardBusinesses }))
);
const DashboardEnquiries = lazy(() =>
  import("@/pages/dashboard/DashboardEnquiries").then((m) => ({ default: m.DashboardEnquiries }))
);

// Admin routes (Staff Only)
const AdminModeration = lazy(() =>
  import("@/pages/admin/AdminModeration").then((m) => ({ default: m.AdminModeration }))
);
const AdminReports = lazy(() =>
  import("@/pages/admin/AdminReports").then((m) => ({ default: m.AdminReports }))
);

const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <Suspense fallback={<Loading fullScreen message="Loading page..." />}>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              {/* Public Discovery Routes */}
              <Route index element={<Home />} />
              <Route path="accommodation" element={<AccommodationList />} />
              <Route path="accommodation/:id" element={<AccommodationDetail />} />
              <Route path="roommates" element={<RoommatesList />} />
              <Route path="shops" element={<ShopsList />} />
              <Route path="shops/:slug" element={<ShopDetail />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />

              {/* Protected Dashboard Routes */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/accommodation"
                element={
                  <ProtectedRoute>
                    <DashboardAccommodation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/roommates"
                element={
                  <ProtectedRoute>
                    <DashboardRoommates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/businesses"
                element={
                  <ProtectedRoute>
                    <DashboardBusinesses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/enquiries"
                element={
                  <ProtectedRoute>
                    <DashboardEnquiries />
                  </ProtectedRoute>
                }
              />

              {/* Protected Staff Moderation Routes */}
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminModeration />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/reports"
                element={
                  <AdminRoute>
                    <AdminReports />
                  </AdminRoute>
                }
              />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
