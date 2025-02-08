document.addEventListener("DOMContentLoaded", () => {
  const userEmailElement = document.getElementById("userEmail");
  const userNameElement = document.getElementById("userName");
  const roleUserElement = document.getElementById("roleUser");
  const logoutButton = document.getElementById("logoutButton");
  const credentialsContainer = document.getElementById("credentialsContainer");
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".section");

  // Recuperar los datos del usuario desde chrome.storage
  chrome.storage.local.get(["email", "token", "name", "role"], (result) => {
    if (result.email) {
      userEmailElement.textContent = result.email;
      userNameElement.textContent = result.name;
      roleUserElement.textContent = result.role;
      loadCredentials(result.token);
    } else {
      window.location.href = "popup.html"; // Si no hay sesión, redirigir a login
    }
  });

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.getAttribute("data-section");
      showSection(section);

      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");
    });
  });

  function showSection(sectionId) {
    sections.forEach((section) => {
      section.classList.remove("active");
    });

    document.getElementById(sectionId).classList.add("active");
  }

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
      credentialsContainer.innerHTML = "";
      if (data.passwords && data.passwords.length > 0) {
        data.passwords.forEach((cred) => {
          const card = document.createElement("div");
          card.className = "credential-card";

          card.innerHTML = `
            <strong>${cred.title}</strong>
            <input type="text" value="${cred.url}" readonly />
            <input type="text" value="${cred.username}" readonly />
            <div class="password-container">
              <input type="password" value="${cred.password}" id="pass-${cred.id}" readonly />
              <div class="toggle-button" data-target="pass-${cred.id}">
                ${eyeIcons.open}
              </div>
            </div>
          `;

          credentialsContainer.appendChild(card);
        });
        addToggleListeners();
      } else {
        credentialsContainer.innerHTML =
          "<p>No hay credenciales asignadas.</p>";
      }
    })
    .catch((err) => console.error("Error al obtener credenciales:", err));
}

const eyeIcons = {
  open: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="eye-icon"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clip-rule="evenodd" /></svg>`,
  closed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="eye-icon"><path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" /><path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z" /><path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" /></svg>`,
};

function addToggleListeners() {
  document.querySelectorAll(".toggle-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      const targetId = event.currentTarget.getAttribute("data-target");
      const passwordField = document.getElementById(targetId);
      const isEyeOpen = passwordField.type === "password";
      passwordField.type = isEyeOpen ? "text" : "password";
      event.currentTarget.innerHTML = isEyeOpen
        ? eyeIcons.closed
        : eyeIcons.open;
    });
  });
}
