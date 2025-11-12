// Dispara eventos que escuchará App.jsx y aplicará los filtros correctos.
export const goAll       = () => window.dispatchEvent(new CustomEvent("nenena:go", { detail: { view: "all" } }));
export const goPersonal  = () => window.dispatchEvent(new CustomEvent("nenena:go", { detail: { view: "personal" } }));
export const goInbox     = () => window.dispatchEvent(new CustomEvent("nenena:go", { detail: { view: "inbox" } }));
export const goTrash     = () => window.dispatchEvent(new CustomEvent("nenena:go", { detail: { view: "trash" } }));
export const goArchive   = () => window.dispatchEvent(new CustomEvent("nenena:go", { detail: { view: "archive" } }));
export const goRecipient = (name) =>
  window.dispatchEvent(new CustomEvent("nenena:go", { detail: { view: "recipient", recipient: name } }));
