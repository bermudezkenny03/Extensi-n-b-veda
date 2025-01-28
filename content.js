console.log("Content script cargado y en ejecución");

const detectForms = () => {
  const forms = document.querySelectorAll("form");

  forms.forEach((form) => {
    if (form.dataset.listenerAttached) return;
    form.dataset.listenerAttached = "true";

    const userField = form.querySelector(
      'input[type="email"], input[type="text"]'
    );
    const passField = form.querySelector('input[type="password"]');

    if (userField && passField) {
      console.log("Formulario detectado:", form);

      const url = new URL(window.location.href);
      const fullUrl = url.href;
      const baseUrl = url.origin;
      console.log("Buscando credenciales para:", fullUrl);

      chrome.runtime.sendMessage({ type: "GET_TOKEN" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error al obtener el token:", chrome.runtime.lastError);
          return;
        }

        if (!response || !response.token || !response.user_id) {
          console.warn(
            "No se puede guardar la contraseña. Usuario no autenticado."
          );
          return;
        }

        const token = response.token;
        const userId = response.user_id;
        console.log("Token y User ID obtenidos correctamente:", token, userId);

        fetch("http://localhost:8000/api/passwords", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: baseUrl }),
        })
          .then((res) => res.json())
          .then((data) => {
            console.log("Respuesta completa de la API:", data);

            if (data.passwords && data.passwords.length > 0) {
              let credentials =
                data.passwords.find((cred) => cred.url === fullUrl) ||
                data.passwords.find((cred) => cred.url === baseUrl);

              if (!credentials) {
                console.log(
                  "No se encontró una credencial exacta para esta URL."
                );
                return;
              }

              console.log("Credencial encontrada:", credentials);
              userField.value = credentials.username;
              passField.value = credentials.password;

              alert("Se han autocompletado las credenciales guardadas.");

              setTimeout(() => {
                console.log("Intentando iniciar sesión automáticamente...");
                userField.dispatchEvent(new Event("input", { bubbles: true }));
                passField.dispatchEvent(new Event("input", { bubbles: true }));
                passField.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
                );

                const submitButton = form.querySelector(
                  'button[type="submit"], input[type="submit"]'
                );
                if (submitButton) {
                  submitButton.click();
                } else {
                  form.dispatchEvent(new Event("submit", { bubbles: true }));
                }
              }, 1000);
            }
          })
          .catch((err) => console.error("Error al verificar credencial:", err));
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();

        setTimeout(() => {
          if (userField.value && passField.value) {
            if (confirm("¿Desea guardar esta contraseña?")) {
              chrome.runtime.sendMessage({ type: "GET_TOKEN" }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error al obtener el token:",
                    chrome.runtime.lastError
                  );
                  return;
                }

                if (!response || !response.token || !response.user_id) {
                  console.warn(
                    "No se pudo obtener el token. Asegúrate de estar autenticado."
                  );
                  return;
                }

                const token = response.token;
                const userId = response.user_id;
                const title = prompt(
                  "Ingrese un nombre para esta credencial:",
                  document.title || "Nueva Credencial"
                );

                const credentials = {
                  title,
                  url: fullUrl,
                  username: userField.value,
                  password: passField.value,
                  role_ids: [1],
                  registered_by: userId,
                };

                console.log(
                  "Enviando datos para guardar contraseña:",
                  credentials
                );

                fetch("http://localhost:8000/api/store-password", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(credentials),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    console.log(
                      "Respuesta de la API al guardar contraseña:",
                      data
                    );

                    if (
                      data.success ||
                      (data.message &&
                        data.message.toLowerCase().includes("success"))
                    ) {
                      alert("Contraseña guardada exitosamente.");
                      form.submit();
                    } else {
                      alert(
                        `Error al guardar la contraseña: ${
                          data.message || "Error desconocido"
                        }`
                      );
                    }
                  })
                  .catch((err) => {
                    console.error("Error al guardar contraseña:", err);
                    alert("Hubo un error al guardar la contraseña.");
                  });
              });
            } else {
              form.submit();
            }
          }
        }, 500);
      });
    }
  });
};

const observer = new MutationObserver(() => detectForms());
observer.observe(document.body, { childList: true, subtree: true });

detectForms();
