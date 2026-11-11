
import React from "react";
import Piano from "./components/Piano";
import "./App.css";

function App() {
  return (
    <main className="app">

      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">♫</span>
          <span>POLYPHONIC PIANO</span>
        </div>

        <span className="homework-label">
          HOMEWORK 2
        </span>
      </header>

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            INTERACTIVE MUSIC EXPERIENCE
          </span>

          <h1>
            Play Your <span>Own Melody.</span>
          </h1>

          <p>
            Khám phá âm nhạc với đàn Piano điện tử 88 phím.
            Hỗ trợ đa âm, ghi lại và phát lại giai điệu của riêng bạn.
          </p>
        </div>
      </section>

      <Piano />

      <footer className="app-footer">
        <span>88-KEY POLYPHONIC PIANO</span>
        <span>BUILT WITH REACT</span>
      </footer>

    </main>
  );
}

export default App;
