document.addEventListener("DOMContentLoaded", async () => {
    const track = document.querySelector(".card-track");
    const prevBtn = document.querySelector(".prev-btn");
    const nextBtn = document.querySelector(".next-btn");
    let position = 0;

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
        alert("Будь ласка, увійдіть у систему.");
        window.location.href = "/";
        return;
    }

    // Получаем тренеров
    try {
        const res = await fetch("/api/coaches", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!res.ok) throw new Error("Не вдалося завантажити тренерів.");
        const coaches = await res.json();

        const cards = document.querySelectorAll(".card");

        coaches.forEach((coach) => {
            const pElement = document.getElementById(coach.IDName);
            if (pElement) {
                pElement.textContent = coach.about || "Інформація відсутня";
                const card = pElement.closest(".card");
                if (card) {
                    card.setAttribute("data-coach-id", coach._id);
                }
            }
        });

        cards.forEach((card) => {
            const chooseBtn = card.querySelector(".choose-btn");

            card.addEventListener("click", () => {
                cards.forEach(c => c.classList.remove("selected"));
                cards.forEach(c => {
                    const btn = c.querySelector(".choose-btn");
                    if (btn) btn.style.display = "none";
                });

                card.classList.add("selected");
                if (chooseBtn) chooseBtn.style.display = "block";
            });

            if (chooseBtn) {
                chooseBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();

                    const coachId = card.getAttribute("data-coach-id");
                    if (!coachId) {
                        alert("Невірний тренер.");
                        return;
                    }

                    const confirmChoice = confirm("Ви впевнені, що хочете обрати цього тренера?");
                    if (!confirmChoice) return;

                    try {
                        const res = await fetch("/api/select-coach", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ coachId, userId })
                        });

                        const data = await res.json();
                        if (res.ok) {
                            // Сохраняем coachId в localStorage!
                            localStorage.setItem("coachId", coachId);

                            // Перенаправление по ID тренера (замени ID на актуальные)
                            if (coachId === "681614b8e4821c2d667a9192") {
                                window.location.href = "zfp.html";
                            } else if (coachId === "681614b8e4821c2d667a9193") {
                                window.location.href = "stretching.html";
                            } else {
                                alert("Тренера обрано! Перенаправлення не задано.");
                            }
                        } else {
                            alert(data.message || "Помилка при виборі тренера.");
                        }
                    } catch (err) {
                        alert("Помилка запиту до сервера.");
                        console.error(err);
                    }
                });
            }
        });
    } catch (err) {
        console.error("Помилка завантаження тренерів:", err);
        alert("Не вдалося отримати дані.");
    }

    // Slider
    const updateSlider = () => {
        const card = document.querySelector(".card");
        const cardWidth = card ? card.offsetWidth + 20 : 320; // 20px gap
        nextBtn.onclick = () => {
            if (Math.abs(position) + track.clientWidth < track.scrollWidth) {
                position -= cardWidth;
                track.style.transform = `translateX(${position}px)`;
            }
        };

        prevBtn.onclick = () => {
            if (position < 0) {
                position += cardWidth;
                track.style.transform = `translateX(${position}px)`;
            }
        };
    };

    updateSlider();
    window.addEventListener("resize", updateSlider); // Пересчитать при изменении экрана
});
