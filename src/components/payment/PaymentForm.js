"use client";

import { useRef, useState } from "react";
import { SAVED_CARDS } from "@/data/accountData";
import { EMPTY_CARD, detectBrand } from "./helpers";
import PageToolbar from "./PageToolbar";
import SavedCardsSection from "./SavedCardsSection";
import AddCardSection from "./AddCardSection";
import BillingAddressSidebar from "./BillingAddressSidebar";
import AcceptedPaymentsSidebar from "./AcceptedPaymentsSidebar";
import Toast from "./Toast";

export default function PaymentForm() {
  const [cards, setCards] = useState(SAVED_CARDS);
  const [newCard, setNewCard] = useState(EMPTY_CARD);
  const [cardError, setCardError] = useState(false);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [toast, setToast] = useState({ message: "", visible: false });

  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function setCardField(field, value) {
    setNewCard((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddCard() {
    const digits = newCard.number.replace(/\D/g, "");
    if (digits.length < 12 || !newCard.expMonth || !newCard.expYear || newCard.cvv.length < 3) {
      setCardError(true);
      showToast("Fill in a valid card number, expiry and CVV");
      return;
    }
    setCardError(false);

    const card = {
      id: `card_${Date.now()}`,
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      expMonth: newCard.expMonth,
      expYear: newCard.expYear,
      holder: newCard.holder || "Cardholder",
      isDefault: newCard.setDefault || cards.length === 0,
    };

    setCards((prev) => (card.isDefault ? prev.map((c) => ({ ...c, isDefault: false })).concat(card) : prev.concat(card)));
    setNewCard(EMPTY_CARD);
    showToast("Card added");
  }

  function handleMakeDefault(id) {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
    showToast("Default payment method updated");
  }

  function handleRemove(id) {
    if (!window.confirm("Remove this payment method?")) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
    showToast("Card removed");
  }

  function handleSave() {
    showToast("Payment settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard unsaved changes?")) return;
    setNewCard(EMPTY_CARD);
    setCardError(false);
    setBillingSameAsShipping(true);
  }

  return (
    <>
      <PageToolbar onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SavedCardsSection cards={cards} onMakeDefault={handleMakeDefault} onRemove={handleRemove} />

          <AddCardSection
            card={newCard}
            cardError={cardError}
            onFieldChange={setCardField}
            onAddCard={handleAddCard}
          />
        </div>

        <div className="space-y-6">
          <BillingAddressSidebar
            sameAsShipping={billingSameAsShipping}
            onSameAsShippingChange={setBillingSameAsShipping}
          />
          <AcceptedPaymentsSidebar />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
