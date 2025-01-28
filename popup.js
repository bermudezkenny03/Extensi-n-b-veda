document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.getElementById("login");

  // Redirigir a la vista de login
  loginButton.addEventListener("click", () => {
    window.location.href = "login.html";
  });
});
