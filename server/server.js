require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/img', express.static(path.join(__dirname, '..', 'img')));
app.use('/video', express.static(path.join(__dirname, '..', 'video')));

// Multer: збереження файлів з орігінальним розширенням
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// MongoDB подключение
mongoose.connect('mongodb://localhost:27017/gymDB')
    .then(() => console.log('MongoDB підключена'))
    .catch((err) => console.error('Помилка при підключенні MongoDB:', err));

// Схема и модель тренера
const coachSchema = new mongoose.Schema({
    name: String,
    direction: String,
    about: String,
    code: String,
    IDName: String
}, { collection: 'coach' });

const Coach = mongoose.model('Coach', coachSchema);

// Схема и модель пользователя
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    coach: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', default: null },
    avatar: { type: String, default: "" }
}, { collection: 'usersCredentials' });

const UserCredentials = mongoose.model('UserCredentials', userSchema);

// Схема и модель блокнота
const ExerciseSchema = new mongoose.Schema({
  text: String,
  status: { type: String, enum: ['done', 'fail', null], default: null }
});


const TaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserCredentials', required: true },
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  exercises: [ExerciseSchema]
});

const Task = mongoose.model('Task', TaskSchema);


// --- Валидация пароля ---
function isPasswordStrong(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
}

function validateEmail(email) {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// --- JWT ---
// генерація токена для користувача або тренера
function generateToken(payload) {
    // payload може містити userId або coachId і role
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN;
    return jwt.sign(payload, secret, { expiresIn });
}

// перевірка токена
function verifyToken(token) {
    const secret = process.env.JWT_SECRET;
    try {
        return jwt.verify(token, secret);
    } catch (err) {
        return null;
    }
}

// middleware для аутентифікації
function authenticateJWT(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(403).json({ message: 'Немає доступу, авторизуйтеся!' });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(403).json({ message: 'Невірний або протермінований токен!' });

    req.user = decoded;
    next();
}


// --- API ---

// Получить всех тренеров
app.get('/api/coaches', authenticateJWT, async (req, res) => {
    try {
        const coaches = await Coach.find({});
        res.status(200).json(coaches);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка получения тренеров' });
    }
});

// Получить информацию о тренере пользователя
/*app.get('/api/user/:id/coach', async (req, res) => {
    try {
        const user = await UserCredentials.findById(req.params.id).populate('coach');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({
            coach: user.coach ? {
                _id: user.coach._id,
                name: user.coach.name,
                direction: user.coach.direction
            } : null
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});*/

// Получить профиль пользователя по userId
app.get('/api/user/:id', authenticateJWT, async (req, res) => {
    if (req.user.userId !== req.params.id) {
    return res.status(403).json({ message: 'У вас немає доступу до цього користувача.' });
    }
    try {
        const user = await UserCredentials.findById(req.params.id).populate('coach');
        if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });
        res.json({
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            coach: user.coach
        });
    } catch (err) {
        res.status(500).json({ message: 'Помилка при отриманні профілю.' });
    }
});

// Регистрация пользователя
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        if (!isPasswordStrong(password)) {
            return res.status(400).json({
                message: 'Пароль має бути не менше 8 символів, містити латинські літери (великі та малі) та цифри.'
            });
        }
        const existingUser = await UserCredentials.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Користувач с таким email вже існує.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new UserCredentials({ username, email, password: hashedPassword });
        await user.save();

        const token = generateToken({ userId: user._id, role: 'user' });

        res.status(201).json({
            message: 'Реєстрація успішна!',
            userId: user._id,
            token
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка регистрации.' });
    }
});

// Вход пользователя
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await UserCredentials.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Користувача не знайдено.' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Неправильний пароль.' });
        }
        const token = generateToken({ userId: user._id, role: 'user' });
        res.status(200).json({ message: 'Вхід успішний!', userId: user._id, token });

    } catch (error) {
        res.status(500).json({ message: 'Помилка входа.' });
    }
});

// Вход тренера по коду
app.post('/login-coach-code', async (req, res) => {
    const { code } = req.body;
    try {
        const coach = await Coach.findOne({ code });
        if (!coach) {
            return res.status(400).json({ message: 'Невірний код тренера.' });
        }
        const token = generateToken({ coachId: coach._id, role: 'coach' }); // створення токена для тренера
        res.status(200).json({ message: 'Вхід успішний!', coach, token });

    } catch (error) {
        res.status(500).json({ message: 'Помилка при вході тренера.' });
    }
});

// Привязка тренера к пользователю
app.post('/api/select-coach', authenticateJWT, async (req, res) => {
    if (req.user.userId !== req.body.userId) {
    return res.status(403).json({ message: 'У вас немає доступу до цього користувача.' });
}


    const { coachId, userId } = req.body;
    if (!coachId || !userId) {
        return res.status(400).json({ message: 'Не вистачає даних.' });
    }

    try {
        const user = await UserCredentials.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Користувача не знайдено.' });
        }
        user.coach = coachId;
        await user.save();
        res.status(200).json({ message: 'Тренер успішно обраний.' });
    } catch (error) {
        res.status(500).json({ message: 'Помилка при виборі тренера.' });
    }
});

