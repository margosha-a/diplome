document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const trainerCodeContainer = document.getElementById("trainerCodeContainer");
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const showSignup = document.getElementById("showSignup");
    const showLogin = document.getElementById("showLogin");

    loginForm.classList.add("hidden");
    signupForm.classList.add("hidden");
    trainerCodeContainer.classList.add("hidden");

    roleInputs.forEach(input => {
        input.addEventListener("change", () => {
            if (input.value === "user") {
                loginForm.classList.remove("hidden");
                signupForm.classList.add("hidden");
                trainerCodeContainer.classList.add("hidden");
            } else if (input.value === "trainer") {
                trainerCodeContainer.classList.remove("hidden");
                loginForm.classList.add("hidden");
                signupForm.classList.add("hidden");
            }
        });
    });

    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add("hidden");
        signupForm.classList.remove("hidden");
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
    });

    function validatePassword(password) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
    }

    const signupPassword = document.getElementById('signupPassword');
    const signupPasswordHelp = document.getElementById('signupPasswordHelp');
    const signupUserForm = document.getElementById('signupUserForm');

    signupPassword.addEventListener('input', () => {
        if (!validatePassword(signupPassword.value)) {
            signupPasswordHelp.classList.remove('valid');
        } else {
            signupPasswordHelp.classList.add('valid');
        }
    });

    signupUserForm.addEventListener('submit', (e) => {
        if (!validatePassword(signupPassword.value)) {
            e.preventDefault();
            signupPasswordHelp.classList.remove('valid');
            signupPassword.focus();
        }
    });

    async function redirectByCoach(userId) {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(`/api/user/${userId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                window.location.href = "choice.html";
                return;
            }

            const user = await response.json();

            if (!user.coach) {
                window.location.href = "choice.html";
                return;
            }

            if (user.coach._id === "681614b8e4821c2d667a9192") {
                window.location.href = "zfp.html";
            } else if (user.coach._id === "681614b8e4821c2d667a9193") {
                window.location.href = "stretching.html";
            } //else {
                //window.location.href = "choice.html";
            //}
        } catch (err) {
            console.error("Ошибка получения пользователя:", err);
            //window.location.href = "choice.html";
        }
    }

    // Вход пользователя
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();

            if (response.ok) {
                if (result.userId && result.token) {
                    localStorage.setItem("userId", result.userId);
                    localStorage.setItem("token", result.token);
                    await redirectByCoach(result.userId);
                    alert(`Вітаємо! Вхід успішний`);
                } 
            } else {
                alert(`Помилка: ${result.message}`);
            }
        } catch (error) {
            console.error("Помилка при вході:", error);
            alert("Сталась помилка. Спробуйте ще раз.");
        }
    });

    function validateEmail(email) {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    }

    // Регистрация пользователя
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("signupUsername").value;
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;
        // Перевірка email
        if (!validateEmail(email)) {
            alert("Введіть коректну електронну адресу (без !#$%^&* та інших недопустимих символів)!");
            document.getElementById("signupEmail").focus();
            return;
        }


        try {
            const response = await fetch("/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            const result = await response.json();

            if (response.ok) {
                if (result.userId && result.token) {
                    localStorage.setItem("userId", result.userId);
                    localStorage.setItem("token", result.token);
                }
                alert(result.message);
                window.location.href = "choice.html";
            } else {
                alert(`Помилка: ${result.message}`);
            }
        } catch (error) {
            console.error("Помилка при реєстрації:", error);
            alert("Сталась помилка. Спробуйте ще раз.");
        }
    });

    // Вход тренера по коду
    const trainerCodeForm = trainerCodeContainer.querySelector("form");
    trainerCodeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const code = document.getElementById("trainerCode").value;

        try {
            const response = await fetch("/login-coach-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem("token", result.token); 
                localStorage.setItem("coachId", result.coach._id);      
                alert(`Вітаємо, тренере ${result.coach.name}!`);
                window.location.href = "usforcoach.html";
            }
            else {
                alert(`Помилка: ${result.message}`);
            }
        } catch (error) {
            console.error("Помилка при вході тренера:", error);
            alert("Сталась помилка. Спробуйте ще раз.");
        }
    });
});
