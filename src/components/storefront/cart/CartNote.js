"use client";

import { useId, useState } from "react";
import { useCart } from "./CartProvider";
import { NOTE_MAX_LENGTH } from "./cartHelpers";
import { CART_FIELD, CART_LABEL, CART_PRIMARY_BUTTON, CART_SECONDARY_BUTTON } from "./cartStyles";

// "Add a note to your order": a free-text note kept with the cart. It is
// committed on Save (an empty note clears it) and discarded on Cancel.
export default function CartNote({ onClose }) {
  const { note, setNote } = useCart();
  const [draft, setDraft] = useState(note);
  const fieldId = useId();

  function save(event) {
    event.preventDefault();
    setNote(draft.trim());
    onClose();
  }

  return (
    <form onSubmit={save}>
      <label htmlFor={fieldId} className={CART_LABEL}>
        Special instructions, gift message or ring size
      </label>
      <textarea
        id={fieldId}
        rows={4}
        maxLength={NOTE_MAX_LENGTH}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Write your note here"
        autoFocus
        className={`${CART_FIELD} resize-none`}
      />
      <p className="mt-1 text-right text-[11px] text-gray-400">
        {draft.length}/{NOTE_MAX_LENGTH}
      </p>
      <div className="mt-2 flex gap-2">
        <button type="submit" className={CART_PRIMARY_BUTTON}>
          Save note
        </button>
        <button type="button" onClick={onClose} className={CART_SECONDARY_BUTTON}>
          Cancel
        </button>
      </div>
    </form>
  );
}
