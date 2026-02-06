// App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home/HomePage.jsx";
import MainPage from "./games/Screen/MainPage.jsx";
import "./index.css";
import IssuePage from "./games/Screen/IssuePage.jsx";
import FinalFixPage from "./games/Screen/FinalFixPage.jsx";
import GamePage from "./pages/Game/GamePage.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="/games" element={<MainPage />} />
                <Route path="/games/issue/:groupId" element={<IssuePage />} />
                <Route path="/games/finalfix" element={<FinalFixPage />} />
            </Routes>
        </BrowserRouter>
    );
}