// Обновить профиль (имя, email, пароль)
app.put('/api/user/:id', authenticateJWT, async (req, res) => {
    if (req.user.userId !== req.params.id) {
    return res.status(403).json({ message: 'У вас немає доступу до цього користувача.' });
    }


    const { username, email, password } = req.body;
    try {
        const user = await UserCredentials.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

        if (username) user.username = username;
        if (email) user.email = email;
        if (password) {
            if (!isPasswordStrong(password)) {
                return res.status(400).json({
                    message: 'Пароль має бути не менше 8 символів, містити латинські літери (великі та малі) та цифри.'
                });
            }
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();
        res.json({ message: 'Профіль оновлено!' });
    } catch (err) {
        res.status(500).json({ message: 'Помилка при оновленні профілю.' });
    }
});

// Загрузка аватара пользователя (с расширением!)
app.post('/api/user/:id/avatar', authenticateJWT, upload.single('avatar'), async (req, res) => {
    if (req.user.userId !== req.params.id) {
    return res.status(403).json({ message: 'У вас немає доступу до цього користувача.' });
    }


    try {
        const user = await UserCredentials.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

        // Удалить старый аватар, если был
        if (user.avatar && fs.existsSync(path.join(__dirname, '..', 'public', user.avatar))) {
            fs.unlinkSync(path.join(__dirname, '..', 'public', user.avatar));
        }

        // Сохраняем путь к новому фото
        user.avatar = '/uploads/' + req.file.filename;
        await user.save();
        res.json({ message: 'Фото оновлено!', avatar: user.avatar });
    } catch (err) {
        res.status(500).json({ message: 'Помилка при завантаженні фото.' });
    }
});

// Удаление аккаунта пользователя
app.delete('/api/user/:id', authenticateJWT, async (req, res) => {
    try {
        const user = await UserCredentials.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });
        if (user.avatar && fs.existsSync(path.join(__dirname, '..', 'public', user.avatar))) {
            fs.unlinkSync(path.join(__dirname, '..', 'public', user.avatar));
        }
        res.json({ message: 'Аккаунт видалено.' });
    } catch (err) {
        res.status(500).json({ message: 'Помилка при видаленні акаунту.' });
    }
});

app.get('/api/coach/:coachId/users', authenticateJWT, async (req, res) => {
    // перевіряємо, що це тренер і його id співпадає з coachId у токені
    if (req.user.role !== 'coach' || req.user.coachId !== req.params.coachId) {
        return res.status(403).json({ message: 'Доступ заборонено' });
    }
    try {
        const users = await UserCredentials.find({ coach: req.params.coachId })
            .select('_id username avatar');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Получить таску
app.get('/api/task/:userId/:coachId', authenticateJWT, async (req, res) => {
  // доступ має тренер або сам користувач
  const isCoach = req.user.role === 'coach' && req.user.coachId === req.params.coachId;
  const isUser = req.user.role === 'user' && req.user.userId === req.params.userId;
  if (!isCoach && !isUser) return res.status(403).json({ message: 'Доступ заборонено' });

  const task = await Task.findOne({ userId: req.params.userId, coachId: req.params.coachId });
  if (!task) return res.json({ exercises: [] });
  res.json({ exercises: task.exercises });
});


// Сохранить таску
// Тренер створює/редагує вправи для користувача
app.post('/api/task/:userId/:coachId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'coach' || req.user.coachId !== req.params.coachId) {
    return res.status(403).json({ message: 'Доступ заборонено' });
  }

  try {
    const { tasks } = req.body;
    const newExercises = tasks.split('\n').filter(Boolean).map(text => text.trim());

    // 1. Знайти існуючі вправи
    const task = await Task.findOne({ userId: req.params.userId, coachId: req.params.coachId });
    const oldExercisesMap = new Map();
    
    if (task) {
      task.exercises.forEach(ex => {
        oldExercisesMap.set(ex.text.trim(), ex.status); // Зберігаємо статуси за текстом
      });
    }

    // 2. Злити старі статуси з новими вправами
    const mergedExercises = newExercises.map(text => ({
      text,
      status: oldExercisesMap.get(text) || null // Беремо статус зі старих даних або null
    }));

    // 3. Оновити або створити запис
    if (task) {
      task.exercises = mergedExercises;
      await task.save();
    } else {
      await Task.create({
        userId: req.params.userId,
        coachId: req.params.coachId,
        exercises: mergedExercises
      });
    }

    res.json({ message: 'Збережено!' });
  } catch (err) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
});


app.post('/api/exercise-status/:userId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'user' || req.user.userId !== req.params.userId) {
    return res.status(403).json({ message: 'Доступ заборонено' });
  }
  const { index, status } = req.body;
  const task = await Task.findOne({ userId: req.params.userId });
  if (!task || !task.exercises[index]) {
    return res.status(404).json({ message: 'Вправу не знайдено' });
  }
  task.exercises[index].status = status;
  await task.save();
  res.json({ success: true });
});


app.listen(PORT, () => {
    console.log(`сервер запущено на http://localhost:${PORT}`);
});
