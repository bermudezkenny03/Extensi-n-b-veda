document.addEventListener("DOMContentLoaded", () => {
  const userEmailElement = document.getElementById("userEmail");
  const logoutButton = document.getElementById("logoutButton");
  const credentialsContainer = document.getElementById("credentialsContainer");

  // Recuperar los datos del usuario desde chrome.storage
  chrome.storage.local.get(["email", "token"], (result) => {
    if (result.email) {
      userEmailElement.textContent = result.email;
      loadCredentials(result.token);
    } else {
      window.location.href = "popup.html"; // Si no hay sesión, redirigir a login
    }
  });

  // Manejar el cierre de sesión
  logoutButton.addEventListener("click", () => {
    chrome.storage.local.get(["token"], (result) => {
      if (!result.token) {
        console.log("No hay sesión activa.");
        return;
      }

      fetch("http://localhost:8000/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${result.token}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Logout response:", data);
          // Eliminar el token y otros datos de almacenamiento
          chrome.storage.local.remove(["token", "user_id", "email"], () => {
            console.log("Sesión cerrada.");
            window.location.href = "popup.html"; // Redirigir al login
          });
        })
        .catch((error) => {
          console.error("Error en logout:", error);
          alert("Hubo un problema cerrando la sesión.");
        });
    });
  });
});

/**
 * Función para cargar las credenciales del usuario autenticado
 */
function loadCredentials(token) {
  fetch("http://localhost:8000/api/passwords", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.passwords && data.passwords.length > 0) {
        credentialsContainer.innerHTML = "";
        data.passwords.forEach((cred) => {
          const card = document.createElement("div");
          card.className = "credential-card";

          card.innerHTML = `
            <strong>${cred.title}</strong>
             <input type="text" value="${cred.url}" id="url-${cred.id}" readonly />
            <input type="text" value="${cred.username}" id="user-${cred.id}" readonly />
            <input type="text" value="${cred.password}" id="pass-${cred.id}" readonly />`;

          credentialsContainer.appendChild(card);
        });
      } else {
        credentialsContainer.innerHTML =
          "<p>No hay credenciales guardadas.</p>";
      }
    })
    .catch((err) => console.error("Error al obtener credenciales:", err));
}
