
import { Coins, Ticket, Gift, RefreshCcw } from "lucide-react";
import { useOptimisticClaim } from "../hooks/useOptimisticClaim";

export default function TicketClaim() {
  const {
    stock,
    tickets,
    gCoins,
    loading,
    message,
    messageType,
    claimTicket,
  } = useOptimisticClaim();

  return (
    <section className="claim-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SUPPLY DROP REWARDS</span>
          <h2>Airdrop Ticket Claim</h2>
          <p>Nhận vé VIP và G-Coin tham gia giải đấu.</p>
        </div>

        <Gift size={32} className="claim-gift-icon" />
      </div>

      <div className="claim-grid">
        <div className="claim-info">
          <div className="reward-item">
            <Ticket />
            <div>
              <span>VÉ VIP ĐÃ NHẬN</span>
              <strong>{tickets}</strong>
            </div>
          </div>

          <div className="reward-item">
            <Coins />
            <div>
              <span>G-COIN ĐÃ NHẬN</span>
              <strong>{gCoins.toLocaleString("vi-VN")}</strong>
            </div>
          </div>

          <div className="stock-info">
            <span>Vé còn lại trong kho</span>
            <strong>{stock} / 400</strong>
          </div>

          <div className="stock-bar">
            <div
              className="stock-progress"
              style={{ width: `${(stock / 400) * 100}%` }}
            />
          </div>
        </div>

        <div className="claim-action">
          <div className="reward-box">
            <Ticket size={35} />
            <strong>VIP PASS</strong>
            <span>+ 5,000 G-COIN</span>
          </div>

          <button
            className="claim-button"
            onClick={() => claimTicket(false)}
            disabled={loading || stock === 0}
          >
            {loading ? (
              "ĐANG XỬ LÝ..."
            ) : (
              <>
                <Gift size={17} />
                NHẬN AIRDROP
              </>
            )}
          </button>

          <button
            className="test-conflict-button"
            onClick={() => claimTicket(true)}
            disabled={loading}
          >
            <RefreshCcw size={14} />
            Mô phỏng lỗi 409
          </button>
        </div>
      </div>

      {message && (
        <div className={`claim-message ${messageType}`}>
          {message}
        </div>
      )}
    </section>
  );
}
