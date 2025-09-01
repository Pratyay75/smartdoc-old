// src/components/Sidebar.js
import React, { useEffect, useRef, useState } from "react";
import "./Sidebar.css";
import {
  FiMenu,
  FiFileText,
  FiBarChart2,
  FiHome,
  FiChevronDown,
  FiChevronRight,
  FiBook,
  FiLayers,
  FiCopy,
  FiColumns,
  FiSend,
  FiFolderPlus,
} from "react-icons/fi";

function Sidebar({ onNavigate, sidebarOpen, setSidebarOpen }) {
  const sidebarRef = useRef(null);
  const [classifyOpen, setClassifyOpen] = useState(true);
  const [compareOpen, setCompareOpen] = useState(true);   

  const handleToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        !e.target.closest(".menu-btn")
      ) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <div className="sidebar-container">
      <button className="menu-btn" onClick={handleToggle}>
        <FiMenu size={24} />
      </button>

      {sidebarOpen && (
        <div className="sidebar" ref={sidebarRef}>
          {/* Home */}
          <div className="sidebar-option" onClick={() => onNavigate("home")}>
            <FiHome /> <span>Home</span>
          </div>

          {/* Document Extraction */}
          <div className="sidebar-option" onClick={() => onNavigate("pdf")}>
            <FiFileText /> <span>Document Extraction</span>
          </div>

          {/* Insights & Analytics */}
          <div className="sidebar-option" onClick={() => onNavigate("analytics")}>
            <FiBarChart2 /> <span>Insights & Analytics</span>
          </div>

          {/* Document Compare group */}
          <div
            className="sidebar-option"
            onClick={() => setCompareOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FiLayers /> <span>Document Compare</span>
            </span>
            {compareOpen ? <FiChevronDown /> : <FiChevronRight />}
          </div>

          {compareOpen && (
            <>
              <div
                className="sidebar-option sidebar-suboption"
                onClick={() => onNavigate("compare")}
              >
                <FiCopy /> <span>Compare Any Document</span>
              </div>
              <div
                className="sidebar-option sidebar-suboption"
                onClick={() => onNavigate("compare-side-by-side")}
              >
                <FiColumns /> <span>Side-by-Side Review</span>
              </div>
            </>
          )}

          {/* Doc Library + Chatbot */}
          <div
            className="sidebar-option"
            onClick={() => onNavigate("multi-doc-chat")}
          >
            <FiBook /> <span>Doc Library + Chatbot</span>
          </div>

          {/* Document Classification group */}
          <div
            className="sidebar-option"
            onClick={() => setClassifyOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FiLayers /> <span>Document Classification</span>
            </span>
            {classifyOpen ? <FiChevronDown /> : <FiChevronRight />}
          </div>

          {classifyOpen && (
            <>
              <div
                className="sidebar-option sidebar-suboption"
                onClick={() => onNavigate("classify-route")}
              >
                <FiSend /> <span>Auto Classify & Route</span>
              </div>
              <div
                className="sidebar-option sidebar-suboption"
                onClick={() => onNavigate("classify-manage")}
              >
                <FiFolderPlus /> <span>Manage Categories</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Sidebar;
