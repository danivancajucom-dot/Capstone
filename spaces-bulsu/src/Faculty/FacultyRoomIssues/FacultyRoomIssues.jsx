import { useState, useEffect } from "react";
import "../../Components/IssueReportCard/issue-report-card.css";
import "./room-issues.css";
import IssueReportCard from "../../Components/IssueReportCard/IssueReportCard";
import SubmitIssueModal from "../../Components/SubmitIssueModal/SubmitIssueModal";
import { auth, db } from "../../firebase";
import {
  collection, query, where, orderBy, onSnapshot,
} from "firebase/firestore";

export default function FacultyRoomIssues() {
  const [issues, setIssues]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const q = query(
      collection(db, "roomIssues"),
      where("reporterId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const active   = issues.filter(i => i.status !== "Resolved");
  const resolved = issues.filter(i => i.status === "Resolved");
  const displayed = activeTab === "active" ? active : resolved;

  return (
    <>
      <div className="ri-page">
        <div className="ri-header">
          <div>
            <h1>Room Issues</h1>
            <p>Report classroom and equipment problems. Track them until resolved.</p>
          </div>
          <button className="ri-report-btn" onClick={() => setShowModal(true)}>
            <i className="fa-solid fa-plus" /> Report Issue
          </button>
        </div>

        <div className="ri-tabs">
          <button className={activeTab === "active" ? "active" : ""} onClick={() => setActiveTab("active")}>
            Active <span className="ri-tab-count">{active.length}</span>
          </button>
          <button className={activeTab === "resolved" ? "active" : ""} onClick={() => setActiveTab("resolved")}>
            Resolved <span className="ri-tab-count">{resolved.length}</span>
          </button>
        </div>

        {loading ? (
          <div className="ri-empty">
            <i className="fa-solid fa-circle-notch fa-spin" />
            <p>Loading your reports...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="ri-empty">
            <i className="fa-regular fa-clipboard" />
            <h3>{activeTab === "active" ? "No active issues" : "No resolved issues yet"}</h3>
            <p>
              {activeTab === "active"
                ? "When you report an issue with a classroom or equipment, it will appear here."
                : "Resolved issues will be archived here for your reference."}
            </p>
            {activeTab === "active" && (
              <button className="ri-empty-btn" onClick={() => setShowModal(true)}>
                <i className="fa-solid fa-plus" /> Report an Issue
              </button>
            )}
          </div>
        ) : (
          <div className="ri-list">
            {displayed.map(issue => (
              <IssueReportCard key={issue.id} issue={issue} role="faculty" />
            ))}
          </div>
        )}
      </div>

      <SubmitIssueModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmitted={() => {}}
      />
    </>
  );
}