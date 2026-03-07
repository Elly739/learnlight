import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Lessons from "./pages/Lessons";
import LessonDetail from "./pages/LessonDetail";
import Navbar from "./components/Navbar";
import Downloads from "./pages/Downloads";
import Dashboard from "./pages/Dashboard";
import Quiz from "./pages/Quiz";
import Certificate from "./pages/Certificate";
import Admin from "./pages/Admin";
import { useAuth } from "./context/AuthContext";
import { Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import VerifyCertificate from "./pages/VerifyCertificate";
import LessonSubject from "./pages/LessonSubject";

export default function App() {
  const { user } = useAuth();
  const canAccessAdmin = ["admin", "editor", "support"].includes(user?.role);

 
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lessons" element={<Lessons />} />
        <Route path="/lessons/:id" element={<LessonDetail />} />
        <Route path="/lessons/:lessonId/subjects/:subjectId" element={<LessonSubject />} />
        <Route path="/subjects/:id" element={<Navigate to="/lessons" replace />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/subjects" element={<Navigate to="/lessons" replace />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/signup" element={<Auth mode="signup" />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route
          path="/admin"
          element={canAccessAdmin ? <Admin /> : <Navigate to="/" />}
        />
        <Route path="/quiz/:id" element={<Quiz />} />
        <Route
          path="/certificate/:certId"
          element={user ? <Certificate /> : <Navigate to="/login" />}
        />
        <Route path="/verify/:certId" element={<VerifyCertificate />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
