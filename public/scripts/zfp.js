document.addEventListener("DOMContentLoaded", () => {
    // Елементи інтерфейсу
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const taskLink = document.getElementById('taskLink');
    const taskModal = document.getElementById('taskModal');
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    const taskText = document.getElementById('taskText');
    const closeTaskBtn = document.getElementById('closeTaskBtn');
    const exerciseList = document.getElementById('exerciseList');

    

    // Данні з локального сховища
    const userId = localStorage.getItem('userId');
    const coachId = localStorage.getItem('coachId');
    const token = localStorage.getItem('token');

    // Визначаємо роль користувача з токена
    let role = null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        role = payload.role;
    } catch {}

    // Відкриття/закриття сайдбара
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Відкриття таски
    taskLink.addEventListener('click', async (e) => {
        e.preventDefault();

        // Позиціонування модального вікна
        const rect = taskLink.getBoundingClientRect();
        taskModal.style.top = (window.scrollY + rect.bottom + 8) + 'px';
        taskModal.style.left = (window.scrollX + rect.left) + 'px';

        taskModal.classList.add('open');
        taskText.value = "Завантаження...";
        exerciseList.innerHTML = "";
        exerciseList.style.display = 'none';
        taskText.style.display = 'block';

        if (userId && coachId && token) {
            try {
                const res = await fetch(`/api/task/${userId}/${coachId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error();
                const data = await res.json();

                if (role === 'coach') {
                    // Тренер: textarea для вправ
                    taskText.value = (data.exercises || []).map(e => e.text).join('\n');
                    taskText.style.display = 'block';
                    exerciseList.style.display = 'none';
                    saveTaskBtn.style.display = 'inline-block';
                } else {
                    // Користувач: список вправ із кнопками
                    taskText.style.display = 'none';
                    exerciseList.style.display = 'block';
                    saveTaskBtn.style.display = 'none';
                    renderExerciseList(data.exercises || []);
                }
            } catch {
                taskText.value = '';
                alert('Не вдалося завантажити нотатку!');
            }
        } else {
            taskText.value = '';
            alert('Відсутній userId, coachId або токен!');
        }

        document.body.classList.add('task-open');
    });

    // Збереження нотаток тренером
    saveTaskBtn.addEventListener('click', async () => {
        if (userId && coachId && token) {
            try {
                const res = await fetch(`/api/task/${userId}/${coachId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ tasks: taskText.value })
                });
                if (!res.ok) throw new Error();
                taskModal.classList.remove('open');
                document.body.classList.remove('task-open');
                alert('Нотатку збережено!');
            } catch {
                alert('Помилка при збереженні нотатки!');
            }
        } else {
            alert('Відсутній userId, coachId або токен!');
        }
    });

    // Закриття блокнота по крестику
    closeTaskBtn.addEventListener('click', () => {
        taskModal.classList.remove('open');
        document.body.classList.remove('task-open');
    });

    // Відображення списку вправ для користувача
    function renderExerciseList(exercises) {
        exerciseList.innerHTML = '';
        exercises.forEach((ex, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${ex.text}</span>
                <button class="done-btn" ${ex.status === 'done' ? 'disabled' : ''}>✅</button>
                <button class="fail-btn" ${ex.status === 'fail' ? 'disabled' : ''}>❌</button>
            `;
            li.querySelector('.done-btn').onclick = () => updateExerciseStatus(idx, 'done');
            li.querySelector('.fail-btn').onclick = () => updateExerciseStatus(idx, 'fail');
            exerciseList.appendChild(li);
        });
    }

    // Оновлення статусу вправи для користувача
    async function updateExerciseStatus(index, status) {
        await fetch(`/api/exercise-status/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ index, status })
        });
        // Перезавантажити список вправ
        taskLink.click();
    }

    // Перетягування блокнота 
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    taskModal.style.position = 'absolute';

    taskModal.addEventListener('mousedown', (e) => {
        if (
            e.target === taskText ||
            e.target === saveTaskBtn ||
            e.target === closeTaskBtn ||
            e.target.closest('.save-task-btn')
        ) return;

        isDragging = true;
        offsetX = e.clientX - taskModal.getBoundingClientRect().left;
        offsetY = e.clientY - taskModal.getBoundingClientRect().top;
        taskModal.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        taskModal.style.cursor = 'move';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        const maxLeft = window.innerWidth - taskModal.offsetWidth;
        const maxTop = window.innerHeight - taskModal.offsetHeight;

        if (newLeft < 0) newLeft = 0;
        else if (newLeft > maxLeft) newLeft = maxLeft;

        if (newTop < 0) newTop = 0;
        else if (newTop > maxTop) newTop = maxTop;

        taskModal.style.left = newLeft + 'px';
        taskModal.style.top = newTop + 'px';
    });

    const notebookLink = document.getElementById('notebookLink');
    const notebookModal = document.getElementById('notebookModal');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const notebookText = document.getElementById('notebookText');
    const closeNotebookBtn = document.getElementById('closeNotebookBtn');

    // Відкриття блокнота
    notebookLink.addEventListener('click', (e) => {
        e.preventDefault();

        // Позиціонування блокнота
        const rect = notebookLink.getBoundingClientRect();
        notebookModal.style.top = (window.scrollY + rect.bottom + 8) + 'px';
        notebookModal.style.left = (window.scrollX + rect.left) + 'px';

        notebookModal.classList.add('open');
        notebookText.value = localStorage.getItem('my_note') || '';

        document.body.classList.add('notebook-open');
    });

    // Збереження нотатки
    saveNoteBtn.addEventListener('click', () => {
        localStorage.setItem('my_note', notebookText.value);
        notebookModal.classList.remove('open');
        document.body.classList.remove('notebook-open');
        alert('Нотатку збережено!');
    });

    // Закриття блокнота
    closeNotebookBtn.addEventListener('click', () => {
        notebookModal.classList.remove('open');
        document.body.classList.remove('notebook-open');
    });

    // Перетягування блокнота
    let isNotebookDragging = false;
    let notebookOffsetX = 0;
    let notebookOffsetY = 0;

    notebookModal.style.position = 'absolute';

    notebookModal.addEventListener('mousedown', (e) => {
        if (
            e.target === notebookText ||
            e.target === saveNoteBtn ||
            e.target === closeNotebookBtn ||
            e.target.closest('.save-note-btn')
        ) return;

        isNotebookDragging = true;
        notebookOffsetX = e.clientX - notebookModal.getBoundingClientRect().left;
        notebookOffsetY = e.clientY - notebookModal.getBoundingClientRect().top;
        notebookModal.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        isNotebookDragging = false;
        notebookModal.style.cursor = 'move';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isNotebookDragging) return;
        let newLeft = e.clientX - notebookOffsetX;
        let newTop = e.clientY - notebookOffsetY;

        const maxLeft = window.innerWidth - notebookModal.offsetWidth;
        const maxTop = window.innerHeight - notebookModal.offsetHeight;

        if (newLeft < 0) newLeft = 0;
        else if (newLeft > maxLeft) newLeft = maxLeft;

        if (newTop < 0) newTop = 0;
        else if (newTop > maxTop) newTop = maxTop;

        notebookModal.style.left = newLeft + 'px';
        notebookModal.style.top = newTop + 'px';
    });

});
