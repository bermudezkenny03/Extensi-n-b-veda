chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mensaje recibido en background:", message);

  if (message.type === "AUTH_TOKEN") {
    if (!message.token || !message.user_id) {
      console.error("Error: Token o user_id faltante.");
      sendResponse({ success: false, error: "Faltan credenciales" });
      return;
    }

    chrome.storage.local.set(
      { token: message.token, user_id: message.user_id },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Error al guardar datos:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError });
        } else {
          console.log("Token y User ID almacenados correctamente.");
          sendResponse({ success: true });
        }
      }
    );

    return true;
  }

  if (message.type === "GET_TOKEN") {
    chrome.storage.local.get(["token", "user_id"], (data) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error al recuperar credenciales:",
          chrome.runtime.lastError
        );
        sendResponse({
          token: null,
          user_id: null,
          error: chrome.runtime.lastError,
        });
      } else {
        console.log("Token y User ID recuperados:", data);
        sendResponse({ token: data.token, user_id: data.user_id });
      }
    });

    return true;
  }
});
