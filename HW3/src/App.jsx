import Leaderboard from "./components/Leaderboard";
import TicketClaim from "./components/TicketClaim";
import { Trophy, Crosshair, Ticket, Coins, Shield } from "lucide-react";
import CountdownTimer from "./components/CountdownTimer";
import "./App.css";

function App() {
  return (
    <main className="arena">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Shield size={25} />
          </div>
          <div>
            <h1>KRAFTON <span>x</span> PUBG</h1>
            <p>VIETNAM CHAMPIONSHIP</p>
          </div>
        </div>

        <div className="topbar-tag">
          <span className="status-dot"></span>
          ESPORTS ARENA 2026
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">WELCOME TO THE BATTLEGROUNDS</span>
          <h2>VIETNAM<br /><span>CHAMPIONSHIP</span></h2>
          <p>
            Chiến đấu hết mình. Khẳng định bản lĩnh.
            Chinh phục vinh quang.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn">
              <Ticket size={17} />
              Nhận vé tham gia
            </button>
            <button className="secondary-btn">
              <Trophy size={17} />
              Bảng xếp hạng
            </button>
          </div>
        </div>

        <div className="hero-decoration">
          <Crosshair size={150} strokeWidth={0.7} />
          <span>PUBG</span>
        </div>
      </section>

      
<CountdownTimer />

<TicketClaim />

<Leaderboard />
<footer>
  KRAFTON x PUBG VIETNAM CHAMPIONSHIP © 2026
</footer>
</main>
);
}

export default App;