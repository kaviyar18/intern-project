import {
  FaArrowRight,
  FaMicrophoneAlt,
  FaFileUpload,
  FaCheckCircle,
  FaSearch,
  FaGraduationCap,
  FaUniversity,
  FaRupeeSign,
  FaLaptop,
  FaUserGraduate,
} from "react-icons/fa";
import { useAppState } from "../context/AppContext";

const features = [
  {
    title: "Voice / Document Input",
    description: "Speak or upload a document to create your profile.",
    icon: <FaMicrophoneAlt />,
  },
  {
    title: "Smart Recommendations",
    description: "Find schemes that match your education, income and category.",
    icon: <FaGraduationCap />,
  },
  {
    title: "Eligibility + XAI",
    description: "See transparent reasons behind each eligibility result.",
    icon: <FaCheckCircle />,
  },
  {
    title: "Application + Tracking",
    description: "Apply, upload documents and track your application.",
    icon: <FaSearch />,
  },
];

export default function Home() {
  const { setPage, setInputMethod } = useAppState();

  const start = (method) => {
    if (method) setInputMethod(method);
    setPage("input");
  };

  const learnMore = () => {
    document.getElementById("home-features")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <div className="landing-brand-icon">
            <img
              src="/images/govt-emblem.png"
              alt="Government of India emblem"
            />
          </div>

          <h1>
            Scholarship &amp;
            <br />
            Welfare Navigator
          </h1>

          <p>
            Find Government Schemes
            <br />
            Based on Your Profile
          </p>

          <div className="landing-actions">
            <button className="landing-primary" onClick={() => start(null)}>
              Get Started <FaArrowRight />
            </button>

            <button className="landing-secondary" onClick={learnMore}>
              Learn More
            </button>
          </div>
        </div>

        <div className="landing-art">
          <div className="art-background-shape shape-one" />
          <div className="art-background-shape shape-two" />

          <div className="art-icon art-scholarship">
            <FaGraduationCap />
          </div>

          <div className="art-icon art-government">
            <FaUniversity />
          </div>

          <div className="art-icon art-welfare">
            <FaRupeeSign />
          </div>

          <div className="art-student">
            <div className="student-head" />
            <div className="student-hair" />
            <div className="student-body">
              <div className="student-shirt" />
              <div className="student-arm student-arm-left" />
              <div className="student-arm student-arm-right" />
            </div>
            <div className="student-backpack" />
            <div className="student-laptop">
              <FaLaptop />
            </div>
          </div>

          <div className="art-leaf leaf-one" />
          <div className="art-leaf leaf-two" />
          <div className="art-ground" />
        </div>
      </section>

      <section className="landing-features" id="home-features">
        <div className="landing-features-heading">
          <span>YOUR SCHOLARSHIP JOURNEY</span>
          <h2>From Profile to Application</h2>
          <p>
            Discover schemes, check eligibility and track your application in
            one place.
          </p>
        </div>

        <div className="landing-feature-grid">
          {features.map((feature) => (
            <div className="landing-feature-card" key={feature.title}>
              <div className="landing-feature-icon">{feature.icon}</div>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="landing-quick-actions">
          <button onClick={() => start("voice")}>
            <FaMicrophoneAlt /> Start with Voice
          </button>

          <button onClick={() => start("document")}>
            <FaFileUpload /> Upload a Document
          </button>

          <button onClick={() => setPage("recommendations")}>
            <FaGraduationCap /> View Recommendations
          </button>
        </div>
      </section>
    </div>
  );
}
