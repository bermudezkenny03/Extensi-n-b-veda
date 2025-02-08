document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("Por favor, ingrese ambos campos.");
      return;
    }

    const apiUrl = "http://localhost:8000/api/login"; // Ajusta la URL según sea necesario
    const credentials = { email, password };

    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Respuesta del servidor:", data);

        if (
          data.success &&
          data.success.token &&
          data.success.user_id &&
          data.success.role_id &&
          data.success.name &&
          data.success.role
        ) {
          // Verificar si chrome.storage está disponible
          if (typeof chrome !== "undefined" && chrome.storage) {
            // Guardar el token y el user_id en Chrome Storage
            chrome.storage.local.set(
              {
                token: data.success.token,
                user_id: data.success.user_id,
                role_id: data.success.role_id,
                name: data.success.name,
                role: data.success.role,
                email: email, // Guardar el email para mostrar en el dashboard
              },
              () => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error al guardar el token y user_id:",
                    chrome.runtime.lastError
                  );
                  // alert("Hubo un problema al guardar la sesión.");
                } else {
                  console.log("Sesión guardada correctamente:", {
                    token: data.success.token,
                    user_id: data.success.user_id,
                  });
                  // alert("Inicio de sesión exitoso.");

                  setTimeout(() => {
                    window.location.href = "dashboard.html";
                  }, 1000);
                }
              }
            );
          } else {
            console.error("chrome.storage no está disponible.");
            alert("No se pudo guardar la sesión.");
          }
        } else {
          // Manejar errores de autenticación
          alert(data.message || "Error desconocido en el inicio de sesión.");
        }
      })
      .catch((error) => {
        console.error("Error en la solicitud de login:", error);
        alert("Hubo un problema con el inicio de sesión.");
      });
  });

  // Redirigir automáticamente si el usuario ya está autenticado
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get(["token"], (result) => {
      if (result.token) {
        window.location.href = "dashboard.html";
      }
    });
  }
});
