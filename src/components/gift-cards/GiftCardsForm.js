"use client";

import { useRef, useState } from "react";
import { GIFT_CARDS, GIFT_CARD_TRANSACTIONS } from "@/data/accountData";
import { isValidGiftCardCode } from "./helpers";
import PageToolbar from "./PageToolbar";
import BalanceSidebar from "./BalanceSidebar";
import HowItWorksSidebar from "./HowItWorksSidebar";
import RedeemGiftCardSection from "./RedeemGiftCardSection";
import MyGiftCardsSection from "./MyGiftCardsSection";
import ActivitySection from "./ActivitySection";
import Toast from "./Toast";

export default function GiftCardsForm() {
  const [cards, setCards] = useState(GIFT_CARDS);
  const [transactions, setTransactions] = useState(GIFT_CARD_TRANSACTIONS);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [toast, setToast] = useState({ message: "", visible: false });

  const toastTimerRef = useRef(null);
  const codeInputRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function handleRedeemClick() {
    codeInputRef.current?.focus();
  }

  function handleRedeem() {
    if (!isValidGiftCardCode(code)) {
      setCodeError("Enter a valid gift card code (format GC-XXXX-XXXX).");
      return;
    }
    if (cards.some((c) => c.code === code)) {
      setCodeError("This gift card has already been added to your account.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);

    const newCard = {
      id: `gc_${Date.now()}`,
      code,
      initialValue: 50,
      balance: 50,
      issuedDate: today,
      expiryDate: expiry.toISOString().slice(0, 10),
      status: "active",
    };

    setCards((prev) => [newCard, ...prev]);
    setTransactions((prev) => [
      {
        id: `gct_${Date.now()}`,
        date: today,
        description: `Gift card ${code} added to account`,
        amount: newCard.balance,
        cardCode: code,
      },
      ...prev,
    ]);
    setCode("");
    setCodeError("");
    showToast("Gift card added to your account");
  }

  const activeCards = cards.filter((c) => c.status === "active");
  const balance = activeCards.reduce((sum, c) => sum + c.balance, 0);

  return (
    <>
      <PageToolbar onRedeemClick={handleRedeemClick} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <RedeemGiftCardSection
            code={code}
            codeError={codeError}
            inputRef={codeInputRef}
            onCodeChange={(value) => {
              setCode(value);
              setCodeError("");
            }}
            onRedeem={handleRedeem}
          />

          <MyGiftCardsSection cards={cards} />

          <ActivitySection transactions={transactions} />
        </div>

        <div className="space-y-6">
          <BalanceSidebar balance={balance} activeCount={activeCards.length} />
          <HowItWorksSidebar />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
