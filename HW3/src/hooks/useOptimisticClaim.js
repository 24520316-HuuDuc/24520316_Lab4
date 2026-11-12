
import { useRef, useState } from "react";

// Mô phỏng kho vé phía server để thực hành xử lý HTTP 409.
let mockServerStock = 400;

function mockClaimApi(forceConflict = false) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (forceConflict || mockServerStock <= 0) {
        resolve({
          status: 409,
          message: "Vé đã hết hoặc đã được người chơi khác nhận!",
        });
        return;
      }

      mockServerStock -= 1;

      resolve({
        status: 200,
        message: "Nhận vé thành công!",
      });
    }, 1000);
  });
}

export function useOptimisticClaim() {
  const [stock, setStock] = useState(400);
  const [tickets, setTickets] = useState(0);
  const [gCoins, setGCoins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const requestLock = useRef(false);

  const claimTicket = async (forceConflict = false) => {
    if (requestLock.current) return;

    requestLock.current = true;
    setLoading(true);
    setMessage("");
    setMessageType("");

    // Lưu trạng thái cũ để rollback nếu server từ chối.
    const previousState = {
      stock,
      tickets,
      gCoins,
    };

    // OPTIMISTIC UPDATE: cập nhật giao diện ngay lập tức.
    setStock((value) => Math.max(0, value - 1));
    setTickets((value) => value + 1);
    setGCoins((value) => value + 5000);

    try {
      const response = await mockClaimApi(forceConflict);

      if (response.status === 409) {
        // ROLLBACK: khôi phục dữ liệu ban đầu.
        setStock(previousState.stock);
        setTickets(previousState.tickets);
        setGCoins(previousState.gCoins);

        setMessage(response.message);
        setMessageType("error");
      } else {
        setMessage(response.message);
        setMessageType("success");
      }
    } catch (error) {
      setStock(previousState.stock);
      setTickets(previousState.tickets);
      setGCoins(previousState.gCoins);

      setMessage("Có lỗi xảy ra. Dữ liệu đã được khôi phục.");
      setMessageType("error");
    } finally {
      setLoading(false);
      requestLock.current = false;
    }
  };

  return {
    stock,
    tickets,
    gCoins,
    loading,
    message,
    messageType,
    claimTicket,
  };
}
