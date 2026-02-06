import React, { useState, useEffect } from "react";
import api from "../../shared/api";
import reportData from "../data/reportData.json"; 
import "./Report.css";

const ReportPage = () => {
  const [report, setReport] = useState(reportData.summary);
  const [isLoading, setIsLoading] = useState(true);
  const { summary, labels, messages } = reportData;

  useEffect(() => {
    const fetchFinalReport = async () => {
        try {
        await api.post("/api/game/report/unlock");
        const response = await api.get("/api/game/report");
        
        if (response.data) {
            setReport({
            totalCorrect: response.data.totalCorrect ?? 0,
            totalWrong: response.data.totalWrong ?? 0,
            totalScore: response.data.totalScore ?? 0,
            });
        }
        } catch (error) {
        console.error("Data Fetch Error:", error);
        } finally {
        setTimeout(() => setIsLoading(false), 2000);
        }
    };
    fetchFinalReport();
    }, []);

  if (isLoading) {
    return (
        <div className="report-loading-container">
        <div className="ios-spinner"></div>
        <div className="loading-text-wrapper">
            <p className="loading-text">{reportData.messages.loading}</p>
        </div>
        </div>
    );
    }

  const Icons = {
    correct: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    wrong: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    total: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    )
  };

  return (
    <div className="report-page-wrapper">
      <div className="report-glass-card">
        <header className="report-header">
            <span className="system-tag">FINAL SYSTEM ANALYSIS</span>
            <h1>결과 리포트</h1>
        </header>

        <div className="score-card-container">
            <div className="score-card correct">
            <div className="card-icon-wrapper">{Icons.correct}</div>
            <div className="card-info">
                <span className="label">{labels.correct}</span>
                <span className="value">{report.totalCorrect}</span>
            </div>
            </div>

            <div className="score-card wrong">
            <div className="card-icon-wrapper">{Icons.wrong}</div>
            <div className="card-info">
                <span className="label">{labels.wrong}</span>
                <span className="value">{report.totalWrong}</span>
            </div>
            </div>

            <div className="score-card total">
            <div className="card-icon-wrapper">{Icons.total}</div>
            <div className="card-info">
                <span className="label">{labels.total}</span>
                <span className="value">{report.totalScore}</span>
            </div>
            </div>
        </div>

        <div className="congratulation-msg">
            <p>{messages.success}</p>
            <p><strong>{messages.footer}</strong></p>
        </div>

        <button className="back-home-btn" onClick={() => window.open('https://www.linkedin.com', '_blank')}
        >
        관련 직무 탐색하기 ↗
        </button>

        <a href="/" className="mini-home-link">
            홈페이지로 돌아가기
        </a>
        </div>
    </div>
  );
};

export default ReportPage;