import React, { useState, useEffect } from 'react';
import './Game.css';

const GamePage = () => {
  const [scene, setScene] = useState('initial');
  const [inputValue, setInputValue] = useState('');
  const bgImage = "https://www.intigent.ca/wp-content/uploads/2024/03/career-development.jpeg";

  useEffect(() => {
    const darkenTimer = setTimeout(() => setScene('darken'), 100);
    const errorTimer = setTimeout(() => setScene('error'), 1500);

    return () => {
      clearTimeout(darkenTimer);
      clearTimeout(errorTimer);
    };
  }, []);

  const handleRecoveryStart = () => {
    setScene('glitch');
    setTimeout(() => setScene('terminal'), 800);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const command = inputValue.toLowerCase().trim();
      if (command === 'y') {
        alert("시스템 복구 모드를 시작합니다...");
      } else {
        setInputValue('');
      }
    }
  };

  return (
    <div className="game-master-container">
      {/* 배경 레이어 (terminal 전까지 노출) */}
      {scene !== 'terminal' && (
        <div 
          className={`scene-web ${scene !== 'initial' ? 'darken' : ''}`} 
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          <div className="overlay"></div>
        </div>
      )}

      {/* 에러 모달: scene이 'error'일 때만 표시 */}
      {scene === 'error' && (
        <div className="modal-overlay">
          <div className="error-box">
            <div className="error-header">HTTP_504: GATEWAY_TIMEOUT</div>
            <h2>지원서 접수 서버 응답 없음</h2>
            <p>
              서버 내부 장애로 인해 <strong>지원서 패킷 전송이 중단되었습니다.</strong><br />
              귀하의 지원 이력은 <span style={{color: '#ef4444', fontWeight: 'bold'}}>영구 손실</span>될 수 있습니다.
            </p>
            <button className="start-btn" onClick={handleRecoveryStart}>서버 긴급 복구</button>
          </div>
        </div>
      )}

      {scene === 'glitch' && <div className="glitch-screen" />}

      {scene === 'terminal' && (
        <div className="terminal-container">
          <div className="terminal-body">
            <p className="warning">🚨 지원서 제출 서버가 응답하지 않습니다. 마지막 수정 기록에서 문제가 감지되었습니다.</p>
            <p className="highlight">🛠 임시 복구 권한이 부여되었습니다. 서버를 직접 점검하고 복구하세요..</p>
            <p className="highlight">👉 현재 상태로는 지원서를 받을 수 없습니다.</p>
            <p className="highlight">--</p>
            <p>진행하시겠습니까? (y/n)</p>
            <div className="input-line">
              <span>admin@onewave-tech:~$</span>
              <input 
                type="text" autoFocus value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;