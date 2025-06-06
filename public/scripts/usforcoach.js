document.addEventListener("DOMContentLoaded", async () => {
    // Перевірка авторизації
    const coachId = localStorage.getItem('coachId');
    const token = localStorage.getItem('token');
    if (!coachId || !token) {
        alert('Помилка: не знайдено ідентифікатор тренера або токен.');
        window.location.href = '/';
        return;
    }

    // Елементи для блокнота
    const taskBlock = document.getElementById('task-block');
    const taskTitle = document.getElementById('task-title');
    const taskText = document.getElementById('task-text');
    const taskSave = document.getElementById('task-save');
    const taskStatus = document.getElementById('task-status');
    const closeTaskbook = document.getElementById('close-task');
    const exercisePreview = document.getElementById('exercisePreview');
    let currentUserId = null;
    let currentExercises = [];

    // Закриття блокнота
    closeTaskbook.onclick = function() {
        taskBlock.style.display = 'none';
        currentUserId = null;
        taskStatus.textContent = '';
    };

    // Завантаження списку учнів
    try {
        const response = await fetch(`/api/coach/${coachId}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const usersList = document.getElementById('usersList');
        usersList.innerHTML = ''; // очищення списку

        if (!response.ok) {
            usersList.innerHTML = '<p>Помилка завантаження</p>';
            return;
        }

        const users = await response.json();

        if (users.length === 0) {
            usersList.innerHTML = '<p>Поки що немає клієнтів</p>';
            return;
        }

        // Генерація карток учнів
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <img src="${user.avatar || '/img/default_avatar.jpg'}" alt="${user.username}">
                <div class="username">${user.username}</div>
            `;
            card.onclick = () => openTask(user);
            usersList.appendChild(card);
        });
    } catch (err) {
        document.getElementById('usersList').innerHTML = '<p>Помилка мережі</p>';
    }

    // Функція відкриття блокнота
    async function openTask(user) {
        currentUserId = user._id;
        taskTitle.textContent = `Завдання для: ${user.username}`;
        taskBlock.style.display = 'block';
        taskText.value = 'Завантаження...';
        exercisePreview.innerHTML = '';
        taskStatus.textContent = '';

        try {
            const res = await fetch(`/api/task/${currentUserId}/${coachId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            currentExercises = data.exercises || [];
            // Відобразити вправи як текст (кожен рядок — вправа)
            taskText.value = currentExercises.map(e => e.text).join('\n');
            renderExercisePreviewWithStatus(currentExercises);
        } catch {
            taskText.value = '';
            exercisePreview.innerHTML = '';
            taskStatus.textContent = 'Помилка завантаження';
            taskStatus.style.color = 'red';
        }
    }

    // Збереження нотаток тренером
    taskSave.onclick = async function() {
        if (!currentUserId) return;
        taskStatus.textContent = 'Збереження...';
        taskStatus.style.color = 'black';

        try {
            const res = await fetch(`/api/task/${currentUserId}/${coachId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tasks: taskText.value })
            });
            if (!res.ok) throw new Error();
            taskStatus.textContent = 'Успішно збережено!';
            taskStatus.style.color = 'green';

            // Після збереження — оновити статуси (щоб не зникли відмітки користувача)
            // Знову завантажити блокнот і оновити прев'ю
            const reloadRes = await fetch(`/api/task/${currentUserId}/${coachId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const reloadData = await reloadRes.json();
            currentExercises = reloadData.exercises || [];
            renderExercisePreviewWithStatus(currentExercises);

        } catch {
            taskStatus.textContent = 'Помилка збереження';
            taskStatus.style.color = 'red';
        }
    };

    // Оновлення прев'ю вправ зі статусом виконання
    function renderExercisePreviewWithStatus(exercises) {
        exercisePreview.innerHTML = '';
        exercises.forEach((ex, idx) => {
            const li = document.createElement('li');
            let statusIcon = '';
            if (ex.status === 'done') statusIcon = '✅';
            else if (ex.status === 'fail') statusIcon = '❌';
            li.textContent = `${idx + 1}. ${ex.text} `;
            if (statusIcon) {
                const span = document.createElement('span');
                span.textContent = statusIcon;
                span.style.marginLeft = '8px';
                li.appendChild(span);
            }
            exercisePreview.appendChild(li);
        });
    }

    // Оновлювати прев'ю при кожному введенні тренером
    taskText.addEventListener('input', () => {
        // Якщо тренер редагує вправи, статуси ще не відомі — показуємо лише текст
        const lines = taskText.value.split('\n').filter(line => line.trim() !== '');
        const fakeExercises = lines.map(text => ({ text, status: null }));
        renderExercisePreviewWithStatus(fakeExercises);
    });
});
