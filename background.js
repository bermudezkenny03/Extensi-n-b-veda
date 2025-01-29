chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mensaje recibido en background:", message);

  if (message.type === "AUTH_TOKEN") {
    if (!message.token || !message.user_id || !message.email) {
      console.error("Error: Token, user_id o email faltante.");
      sendResponse({ success: false, error: "Faltan credenciales" });
      return;
    }

    chrome.storage.local.set(
      { token: message.token, user_id: message.user_id, email: message.email },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Error al guardar datos:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError });
        } else {
          console.log("Token, User ID y Email almacenados correctamente.");
          sendResponse({ success: true });
        }
      }
    );

    return true; // Indica que sendResponse será usado asincrónicamente
  }

  if (message.type === "GET_TOKEN") {
    chrome.storage.local.get(
      ["token", "user_id", "email", "role_id", "name", "role"],
      (data) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error al recuperar credenciales:",
            chrome.runtime.lastError
          );
          sendResponse({
            token: null,
            user_id: null,
            email: null,
            role_id: null,
            name: null,
            role: null,
            error: chrome.runtime.lastError,
          });
        } else {
          console.log("Token, User ID y Email recuperados:", data);
          sendResponse({
            token: data.token,
            user_id: data.user_id,
            role_id: data.role_id,
            name: data.name,
            role: data.role,
            email: data.email,
          });
        }
      }
    );

    return true; // Permite que sendResponse se ejecute después de la operación asincrónica
  }
});
