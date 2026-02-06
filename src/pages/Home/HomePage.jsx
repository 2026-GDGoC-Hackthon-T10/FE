import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import './Home.css';

const Home = ({ onStartGame }) => {
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  const handleSubmitClick = () => {
    navigate("/game");
  };

  const bgImage = "https://www.intigent.ca/wp-content/uploads/2024/03/career-development.jpeg";

  return (
    <div className="home-wrapper" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="overlay"></div>

      {/* 상단 네비게이션 */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-left">
            <div 
                className="brand-logo" 
                onClick={() => window.location.href = '/'} 
                style={{ cursor: 'pointer' }}
            >
                CodeBlue<span>.</span></div>
            <ul className="nav-menu">
              <li className="active">커리어 분석</li>
              <li>실무 리포트</li>
              <li>인사이트</li>
              <li>커뮤니티</li>
            </ul>
          </div>
          <div className="nav-right">
            <button className="btn-login-text">로그인</button>
            <button className="btn-start-free">시작하기</button>
          </div>
        </div>
      </nav>

      {/* 메인 레이아웃: 왼쪽(큰 영역) + 오른쪽(상,하 카드) */}
      <main className="grid-container">
        
        {/* [왼쪽] 큰 영역 */}
        <section className="main-feature glass-card">
          <div className="hero-content">
            <h1 className="hero-title">
              성공적인 커리어를 위한<br />
              <span>실무 디버깅</span> 챌린지
            </h1>
            <p className="hero-sub">
              이론으로만 배우던 CS 지식을 실제 장애 상황에서 증명하세요.
            </p>
            <div className="search-bar">
                <input type="text" placeholder="관심 있는 기술 스택이나 직무를 검색해 보세요" />
                <button className="search-btn">
                    <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    >
                    <circle 
                        cx="11" 
                        cy="11" 
                        r="7.5" 
                        stroke="#3b82f6" 
                        strokeWidth="1.5"
                    />
                    <path 
                        d="M16.5 16.5L21 21" 
                        stroke="#3b82f6" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                    />
                    </svg>
                </button>
                </div>
          </div>
        </section>

        {/* [오른쪽] 카드 섹션 */}
        <div className="side-cards">
          <div className="glass-card job-item highlight-card">
            <div className="card-header">
                <div className="card-tag">D-3</div>
                <span className="company-name">원웨이브 테크(OneWave Tech)</span>
            </div>
  
            <div className="card-body">
                <h4>[신입] IT 개발자 채용</h4>
                <p>서버 장애 대응 역량 보유자 우대</p>
            </div>

            {/* 지원서 제출하기 버튼 */}
            <div className="card-footer">
                <button className="submit-btn" onClick={handleSubmitClick}>
                지원서 제출하기
                </button>
            </div>
        </div>

          <div className="glass-card job-item">
            <div className="card-tag grey">PREVIEW</div>
            <h4>Git 충돌 마스터</h4>
            <p>협업 역량 강화</p>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Home;
