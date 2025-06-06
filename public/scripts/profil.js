document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token'); // Получаем токен один раз
    
    if (!userId || !token) { // Проверяем и токен тоже
        alert('Ви не авторизовані!');
        window.location.href = 'login.html';
        return;
    }

    // Элементы (остаётся без изменений)
    const profileView = document.getElementById('profileView');
    const profileEdit = document.getElementById('profileEdit');
    const editBtn = document.getElementById('editBtn');
    const cancelEdit = document.getElementById('cancelEdit');
    const avatarView = document.getElementById('avatarView');
    const usernameView = document.getElementById('usernameView');
    const emailView = document.getElementById('emailView');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarInput = document.getElementById('avatarInput');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordHelp = document.getElementById('passwordHelp');
    const deleteBtn = document.getElementById('deleteAccount');
    const profileForm = document.getElementById('profileEdit');

    let currentAvatar = "img/default_avatar.jpg";

    // Проверка пароля (без изменений)
    function validatePassword(password) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
    }

    function validateEmail(email) {
    const re = /^[^\s@!#$%^&*()=+{}[\]<>;:"'|\\,/?]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
    }


    // Обновлённая функция загрузки профиля
    async function loadProfile() {
        try {
            const res = await fetch(`/api/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Помилка завантаження профілю');
            const user = await res.json();
            
            // Заполняем данные (без изменений)
            usernameView.textContent = user.username || '';
            emailView.textContent = user.email || '';
            usernameInput.value = user.username || '';
            emailInput.value = user.email || '';
            avatarView.src = user.avatar || "img/default_avatar.jpg";
            avatarPreview.src = user.avatar || "img/default_avatar.jpg";
            currentAvatar = user.avatar || "img/default_avatar.jpg";
        } catch {
            alert('Помилка завантаження профілю');
        }
    }
    await loadProfile();

    // Остальные обработчики событий без изменений
    editBtn.addEventListener('click', () => {
        profileView.style.display = 'none';
        profileEdit.style.display = 'flex';
        passwordInput.value = '';
        avatarPreview.src = currentAvatar;
    });

    cancelEdit.addEventListener('click', () => {
        profileEdit.style.display = 'none';
        profileView.style.display = 'flex';
        avatarPreview.src = currentAvatar;
        passwordInput.value = '';
        passwordHelp.classList.remove('valid');
    });

    avatarInput.addEventListener('change', () => {
        const file = avatarInput.files[0];
        avatarPreview.src = file ? URL.createObjectURL(file) : currentAvatar;
    });

    passwordInput.addEventListener('input', () => {
        passwordHelp.classList.toggle('valid', 
            passwordInput.value && validatePassword(passwordInput.value)
        );
    });

    // ОБНОВЛЕННЫЙ обработчик сохранения профиля
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateEmail(emailInput.value)) {
        alert("Введіть коректну електронну адресу (без ! # $ % ^ & * та інших недопустимих символів)!");
        emailInput.focus();
        return;
    }

        if (passwordInput.value && !validatePassword(passwordInput.value)) {
            passwordHelp.classList.remove('valid');
            passwordInput.focus();
            return alert("Пароль має бути не менше 8 символів, містити латинські літери (великі та малі) і цифри.");
        }

        try {
            // Обновление данных
            const updateRes = await fetch(`/api/user/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: usernameInput.value,
                    email: emailInput.value,
                    password: passwordInput.value
                })
            });
            
            if (!updateRes.ok) {
                const errorData = await updateRes.json();
                throw new Error(errorData.message);
            }

            // Обновление аватара
            if (avatarInput.files.length) {
                const formData = new FormData();
                formData.append('avatar', avatarInput.files[0]);
                
                const avatarRes = await fetch(`/api/user/${userId}/avatar`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                
                if (!avatarRes.ok) {
                    const errorData = await avatarRes.json();
                    throw new Error(errorData.message);
                }
            }

            alert('Профіль оновлено!');
            profileEdit.style.display = 'none';
            profileView.style.display = 'flex';
            await loadProfile();
            
        } catch (error) {
            alert(error.message || 'Помилка оновлення профілю');
        }
    });

    // ОБНОВЛЕННЫЙ обработчик удаления аккаунта
    deleteBtn.addEventListener('click', async () => {
        if (!confirm('Ви впевнені, що хочете видалити акаунт?')) return;

        try {
            const res = await fetch(`/api/user/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message);
            }

            alert('Акаунт видалено!');
            localStorage.clear();
            window.location.href = 'login.html';
            
        } catch (error) {
            alert(error.message || 'Помилка видалення акаунта');
        }
    });
});
