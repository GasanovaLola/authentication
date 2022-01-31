const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {secret} = {secret: "SECRET_KEY_RANDOM"};
const {check} = require('express-validator');
const {response} = require('express');

let env = require('dotenv').config();

const app = express();
const Schema = mongoose.Schema;

/* ----------------------------------- */
const userScheme = new Schema({
    balance: String,
    picture: String,
    age: Number,
    name: String,
    gender: String,
    company: String,
    email: String,
    friends: [],
    pendingFriends: []
});
/* ----------------------------------- */
// User

const UserLogScheme = new Schema({
  username: {type: String, unique: true, required: true},
  password: {type: String, required: true},
  roles: [{type: String, ref: 'Role'}]
})

// Role

const roleScheme = new Schema({
  value: {type: String, unique: true, default: "USER"},
})

const User = mongoose.model("User", userScheme);
const Role = mongoose.model("Role", roleScheme);
const UserLog = mongoose.model("UserLog", UserLogScheme);

const host = 'localhost';

const MONGODB_LINK = process.env.MONGODB_LINK;
console.log(MONGODB_LINK);
mongoose.connect(MONGODB_LINK, { useUnifiedTopology: true, useNewUrlParser: true })

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

async function addFriend(req, res) {
    try {
        const {friendRequests: idUserRequest, friendTarget: idUserTarget} = req.body;

        if(!idUserRequest || !idUserTarget) throw new Error("Wrong params!");
        const user = await User.findById(idUserRequest);

        if(!user) throw new Error("User does not exist!");
        await user.pendingFriends.push(idUserRequest);

        res.status(200).json({ success: true });
        await user.save();
    }
    catch (err) {
        console.log(err);
        res.status(404).send(err.message);
    }
}

async function getFriends(req, res) {
    try {
        const {friendRequests: idUserRequest, flag: requestFlag, pendingFriends} = req.body;

        if(!idUserRequest) throw new Error("Wrong params");

        const user = await User.findById(idUserRequest);
        let friends = await User.find({_id: { $in: user.friends } });

        if(!requestFlag || friends.length > 0) throw new Error("Пользователь отклонил ваш запрос в друзья!");

        friends = friends.map(obj => obj.name);

        user.friends = pendingFriends;
        user.pendingFriends = user.pendingFriends.pop();

        const newUser = await User.findById(friends[0]);

        newUser.friends = idUserRequest;
        newUser.pendingFriends = req.body.pendingFriends.pop();
        
        await user.save();
        await newUser.save();

        res.status(200).json(newUser);
    }
    catch (err) {
       console.log(err);
       res.status(400).send(err.message);
    }
}

async function getAllUsers(req, res){
    try {
        const users = await User.find();

        res.status(200).json(users);
    }
    catch (err) {
        console.log(err);
        res.status(404).send(err.message);
    }
}

async function getUser(req, res){
    try {
        const id = req.params.userId;

        const user = await User.findById(id);

        res.status(200).json(user);
    }
    catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }
}

async function createUser(req, res){
    try {
        const {balance, picture, age, name, gender, company, email, friends, pendingFriends} = req.body;
        const newUser = new User(balance, picture, age, name, gender, company, email, friends, pendingFriends);
        await newUser.save();

        res.status(404).json(newUser);
    }
    catch (err) {
        console.log(err);
        res.send(404).send(err.message);
    }
}

async function updateUser(req, res) {
    try{
        const id = req.params.userId;
        const {balance, picture, age, name, gender, company, email, friends, pendingFriends} = req.body;
        
        const updatedUser = await User.findById(id);

        Object.assign(user, {balance, picture, age, name, gender, company, email, friends, pendingFriends});
        await updatedUser.save();

        res.status(200).json(updatedUser);
    }
    catch (err) {
        console.log(err);
        res.status(404).send(err.message);
    }
}

async function deleteUser(req, res) {
    try {
        const id = req.params.userId;

        const user = await User.findById(id);
        const deletedUser = await user.remove();

        res.status(200).json(deletedUser);
    }
    catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }
}



async function registration(req, res) {
  try {
    const errors = check(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({message: "Ошибка при регистрации", errors});
    }

    const {username, password} = req.body;
    const candidate = await UserLog.findOne({username});

    if (candidate) {
      return res.status(400).json({message: "Пользователь с таким именем уже существует"});
    }

    const hashPassword = bcrypt.hashSync(password, 7);
    const userRole = await Role.findOne({value: "USER"});
    const userlog = new UserLog({username, password: hashPassword, roles: [userRole.value]});

    await userlog.save();

    return res.send("Пользователь успешно зпрегистрирован");
  }
  catch (err) {
    console.log(err);
    res.status(400).send(err.message);
  }
}

async function login(req, res) {
  try {
    const {username, password} = req.body;

    const user = await UserLog.findOne({username});

    if (!user) {
      return res(400).send("Пользователь с таким видео не найден");
    }

    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      return res(400).send("Пользователь введен не верно");
    }

    const token = generateAccessToken(user._id, user.roles);
    return res.json({token});
  }
  catch (err) {
    console.log(err);
    res.status(400).send(err.message);
  }
}

async function getUsers(req, res) {
  try {
    const users = await UserLog.find();
    res.status(200).json({users});
  }
  catch (err) {
    console.log(err);
    res.status(400).send(err.message);
  }
}


