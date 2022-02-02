const UserLog = require('./models/userslog')
const Role = require('./models/roles')
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const { validationResult } = require('express-validator')
const { secret } = require('./config');

const generateAccessToken = (id, roles) => {
    const payload = {
      id,
       roles
    };
    return jwt.sign(payload, secret, {expiresIn: "24h"});
}

class authController {
  async registration(req, res) {
      try {
        const errors = validationResult(req);
    
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
    
  async login(req, res) {
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

  async getUsers(req, res) {
      try {
        const users = await UserLog.find();
        res.status(200).json({users});
      }
      catch (err) {
        console.log(err);
        res.status(400).send(err.message);
      }
  }
}

module.exports = new authController();