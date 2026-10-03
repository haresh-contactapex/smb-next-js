import { getCurrencyTaxSettings } from "./currencyTaxSettings";
import { DEFAULT_MONEY_FORMAT } from "./currency";

// The store's { position, numberFormat } from Settings -> Currency & Tax, for
// server code that formats money (client components use useGeneralSettings()).
// Falls back to the US default so a page still renders if the row can't be read.
export async function loadMoneyFormat() {
  try {
    const settings = await getCurrencyTaxSettings();
    return { position: settings.currencyPosition, numberFormat: settings.numberFormat };
  } catch {
    return DEFAULT_MONEY_FORMAT;
  }
}
