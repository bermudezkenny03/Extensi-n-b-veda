console.log("Content script cargado y en ejecución");

const cleanUrl = (url) => {
  try {
    let parsedUrl = new URL(url);
    return parsedUrl.origin + parsedUrl.pathname;
  } catch (e) {
    console.error("Error al limpiar la URL:", e);
    return url;
  }
};

const normalizeEmail = (email) => email.trim().toLowerCase();

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

      let credentialExists = false;

      chrome.runtime.sendMessage({ type: "GET_TOKEN" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error al obtener el token:", chrome.runtime.lastError);
          return;
        }

        if (
          !response ||
          !response.token ||
          !response.user_id ||
          !response.email ||
          !response.role_id ||
          !response.name ||
          !response.role
        ) {
          console.warn(
            "No se puede guardar la contraseña. Usuario no autenticado."
          );
          return;
        }

        const token = response.token;
        const userId = response.user_id;
        const userEmail = response.email;
        const roleUser = Number(response.role_id);
        const nameUser = response.name;
        const nameRole = response.role;
        console.log(
          JSON.stringify(
            {
              roleUser: roleUser,
              nameRole: nameRole,
              userId: userId,
              nameUser: nameUser,
              userEmail: userEmail,
              token: token,
            },
            null,
            2
          )
        );
        fetch("http://localhost:8000/api/pivote-data", {
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
              const cleanedFullUrl = cleanUrl(fullUrl);
              const cleanedBaseUrl = cleanUrl(baseUrl);

              let credentials =
                data.passwords.find(
                  (cred) =>
                    cleanUrl(cred.url) === cleanedFullUrl &&
                    normalizeEmail(cred.username) ===
                      normalizeEmail(userEmail) &&
                    Number(cred.password_role?.role_id) === 2
                ) ||
                data.passwords.find(
                  (cred) =>
                    cleanUrl(cred.url) === cleanedBaseUrl &&
                    normalizeEmail(cred.username) ===
                      normalizeEmail(userEmail) &&
                    Number(cred.password_role?.role_id) === Number(roleUser) &&
                    Number(cred.password_role?.role_id) !== 2
                ) ||
                data.passwords.find(
                  (cred) =>
                    cleanedFullUrl.startsWith(cleanUrl(cred.url)) &&
                    normalizeEmail(cred.username) ===
                      normalizeEmail(userEmail) && // Asegurar que es del usuario
                    Number(cred.password_role?.role_id) === Number(roleUser)
                );

              if (!credentials) {
                console.log("No se encontró una credencial exacta.");
                return;
              }

              if (
                Number(credentials.password_role?.role_id) !== Number(roleUser)
              ) {
                console.warn(
                  "Los roles NO coinciden. No se debe autocompletar."
                );
                return;
              }

              console.log("Credencial encontrada:", credentials);
              credentialExists = true;

              // Autocompletar credenciales
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
            if (!credentialExists) {
              chrome.runtime.sendMessage({ type: "GET_TOKEN" }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error al obtener el token:",
                    chrome.runtime.lastError
                  );
                  return;
                }

                if (
                  !response ||
                  !response.token ||
                  !response.user_id ||
                  !response.role_id
                ) {
                  console.warn(
                    "No se pudo obtener el token o role_id. Asegúrate de estar autenticado."
                  );
                  return;
                }

                const token = response.token;
                const userId = response.user_id;
                const roleUser = Number(response.role_id);

                console.log(
                  "🔹 Verificando roleUser antes de mostrar el mensaje:"
                );
                console.log("roleUser:", roleUser);
                console.log("¿Es roleUser == 2?", roleUser === 2);

                if (roleUser !== 2) {
                  console.log(
                    "Usuario sin permisos para guardar la contraseña. Iniciando sesión normalmente."
                  );
                  form.submit();
                  return;
                }

                if (confirm("¿Desea guardar esta contraseña?")) {
                  const title = prompt(
                    "Ingrese un nombre para esta credencial:",
                    document.title || "Nueva Credencial"
                  );

                  const credentials = {
                    title,
                    url: fullUrl,
                    username: userField.value,
                    password: passField.value,
                    role_ids: [2],
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
                      } else {
                        alert(
                          `Error al guardar la contraseña: ${
                            data.message || "Error desconocido"
                          }`
                        );
                      }
                      form.submit();
                    })
                    .catch((err) => {
                      console.error("Error al guardar contraseña:", err);
                      alert("Hubo un error al guardar la contraseña.");
                      form.submit();
                    });
                } else {
                  form.submit();
                }
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
