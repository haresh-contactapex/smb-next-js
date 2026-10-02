import { SelectField } from "./CheckoutField";
import { CLEARED_ADDRESS, addressMatches, savedAddressLabel, savedToAddress } from "./checkoutHelpers";

const OTHER = "other";

// "Use a saved address" above an address block. Picking one fills the block with it;
// picking "Enter a different address" empties everything under the country so a new
// one can be typed. What is selected is worked out from the values themselves (an
// address that matches a saved one shows as that one), so editing a field after
// picking moves the picker to "different" on its own. `onPick(patch)` receives the
// address fields to change, to be applied like any edit to that block.
export default function SavedAddressPicker({ section, addresses, address, disabled = false, onPick }) {
  const selected = addresses.find((saved) => addressMatches(saved, address));

  function choose(event) {
    const saved = addresses.find((candidate) => candidate.id === event.target.value);
    onPick(saved ? savedToAddress(saved) : CLEARED_ADDRESS);
  }

  return (
    <SelectField
      id={`checkout-${section}-saved`}
      label="Saved addresses"
      required={false}
      className="mb-5"
      value={selected ? selected.id : OTHER}
      onChange={choose}
      disabled={disabled}
      options={[...addresses.map((saved) => ({ value: saved.id, label: savedAddressLabel(saved) })), { value: OTHER, label: "Enter a different address" }]}
    />
  );
}