function middleWare(req, res, next) {
  if (req.method === "OPTIONS") {
      next();
  }

  try {
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
      return res.status(400).send("Пользователь не авторизирован");
    }

    const decodedData = jwt.verify(token, secret);
    req.user = decodedData;

    next();
  }
  catch (err) {
    console.log(err);
    res.status(400).send(err.message);
  }
}

function roleMiddleWare (roles) {
  return function (req, res, next) {
    if (req.method === "OPTIONS") {
      next();
    }

    try {
      const token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(400).send("Пользователь не авторизирован");
      }

      const {roles: userRole} = jwt.verify(token, secret);
      let hasRole = false;
      
      userRole.forEach(role => {
        if (roles.includes(role)) {
          hasRole = true;
        }
      });

      if (!hasRole) {
        return res.status(400).send("У Вас нет доступа");
      }
      next();
    }
    catch (err) {
      console.log(err);
      res.status(400).send(err.message);
    }
  }
}
    

const generateAccessToken = (id, roles) => {
  const payload = {
    id,
     roles
  };
  return jwt.sign(payload, secret, {expiresIn: "24h"});
}


app.get('/', getAllUsers);
app.post('/addFriend', addFriend);
app.post('/getFriends', getFriends);
app.get('/user/:userId', getUser);
app.post('/', createUser);
app.put('/:userId', updateUser);
app.delete('/:userId', deleteUser);

app.post('/registration', [
  check('username', "Имя пользователя не может быть пустым").notEmpty(),
  check('password', "Пароль должен быть не мешьше 5 и не больше 10 символов").isLength({min: 5, max: 10})
], registration);
app.post('/login', login);
app.get('/getUser', middleWare, getUsers);
//app.get('/getUser', roleMiddleWare(['USER']), getUsers);

const PORT = process.env.PORT || 3000;

/*const start = async () => {
    try {
        await mongoose.connect(MONGODB_LINK, { useUnifiedTopology: true, useNewUrlParser: true });

        app.listen(PORT, host, function () {
            console.log(`Server listens http://${host}:${PORT}`)
        });
    }
    catch (err) {
        console.log(err);
    }
}

start();*/

app.listen(PORT, host, function () {
  console.log(`Server listens http://${host}:${PORT}`)
});









// может быть включена поддержка сессий
// app.use(express.session());
// теперь в HTTP-обработчиках будет доступна переменная req.session.

// для поддержки сессий в MongoDB необходимо установить connect-mongodb:
// npm install connect-mongodb

/*app.configure('development', function() {
    app.set('db-uri', 'mongodb://localhost/nodepad-development');
});
  
var db = mongoose.connect(app.set('db-uri'));
  
function mongoStoreConnectionArgs() {
    return { 
        dbname: db.db.databaseName,
        host: db.db.serverConfig.host,
        port: db.db.serverConfig.port,
        username: db.uri.username,
        password: db.uri.password};
}
  
app.use(express.session({
    store: mongoStore(mongoStoreConnectionArgs())
}));*/

/*function loadUser(req, res, next) {
  if (req.session.user_id) {
    User.findById(req.session.user_id, function(user) {
      if (user) {
        req.currentUser = user;
        next();
      } else {
        res.redirect('/sessions/new');
      }
    });
  } else {
    res.redirect('/sessions/new');
  }
}

app.get('/documents.:format?', loadUser, function(req, res) {
  // ...
});*/


// RESTful подход к сессиям
/*// Сессии
app.get('/sessions/new', function(req, res) {
  res.render('sessions/new.jade', {
    locals: { user: new User() }
  });
});

app.post('/sessions', function(req, res) {
  // Найти пользователя и выставить currentUser
});

app.del('/sessions', loadUser, function(req, res) {
  // Удалить сессию
  if (req.session) {
    req.session.destroy(function() {});
  }
  res.redirect('/sessions/new');
});*/


// Шифрование пароля использует стандартную Node.js библиотеку crypto:
/*var crypto = require('crypto');

mongoose.model('User', {
  methods: {
    encryptPassword: function(password) {
      return crypto.createHmac('sha1', this.salt).
                    update(password).
                    digest('hex');
    }
  }
});*/

/* mongoose.model('User', {
  // ...

  setters: {
    password: function(password) {
      this._password = password;
      this.salt = this.makeSalt();
      this.hashed_password = this.encryptPassword(password);
    }
  },

  methods: {
    authenticate: function(plainText) {
      return this.encryptPassword(plainText) === this.hashed_password;
    },

    makeSalt: function() {
      return Math.round((new Date().valueOf() * Math.random())) + '';
    },

    // ...*/

/* mongoose.model('User', {
  // ...
  methods: {
    // ...

    save: function(okFn, failedFn) {
      if (this.isValid()) {
        this.__super__(okFn);
      } else {
        failedFn();
      }
    }

    // ...*/

/* app.post('/users.:format?', function(req, res) {
  var user = new User(req.body.user);

  function userSaved() {
    switch (req.params.format) {
      case 'json':
        res.send(user.__doc);
      break;

      default:
        req.session.user_id = user.id;
        res.redirect('/documents');
    }
  }

  function userSaveFailed() {
    res.render('users/new.jade', {
      locals: { user: user }
    });
  }

  user.save(userSaved, userSaveFailed);
});*/

/* mongoose.model('User', {
  // ...

  indexes: [
    [{ email: 1 }, { unique: true }]
  ],

  // ...
});*/