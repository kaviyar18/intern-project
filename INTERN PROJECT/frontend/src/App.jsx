import { useState } from "react";
import { AppStateProvider, useAppState } from "./context/AppContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ToastContainer from "./components/ToastContainer";

import Home from "./pages/Home";
import Input from "./pages/Input";
import Profile from "./pages/Profile";
import Chatbot from "./pages/Chatbot";
import Recommendations from "./pages/Recommendations";
import Eligibility from "./pages/Eligibility";
import Application from "./pages/Application";
import Submission from "./pages/Submission";
import Track from "./pages/Track";

function AppContent() {
  const { currentPage } = useAppState();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pages = {
    home: <Home />,
    input: <Input />,
    profile: <Profile />,
    chatbot: <Chatbot />,
    recommendations: <Recommendations />,
    eligibility: <Eligibility />,
    application: <Application />,
    submission: <Submission />,
    track: <Track />,
  };

  const isHomePage = currentPage === "home";

  return (
    <div className={`reference-app ${isHomePage ? "home-app" : ""}`}>
      <ToastContainer />

      {isHomePage ? (
        <main className="home-main">{pages.home}</main>
      ) : (
        <>
          <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

          <div className="reference-layout">
            <Sidebar
              show={sidebarOpen}
              onNavigate={() => setSidebarOpen(false)}
            />

            <main className="reference-main">
              {pages[currentPage] || <Home />}
            </main>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}
